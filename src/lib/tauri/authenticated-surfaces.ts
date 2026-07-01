"use client";

import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];

export function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return Promise.resolve();
  if (launchRequested && launchPromise) return launchPromise;
  if (launchRequested) return Promise.resolve();

  launchRequested = true;
  launchPromise = (async () => {
    const selectedRoomId = getActiveProjectRoomId();
    await tauriCommands.appReady({ selectedRoomId }).catch(() => undefined);

    const errors: unknown[] = [];
    for (const input of loginStartupWindows) {
      try {
        await tauriCommands.openWidgetWindow({ ...input, selectedRoomId });
      } catch (error) {
        errors.push(error);
      }
    }

    void tauriCommands
      .recordWidgetUsageEvent({
        bubbleType: "todo",
        eventType: "open:auto-login",
        occurredAt: new Date().toISOString(),
      })
      .catch(() => undefined);

    if (errors.length === loginStartupWindows.length) {
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
