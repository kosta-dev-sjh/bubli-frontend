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

export type ManagedFolderAutoSyncStatus = {
  lastAttemptAt?: string;
  lastFileAnalysisFailedCount?: number;
  lastFileAnalysisRequestedCount?: number;
  lastFileEventSentCount?: number;
  lastFileEventSkippedCount?: number;
  lastFileEventSyncedCount?: number;
  lastErrorMessage?: string;
  lastSkippedCount?: number;
  lastSkippedFolderIds?: string[];
  lastStatus: "idle" | "syncing" | "synced" | "waiting" | "failed" | "stopped";
  lastSuccessAt?: string;
  lastSyncedFolderId?: string | null;
  lastWatchEventFolderId?: string;
  lastWatchedCount?: number;
  lastWatchedFolderIds?: string[];
  pendingFolderCount: number;
  pendingFullSyncRequested: boolean;
  running: boolean;
};

let autoSyncStatus: ManagedFolderAutoSyncStatus = {
  lastStatus: "idle",
  pendingFolderCount: 0,
  pendingFullSyncRequested: false,
  running: false,
};

type ManagedFolderDrainSummary = {
  analysisFailedCount: number;
  analysisRequestedCount: number;
  sentCount: number;
  skippedCount: number;
  syncedCount: number;
};

const emptyManagedFolderDrainSummary = (): ManagedFolderDrainSummary => ({
  analysisFailedCount: 0,
  analysisRequestedCount: 0,
  sentCount: 0,
  skippedCount: 0,
  syncedCount: 0,
});

export function startManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

  updateManagedFolderAutoSyncStatus({ lastErrorMessage: undefined, lastStatus: "syncing", running: true });
  void syncManagedFolderEventsOnce();
  syncIntervalId = window.setInterval(() => {
    void syncManagedFolderEventsOnce();
  }, LOCAL_FILE_EVENT_SYNC_INTERVAL_MS);
}

export async function stopManagedFolderAutoSync(input?: ManagedFolderAutoSyncStopInput) {
  const shouldFlush =
    Boolean(input?.flush) &&
    (syncIntervalId !== null ||
      syncInFlight ||
      syncInFlightPromise !== null ||
      pendingFullSyncRequested ||
      pendingFolderSyncIds.size > 0);

  if (shouldFlush) {
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
  updateManagedFolderAutoSyncStatus({ lastStatus: "stopped", running: false });
}

export async function flushManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  await syncManagedFolderEventsOnce().catch(() => undefined);
}

export function isManagedFolderAutoSyncRunning() {
  return syncIntervalId !== null;
}

export function getManagedFolderAutoSyncStatus(): ManagedFolderAutoSyncStatus {
  return autoSyncStatus;
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
    updateManagedFolderAutoSyncStatus({ lastStatus: "stopped", running: false });
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
  updateManagedFolderAutoSyncStatus({
    lastStatus: "waiting",
    lastWatchEventFolderId: localFolderId,
  });
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
  updateManagedFolderAutoSyncStatus({
    lastAttemptAt: new Date().toISOString(),
    lastErrorMessage: undefined,
    lastStatus: "syncing",
  });

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
        updateManagedFolderAutoSyncStatus({ lastStatus: "stopped" });
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
          const drained = await drainPersonalLocalFileEvents({ consentGranted });
          updateManagedFolderAutoSyncStatus({
            lastFileAnalysisFailedCount: drained.analysisFailedCount,
            lastFileAnalysisRequestedCount: drained.analysisRequestedCount,
            lastFileEventSentCount: drained.sentCount,
            lastFileEventSkippedCount: drained.skippedCount,
            lastFileEventSyncedCount: drained.syncedCount,
            lastStatus: "synced",
            lastSuccessAt: new Date().toISOString(),
            lastSyncedFolderId: null,
          });
          continue;
        }

        const folderId = pendingFolderSyncIds.values().next().value;
        if (!folderId) continue;
        pendingFolderSyncIds.delete(folderId);
        const drained = await drainPersonalLocalFileEvents({ consentGranted, localFolderId: folderId });
        updateManagedFolderAutoSyncStatus({
          lastFileAnalysisFailedCount: drained.analysisFailedCount,
          lastFileAnalysisRequestedCount: drained.analysisRequestedCount,
          lastFileEventSentCount: drained.sentCount,
          lastFileEventSkippedCount: drained.skippedCount,
          lastFileEventSyncedCount: drained.syncedCount,
          lastStatus: "synced",
          lastSuccessAt: new Date().toISOString(),
          lastSyncedFolderId: folderId,
        });
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
      updateManagedFolderAutoSyncStatus({
        lastErrorMessage: "Managed folder auto-sync failed; retrying on the next watch event or interval.",
        lastStatus: "failed",
      });
      // The sync adapter keeps failed rows retryable in SQLite; the next watch event or tick can try again.
    } finally {
      syncInFlight = false;
      syncInFlightPromise = null;
      updateManagedFolderAutoSyncStatus({});
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

async function drainPersonalLocalFileEvents(input: {
  consentGranted: boolean;
  localFolderId?: string;
}): Promise<ManagedFolderDrainSummary> {
  const summary = emptyManagedFolderDrainSummary();

  for (let batch = 0; batch < LOCAL_FILE_EVENT_SYNC_MAX_BATCHES_PER_TICK; batch += 1) {
    const result = await syncPersonalLocalFileEventsToServer({
      consentGranted: input.consentGranted,
      limit: LOCAL_FILE_EVENT_SYNC_BATCH_LIMIT,
      localFolderId: input.localFolderId,
    });

    if (result.status !== "ready") {
      return summary;
    }

    summary.analysisFailedCount += result.data.analysisFailedCount;
    summary.analysisRequestedCount += result.data.analysisRequestedCount;
    summary.sentCount += result.data.sentCount;
    summary.skippedCount += result.data.skippedCount;
    summary.syncedCount += result.data.syncedCount;

    if (result.data.sentCount < LOCAL_FILE_EVENT_SYNC_BATCH_LIMIT) {
      return summary;
    }
  }

  return summary;
}

async function ensureManagedFolderRuntimeConsent() {
  const consentGranted = await readManagedFolderConsent();
  if (!consentGranted) {
    detachManagedFolderWatchListener();
    await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
    return false;
  }

  attachManagedFolderWatchListener();
  const watchResult = await tauriCommands.watchAllManagedFolders().catch(() => null);
  if (watchResult) {
    updateManagedFolderAutoSyncStatus({
      lastSkippedCount: watchResult.skippedCount,
      lastSkippedFolderIds: watchResult.skippedFolderIds,
      lastWatchedCount: watchResult.watchedCount,
      lastWatchedFolderIds: watchResult.watchedFolderIds,
    });
  }
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

function updateManagedFolderAutoSyncStatus(next: Partial<ManagedFolderAutoSyncStatus>) {
  autoSyncStatus = {
    ...autoSyncStatus,
    ...next,
    pendingFolderCount: pendingFolderSyncIds.size,
    pendingFullSyncRequested,
    running: next.running ?? isManagedFolderAutoSyncRunning(),
  };
}
