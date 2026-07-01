"use client";

import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];

export async function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return;
  if (launchRequested && launchPromise) return launchPromise;
  if (launchRequested) return;

  launchRequested = true;
  launchPromise = (async () => {
    await tauriCommands.appReady().catch(() => undefined);

    const errors: unknown[] = [];
    for (const input of loginStartupWindows) {
      try {
        await tauriCommands.openWidgetWindow(input);
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
