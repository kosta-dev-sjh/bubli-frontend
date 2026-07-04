"use client";

import {
  backfillPersonalLocalFileAnalyses,
  listPersonalManagedFolders,
  scanPersonalManagedFolder,
  syncPersonalLocalFileEventsToServer,
} from "@/lib/local/managed-folder-client";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands } from "@/lib/tauri/commands";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";

const LOCAL_FILE_EVENT_SYNC_INTERVAL_MS = 60_000;
const CONSENT_REFRESH_INTERVAL_MS = 60_000;
const LOCAL_FILE_EVENT_SYNC_BATCH_LIMIT = 20;
const LOCAL_FILE_EVENT_SYNC_MAX_BATCHES_PER_TICK = 5;
const WATCH_EVENT_SYNC_DEBOUNCE_MS = 400;

let syncIntervalId: number | null = null;
let syncInFlight = false;
let syncInFlightPromise: Promise<void> | null = null;
let analysisBackfillHasRun = false;
let startupScanHasRun = false;
let pendingFullSyncRequested = false;
const pendingFolderSyncIds = new Set<string>();
let watchUnlisten: (() => void) | null = null;
let watchUnlistenPromise: Promise<() => void> | null = null;
let watchListenerGeneration = 0;
const pendingWatchEventSyncTimeoutIds = new Map<string, number>();
let cachedConsent: boolean | null = null;
let cachedConsentCheckedAt = 0;
let managedFolderConsentRevision = 0;

type ManagedFolderAutoSyncStopInput = {
  flush?: boolean;
};

export function startManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

  void syncManagedFolderEventsOnce();
  syncIntervalId = window.setInterval(() => {
    void syncManagedFolderEventsOnce();
  }, LOCAL_FILE_EVENT_SYNC_INTERVAL_MS);
}

export async function stopManagedFolderAutoSync(input?: ManagedFolderAutoSyncStopInput) {
  if (input?.flush) {
    await flushManagedFolderAutoSync();
  }

  if (syncIntervalId !== null) {
    window.clearInterval(syncIntervalId);
  }

  syncIntervalId = null;
  syncInFlight = false;
  syncInFlightPromise = null;
  analysisBackfillHasRun = false;
  startupScanHasRun = false;
  pendingFullSyncRequested = false;
  pendingFolderSyncIds.clear();
  clearPendingWatchEventSyncs();
  cachedConsent = null;
  cachedConsentCheckedAt = 0;
  detachManagedFolderWatchListener();
  if (isTauriRuntime()) {
    void tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
  }
}

export async function flushManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  await syncManagedFolderEventsOnce().catch(() => undefined);
}

export function isManagedFolderAutoSyncRunning() {
  return syncIntervalId !== null;
}

export function notifyManagedFolderConsentChanged(enabled: boolean) {
  cachedConsent = enabled;
  cachedConsentCheckedAt = Date.now();
  managedFolderConsentRevision += 1;

  if (!enabled) {
    if (syncIntervalId !== null) {
      window.clearInterval(syncIntervalId);
    }
    syncIntervalId = null;
    pendingFullSyncRequested = false;
    pendingFolderSyncIds.clear();
    clearPendingWatchEventSyncs();
    analysisBackfillHasRun = false;
    startupScanHasRun = false;
    detachManagedFolderWatchListener();
    if (isTauriRuntime()) {
      void tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
    }
    return;
  }

  startManagedFolderAutoSync();
}

function attachManagedFolderWatchListener() {
  if (watchUnlisten || watchUnlistenPromise) return;

  const generation = ++watchListenerGeneration;
  watchUnlistenPromise = listenManagedFolderWatchEvents((payload) => {
    debounceManagedFolderWatchEventSync(payload.localFolderId);
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
  clearPendingWatchEventSyncs();

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

function debounceManagedFolderWatchEventSync(localFolderId: string) {
  const pendingTimeoutId = pendingWatchEventSyncTimeoutIds.get(localFolderId);
  if (pendingTimeoutId !== undefined) {
    window.clearTimeout(pendingTimeoutId);
  }

  const timeoutId = window.setTimeout(() => {
    pendingWatchEventSyncTimeoutIds.delete(localFolderId);
    void syncManagedFolderEventsOnce(localFolderId);
  }, WATCH_EVENT_SYNC_DEBOUNCE_MS);

  pendingWatchEventSyncTimeoutIds.set(localFolderId, timeoutId);
}

function clearPendingWatchEventSyncs() {
  for (const timeoutId of pendingWatchEventSyncTimeoutIds.values()) {
    window.clearTimeout(timeoutId);
  }
  pendingWatchEventSyncTimeoutIds.clear();
}

async function syncManagedFolderEventsOnce(localFolderId?: string) {
  if (localFolderId) {
    pendingFolderSyncIds.add(localFolderId);
  } else {
    pendingFullSyncRequested = true;
  }

  if (syncInFlight) {
    return syncInFlightPromise ?? Promise.resolve();
  }

  syncInFlight = true;
  syncInFlightPromise = (async () => {
    try {
      const revision = managedFolderConsentRevision;
      const consentGranted = await ensureManagedFolderRuntimeConsent();
      if (!consentGranted || revision !== managedFolderConsentRevision) {
        pendingFullSyncRequested = false;
        pendingFolderSyncIds.clear();
        return;
      }

      if (!startupScanHasRun) {
        await scanSyncEnabledManagedFoldersOnce(consentGranted);
        startupScanHasRun = true;
        pendingFullSyncRequested = true;
      }

      while (pendingFullSyncRequested || pendingFolderSyncIds.size > 0) {
        if (pendingFullSyncRequested) {
          pendingFullSyncRequested = false;
          pendingFolderSyncIds.clear();
          await drainPersonalLocalFileEvents({ consentGranted });
          continue;
        }

        const folderId = pendingFolderSyncIds.values().next().value;
        if (!folderId) continue;
        pendingFolderSyncIds.delete(folderId);
        await drainPersonalLocalFileEvents({ consentGranted, localFolderId: folderId });
      }

      await backfillPersonalLocalFileAnalyses({
        consentGranted,
        limit: analysisBackfillHasRun ? 1 : 3,
        maxAttempts: 3,
      });
      analysisBackfillHasRun = true;
    } catch {
      cachedConsent = null;
      cachedConsentCheckedAt = 0;
      pendingFullSyncRequested = false;
      pendingFolderSyncIds.clear();
      startupScanHasRun = false;
      // The sync adapter keeps failed rows retryable in SQLite; the next watch event or tick can try again.
    } finally {
      syncInFlight = false;
      syncInFlightPromise = null;
      if (pendingFullSyncRequested || pendingFolderSyncIds.size > 0) {
        await syncManagedFolderEventsOnce();
      }
    }
  })();

  return syncInFlightPromise;
}

async function scanSyncEnabledManagedFoldersOnce(consentGranted: boolean) {
  const folders = await listPersonalManagedFolders();
  if (folders.status !== "ready") return;

  for (const folder of folders.data.folders) {
    if (folder.status !== "ACTIVE" || !folder.syncEnabled) continue;
    await scanPersonalManagedFolder({
      consentGranted,
      localFolderId: folder.localFolderId,
    }).catch(() => undefined);
  }
}

async function drainPersonalLocalFileEvents(input: { consentGranted: boolean; localFolderId?: string }) {
  for (let batch = 0; batch < LOCAL_FILE_EVENT_SYNC_MAX_BATCHES_PER_TICK; batch += 1) {
    const result = await syncPersonalLocalFileEventsToServer({
      consentGranted: input.consentGranted,
      limit: LOCAL_FILE_EVENT_SYNC_BATCH_LIMIT,
      localFolderId: input.localFolderId,
    });

    if (result.status !== "ready" || result.data.sentCount < LOCAL_FILE_EVENT_SYNC_BATCH_LIMIT) {
      return;
    }
  }
}

async function ensureManagedFolderRuntimeConsent() {
  const consentGranted = await readManagedFolderConsent();
  if (!consentGranted) {
    detachManagedFolderWatchListener();
    await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
    return false;
  }

  attachManagedFolderWatchListener();
  await tauriCommands.watchAllManagedFolders().catch(() => undefined);
  return true;
}

async function readManagedFolderConsent() {
  const now = Date.now();
  if (cachedConsent !== null && now - cachedConsentCheckedAt < CONSENT_REFRESH_INTERVAL_MS) {
    return cachedConsent;
  }

  const privacy = await settingsApi.getPrivacyConsents();
  cachedConsent = Boolean(privacy.localFolderEnabled);
  cachedConsentCheckedAt = now;
  return cachedConsent;
}
