"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { authApi } from "@/features/auth/api/authApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import {
  clearActiveProjectRoomId,
  getActiveProjectRoomId,
  restoreActiveProjectRoomFromTauri,
  seedActiveProjectRoomId,
} from "@/lib/workspace-active-room";
import type { WidgetBubbleSettingResponse, WidgetBubbleType as ApiWidgetBubbleType } from "@/types/api/widget";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;
let launchGeneration = 0;
let launchedAuthenticatedSurfaces = false;

const loginStartupBarWindow: WidgetWindowOpenInput = { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" };
// 메뉴 오브 창도 로그인 시 자동 실행 목록에 함께 띄운다.
const loginStartupMenuWindow: WidgetWindowOpenInput = { bubbleType: "menu", mode: "DEFAULT", windowId: "menu" };
const loginStartupWindows: WidgetWindowOpenInput[] = [
  loginStartupBarWindow,
  loginStartupMenuWindow,
  { bubbleType: "agent", mode: "DEFAULT", windowId: "agent" },
  { bubbleType: "alert", mode: "DEFAULT", windowId: "alert" },
  { bubbleType: "chat", mode: "DEFAULT", windowId: "chat" },
  { bubbleType: "memo", mode: "DEFAULT", windowId: "memo" },
  { bubbleType: "resource", mode: "DEFAULT", windowId: "resource" },
  { bubbleType: "schedule", mode: "DEFAULT", windowId: "schedule" },
  { bubbleType: "timer", mode: "DEFAULT", windowId: "timer" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];
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

function widgetTargetFromInput(input: WidgetWindowOpenInput) {
  return {
    bubbleType: input.bubbleType,
    windowId: input.windowId ?? input.bubbleType,
  };
}

function startupWindowRequiresVisibleWindow(input: WidgetWindowOpenInput) {
  return input.mode !== "MINIMIZED";
}

async function authenticatedStartupWindowsReady(startupWindows: WidgetWindowOpenInput[]) {
  for (const input of startupWindows) {
    if (!startupWindowRequiresVisibleWindow(input)) continue;

    try {
      const state = await tauriCommands.getWidgetWindowState(widgetTargetFromInput(input));
      if (!state.windowVisible) return false;
    } catch {
      return false;
    }
  }

  return true;
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

async function openWidgetWindowsWithRetry(
  inputs: WidgetWindowOpenInput[],
  selectedRoomId: string | null,
  shouldContinue: () => boolean,
): Promise<WidgetOpenResult[]> {
  if (inputs.length === 0) return [];
  let lastReason: unknown = null;
  const windows = inputs.map((input) => ({ ...input, selectedRoomId }));

  for (let attempt = 0; attempt <= widgetOpenRetryAttempts; attempt += 1) {
    if (!shouldContinue()) {
      return inputs.map((input) => ({
        input,
        reason: new Error("Tauri widget launch cancelled"),
        status: "rejected" as const,
      }));
    }

    try {
      await withTimeout(tauriCommands.openWidgetWindows({ windows }), widgetOpenCommandTimeoutMs);
      return inputs.map((input) => ({ input, status: "fulfilled" as const }));
    } catch (reason) {
      lastReason = reason;
      if (attempt < widgetOpenRetryAttempts && shouldContinue()) {
        await delay(widgetOpenRetryDelayMs);
      }
    }
  }

  return inputs.map((input) => ({ input, reason: lastReason, status: "rejected" as const }));
}

function getStartupModeFromSetting(setting: WidgetBubbleSettingResponse): WidgetWindowMode {
  if (setting.minimized) return "MINIMIZED";
  if (setting.ghostMode) return "GHOST";
  if (setting.opacity !== null && setting.opacity !== undefined && setting.opacity < 0.95) {
    return "TRANSLUCENT";
  }
  return "DEFAULT";
}

function getLoginStartupBubbles(settings: WidgetBubbleSettingResponse[]): WidgetWindowOpenInput[] {
  const enabledByBubble = new Map<Exclude<WidgetBubbleType, "bar" | "menu">, WidgetBubbleSettingResponse>();
  const sortedStartupBubbles: Array<
    WidgetWindowOpenInput & {
      bubbleType: Exclude<WidgetBubbleType, "bar" | "menu">;
    }
  > = [];

  for (const startupWindow of loginStartupWindows) {
    if (startupWindow.bubbleType === undefined || startupWindow.bubbleType === "bar" || startupWindow.bubbleType === "menu") {
      continue;
    }

    const bubbleWithType = startupWindow as WidgetWindowOpenInput & {
      bubbleType: Exclude<WidgetBubbleType, "bar" | "menu">;
    };
    sortedStartupBubbles.push(bubbleWithType);
  }

  for (const setting of settings) {
    if (!setting.enabled) continue;
    const localType = backendBubbleToLocal[setting.bubbleType];
    if (!localType) continue;
    enabledByBubble.set(localType, setting);
  }

  const startupBubbles: WidgetWindowOpenInput[] = [loginStartupMenuWindow];
  for (const bubble of sortedStartupBubbles) {
    const setting = enabledByBubble.get(bubble.bubbleType);
    if (!setting) continue;
    startupBubbles.push({
      bubbleType: bubble.bubbleType,
      mode: getStartupModeFromSetting(setting),
      windowId: bubble.windowId,
    });
  }

  return startupBubbles;
}

export async function resolveLoginStartupWindows(): Promise<WidgetWindowOpenInput[]> {
  const settings = await widgetApi.getSettings().catch(() => null);
  if (!settings) {
    return loginStartupWindows;
  }

  const startupBubbles = getLoginStartupBubbles(settings.bubbles);
  if (startupBubbles.length === 0) return loginStartupWindows;

  return [loginStartupBarWindow, ...startupBubbles];
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
  if (launchRequested && launchPromise) return launchPromise;

  launchRequested = true;
  const generation = ++launchGeneration;
  launchPromise = (async () => {
    await authApi.getMe();

    const startupWindows = await resolveLoginStartupWindows();
    if (launchedAuthenticatedSurfaces) {
      const ready = await authenticatedStartupWindowsReady(startupWindows);
      if (ready) return;

      launchedAuthenticatedSurfaces = false;
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    }

    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    const selectedRoomId = await resolveLaunchSelectedRoomId();
    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

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

    const bubbleResults = await openWidgetWindowsWithRetry(bubbleWindows, selectedRoomId, shouldContinueLaunch);
    for (const result of bubbleResults) {
      if (result.status === "fulfilled") {
        openedWindows.push(result.input);
      } else {
        rejectedReasons.push(result.reason);
      }
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    if (openedWindows.length < startupWindows.length) {
      launchRequested = false;
      launchedAuthenticatedSurfaces = false;
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      throw rejectedReasons[0] ?? new Error("Some Tauri widgets failed to open after login");
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
    // All requested windows opened; this login cycle is active.
    // Partial launches are cleaned up above so bar-only startup cannot hide a
    // failed bubble batch.
    launchedAuthenticatedSurfaces = true;
    launchRequested = true;
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

  clearActiveProjectRoomId();
  await tauriCommands.clearActiveProjectRoom().catch(() => undefined);
  await tauriCommands.setWidgetRoomContext({ selectedRoomId: null }).catch(() => undefined);
  await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
  await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
}
