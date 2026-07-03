"use client";

import { syncPersonalLocalFileEventsToServer } from "@/lib/local/managed-folder-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands } from "@/lib/tauri/commands";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";

const LOCAL_FILE_EVENT_SYNC_INTERVAL_MS = 60_000;

let syncIntervalId: number | null = null;
let syncInFlight = false;
let pendingFullSyncRequested = false;
const pendingFolderSyncIds = new Set<string>();
let watchUnlisten: (() => void) | null = null;
let watchUnlistenPromise: Promise<() => void> | null = null;
let watchListenerGeneration = 0;

export function startManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

  void tauriCommands.watchAllManagedFolders().catch(() => undefined);
  attachManagedFolderWatchListener();
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
  pendingFullSyncRequested = false;
  pendingFolderSyncIds.clear();
  syncInFlight = false;
  detachManagedFolderWatchListener();
  if (isTauriRuntime()) {
    void tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
  }
}

export function isManagedFolderAutoSyncRunning() {
  return syncIntervalId !== null;
}

function attachManagedFolderWatchListener() {
  if (watchUnlisten || watchUnlistenPromise) return;

  const generation = ++watchListenerGeneration;
  watchUnlistenPromise = listenManagedFolderWatchEvents((payload) => {
    void syncManagedFolderEventsOnce(payload.localFolderId);
  })
    .then((nextUnlisten) => {
      if (generation !== watchListenerGeneration) {
        nextUnlisten();
        return () => undefined;
      }

      watchUnlisten = nextUnlisten;
      watchUnlistenPromise = null;
      return nextUnlisten;
    })
    .catch(() => {
      watchUnlistenPromise = null;
      return () => undefined;
    });
}

function detachManagedFolderWatchListener() {
  watchListenerGeneration += 1;

  if (watchUnlisten) {
    watchUnlisten();
    watchUnlisten = null;
  }

  if (watchUnlistenPromise) {
    watchUnlistenPromise
      .then((nextUnlisten) => nextUnlisten())
      .catch(() => undefined);
    watchUnlistenPromise = null;
  }
}

async function syncManagedFolderEventsOnce(localFolderId?: string) {
  if (localFolderId) {
    pendingFolderSyncIds.add(localFolderId);
  } else {
    pendingFullSyncRequested = true;
  }

  if (syncInFlight) return;

  syncInFlight = true;
  try {
    while (pendingFullSyncRequested || pendingFolderSyncIds.size > 0) {
      if (pendingFullSyncRequested) {
        pendingFullSyncRequested = false;
        pendingFolderSyncIds.clear();
        await syncPersonalLocalFileEventsToServer({ limit: 20 });
        continue;
      }

      const folderId = pendingFolderSyncIds.values().next().value;
      if (!folderId) continue;
      pendingFolderSyncIds.delete(folderId);
      await syncPersonalLocalFileEventsToServer({ limit: 20, localFolderId: folderId });
    }
  } catch {
    // The sync adapter keeps failed rows retryable in SQLite; the next watch event or tick can try again.
  } finally {
    syncInFlight = false;
    if (pendingFullSyncRequested || pendingFolderSyncIds.size > 0) {
      void syncManagedFolderEventsOnce();
    }
  }
}
