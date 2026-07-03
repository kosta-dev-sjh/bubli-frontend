"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";
import type { WidgetBubbleSettingResponse, WidgetBubbleType as ApiWidgetBubbleType } from "@/types/api/widget";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;
let launchGeneration = 0;
let launchedAuthenticatedSurfaces = false;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];
const startupBubblePriority: WidgetBubbleType[] = ["todo", "schedule", "timer", "chat", "agent", "memo", "resource", "alert"];
const backendBubbleToLocal: Record<ApiWidgetBubbleType, WidgetBubbleType> = {
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Tauri widget open timed out")), timeoutMs)),
  ]);
}

function getStartupModeFromSetting(setting: WidgetBubbleSettingResponse): WidgetWindowMode {
  if (setting.minimized) return "MINIMIZED";
  if (setting.ghostMode) return "GHOST";
  if (setting.opacity !== null && setting.opacity !== undefined && setting.opacity < 0.95) {
    return "TRANSLUCENT";
  }
  return "DEFAULT";
}

function getPrimaryStartupBubble(settings: WidgetBubbleSettingResponse[]): WidgetWindowOpenInput | null {
  const enabledByBubble = new Map<WidgetBubbleType, WidgetBubbleSettingResponse>();

  for (const setting of settings) {
    if (!setting.enabled || setting.minimized) continue;
    enabledByBubble.set(backendBubbleToLocal[setting.bubbleType], setting);
  }

  for (const bubbleType of startupBubblePriority) {
    const setting = enabledByBubble.get(bubbleType);
    if (!setting) continue;

    return {
      bubbleType,
      mode: getStartupModeFromSetting(setting),
      windowId: bubbleType,
    };
  }

  return null;
}

export async function resolveLoginStartupWindows(): Promise<WidgetWindowOpenInput[]> {
  const settings = await widgetApi.getSettings().catch(() => null);
  const primaryBubble = settings ? getPrimaryStartupBubble(settings.bubbles) : null;

  if (!primaryBubble) {
    return loginStartupWindows;
  }

  return [{ bubbleType: "bar", mode: "DEFAULT", windowId: "bar" }, primaryBubble];
}

export function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return Promise.resolve();
  if (launchedAuthenticatedSurfaces) return Promise.resolve();
  if (launchRequested && launchPromise) return launchPromise;

  launchRequested = true;
  const generation = ++launchGeneration;
  launchPromise = (async () => {
    const selectedRoomId = getActiveProjectRoomId();
    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      return;
    }

    const startupWindows = await resolveLoginStartupWindows();
    const results: PromiseSettledResult<void>[] = [];

    for (const input of startupWindows) {
      if (generation !== launchGeneration) {
        await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
        return;
      }

      try {
        await withTimeout(tauriCommands.openWidgetWindow({ ...input, selectedRoomId }), widgetOpenCommandTimeoutMs);
        results.push({ status: "fulfilled", value: undefined });
      } catch (reason) {
        results.push({ reason, status: "rejected" });
      }
    }

    void tauriCommands
      .recordWidgetUsageEvent({
        bubbleType: startupWindows.find((input) => input.bubbleType !== "bar")?.bubbleType ?? "todo",
        eventType: "open:auto-login",
        occurredAt: new Date().toISOString(),
      })
      .catch(() => undefined);

    startActivityAutoCapture();
    startManagedFolderAutoSync();
    startWidgetUsageAutoSync();
    launchedAuthenticatedSurfaces = true;

    if (results.every((result) => result.status === "rejected")) {
      throw results[0].status === "rejected" ? results[0].reason : new Error("No Tauri widgets opened");
    }
  })()
    .catch((error) => {
      launchRequested = false;
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
  stopActivityAutoCapture();
  stopManagedFolderAutoSync();
  stopWidgetUsageAutoSync();

  if (!isTauriRuntime()) return;

  await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
}
