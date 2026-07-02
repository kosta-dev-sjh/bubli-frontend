"use client";

import { syncPersonalLocalFileEventsToServer } from "@/lib/local/managed-folder-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands } from "@/lib/tauri/commands";

const LOCAL_FILE_EVENT_SYNC_INTERVAL_MS = 60_000;

let syncIntervalId: number | null = null;
let syncInFlight = false;

export function startManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

  void tauriCommands.watchAllManagedFolders().catch(() => undefined);
  void syncManagedFolderEventsOnce();
  syncIntervalId = window.setInterval(() => {
    void syncManagedFolderEventsOnce();
  }, LOCAL_FILE_EVENT_SYNC_INTERVAL_MS);
}

export function stopManagedFolderAutoSync() {
  if (syncIntervalId !== null) {
    window.clearInterval(syncIntervalId);
  }

  syncIntervalId = null;
  syncInFlight = false;
  if (isTauriRuntime()) {
    void tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
  }
}

export function isManagedFolderAutoSyncRunning() {
  return syncIntervalId !== null;
}

async function syncManagedFolderEventsOnce() {
  if (syncInFlight) return;

  syncInFlight = true;
  try {
    await syncPersonalLocalFileEventsToServer({ limit: 20 });
  } catch {
    // The sync adapter keeps failed rows retryable in SQLite; the next tick can try again.
  } finally {
    syncInFlight = false;
  }
}
