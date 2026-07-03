"use client";

import {
  backfillPersonalLocalFileAnalyses,
  syncPersonalLocalFileEventsToServer,
} from "@/lib/local/managed-folder-client";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands } from "@/lib/tauri/commands";

const LOCAL_FILE_EVENT_SYNC_INTERVAL_MS = 60_000;
const LOCAL_FILE_EVENT_SYNC_DEBOUNCE_MS = 1_500;

let syncIntervalId: number | null = null;
let syncDebounceId: number | null = null;
let syncInFlight = false;
let syncRequestedWhileInFlight = false;
let analysisBackfillHasRun = false;
let unlistenManagedFolderWatchEvents: (() => void) | null = null;

export function startManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

  void tauriCommands.watchAllManagedFolders().catch(() => undefined);
  void listenManagedFolderWatchEvents(() => {
    requestManagedFolderSync(LOCAL_FILE_EVENT_SYNC_DEBOUNCE_MS);
  }).then((unlisten) => {
    unlistenManagedFolderWatchEvents = unlisten;
  });
  requestManagedFolderSync(0);
  syncIntervalId = window.setInterval(() => {
    requestManagedFolderSync(0);
  }, LOCAL_FILE_EVENT_SYNC_INTERVAL_MS);
}

export function stopManagedFolderAutoSync() {
  if (syncIntervalId !== null) {
    window.clearInterval(syncIntervalId);
  }

  if (syncDebounceId !== null) {
    window.clearTimeout(syncDebounceId);
  }
  unlistenManagedFolderWatchEvents?.();
  unlistenManagedFolderWatchEvents = null;
  syncIntervalId = null;
  syncDebounceId = null;
  syncInFlight = false;
  syncRequestedWhileInFlight = false;
  analysisBackfillHasRun = false;
  if (isTauriRuntime()) {
    void tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
  }
}

export function isManagedFolderAutoSyncRunning() {
  return syncIntervalId !== null;
}

function requestManagedFolderSync(delayMs: number) {
  if (syncDebounceId !== null) {
    window.clearTimeout(syncDebounceId);
  }

  syncDebounceId = window.setTimeout(() => {
    syncDebounceId = null;
    void syncManagedFolderEventsOnce();
  }, delayMs);
}

async function syncManagedFolderEventsOnce() {
  if (syncInFlight) {
    syncRequestedWhileInFlight = true;
    return;
  }

  syncInFlight = true;
  try {
    await syncPersonalLocalFileEventsToServer({ limit: 20 });
    await backfillPersonalLocalFileAnalyses({
      limit: analysisBackfillHasRun ? 1 : 3,
      maxAttempts: 3,
    });
    analysisBackfillHasRun = true;
  } catch {
    // The sync adapter keeps failed rows retryable in SQLite; the next tick can try again.
  } finally {
    syncInFlight = false;
    if (syncRequestedWhileInFlight) {
      syncRequestedWhileInFlight = false;
      requestManagedFolderSync(LOCAL_FILE_EVENT_SYNC_DEBOUNCE_MS);
    }
  }
}
