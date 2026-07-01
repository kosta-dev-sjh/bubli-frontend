"use client";

import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;

const loginStartupWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
  { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" },
];

export function launchTauriAuthenticatedSurfaces() {
  if (!isTauriRuntime()) return Promise.resolve();
  if (launchRequested && launchPromise) return launchPromise;
  if (launchRequested) return Promise.resolve();

  launchRequested = true;
  launchPromise = (async () => {
    await tauriCommands.appReady().catch(() => undefined);

    const launches = loginStartupWindows.map(
      (input, index) =>
        new Promise<boolean>((resolve) => {
          window.setTimeout(() => {
            void tauriCommands.openWidgetWindow(input).then(
              () => resolve(true),
              () => resolve(false),
            );
          }, index * 250);
        }),
    );
    const results = await Promise.all(launches);

    void tauriCommands
      .recordWidgetUsageEvent({
        bubbleType: "todo",
        eventType: "open:auto-login",
        occurredAt: new Date().toISOString(),
      })
      .catch(() => undefined);

    if (results.every((result) => !result)) {
      throw new Error("failed to open login startup widgets");
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
