"use client";

import {
  backfillPersonalLocalFileAnalyses,
  listPersonalManagedFolders,
  scanPersonalManagedFolder,
  syncPersonalLocalFileEventsToServer,
} from "@/lib/local/managed-folder-client";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { notifyDataChanged } from "@/lib/data-changed";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands } from "@/lib/tauri/commands";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";

const LOCAL_FILE_EVENT_SYNC_INTERVAL_MS = 60_000;
const CONSENT_REFRESH_INTERVAL_MS = 60_000;
const LOCAL_FILE_EVENT_SYNC_BATCH_LIMIT = 20;
const LOCAL_FILE_EVENT_SYNC_MAX_BATCHES_PER_TICK = 5;
const WATCH_EVENT_SYNC_DEBOUNCE_MS = 400;
// 서버→앱 조정용 개인 자료 목록 순회 상한 — 서버 오류로 인한 무한 순회를 막는다.
const SERVER_RESOURCE_RECONCILE_PAGE_SIZE = 100;
const SERVER_RESOURCE_RECONCILE_MAX_PAGES = 50;

let syncIntervalId: number | null = null;
let syncInFlight = false;
let syncInFlightPromise: Promise<void> | null = null;
let analysisBackfillHasRun = false;
let startupScanHasRun = false;
let pendingFullSyncRequested = false;
let stopRequested = false;
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
  lastFileAnalysisFailedCountScope?: "folder-auto-sync-drain" | "global-auto-sync-drain";
  lastAttemptAt?: string;
  lastFileEventFailedCount?: number;
  lastFileAnalysisFailedCount?: number;
  lastFileAnalysisRequestedCount?: number;
  lastFileEventSentCount?: number;
  lastFileEventSkippedCount?: number;
  lastFileEventSyncedCount?: number;
  lastErrorMessage?: string;
  lastSkippedCount?: number;
  lastSkippedFolderIds?: string[];
  lastStartupScanFailedCount?: number;
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
  errorMessage?: string;
  failedCount: number;
  sentCount: number;
  skippedCount: number;
  syncedCount: number;
};

const emptyManagedFolderDrainSummary = (): ManagedFolderDrainSummary => ({
  analysisFailedCount: 0,
  analysisRequestedCount: 0,
  failedCount: 0,
  sentCount: 0,
  skippedCount: 0,
  syncedCount: 0,
});

function managedFolderDrainStatus(drained: ManagedFolderDrainSummary) {
  return drained.failedCount > 0 ? "failed" : "synced";
}

export function startManagedFolderAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

  stopRequested = false;
  updateManagedFolderAutoSyncStatus({ lastErrorMessage: undefined, lastStatus: "syncing", running: true });
  void syncManagedFolderEventsOnce();
  syncIntervalId = window.setInterval(() => {
    void syncManagedFolderEventsOnce();
  }, LOCAL_FILE_EVENT_SYNC_INTERVAL_MS);
}

export async function stopManagedFolderAutoSync(input?: ManagedFolderAutoSyncStopInput) {
  stopRequested = true;
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
  clearPendingWatchEventSyncs();
  detachManagedFolderWatchListener();
  if (isTauriRuntime()) {
    await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
  }

  if (input?.flush) {
    await flushManagedFolderAutoSync();
  }

  syncInFlight = false;
  syncInFlightPromise = null;
  analysisBackfillHasRun = false;
  startupScanHasRun = false;
  pendingFullSyncRequested = false;
  pendingFolderSyncIds.clear();
  clearPendingWatchEventSyncs();
  cachedConsent = null;
  cachedConsentCheckedAt = 0;
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
        const startupScanFailedCount = await scanSyncEnabledManagedFoldersOnce(consentGranted);
        startupScanHasRun = startupScanFailedCount === 0;
        updateManagedFolderAutoSyncStatus({ lastStartupScanFailedCount: startupScanFailedCount });
        pendingFullSyncRequested = true;
      }

      // 60초 인터벌이 요청하는 full-sync를 이번 실행에서 실제로 돌렸는지 기록한다.
      // 서버→앱 조정은 full-sync 틱에서만 붙여서 감시 이벤트(폴더 단위)까지 서버를 훑지 않게 한다.
      let fullSyncDrained = false;

      while (pendingFullSyncRequested || pendingFolderSyncIds.size > 0) {
        if (pendingFullSyncRequested) {
          pendingFullSyncRequested = false;
          pendingFolderSyncIds.clear();
          fullSyncDrained = true;
          const drained = await drainPersonalLocalFileEvents({ consentGranted });
          updateManagedFolderAutoSyncStatus({
            lastFileAnalysisFailedCount: drained.analysisFailedCount,
            lastFileAnalysisFailedCountScope: "global-auto-sync-drain",
            lastFileAnalysisRequestedCount: drained.analysisRequestedCount,
            lastFileEventFailedCount: drained.failedCount,
            lastFileEventSentCount: drained.sentCount,
            lastFileEventSkippedCount: drained.skippedCount,
            lastFileEventSyncedCount: drained.syncedCount,
            lastErrorMessage: drained.errorMessage,
            lastStatus: managedFolderDrainStatus(drained),
            lastSuccessAt: drained.failedCount > 0 ? undefined : new Date().toISOString(),
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
          lastFileAnalysisFailedCountScope: "folder-auto-sync-drain",
          lastFileAnalysisRequestedCount: drained.analysisRequestedCount,
          lastFileEventFailedCount: drained.failedCount,
          lastFileEventSentCount: drained.sentCount,
          lastFileEventSkippedCount: drained.skippedCount,
          lastFileEventSyncedCount: drained.syncedCount,
          lastErrorMessage: drained.errorMessage,
          lastStatus: managedFolderDrainStatus(drained),
          lastSuccessAt: drained.failedCount > 0 ? undefined : new Date().toISOString(),
          lastSyncedFolderId: folderId,
        });
      }

      await backfillPersonalLocalFileAnalyses({
        consentGranted,
        limit: analysisBackfillHasRun ? 1 : 3,
        maxAttempts: 3,
      });
      analysisBackfillHasRun = true;

      // full-sync 틱의 마지막 단계: 서버에서 지워진 개인 자료를 로컬 인덱스에 반영한다.
      // 로컬→서버 방향과 달리 서버 삭제는 앱으로 밀어줄 경로가 없어서 여기서 당겨 맞춘다.
      if (fullSyncDrained) {
        await reconcileLocalIndexWithServerResources();
      }
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
      if (!stopRequested && (pendingFullSyncRequested || pendingFolderSyncIds.size > 0)) {
        await syncManagedFolderEventsOnce();
      }
    }
  })();

  return syncInFlightPromise;
}

// 서버→앱 방향 조정: 서버에서 지워진 개인 자료를 참조하던 로컬 인덱스 행을 LOCAL_ONLY로 되돌린다.
// 실패는 조용히 넘어간다 — 다음 60초 틱에서 자연히 재시도되고, 조정이 늦어도 데이터가 깨지지는 않는다.
async function reconcileLocalIndexWithServerResources() {
  try {
    // 1) 서버 개인 자료 id 집합을 페이지 단위로 모은다(상한 50페이지).
    const resourceIds: string[] = [];
    for (let page = 0; page < SERVER_RESOURCE_RECONCILE_MAX_PAGES; page += 1) {
      const response = await resourcesApi.listPersonalPage(page, SERVER_RESOURCE_RECONCILE_PAGE_SIZE);
      for (const resource of response.items) {
        resourceIds.push(resource.id);
      }
      if (!response.hasNext) {
        break;
      }
    }

    // 2) 이 집합에 없는 resource_id를 가진 로컬 인덱스 행을 LOCAL_ONLY로 되돌린다.
    const result = await tauriCommands.reconcileLocalFilesWithServer({ resourceIds });
    if (result.resetCount > 0) {
      // 서버에서 지워진 자료의 연결이 풀렸으니 자료 화면(웹/메인 창)이 재조회하도록 알린다.
      notifyDataChanged("resource");
    }
  } catch {
    // 서버 조회나 로컬 조정 실패는 다음 틱에서 다시 시도하므로 여기서는 조용히 무시한다.
  }
}

async function scanSyncEnabledManagedFoldersOnce(consentGranted: boolean) {
  const folders = await listPersonalManagedFolders();
  if (folders.status !== "ready") return 1;

  let failedCount = 0;
  for (const folder of folders.data.folders) {
    if (folder.status !== "ACTIVE" || !folder.syncEnabled) continue;
    const result = await scanPersonalManagedFolder({
      consentGranted,
      localFolderId: folder.localFolderId,
    }).catch(() => null);
    if (!result || result.status !== "ready") {
      failedCount += 1;
    }
  }
  return failedCount;
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
      summary.failedCount += 1;
      summary.errorMessage = result.message;
      return summary;
    }

    summary.analysisFailedCount += result.data.analysisFailedCount;
    summary.analysisRequestedCount += result.data.analysisRequestedCount;
    summary.failedCount += result.data.failedCount;
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

  if (!stopRequested) {
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
