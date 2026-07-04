"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import { getActiveProjectRoomId, restoreActiveProjectRoomFromTauri, seedActiveProjectRoomId } from "@/lib/workspace-active-room";
import type { WidgetBubbleSettingResponse, WidgetBubbleType as ApiWidgetBubbleType } from "@/types/api/widget";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;
let launchGeneration = 0;
let launchedAuthenticatedSurfaces = false;

const loginStartupBarWindow: WidgetWindowOpenInput = { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" };
// (deprecated) 메뉴(오브) 창은 더 이상 자동 실행하지 않는다 — Bubli 메뉴는 바 창의
// 브랜드 칩에서 열리는 인라인 morph 패널로 통합됐다. "menu" 창 경로(?bubble=menu)와
// Rust 창 상태는 그대로 남아 있어 수동으로 열면 여전히 동작한다.
const loginStartupWindows: WidgetWindowOpenInput[] = [
  loginStartupBarWindow,
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];
const loginPrimaryBubble: WidgetBubbleType = "todo";
const backendBubbleToLocal: Record<ApiWidgetBubbleType, Exclude<WidgetBubbleType, "bar" | "menu">> = {
  AGENT: "agent",
  ALERT: "alert",
  CHAT: "chat",
  MEMO: "memo",
  RESOURCE: "resource",
  SCHEDULE: "schedule",
  TIMER: "timer",
  TODO: "todo",
};

const widgetOpenCommandTimeoutMs = 8_000;
const widgetOpenRetryAttempts = 2;
const widgetOpenRetryDelayMs = 650;

type WidgetOpenResult =
  | { input: WidgetWindowOpenInput; status: "fulfilled" }
  | { input: WidgetWindowOpenInput; reason: unknown; status: "rejected" };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Tauri widget open timed out")), timeoutMs)),
  ]);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

async function openWidgetWindowWithRetry(
  input: WidgetWindowOpenInput,
  selectedRoomId: string | null,
  shouldContinue: () => boolean,
): Promise<WidgetOpenResult> {
  let lastReason: unknown = null;

  for (let attempt = 0; attempt <= widgetOpenRetryAttempts; attempt += 1) {
    if (!shouldContinue()) {
      return { input, reason: new Error("Tauri widget launch cancelled"), status: "rejected" };
    }

    try {
      await withTimeout(tauriCommands.openWidgetWindow({ ...input, selectedRoomId }), widgetOpenCommandTimeoutMs);
      return { input, status: "fulfilled" };
    } catch (reason) {
      lastReason = reason;
      if (attempt < widgetOpenRetryAttempts && shouldContinue()) {
        await delay(widgetOpenRetryDelayMs);
      }
    }
  }

  return { input, reason: lastReason, status: "rejected" };
}

function getStartupModeFromSetting(setting: WidgetBubbleSettingResponse): WidgetWindowMode {
  if (setting.minimized) return "MINIMIZED";
  if (setting.ghostMode) return "GHOST";
  if (setting.opacity !== null && setting.opacity !== undefined && setting.opacity < 0.95) {
    return "TRANSLUCENT";
  }
  return "DEFAULT";
}

function getLoginPrimaryBubbleWindow(settings: WidgetBubbleSettingResponse[]): WidgetWindowOpenInput | null {
  const enabledByBubble = new Map<Exclude<WidgetBubbleType, "bar" | "menu">, WidgetBubbleSettingResponse>();

  for (const setting of settings) {
    if (!setting.enabled || setting.minimized) continue;
    enabledByBubble.set(backendBubbleToLocal[setting.bubbleType], setting);
  }

  const setting = enabledByBubble.get(loginPrimaryBubble);
  if (!setting) return null;

  return {
    bubbleType: loginPrimaryBubble,
    mode: getStartupModeFromSetting(setting),
    windowId: loginPrimaryBubble,
  };
}

export async function resolveLoginStartupWindows(): Promise<WidgetWindowOpenInput[]> {
  const settings = await widgetApi.getSettings().catch(() => null);
  if (!settings) {
    return loginStartupWindows;
  }

  // Backend defaults keep all eight bubbles enabled for the bar/catalog, but
  // login must not spawn eight native windows at once.
  const primaryBubbleWindow = getLoginPrimaryBubbleWindow(settings.bubbles);
  if (!primaryBubbleWindow) return [loginStartupBarWindow];

  return [loginStartupBarWindow, primaryBubbleWindow];
}

async function resolveLaunchSelectedRoomId() {
  const context = await widgetApi.getContext().catch(() => null);
  if (context?.selectedRoomId) {
    seedActiveProjectRoomId(context.selectedRoomId);
    return context.selectedRoomId;
  }

  const activeRoomId = getActiveProjectRoomId();
  if (activeRoomId) return activeRoomId;

  const restored = await restoreActiveProjectRoomFromTauri().catch(() => null);
  return restored?.roomId ?? null;
}

export function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return Promise.resolve();
  if (launchedAuthenticatedSurfaces) return Promise.resolve();
  if (launchRequested && launchPromise) return launchPromise;

  launchRequested = true;
  const generation = ++launchGeneration;
  launchPromise = (async () => {
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    const selectedRoomId = await resolveLaunchSelectedRoomId();
    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    const startupWindows = await resolveLoginStartupWindows();
    const [barWindow, ...bubbleWindows] = startupWindows;
    const openedWindows: WidgetWindowOpenInput[] = [];
    const rejectedReasons: unknown[] = [];
    const shouldContinueLaunch = () => generation === launchGeneration;

    if (barWindow) {
      if (generation !== launchGeneration) {
        await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
        await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
        return;
      }

      const barResult = await openWidgetWindowWithRetry(barWindow, selectedRoomId, shouldContinueLaunch);
      if (barResult.status === "fulfilled") {
        openedWindows.push(barWindow);
      } else {
        rejectedReasons.push(barResult.reason);
      }
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    const bubbleResults = await Promise.allSettled(
      bubbleWindows.map((input) => openWidgetWindowWithRetry(input, selectedRoomId, shouldContinueLaunch)),
    );

    for (const result of bubbleResults) {
      if (result.status === "rejected") {
        rejectedReasons.push(result.reason);
        continue;
      }

      const value = result.value;
      if (value.status === "fulfilled") {
        openedWindows.push(value.input);
      } else {
        rejectedReasons.push(value.reason);
      }
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    if (openedWindows.length === 0) {
      launchRequested = false;
      launchedAuthenticatedSurfaces = false;
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      throw rejectedReasons[0] ?? new Error("No Tauri widgets opened");
    }

    void tauriCommands
      .seedWidgetBarItems({ selectedRoomId })
      .catch(() => undefined);

    for (const input of openedWindows) {
      const bubbleType = input.bubbleType;
      if (!bubbleType || bubbleType === "bar" || bubbleType === "menu") continue;
      void tauriCommands
        .recordWidgetUsageEvent({
          bubbleType,
          eventType: "open:auto-login",
          occurredAt: new Date().toISOString(),
        })
        .catch(() => undefined);
    }

    startActivityAutoCapture();
    startManagedFolderAutoSync();
    startWidgetUsageAutoSync();
    launchedAuthenticatedSurfaces = rejectedReasons.length === 0;
    launchRequested = rejectedReasons.length === 0;
  })()
    .catch(async (error) => {
      launchRequested = false;
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      throw error;
    })
    .finally(() => {
      launchPromise = null;
    });

  return launchPromise;
}

export async function stopTauriAuthenticatedSurfaces() {
  launchGeneration += 1;
  launchRequested = false;
  launchPromise = null;
  launchedAuthenticatedSurfaces = false;
  await stopActivityAutoCapture({ flush: true });
  await stopManagedFolderAutoSync({ flush: true });
  await stopWidgetUsageAutoSync({ flush: true });

  if (!isTauriRuntime()) return;

  await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
  await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
}
