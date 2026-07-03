"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;
let launchGeneration = 0;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];

export function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return Promise.resolve();
  if (launchRequested && launchPromise) return launchPromise;

  launchRequested = true;
  const generation = ++launchGeneration;
  launchPromise = (async () => {
    const selectedRoomId = getActiveProjectRoomId();
    const appReadyOpenedWidgets = await tauriCommands
      .appReady({ qaAllWidgets: false, selectedRoomId })
      .then(() => true)
      .catch(() => false);

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      return;
    }

    const errors: unknown[] = [];
    if (!appReadyOpenedWidgets) {
      for (const input of loginStartupWindows) {
        if (generation !== launchGeneration) {
          await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
          return;
        }

        try {
          await tauriCommands.openWidgetWindow({ ...input, selectedRoomId });
        } catch (error) {
          errors.push(error);
        }
      }
    }

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

    if (!appReadyOpenedWidgets && errors.length === loginStartupWindows.length) {
      throw errors[0];
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
  stopActivityAutoCapture();
  stopManagedFolderAutoSync();
  stopWidgetUsageAutoSync();

  if (!isTauriRuntime()) return;

  await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
}
