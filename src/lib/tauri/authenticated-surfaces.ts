"use client";

import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { startActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { startWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];

export function resetTauriAuthenticatedSurfaceLaunch() {
  launchRequested = false;
  launchPromise = null;
}

export async function closeTauriAuthenticatedSurfaces() {
  resetTauriAuthenticatedSurfaceLaunch();
  if (!isTauriRuntime()) return;

  await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
}

export function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return Promise.resolve();
  if (launchRequested && launchPromise) return launchPromise;
  if (launchRequested) return Promise.resolve();

  launchRequested = true;
  launchPromise = (async () => {
    const selectedRoomId = getActiveProjectRoomId();
    const appReadyOpenedWidgets = await tauriCommands
      .appReady({ selectedRoomId })
      .then(() => true)
      .catch(() => false);

    const errors: unknown[] = [];
    if (!appReadyOpenedWidgets) {
      for (const input of loginStartupWindows) {
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
