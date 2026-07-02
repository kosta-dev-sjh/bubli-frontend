"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { widgetApi } from "@/features/widget/api/widgetApi";
import type { WidgetBubbleType } from "@/types/api/widget";
import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;
let launchGeneration = 0;
let launchedAuthenticatedSurfaces = false;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
];

const defaultWidgetBubbleTypes: WidgetBubbleType[] = ["TODO", "SCHEDULE", "TIMER", "MEMO", "CHAT", "AGENT", "RESOURCE", "ALERT"];
const widgetOpenCommandTimeoutMs = 8_000;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Tauri widget open timed out")), timeoutMs)),
  ]);
}

function toWidgetWindowInput(bubbleType: WidgetBubbleType): WidgetWindowOpenInput {
  const normalized = bubbleType.toLowerCase() as WidgetWindowOpenInput["bubbleType"];
  return {
    bubbleType: normalized,
    mode: "DEFAULT",
    windowId: normalized,
  };
}

async function getLoginStartupWindows(): Promise<WidgetWindowOpenInput[]> {
  try {
    const settings = await widgetApi.getSettings();
    const enabledBubbles = settings.bubbles
      .filter((bubble) => bubble.enabled)
      .map((bubble) => bubble.bubbleType);
    const bubbleTypes = enabledBubbles.length > 0 ? enabledBubbles : defaultWidgetBubbleTypes;
    return [...loginStartupWindows, ...bubbleTypes.map(toWidgetWindowInput)];
  } catch {
    return [...loginStartupWindows, ...defaultWidgetBubbleTypes.map(toWidgetWindowInput)];
  }
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

    const startupWindows = await getLoginStartupWindows();
    const results = await Promise.allSettled(
      startupWindows.map(async (input, index) => {
        await delay(index * 120);
        if (generation !== launchGeneration) {
          await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
          return;
        }

        await withTimeout(tauriCommands.openWidgetWindow({ ...input, selectedRoomId }), widgetOpenCommandTimeoutMs);
      }),
    );

    void tauriCommands
      .recordWidgetUsageEvent({
        bubbleType: "todo",
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
