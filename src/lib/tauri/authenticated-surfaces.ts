"use client";

import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
];

export async function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return;
  if (launchRequested && launchPromise) return launchPromise;
  if (launchRequested) return;

  launchRequested = true;
  launchPromise = (async () => {
    await tauriCommands.appReady().catch(() => undefined);

    loginStartupWindows.forEach((input, index) => {
      window.setTimeout(() => {
        void tauriCommands.openWidgetWindow(input).catch(() => undefined);
      }, index * 250);
    });

    void tauriCommands
      .recordWidgetUsageEvent({
        bubbleType: "todo",
        eventType: "open:auto-login",
        occurredAt: new Date().toISOString(),
      })
      .catch(() => undefined);
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
