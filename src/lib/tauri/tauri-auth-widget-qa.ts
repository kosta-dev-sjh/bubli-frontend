"use client";

import { authApi } from "@/features/auth/api/authApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import {
  getStoredAuthSessionDiagnostics,
  probeStoredAuthSessionRestoreFromTauriMirrorForQa,
  readTauriAuthSessionDiagnostics,
  type AuthSessionDiagnostics,
} from "@/lib/auth/auth-session";
import { ApiClientError } from "@/lib/api/errors";
import { isActivityAutoCaptureRunning, notifyActivityConsentChanged } from "@/lib/local/activity-auto-capture";
import {
  getManagedFolderAutoSyncStatus,
  isManagedFolderAutoSyncRunning,
  notifyManagedFolderConsentChanged,
  type ManagedFolderAutoSyncStatus,
} from "@/lib/local/managed-folder-auto-sync";
import { syncPersonalLocalFileEventsToServer } from "@/lib/local/managed-folder-client";
import { syncAllLocalOutboxToServer } from "@/lib/sync/local-sync-client";
import {
  tauriCommands,
  type LocalFileEventsSyncStageResult,
  type WidgetBubbleType,
  type WidgetWindowBubbleType,
  type WidgetWindowState,
} from "@/lib/tauri/commands";
import {
  launchTauriAuthenticatedSurfaces,
  readTauriAuthenticatedSurfacesLaunchTimeline,
  stopTauriAuthenticatedSurfaces,
  type TauriAuthenticatedSurfaceLaunchTimeline,
} from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { isWidgetUsageAutoSyncRunning } from "@/lib/widget/widget-usage-auto-sync";
import { WIDGET_BUBBLE_TYPES } from "@/lib/widget/widget-types";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

const REAL_OAUTH_LOCAL_SYNC_FOLDER_MARKER = "bubli-real-oauth-local-sync-";
const REAL_OAUTH_LOCAL_SYNC_INITIAL_SEARCH_QUERY = "RealOAuthLocalSyncInitial";
const REAL_OAUTH_LOCAL_SYNC_UPDATED_MARKER = "RealOAuthLocalSyncUpdated";
const REAL_OAUTH_LOCAL_SYNC_UPDATED_SEARCH_QUERY = "searchable marker";
const REAL_OAUTH_LOCAL_SYNC_WATCH_INITIAL_QUERY = "RealOAuthLocalWatchInitial";

type RealOAuthQaPrivacyConsents = {
  activityDetectionEnabled: boolean;
  localFolderEnabled: boolean;
};

let realOAuthQaOriginalPrivacyConsents: RealOAuthQaPrivacyConsents | null = null;
let realOAuthQaPrivacyConsentsChanged = false;

type QaProbe = {
  code?: string;
  ok: boolean;
  status?: number;
};

type TauriRealOAuthLocalSyncProbe = {
  activity?: {
    consentGranted: boolean;
    localActivityId?: string;
    nativeAppName?: string;
    nativeCaptured: boolean;
    nativeDurationSeconds?: number;
    nativeWindowTitleCaptured: boolean;
    queued: boolean;
    syncStatus?: string;
  };
  enabled: boolean;
  error?: string;
  localFiles?: {
    enabled: boolean;
    error?: string;
    fixturePath?: string;
    initialPreviewIncludesMarker?: boolean;
    initialPreviewReady?: boolean;
    initialSearchMatched?: boolean;
    initialSyncAnalysisFailedCount?: number;
    initialSyncAnalysisRequestedCount?: number;
    initialSyncFailedCount?: number;
    initialSyncSentCount?: number;
    initialSyncSyncedCount?: number;
    initialSyncedResourceNotInSelectedRoomResources?: boolean;
    initialSyncedResourcePersonal?: boolean;
    initialSyncedResourceResolved?: boolean;
    initialSyncedResourceRoomIdAbsent?: boolean;
    initialSyncedResourceRoomListChecked?: boolean;
    initialSyncedResourceRoomListShapeOk?: boolean;
    fixtureFileName?: string;
    localFolderId?: string;
    deleteRequested?: boolean;
    deletedSearchCleared?: boolean;
    deleteSyncFailedCount?: number;
    deleteSyncSentCount?: number;
    deleteSyncSyncedCount?: number;
    nativeWatchCreateSyncFailedCount?: number;
    nativeWatchCreateSyncSentCount?: number;
    nativeWatchCreateSyncSyncedCount?: number;
    nativeWatchDeleteRequested?: boolean;
    nativeWatchDeleteSyncFailedCount?: number;
    nativeWatchDeleteSyncSentCount?: number;
    nativeWatchDeleteSyncSyncedCount?: number;
    nativeWatchFileName?: string;
    nativeWatchInitialSearchMatched?: boolean;
    nativeWatchMutationRequested?: boolean;
    nativeWatchStarted?: boolean;
    nativeWatchUpdateSyncFailedCount?: number;
    nativeWatchUpdateSyncSentCount?: number;
    nativeWatchUpdateSyncSyncedCount?: number;
    nativeWatchUpdatedSearchMatched?: boolean;
    mutationRequested?: boolean;
    prepareRequested?: boolean;
    reindexChanged?: boolean;
    reindexStatus?: string;
    remainingQaEvents?: number;
    scanFileCount?: number;
    staleQaFolderRemovedCount?: number;
    stagedCreatedCount?: number;
    stagedCreatedEventTypes?: string[];
    stagedCreatedFileNames?: string[];
    stagedDeletedCount?: number;
    stagedDeletedEventTypes?: string[];
    stagedDeletedFileNames?: string[];
    stagedNativeWatchCreatedCount?: number;
    stagedNativeWatchDeletedCount?: number;
    stagedNativeWatchEventTypes?: string[];
    stagedNativeWatchFileNames?: string[];
    stagedNativeWatchUpdatedCount?: number;
    stagedUpdatedCount?: number;
    stagedUpdatedEventTypes?: string[];
    stagedUpdatedFileNames?: string[];
    updatedPreviewIncludesMarker?: boolean;
    updatedPreviewReady?: boolean;
    updatedSearchMatched?: boolean;
    updateSyncAnalysisFailedCount?: number;
    updateSyncAnalysisRequestedCount?: number;
    updateSyncFailedCount?: number;
    updateSyncSentCount?: number;
    updateSyncSyncedCount?: number;
  };
  outbox?: {
    activityFailedCount?: number;
    activitySentCount?: number;
    activityStagedCount?: number;
    failedCount?: number;
    failedCountScope?: string;
    fileFailedCount?: number;
    fileScopeLocalFolderId?: string;
    fileSentCount?: number;
    fileSyncedCount?: number;
    pendingCount?: number;
    pendingCountScope?: string;
    sentCount?: number;
    status: string;
    syncedAt?: string;
    widgetFailedCount?: number;
    widgetSentCount?: number;
  };
  sqlite?: {
    ok: boolean;
  };
  widgetUsageQueued?: boolean;
};

type TauriRealOAuthStopCleanupProbe = {
  activeProjectRoomCleared?: boolean;
  allExpectedWindowsHidden?: boolean;
  barWindowHidden?: boolean;
  enabled: boolean;
  error?: string;
  syncLoopsStopped?: boolean;
};

type TauriRealOAuthSessionRestoreProbe = {
  backendMeOk?: boolean;
  enabled: boolean;
  error?: string;
  browserSessionCleared?: boolean;
  restoredLocalSession?: boolean;
  restoredRealOAuthSession?: boolean;
  restoredTauriClient?: boolean;
  restoredTokenLive?: boolean;
};

type TauriRealOAuthStabilityProbe = {
  allAutoSyncLoopsRunning?: boolean;
  allExpectedWindowsVisible?: boolean;
  allWindowRoomContextMatchesActive?: boolean;
  allWindowRoomContextMatchesServer?: boolean;
  backendWidgetSummaryOk?: boolean;
  barRestoreItemsMatchActiveRoom?: boolean;
  dwellMs?: number;
  enabled: boolean;
  error?: string;
  managedFolderStatusNotFailed?: boolean;
};

export type TauriWidgetWindowQaState = Pick<WidgetWindowState, "mode" | "selectedRoomId" | "windowVisible"> & {
  bubbleType: WidgetWindowBubbleType;
  selectedRoomMatchesActiveRoom: boolean;
  selectedRoomMatchesServerContext: boolean;
};

type TauriWidgetRuntimeQaSnapshot = {
  allExpectedWindowsVisible: boolean;
  allWindowRoomContextMatchesActive: boolean;
  allWindowRoomContextMatchesServer: boolean;
  barRestoreItems: {
    count: number;
    allMatchActiveRoom: boolean;
    selectedRoomIds: Array<string | null>;
    windowIds: string[];
  };
  barWindow: TauriWidgetWindowQaState | null;
  missingVisibleBubbles: WidgetBubbleType[];
  windows: Record<WidgetBubbleType, TauriWidgetWindowQaState | null>;
};

export type TauriAuthWidgetQaSnapshot = {
  activeProjectRoom: {
    hasSelectedRoom: boolean;
    memoryRoomId: string | null;
    serverSelectedRoomId: string | null;
    tauriRoomId: string | null;
    tauriSavedAt?: string;
    tauriMatchesMemory: boolean;
    tauriMatchesServerContext: boolean;
  };
  backend: {
    me: QaProbe;
    widgetContext: QaProbe;
    widgetSummary: QaProbe & {
      bubbleCount?: number;
      enabledBubbleTypes?: string[];
      selectedRoomId?: string | null;
    };
  };
  collectedAt: string;
  expectedBubbleTypes: readonly WidgetBubbleType[];
  localSession: AuthSessionDiagnostics;
  localSyncProbe: TauriRealOAuthLocalSyncProbe;
  launchTimeline: TauriAuthenticatedSurfaceLaunchTimeline;
  sessionRestoreProbe: TauriRealOAuthSessionRestoreProbe;
  stabilityProbe: TauriRealOAuthStabilityProbe;
  stopCleanupProbe: TauriRealOAuthStopCleanupProbe;
  syncRuntime: {
    activityAutoCaptureRunning: boolean;
    allAutoSyncLoopsRunning: boolean;
    managedFolderAutoSyncRunning: boolean;
    managedFolderStatus: ManagedFolderAutoSyncStatus;
    widgetUsageAutoSyncRunning: boolean;
  };
  tauriMirrorSession: AuthSessionDiagnostics;
  widgetRuntime: TauriWidgetRuntimeQaSnapshot;
};

export type TauriRealGoogleAuthWidgetQaAssertion = {
  failedChecks: string[];
  ok: boolean;
  snapshot: TauriAuthWidgetQaSnapshot;
};

type ReadTauriAuthWidgetQaSnapshotOptions = {
  ensureAuthenticatedSurfaces?: boolean;
  runStopCleanupProbe?: boolean;
};

function toProbe(error: unknown): QaProbe {
  if (error instanceof ApiClientError) {
    return { code: error.code, ok: false, status: error.status };
  }

  return { ok: false };
}

function shouldRetryBackendProbe(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }

  return true;
}

async function probeBackend<T>(read: () => Promise<T>, attempts = 3): Promise<{ data?: T; probe: QaProbe }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return { data: await read(), probe: { ok: true } };
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1 || !shouldRetryBackendProbe(error)) {
        break;
      }
      await waitForMs(500 * (attempt + 1));
    }
  }

  return { probe: toProbe(lastError) };
}

function roomMatches(actual: string | null | undefined, expected: string | null) {
  if (!expected) {
    return !actual;
  }

  return actual === expected;
}

function toWindowQaState(
  state: WidgetWindowState,
  activeRoomId: string | null,
  serverSelectedRoomId: string | null,
): TauriWidgetWindowQaState {
  return {
    bubbleType: state.activeBubble,
    mode: state.mode,
    selectedRoomId: state.selectedRoomId ?? null,
    selectedRoomMatchesActiveRoom: roomMatches(state.selectedRoomId, activeRoomId),
    selectedRoomMatchesServerContext: roomMatches(state.selectedRoomId, serverSelectedRoomId),
    windowVisible: state.windowVisible,
  };
}

function addCheck(failedChecks: string[], condition: unknown, name: string) {
  if (!condition) {
    failedChecks.push(name);
  }
}

function timestampMs(value?: string) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampOrder(left?: string, right?: string) {
  const leftMs = timestampMs(left);
  const rightMs = timestampMs(right);
  return leftMs !== null && rightMs !== null && leftMs <= rightMs;
}

function shouldRunRealOAuthLocalSyncProbe() {
  return process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA === "true";
}

function resolveRealOAuthLocalSyncFolderPath() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_FOLDER;
  return value?.trim() || null;
}

function resolveRealOAuthLocalSyncMutateUrl() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_MUTATE_URL;
  return value?.trim() || null;
}

function resolveRealOAuthLocalSyncDeleteUrl() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_DELETE_URL;
  return value?.trim() || null;
}

function resolveRealOAuthLocalSyncWatchCreateUrl() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_CREATE_URL;
  return value?.trim() || null;
}

function resolveRealOAuthLocalSyncWatchDeleteUrl() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_DELETE_URL;
  return value?.trim() || null;
}

function resolveRealOAuthLocalSyncWatchMutateUrl() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_MUTATE_URL;
  return value?.trim() || null;
}

function resolveRealOAuthLocalSyncPrepareUrl() {
  const value = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_PREPARE_URL;
  return value?.trim() || null;
}

function shouldRunRealOAuthStopCleanupProbe() {
  return process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA === "true";
}

function shouldRunRealOAuthSessionRestoreProbe() {
  return process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA === "true";
}

function resolveRealOAuthStabilityDwellMs() {
  const raw = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(Math.max(parsed, 1_000), 60_000);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function waitForMs(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function enableRealOAuthQaPrivacyConsents() {
  const original = await settingsApi.getPrivacyConsents();
  if (!realOAuthQaOriginalPrivacyConsents) {
    realOAuthQaOriginalPrivacyConsents = {
      activityDetectionEnabled: original.activityDetectionEnabled,
      localFolderEnabled: original.localFolderEnabled,
    };
  }

  if (original.activityDetectionEnabled && original.localFolderEnabled) {
    notifyActivityConsentChanged(original.activityDetectionEnabled);
    notifyManagedFolderConsentChanged(original.localFolderEnabled);
    return original;
  }

  const enabled = await settingsApi.updatePrivacyConsents({
    activityDetectionEnabled: true,
    localFolderEnabled: true,
  });
  realOAuthQaPrivacyConsentsChanged = true;
  notifyActivityConsentChanged(enabled.activityDetectionEnabled);
  notifyManagedFolderConsentChanged(enabled.localFolderEnabled);
  return enabled;
}

async function restoreRealOAuthQaPrivacyConsents() {
  if (!realOAuthQaPrivacyConsentsChanged || !realOAuthQaOriginalPrivacyConsents) {
    return;
  }

  const restored = await settingsApi.updatePrivacyConsents(realOAuthQaOriginalPrivacyConsents);
  notifyActivityConsentChanged(restored.activityDetectionEnabled);
  notifyManagedFolderConsentChanged(restored.localFolderEnabled);
  realOAuthQaOriginalPrivacyConsents = null;
  realOAuthQaPrivacyConsentsChanged = false;
}

async function stageQaLocalFileEventsUntil(
  localFolderId: string,
  isReady: (stage: LocalFileEventsSyncStageResult) => boolean,
) {
  let latestStage = await tauriCommands.stageLocalFileEventsForSync({
    limit: 20,
    localFolderId,
  });
  if (isReady(latestStage)) {
    return latestStage;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await waitForMs(250);
    latestStage = await tauriCommands.stageLocalFileEventsForSync({
      limit: 20,
      localFolderId,
    });
    if (isReady(latestStage)) {
      return latestStage;
    }
  }

  return latestStage;
}

async function fetchQaFixtureJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status}`);
  }
  return (await response.json().catch(() => ({}))) as T;
}

async function cleanupStaleRealOAuthQaManagedFolders(currentFixturePath: string) {
  const folders = await tauriCommands.listManagedFolders().catch(() => null);
  if (!folders) {
    return 0;
  }

  const currentPath = currentFixturePath.toLowerCase();
  const staleQaFolders = folders.folders.filter((folder) => {
    const folderPath = folder.path.toLowerCase();
    return folderPath.includes(REAL_OAUTH_LOCAL_SYNC_FOLDER_MARKER) && folderPath !== currentPath && folder.status !== "REMOVED";
  });
  const removed = await Promise.allSettled(
    staleQaFolders.map((folder) => tauriCommands.removeManagedFolder({ localFolderId: folder.localFolderId })),
  );

  return removed.filter((result) => result.status === "fulfilled").length;
}

async function verifySyncedPersonalResourceIsolation(resourceId: string | undefined, selectedRoomId: string | null) {
  if (!resourceId) {
    return {
      initialSyncedResourceNotInSelectedRoomResources: false,
      initialSyncedResourcePersonal: false,
      initialSyncedResourceResolved: false,
      initialSyncedResourceRoomIdAbsent: false,
      initialSyncedResourceRoomListChecked: false,
      initialSyncedResourceRoomListShapeOk: false,
    };
  }

  const resource = await resourcesApi.get(resourceId);
  const roomItems = [];
  let roomListShapeOk = false;
  if (selectedRoomId) {
    for (let page = 0; page < 5; page += 1) {
      const roomResources = await resourcesApi.listRoomResourcesPage(selectedRoomId, page, 100);
      if (!Array.isArray(roomResources.items)) {
        roomListShapeOk = false;
        break;
      }
      roomListShapeOk = true;
      roomItems.push(...roomResources.items);
      if (!roomResources.hasNext) {
        break;
      }
    }
  }

  return {
    initialSyncedResourceNotInSelectedRoomResources:
      roomListShapeOk && !roomItems.some((item) => item.id === resourceId),
    initialSyncedResourcePersonal: resource.visibility === "PERSONAL",
    initialSyncedResourceResolved: resource.id === resourceId,
    initialSyncedResourceRoomIdAbsent: resource.roomId === null || resource.roomId === undefined,
    initialSyncedResourceRoomListChecked: Boolean(selectedRoomId),
    initialSyncedResourceRoomListShapeOk: roomListShapeOk,
  };
}

async function runRealOAuthLocalFileProbe(
  consentGranted: boolean,
  selectedRoomId: string | null,
): Promise<NonNullable<TauriRealOAuthLocalSyncProbe["localFiles"]>> {
  const fixturePath = resolveRealOAuthLocalSyncFolderPath();
  if (!fixturePath) {
    return { enabled: false };
  }

  if (!consentGranted) {
    return { enabled: true, error: "local_folder_consent_disabled", fixturePath };
  }

  let localFolderId: string | undefined;

  try {
    const prepareUrl = resolveRealOAuthLocalSyncPrepareUrl();
    let fixtureFileName = "real-oauth-local-sync-note.txt";
    let prepareRequested = false;
    if (prepareUrl) {
      const response = await fetch(prepareUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error(`fixture prepare failed: ${response.status}`);
      }
      const prepared = (await response.json().catch(() => null)) as { fileName?: unknown } | null;
      if (typeof prepared?.fileName === "string" && prepared.fileName.trim()) {
        fixtureFileName = prepared.fileName.trim();
      }
      prepareRequested = true;
    }

    const staleQaFolderRemovedCount = await cleanupStaleRealOAuthQaManagedFolders(fixturePath);
    const folder = await tauriCommands.selectManagedFolder({ path: fixturePath });
    localFolderId = folder.localFolderId;
    await tauriCommands.setFolderSync({ enabled: true, localFolderId: folder.localFolderId });
    const scan = await tauriCommands.scanManagedFolder({ localFolderId: folder.localFolderId });
    const initialSearch = await tauriCommands.searchLocalFiles({
      limit: 10,
      query: REAL_OAUTH_LOCAL_SYNC_INITIAL_SEARCH_QUERY,
    });
    const noteFile = initialSearch.items.find((item) => item.name === fixtureFileName) ?? initialSearch.items[0];
    if (!noteFile?.localFileId) {
      return {
        enabled: true,
        error: "fixture_file_not_indexed",
        fixtureFileName,
        fixturePath,
        localFolderId: folder.localFolderId,
        prepareRequested,
        scanFileCount: scan.changedCount,
      };
    }

    const initialPreview = await tauriCommands.readLocalFilePreview({
      localFileId: noteFile.localFileId,
      maxChars: 1_000,
    });
    const createdEvents = await stageQaLocalFileEventsUntil(folder.localFolderId, (stage) =>
      stage.events.some((event) => event.fileName === fixtureFileName && event.eventType === "CREATED"),
    );
    const qaCreatedEvents = createdEvents.events.filter(
      (event) => event.fileName === fixtureFileName && event.eventType === "CREATED",
    );
    const initialSync = await syncPersonalLocalFileEventsToServer({
      consentGranted,
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const initialSyncedResourceIsolation =
      initialSync.status === "ready"
        ? await verifySyncedPersonalResourceIsolation(initialSync.data.syncedResourceIds[0], selectedRoomId)
        : await verifySyncedPersonalResourceIsolation(undefined, selectedRoomId);

    const mutateUrl = resolveRealOAuthLocalSyncMutateUrl();
    let mutationRequested = false;
    let updatedSearchQuery = REAL_OAUTH_LOCAL_SYNC_UPDATED_SEARCH_QUERY;
    if (mutateUrl) {
      const response = await fetch(mutateUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error(`fixture mutation failed: ${response.status}`);
      }
      const mutation = (await response.json().catch(() => null)) as { marker?: unknown } | null;
      if (typeof mutation?.marker === "string" && mutation.marker.trim()) {
        updatedSearchQuery = mutation.marker.trim();
      }
      mutationRequested = true;
    }

    const reindex = await tauriCommands.reindexFile({ localFileId: noteFile.localFileId });
    const updatedPreview = await readLocalFilePreviewUntilMarker(noteFile.localFileId, REAL_OAUTH_LOCAL_SYNC_UPDATED_MARKER);
    const updatedSearch = await searchLocalFilesUntilMatch(noteFile.localFileId, updatedSearchQuery);
    const updatedEvents = await stageQaLocalFileEventsUntil(folder.localFolderId, (stage) =>
      stage.events.some((event) => event.localFileId === noteFile.localFileId && event.eventType === "UPDATED"),
    );
    const qaUpdatedEvents = updatedEvents.events.filter(
      (event) => event.localFileId === noteFile.localFileId && event.eventType === "UPDATED",
    );
    const updateSync = await syncPersonalLocalFileEventsToServer({
      consentGranted,
      limit: 20,
      localFolderId: folder.localFolderId,
    });

    const deleteUrl = resolveRealOAuthLocalSyncDeleteUrl();
    let deleteRequested = false;
    if (deleteUrl) {
      const response = await fetch(deleteUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error(`fixture delete failed: ${response.status}`);
      }
      deleteRequested = true;
    }

    await tauriCommands.scanManagedFolder({ localFolderId: folder.localFolderId });
    const deletedEvents = await stageQaLocalFileEventsUntil(folder.localFolderId, (stage) =>
      stage.events.some((event) => event.localFileId === noteFile.localFileId && event.eventType === "DELETED"),
    );
    const qaDeletedEvents = deletedEvents.events.filter(
      (event) => event.localFileId === noteFile.localFileId && event.eventType === "DELETED",
    );
    const deleteSync = await syncPersonalLocalFileEventsToServer({
      consentGranted,
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const deletedSearch = await searchLocalFilesUntilMissing(noteFile.localFileId, updatedSearchQuery);

    let nativeWatchCreateSync = null as Awaited<ReturnType<typeof syncPersonalLocalFileEventsToServer>> | null;
    let nativeWatchDeleteRequested = false;
    let nativeWatchDeleteSync = null as Awaited<ReturnType<typeof syncPersonalLocalFileEventsToServer>> | null;
    let nativeWatchFileName: string | undefined;
    let nativeWatchInitialSearch = null as Awaited<ReturnType<typeof tauriCommands.searchLocalFiles>> | null;
    let nativeWatchLocalFileId: string | null = null;
    let nativeWatchMutationRequested = false;
    let nativeWatchStarted = false;
    let nativeWatchUpdatedSearch = null as Awaited<ReturnType<typeof tauriCommands.searchLocalFiles>> | null;
    let nativeWatchUpdateSync = null as Awaited<ReturnType<typeof syncPersonalLocalFileEventsToServer>> | null;
    let watchedCreatedEvents: LocalFileEventsSyncStageResult | null = null;
    let watchedDeletedEvents: LocalFileEventsSyncStageResult | null = null;
    let watchedUpdatedEvents: LocalFileEventsSyncStageResult | null = null;

    const watchCreateUrl = resolveRealOAuthLocalSyncWatchCreateUrl();
    const watchDeleteUrl = resolveRealOAuthLocalSyncWatchDeleteUrl();
    const watchMutateUrl = resolveRealOAuthLocalSyncWatchMutateUrl();
    if (watchCreateUrl && watchDeleteUrl && watchMutateUrl) {
      const watch = await tauriCommands.watchManagedFolder({ localFolderId: folder.localFolderId });
      nativeWatchStarted = watch.watching;

      const watchedCreated = await fetchQaFixtureJson<{ fileName?: unknown; marker?: unknown }>(
        watchCreateUrl,
        "fixture native watch create",
      );
      if (typeof watchedCreated.fileName !== "string" || !watchedCreated.fileName.trim()) {
        throw new Error("fixture native watch create did not return fileName");
      }
      nativeWatchFileName = watchedCreated.fileName.trim();
      const nativeWatchInitialQuery =
        typeof watchedCreated.marker === "string" && watchedCreated.marker.trim()
          ? watchedCreated.marker.trim()
          : REAL_OAUTH_LOCAL_SYNC_WATCH_INITIAL_QUERY;
      watchedCreatedEvents = await stageQaLocalFileEventsUntil(folder.localFolderId, (stage) =>
        stage.events.some((event) => event.fileName === nativeWatchFileName && event.eventType === "CREATED"),
      );
      nativeWatchLocalFileId =
        watchedCreatedEvents.events.find(
          (event) => event.fileName === nativeWatchFileName && event.eventType === "CREATED",
        )?.localFileId ?? null;
      if (!nativeWatchLocalFileId) {
        throw new Error("fixture native watch create did not stage localFileId");
      }
      nativeWatchInitialSearch = await searchLocalFilesUntilMatch(nativeWatchLocalFileId, nativeWatchInitialQuery);
      nativeWatchCreateSync = await syncPersonalLocalFileEventsToServer({
        consentGranted,
        limit: 20,
        localFolderId: folder.localFolderId,
      });

      const watchedMutation = await fetchQaFixtureJson<{ fileName?: unknown; marker?: unknown }>(
        watchMutateUrl,
        "fixture native watch mutation",
      );
      const nativeWatchUpdatedQuery =
        typeof watchedMutation.marker === "string" && watchedMutation.marker.trim()
          ? watchedMutation.marker.trim()
          : REAL_OAUTH_LOCAL_SYNC_WATCH_INITIAL_QUERY;
      nativeWatchMutationRequested = true;
      watchedUpdatedEvents = await stageQaLocalFileEventsUntil(folder.localFolderId, (stage) =>
        stage.events.some((event) => event.localFileId === nativeWatchLocalFileId && event.eventType === "UPDATED"),
      );
      nativeWatchUpdatedSearch = await searchLocalFilesUntilMatch(nativeWatchLocalFileId, nativeWatchUpdatedQuery);
      nativeWatchUpdateSync = await syncPersonalLocalFileEventsToServer({
        consentGranted,
        limit: 20,
        localFolderId: folder.localFolderId,
      });

      await fetchQaFixtureJson<{ fileName?: unknown; notePath?: unknown }>(
        watchDeleteUrl,
        "fixture native watch delete",
      );
      nativeWatchDeleteRequested = true;
      watchedDeletedEvents = await stageQaLocalFileEventsUntil(folder.localFolderId, (stage) =>
        stage.events.some((event) => event.localFileId === nativeWatchLocalFileId && event.eventType === "DELETED"),
      );
      nativeWatchDeleteSync = await syncPersonalLocalFileEventsToServer({
        consentGranted,
        limit: 20,
        localFolderId: folder.localFolderId,
      });
    }

    const remainingEvents = await tauriCommands.stageLocalFileEventsForSync({
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const remainingQaEvents = remainingEvents.events.filter(
      (event) => event.fileName === fixtureFileName || event.fileName === nativeWatchFileName,
    );

    return {
      enabled: true,
      fixtureFileName,
      fixturePath,
      initialPreviewIncludesMarker: Boolean(initialPreview.previewText?.includes("RealOAuthLocalSyncInitial")),
      initialPreviewReady: initialPreview.status === "READY",
      initialSearchMatched: initialSearch.items.some((item) => item.localFileId === noteFile.localFileId),
      initialSyncAnalysisFailedCount: initialSync.status === "ready" ? initialSync.data.analysisFailedCount : undefined,
      initialSyncAnalysisRequestedCount: initialSync.status === "ready" ? initialSync.data.analysisRequestedCount : undefined,
      initialSyncFailedCount: initialSync.status === "ready" ? initialSync.data.failedCount : undefined,
      initialSyncSentCount: initialSync.status === "ready" ? initialSync.data.sentCount : undefined,
      initialSyncSyncedCount: initialSync.status === "ready" ? initialSync.data.syncedCount : undefined,
      ...initialSyncedResourceIsolation,
      localFolderId: folder.localFolderId,
      deleteRequested,
      deletedSearchCleared: !deletedSearch.items.some((item) => item.localFileId === noteFile.localFileId),
      deleteSyncFailedCount: deleteSync.status === "ready" ? deleteSync.data.failedCount : undefined,
      deleteSyncSentCount: deleteSync.status === "ready" ? deleteSync.data.sentCount : undefined,
      deleteSyncSyncedCount: deleteSync.status === "ready" ? deleteSync.data.syncedCount : undefined,
      nativeWatchCreateSyncFailedCount: nativeWatchCreateSync?.status === "ready" ? nativeWatchCreateSync.data.failedCount : undefined,
      nativeWatchCreateSyncSentCount: nativeWatchCreateSync?.status === "ready" ? nativeWatchCreateSync.data.sentCount : undefined,
      nativeWatchCreateSyncSyncedCount: nativeWatchCreateSync?.status === "ready" ? nativeWatchCreateSync.data.syncedCount : undefined,
      nativeWatchDeleteRequested,
      nativeWatchDeleteSyncFailedCount: nativeWatchDeleteSync?.status === "ready" ? nativeWatchDeleteSync.data.failedCount : undefined,
      nativeWatchDeleteSyncSentCount: nativeWatchDeleteSync?.status === "ready" ? nativeWatchDeleteSync.data.sentCount : undefined,
      nativeWatchDeleteSyncSyncedCount: nativeWatchDeleteSync?.status === "ready" ? nativeWatchDeleteSync.data.syncedCount : undefined,
      nativeWatchFileName,
      nativeWatchInitialSearchMatched: nativeWatchInitialSearch?.items.some(
        (item) => item.localFileId === nativeWatchLocalFileId,
      ),
      nativeWatchMutationRequested,
      nativeWatchStarted,
      nativeWatchUpdateSyncFailedCount:
        nativeWatchUpdateSync?.status === "ready" ? nativeWatchUpdateSync.data.failedCount : undefined,
      nativeWatchUpdateSyncSentCount:
        nativeWatchUpdateSync?.status === "ready" ? nativeWatchUpdateSync.data.sentCount : undefined,
      nativeWatchUpdateSyncSyncedCount:
        nativeWatchUpdateSync?.status === "ready" ? nativeWatchUpdateSync.data.syncedCount : undefined,
      nativeWatchUpdatedSearchMatched: nativeWatchUpdatedSearch?.items.some(
        (item) => item.localFileId === nativeWatchLocalFileId,
      ),
      mutationRequested,
      prepareRequested,
      reindexChanged: reindex.changed,
      reindexStatus: reindex.status,
      remainingQaEvents: remainingQaEvents.length,
      scanFileCount: scan.changedCount,
      staleQaFolderRemovedCount,
      stagedCreatedCount: qaCreatedEvents.length,
      stagedCreatedEventTypes: createdEvents.events.map((event) => event.eventType),
      stagedCreatedFileNames: createdEvents.events.map((event) => event.fileName),
      stagedDeletedCount: qaDeletedEvents.length,
      stagedDeletedEventTypes: deletedEvents.events.map((event) => event.eventType),
      stagedDeletedFileNames: deletedEvents.events.map((event) => event.fileName),
      stagedNativeWatchCreatedCount:
        watchedCreatedEvents?.events.filter(
          (event) => event.fileName === nativeWatchFileName && event.eventType === "CREATED",
        ).length,
      stagedNativeWatchDeletedCount:
        watchedDeletedEvents?.events.filter(
          (event) => event.localFileId === nativeWatchLocalFileId && event.eventType === "DELETED",
        ).length,
      stagedNativeWatchEventTypes: [
        ...(watchedCreatedEvents?.events.map((event) => event.eventType) ?? []),
        ...(watchedUpdatedEvents?.events.map((event) => event.eventType) ?? []),
        ...(watchedDeletedEvents?.events.map((event) => event.eventType) ?? []),
      ],
      stagedNativeWatchFileNames: [
        ...(watchedCreatedEvents?.events.map((event) => event.fileName) ?? []),
        ...(watchedUpdatedEvents?.events.map((event) => event.fileName) ?? []),
        ...(watchedDeletedEvents?.events.map((event) => event.fileName) ?? []),
      ],
      stagedNativeWatchUpdatedCount:
        watchedUpdatedEvents?.events.filter(
          (event) => event.localFileId === nativeWatchLocalFileId && event.eventType === "UPDATED",
        ).length,
      stagedUpdatedCount: qaUpdatedEvents.length,
      stagedUpdatedEventTypes: updatedEvents.events.map((event) => event.eventType),
      stagedUpdatedFileNames: updatedEvents.events.map((event) => event.fileName),
      updatedPreviewIncludesMarker: Boolean(updatedPreview.previewText?.includes(REAL_OAUTH_LOCAL_SYNC_UPDATED_MARKER)),
      updatedPreviewReady: updatedPreview.status === "READY",
      updatedSearchMatched: updatedSearch.items.some((item) => item.localFileId === noteFile.localFileId),
      updateSyncAnalysisFailedCount: updateSync.status === "ready" ? updateSync.data.analysisFailedCount : undefined,
      updateSyncAnalysisRequestedCount: updateSync.status === "ready" ? updateSync.data.analysisRequestedCount : undefined,
      updateSyncFailedCount: updateSync.status === "ready" ? updateSync.data.failedCount : undefined,
      updateSyncSentCount: updateSync.status === "ready" ? updateSync.data.sentCount : undefined,
      updateSyncSyncedCount: updateSync.status === "ready" ? updateSync.data.syncedCount : undefined,
    };
  } catch (error) {
    return {
      enabled: true,
      error: errorMessage(error),
      fixturePath,
      localFolderId,
    };
  } finally {
    if (localFolderId) {
      await tauriCommands.removeManagedFolder({ localFolderId }).catch(() => undefined);
    }
  }
}

async function searchLocalFilesUntilMatch(localFileId: string, query: string, timeoutMs = 12_000) {
  const startedAt = Date.now();
  let latest = await tauriCommands.searchLocalFiles({ limit: 10, query });

  while (!latest.items.some((item) => item.localFileId === localFileId) && Date.now() - startedAt < timeoutMs) {
    await waitForMs(250);
    latest = await tauriCommands.searchLocalFiles({ limit: 10, query });
  }

  return latest;
}

async function searchLocalFilesUntilMissing(localFileId: string, query: string, timeoutMs = 12_000) {
  const startedAt = Date.now();
  let latest = await tauriCommands.searchLocalFiles({ limit: 10, query });

  while (latest.items.some((item) => item.localFileId === localFileId) && Date.now() - startedAt < timeoutMs) {
    await waitForMs(250);
    latest = await tauriCommands.searchLocalFiles({ limit: 10, query });
  }

  return latest;
}

async function readLocalFilePreviewUntilMarker(localFileId: string, marker: string, timeoutMs = 12_000) {
  const startedAt = Date.now();
  let latest = await tauriCommands.readLocalFilePreview({ localFileId, maxChars: 1_000 });

  while (!latest.previewText?.includes(marker) && Date.now() - startedAt < timeoutMs) {
    await waitForMs(250);
    latest = await tauriCommands.readLocalFilePreview({ localFileId, maxChars: 1_000 });
  }

  return latest;
}

async function runRealOAuthLocalSyncProbe(roomId: string | null): Promise<TauriRealOAuthLocalSyncProbe> {
  if (!shouldRunRealOAuthLocalSyncProbe()) {
    return { enabled: false };
  }

  if (!isTauriRuntime()) {
    return { enabled: true, error: "not_tauri_runtime" };
  }

  try {
    const privacyConsents = await enableRealOAuthQaPrivacyConsents();
    const sqlite = await tauriCommands.checkLocalSqliteIntegrity();
    const localFiles = await runRealOAuthLocalFileProbe(privacyConsents.localFolderEnabled, roomId);
    const occurredAt = new Date();
    const nativeActivity = privacyConsents.activityDetectionEnabled
      ? await tauriCommands
          .setActivityContextConsent({ enabled: true })
          .then(() => tauriCommands.readActivityContext())
      : null;
    const activityDurationSeconds = Math.max(nativeActivity?.durationSeconds ?? 30, 1);
    const activityEndedAt = nativeActivity?.capturedAt ?? occurredAt.toISOString();
    const activityStartedAt = new Date(
      new Date(activityEndedAt).getTime() - activityDurationSeconds * 1_000,
    ).toISOString();
    const activity =
      privacyConsents.activityDetectionEnabled && nativeActivity
        ? await tauriCommands.recordActivityContext({
            appName: nativeActivity.appName,
            capturedAt: nativeActivity.capturedAt,
            durationSeconds: activityDurationSeconds,
            endedAt: activityEndedAt,
            roomId,
            startedAt: activityStartedAt,
            windowTitle: nativeActivity.windowTitle,
          })
        : null;
    await tauriCommands.recordWidgetUsageEvent({
      bubbleType: "todo",
      eventType: "real-oauth-qa:local-sync",
      itemId: `real-oauth-qa-${occurredAt.getTime()}`,
      itemType: "TASK",
      occurredAt: occurredAt.toISOString(),
    });
    const outbox = await syncAllLocalOutboxToServer({
      limit: 50,
      localFolderId: localFiles.localFolderId,
    });

    return {
      enabled: true,
      activity: {
        consentGranted: privacyConsents.activityDetectionEnabled,
        localActivityId: activity?.localActivityId,
        nativeAppName: nativeActivity?.appName,
        nativeCaptured: Boolean(nativeActivity?.appName),
        nativeDurationSeconds: nativeActivity?.durationSeconds,
        nativeWindowTitleCaptured: Boolean(nativeActivity?.windowTitle),
        queued: Boolean(activity?.localActivityId),
        syncStatus: activity?.syncStatus,
      },
      localFiles,
      outbox:
        outbox.status === "ready"
          ? {
              activityFailedCount: outbox.data.activityFailedCount,
              activitySentCount: outbox.data.activitySentCount,
              activityStagedCount: outbox.data.activityStagedCount,
              failedCount: outbox.data.failedCount,
              failedCountScope: "current-sync-attempt",
              fileFailedCount: outbox.data.fileFailedCount,
              fileScopeLocalFolderId: localFiles.localFolderId,
              fileSentCount: outbox.data.fileSentCount,
              fileSyncedCount: outbox.data.fileSyncedCount,
              pendingCount: outbox.data.pendingCount,
              pendingCountScope: "global-sqlite-backlog",
              sentCount: outbox.data.sentCount,
              status: outbox.status,
              syncedAt: outbox.data.syncedAt,
              widgetFailedCount: outbox.data.widgetFailedCount,
              widgetSentCount: outbox.data.widgetSentCount,
            }
          : {
              status: outbox.status,
            },
      sqlite: {
        ok: sqlite.ok,
      },
      widgetUsageQueued: true,
    };
  } catch (error) {
    return {
      enabled: true,
      error: errorMessage(error),
    };
  }
}

async function runRealOAuthStopCleanupProbe(): Promise<TauriRealOAuthStopCleanupProbe> {
  if (!shouldRunRealOAuthStopCleanupProbe()) {
    return { enabled: false };
  }

  if (!isTauriRuntime()) {
    return { enabled: true, error: "not_tauri_runtime" };
  }

  try {
    await stopTauriAuthenticatedSurfaces();
    await waitForRealOAuthAutoSyncLoopsStopped();

    const activeProjectRoom = await tauriCommands.readActiveProjectRoom().catch(() => null);
    const barWindow = await readWindowState("bar", null, null);
    const windowEntries = await Promise.all(
      WIDGET_BUBBLE_TYPES.map(async (bubbleType) => [
        bubbleType,
        await readWindowState(bubbleType, null, null),
      ] as const),
    );
    const windows = Object.fromEntries(windowEntries) as Record<WidgetBubbleType, TauriWidgetWindowQaState | null>;

    return {
      activeProjectRoomCleared: activeProjectRoom === null,
      allExpectedWindowsHidden: WIDGET_BUBBLE_TYPES.every((bubbleType) => !windows[bubbleType]?.windowVisible),
      barWindowHidden: !barWindow?.windowVisible,
      enabled: true,
      syncLoopsStopped:
        !isActivityAutoCaptureRunning() &&
        !isManagedFolderAutoSyncRunning() &&
        !isWidgetUsageAutoSyncRunning(),
    };
  } catch (error) {
    return {
      enabled: true,
      error: errorMessage(error),
    };
  }
}

async function runRealOAuthSessionRestoreProbe(): Promise<TauriRealOAuthSessionRestoreProbe> {
  if (!shouldRunRealOAuthSessionRestoreProbe()) {
    return { enabled: false };
  }

  if (!isTauriRuntime()) {
    return { enabled: true, error: "not_tauri_storage_runtime" };
  }

  try {
    const restoreProbe = await probeStoredAuthSessionRestoreFromTauriMirrorForQa();
    const backendMe = await probeBackend(() => authApi.getMe());

    return {
      backendMeOk: backendMe.probe.ok,
      enabled: true,
      ...restoreProbe,
    };
  } catch (error) {
    return {
      enabled: true,
      error: errorMessage(error),
    };
  }
}

async function runRealOAuthStabilityProbe(
  selectedRoomId: string | null,
  serverSelectedRoomId: string | null,
): Promise<TauriRealOAuthStabilityProbe> {
  const dwellMs = resolveRealOAuthStabilityDwellMs();
  if (dwellMs <= 0) {
    return { enabled: false };
  }

  if (!isTauriRuntime()) {
    return { dwellMs, enabled: true, error: "not_tauri_runtime" };
  }

  try {
    await waitForMs(dwellMs);
    const widgetRuntime = await readWidgetRuntimeState(selectedRoomId, serverSelectedRoomId);
    const backendSummary = await probeBackend(() => widgetApi.getSummary(selectedRoomId));
    const allAutoSyncLoopsRunning = realOAuthAutoSyncLoopsRunning();

    return {
      allAutoSyncLoopsRunning,
      allExpectedWindowsVisible: widgetRuntime.allExpectedWindowsVisible,
      allWindowRoomContextMatchesActive: widgetRuntime.allWindowRoomContextMatchesActive,
      allWindowRoomContextMatchesServer: widgetRuntime.allWindowRoomContextMatchesServer,
      backendWidgetSummaryOk: backendSummary.probe.ok,
      barRestoreItemsMatchActiveRoom: widgetRuntime.barRestoreItems.allMatchActiveRoom,
      dwellMs,
      enabled: true,
      managedFolderStatusNotFailed: getManagedFolderAutoSyncStatus().lastStatus !== "failed",
    };
  } catch (error) {
    return {
      dwellMs,
      enabled: true,
      error: errorMessage(error),
    };
  }
}

function assertRealGoogleSessionDiagnostics(
  failedChecks: string[],
  diagnostics: AuthSessionDiagnostics,
  prefix: "local" | "tauriMirror",
) {
  addCheck(failedChecks, diagnostics.hasSession, `${prefix}:hasSession`);
  addCheck(failedChecks, diagnostics.clientType === "TAURI", `${prefix}:clientType=TAURI`);
  addCheck(failedChecks, diagnostics.isTauriClient, `${prefix}:isTauriClient`);
  addCheck(failedChecks, diagnostics.isDevAccessTokenSession === false, `${prefix}:notDevAccessTokenSession`);
  addCheck(
    failedChecks,
    diagnostics.wouldRejectDevAccessTokenSession === false,
    `${prefix}:wouldNotRejectAsDevToken`,
  );
  addCheck(failedChecks, diagnostics.refreshTokenExpired === false, `${prefix}:refreshLive`);
}

export async function assertTauriRealGoogleAuthWidgetQa(): Promise<TauriRealGoogleAuthWidgetQaAssertion> {
  const snapshot = await readTauriAuthWidgetQaSnapshot({ runStopCleanupProbe: false });
  const failedChecks: string[] = [];

  assertRealGoogleSessionDiagnostics(failedChecks, snapshot.localSession, "local");
  assertRealGoogleSessionDiagnostics(failedChecks, snapshot.tauriMirrorSession, "tauriMirror");
  addCheck(failedChecks, snapshot.backend.me.ok, "backend:/api/me");
  addCheck(failedChecks, snapshot.launchTimeline.completed, "launchTimeline:completed");
  addCheck(failedChecks, !snapshot.launchTimeline.lastError, "launchTimeline:noError");
  addCheck(
    failedChecks,
    snapshot.launchTimeline.authGateAfterBackendAuth,
    "launchTimeline:authGateAfterBackendAuth",
  );
  addCheck(
    failedChecks,
    snapshot.launchTimeline.firstWidgetOpenAfterBackendAuth,
    "launchTimeline:firstWidgetOpenAfterBackendAuth",
  );
  addCheck(
    failedChecks,
    timestampOrder(snapshot.launchTimeline.sessionMirrorStoredAt, snapshot.launchTimeline.barWindowOpenedAt),
    "launchTimeline:mirrorStoredBeforeBar",
  );
  addCheck(
    failedChecks,
    timestampOrder(snapshot.launchTimeline.barWindowOpenedAt, snapshot.launchTimeline.bubbleWindowsOpenedAt),
    "launchTimeline:barBeforeBubbles",
  );
  addCheck(
    failedChecks,
    timestampOrder(snapshot.launchTimeline.bubbleWindowsOpenedAt, snapshot.launchTimeline.syncLoopsStartedAt),
    "launchTimeline:syncLoopsAfterWidgets",
  );
  addCheck(failedChecks, snapshot.backend.widgetContext.ok, "backend:/api/widget/context");
  addCheck(failedChecks, snapshot.backend.widgetSummary.ok, "backend:/api/widget/summary");
  addCheck(failedChecks, snapshot.activeProjectRoom.hasSelectedRoom, "room:hasSelectedProjectRoom");
  addCheck(failedChecks, snapshot.activeProjectRoom.tauriMatchesMemory, "room:tauriMatchesMemory");
  addCheck(
    failedChecks,
    snapshot.activeProjectRoom.tauriMatchesServerContext,
    "room:tauriMatchesServerContext",
  );
  addCheck(failedChecks, snapshot.widgetRuntime.allExpectedWindowsVisible, "widgets:allExpectedWindowsVisible");
  addCheck(
    failedChecks,
    snapshot.widgetRuntime.allWindowRoomContextMatchesActive,
    "widgets:allWindowRoomContextMatchesActive",
  );
  addCheck(
    failedChecks,
    snapshot.widgetRuntime.allWindowRoomContextMatchesServer,
    "widgets:allWindowRoomContextMatchesServer",
  );
  addCheck(
    failedChecks,
    snapshot.widgetRuntime.barRestoreItems.allMatchActiveRoom,
    "widgets:barRestoreItemsMatchActiveRoom",
  );
  addCheck(failedChecks, snapshot.syncRuntime.allAutoSyncLoopsRunning, "sync:allAutoSyncLoopsRunning");
  addCheck(
    failedChecks,
    snapshot.syncRuntime.managedFolderStatus.running === snapshot.syncRuntime.managedFolderAutoSyncRunning,
    "sync:managedFolderStatusMatchesRunningFlag",
  );
  addCheck(
    failedChecks,
    snapshot.syncRuntime.managedFolderStatus.lastStatus !== "failed",
    "sync:managedFolderStatusNotFailed",
  );
  addCheck(
    failedChecks,
    snapshot.syncRuntime.managedFolderStatus.lastFileAnalysisFailedCountScope === "global-auto-sync-drain" ||
      snapshot.syncRuntime.managedFolderStatus.lastFileAnalysisFailedCountScope === "folder-auto-sync-drain",
    "sync:managedFolderAnalysisScopeKnown",
  );
  if (snapshot.localSyncProbe.enabled) {
    addCheck(failedChecks, !snapshot.localSyncProbe.error, "localSyncProbe:noError");
    addCheck(failedChecks, snapshot.localSyncProbe.sqlite?.ok, "localSyncProbe:sqliteQuickCheck");
    if (snapshot.localSyncProbe.localFiles?.enabled) {
      const localFiles = snapshot.localSyncProbe.localFiles;
      addCheck(failedChecks, !localFiles.error, "localSyncProbe:localFileNoError");
      addCheck(failedChecks, Boolean(localFiles.localFolderId), "localSyncProbe:localFileFolderSelected");
      addCheck(failedChecks, (localFiles.scanFileCount ?? 0) >= 1, "localSyncProbe:localFileScan");
      addCheck(failedChecks, localFiles.initialSearchMatched, "localSyncProbe:localFileInitialSearch");
      addCheck(failedChecks, localFiles.initialPreviewReady, "localSyncProbe:localFileInitialPreviewReady");
      addCheck(failedChecks, localFiles.initialPreviewIncludesMarker, "localSyncProbe:localFileInitialPreviewMarker");
      addCheck(failedChecks, (localFiles.stagedCreatedCount ?? 0) >= 1, "localSyncProbe:localFileCreatedStaged");
      addCheck(failedChecks, (localFiles.initialSyncSentCount ?? 0) >= 1, "localSyncProbe:localFileCreatedSent");
      addCheck(failedChecks, (localFiles.initialSyncSyncedCount ?? 0) >= 1, "localSyncProbe:localFileCreatedSynced");
      addCheck(failedChecks, localFiles.initialSyncFailedCount === 0, "localSyncProbe:localFileCreatedNoFailures");
      addCheck(failedChecks, localFiles.initialSyncedResourceResolved, "localSyncProbe:localFileResourceResolved");
      addCheck(failedChecks, localFiles.initialSyncedResourcePersonal, "localSyncProbe:localFileResourcePersonal");
      addCheck(
        failedChecks,
        localFiles.initialSyncedResourceRoomIdAbsent,
        "localSyncProbe:localFileResourceNoRoomId",
      );
      addCheck(
        failedChecks,
        localFiles.initialSyncedResourceRoomListChecked,
        "localSyncProbe:localFileResourceRoomListChecked",
      );
      addCheck(
        failedChecks,
        localFiles.initialSyncedResourceRoomListShapeOk,
        "localSyncProbe:localFileResourceRoomListShape",
      );
      addCheck(
        failedChecks,
        localFiles.initialSyncedResourceNotInSelectedRoomResources,
        "localSyncProbe:localFileResourceNotInSelectedRoom",
      );
      addCheck(
        failedChecks,
        (localFiles.initialSyncAnalysisRequestedCount ?? 0) >= 1,
        "localSyncProbe:localFileCreatedAnalysisRequested",
      );
      addCheck(
        failedChecks,
        localFiles.initialSyncAnalysisFailedCount === 0,
        "localSyncProbe:localFileCreatedAnalysisNoFailures",
      );
      addCheck(failedChecks, localFiles.mutationRequested, "localSyncProbe:localFileMutationRequested");
      addCheck(failedChecks, localFiles.reindexStatus === "REINDEXED", "localSyncProbe:localFileReindexed");
      addCheck(failedChecks, localFiles.reindexChanged, "localSyncProbe:localFileReindexChanged");
      addCheck(failedChecks, localFiles.updatedSearchMatched, "localSyncProbe:localFileUpdatedSearch");
      addCheck(failedChecks, localFiles.updatedPreviewReady, "localSyncProbe:localFileUpdatedPreviewReady");
      addCheck(failedChecks, localFiles.updatedPreviewIncludesMarker, "localSyncProbe:localFileUpdatedPreviewMarker");
      addCheck(failedChecks, (localFiles.stagedUpdatedCount ?? 0) >= 1, "localSyncProbe:localFileUpdatedStaged");
      addCheck(failedChecks, (localFiles.updateSyncSentCount ?? 0) >= 1, "localSyncProbe:localFileUpdatedSent");
      addCheck(failedChecks, (localFiles.updateSyncSyncedCount ?? 0) >= 1, "localSyncProbe:localFileUpdatedSynced");
      addCheck(failedChecks, localFiles.updateSyncFailedCount === 0, "localSyncProbe:localFileUpdatedNoFailures");
      addCheck(
        failedChecks,
        (localFiles.updateSyncAnalysisRequestedCount ?? 0) >= 1,
        "localSyncProbe:localFileUpdatedAnalysisRequested",
      );
      addCheck(
        failedChecks,
        localFiles.updateSyncAnalysisFailedCount === 0,
        "localSyncProbe:localFileUpdatedAnalysisNoFailures",
      );
      addCheck(failedChecks, localFiles.deleteRequested, "localSyncProbe:localFileDeleteRequested");
      addCheck(failedChecks, (localFiles.stagedDeletedCount ?? 0) >= 1, "localSyncProbe:localFileDeletedStaged");
      addCheck(failedChecks, (localFiles.deleteSyncSentCount ?? 0) >= 1, "localSyncProbe:localFileDeletedSent");
      addCheck(failedChecks, (localFiles.deleteSyncSyncedCount ?? 0) >= 1, "localSyncProbe:localFileDeletedSynced");
      addCheck(failedChecks, localFiles.deleteSyncFailedCount === 0, "localSyncProbe:localFileDeletedNoFailures");
      addCheck(failedChecks, localFiles.deletedSearchCleared, "localSyncProbe:localFileDeletedSearchCleared");
      addCheck(failedChecks, localFiles.nativeWatchStarted, "localSyncProbe:nativeWatchStarted");
      addCheck(failedChecks, Boolean(localFiles.nativeWatchFileName), "localSyncProbe:nativeWatchFileCreated");
      addCheck(
        failedChecks,
        (localFiles.stagedNativeWatchCreatedCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchCreatedStaged",
      );
      addCheck(
        failedChecks,
        (localFiles.nativeWatchCreateSyncSentCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchCreatedSent",
      );
      addCheck(
        failedChecks,
        (localFiles.nativeWatchCreateSyncSyncedCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchCreatedSynced",
      );
      addCheck(
        failedChecks,
        localFiles.nativeWatchCreateSyncFailedCount === 0,
        "localSyncProbe:nativeWatchCreatedNoFailures",
      );
      addCheck(failedChecks, localFiles.nativeWatchInitialSearchMatched, "localSyncProbe:nativeWatchInitialSearch");
      addCheck(failedChecks, localFiles.nativeWatchMutationRequested, "localSyncProbe:nativeWatchMutationRequested");
      addCheck(
        failedChecks,
        (localFiles.stagedNativeWatchUpdatedCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchUpdatedStaged",
      );
      addCheck(
        failedChecks,
        (localFiles.nativeWatchUpdateSyncSentCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchUpdatedSent",
      );
      addCheck(
        failedChecks,
        (localFiles.nativeWatchUpdateSyncSyncedCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchUpdatedSynced",
      );
      addCheck(
        failedChecks,
        localFiles.nativeWatchUpdateSyncFailedCount === 0,
        "localSyncProbe:nativeWatchUpdatedNoFailures",
      );
      addCheck(failedChecks, localFiles.nativeWatchUpdatedSearchMatched, "localSyncProbe:nativeWatchUpdatedSearch");
      addCheck(failedChecks, localFiles.nativeWatchDeleteRequested, "localSyncProbe:nativeWatchDeleteRequested");
      addCheck(
        failedChecks,
        (localFiles.stagedNativeWatchDeletedCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchDeletedStaged",
      );
      addCheck(
        failedChecks,
        (localFiles.nativeWatchDeleteSyncSentCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchDeletedSent",
      );
      addCheck(
        failedChecks,
        (localFiles.nativeWatchDeleteSyncSyncedCount ?? 0) >= 1,
        "localSyncProbe:nativeWatchDeletedSynced",
      );
      addCheck(
        failedChecks,
        localFiles.nativeWatchDeleteSyncFailedCount === 0,
        "localSyncProbe:nativeWatchDeletedNoFailures",
      );
      addCheck(failedChecks, localFiles.remainingQaEvents === 0, "localSyncProbe:localFileNoRemainingEvents");
    }
    addCheck(failedChecks, snapshot.localSyncProbe.widgetUsageQueued, "localSyncProbe:widgetUsageQueued");
    addCheck(failedChecks, snapshot.localSyncProbe.outbox?.status === "ready", "localSyncProbe:outboxReady");
    addCheck(
      failedChecks,
      (snapshot.localSyncProbe.outbox?.widgetSentCount ?? 0) >= 1,
      "localSyncProbe:widgetUsageReachedBackend",
    );
    addCheck(
      failedChecks,
      snapshot.localSyncProbe.outbox?.widgetFailedCount === 0,
      "localSyncProbe:widgetUsageNoFailedSync",
    );
    if (snapshot.localSyncProbe.activity?.consentGranted) {
      addCheck(failedChecks, snapshot.localSyncProbe.activity.nativeCaptured, "localSyncProbe:activityNativeCaptured");
      addCheck(failedChecks, snapshot.localSyncProbe.activity.queued, "localSyncProbe:activityQueued");
      addCheck(
        failedChecks,
        (snapshot.localSyncProbe.outbox?.activitySentCount ?? 0) >= 1,
        "localSyncProbe:activityReachedBackend",
      );
      addCheck(
        failedChecks,
        snapshot.localSyncProbe.outbox?.activityFailedCount === 0,
        "localSyncProbe:activityNoFailedSync",
      );
    }
  }
  if (snapshot.sessionRestoreProbe.enabled) {
    addCheck(failedChecks, !snapshot.sessionRestoreProbe.error, "sessionRestoreProbe:noError");
    addCheck(
      failedChecks,
      snapshot.sessionRestoreProbe.browserSessionCleared,
      "sessionRestoreProbe:browserSessionCleared",
    );
    addCheck(
      failedChecks,
      snapshot.sessionRestoreProbe.restoredLocalSession,
      "sessionRestoreProbe:restoredLocalSession",
    );
    addCheck(
      failedChecks,
      snapshot.sessionRestoreProbe.restoredTauriClient,
      "sessionRestoreProbe:restoredTauriClient",
    );
    addCheck(
      failedChecks,
      snapshot.sessionRestoreProbe.restoredRealOAuthSession,
      "sessionRestoreProbe:restoredRealOAuthSession",
    );
    addCheck(failedChecks, snapshot.sessionRestoreProbe.restoredTokenLive, "sessionRestoreProbe:restoredTokenLive");
    addCheck(failedChecks, snapshot.sessionRestoreProbe.backendMeOk, "sessionRestoreProbe:backendMeAfterRestore");
  }
  if (snapshot.stabilityProbe.enabled) {
    addCheck(failedChecks, !snapshot.stabilityProbe.error, "stabilityProbe:noError");
    addCheck(failedChecks, (snapshot.stabilityProbe.dwellMs ?? 0) >= 1_000, "stabilityProbe:dwellMs");
    addCheck(
      failedChecks,
      snapshot.stabilityProbe.allExpectedWindowsVisible,
      "stabilityProbe:allExpectedWindowsVisible",
    );
    addCheck(
      failedChecks,
      snapshot.stabilityProbe.allWindowRoomContextMatchesActive,
      "stabilityProbe:allWindowRoomContextMatchesActive",
    );
    addCheck(
      failedChecks,
      snapshot.stabilityProbe.allWindowRoomContextMatchesServer,
      "stabilityProbe:allWindowRoomContextMatchesServer",
    );
    addCheck(
      failedChecks,
      snapshot.stabilityProbe.barRestoreItemsMatchActiveRoom,
      "stabilityProbe:barRestoreItemsMatchActiveRoom",
    );
    addCheck(failedChecks, snapshot.stabilityProbe.allAutoSyncLoopsRunning, "stabilityProbe:syncLoopsStillRunning");
    addCheck(
      failedChecks,
      snapshot.stabilityProbe.managedFolderStatusNotFailed,
      "stabilityProbe:managedFolderStatusNotFailed",
    );
    addCheck(failedChecks, snapshot.stabilityProbe.backendWidgetSummaryOk, "stabilityProbe:backendWidgetSummary");
  }
  if (snapshot.stopCleanupProbe.enabled) {
    addCheck(failedChecks, !snapshot.stopCleanupProbe.error, "stopCleanupProbe:noError");
    addCheck(
      failedChecks,
      snapshot.stopCleanupProbe.activeProjectRoomCleared,
      "stopCleanupProbe:activeProjectRoomCleared",
    );
    addCheck(
      failedChecks,
      snapshot.stopCleanupProbe.allExpectedWindowsHidden,
      "stopCleanupProbe:allExpectedWindowsHidden",
    );
    addCheck(failedChecks, snapshot.stopCleanupProbe.barWindowHidden, "stopCleanupProbe:barWindowHidden");
    addCheck(failedChecks, snapshot.stopCleanupProbe.syncLoopsStopped, "stopCleanupProbe:syncLoopsStopped");
  }

  if (failedChecks.length === 0 && shouldRunRealOAuthStopCleanupProbe()) {
    const finalSnapshot = {
      ...snapshot,
      stopCleanupProbe: await runRealOAuthStopCleanupProbe(),
    };
    const cleanupFailedChecks: string[] = [];
    addCheck(cleanupFailedChecks, !finalSnapshot.stopCleanupProbe.error, "stopCleanupProbe:noError");
    addCheck(
      cleanupFailedChecks,
      finalSnapshot.stopCleanupProbe.activeProjectRoomCleared,
      "stopCleanupProbe:activeProjectRoomCleared",
    );
    addCheck(
      cleanupFailedChecks,
      finalSnapshot.stopCleanupProbe.allExpectedWindowsHidden,
      "stopCleanupProbe:allExpectedWindowsHidden",
    );
    addCheck(cleanupFailedChecks, finalSnapshot.stopCleanupProbe.barWindowHidden, "stopCleanupProbe:barWindowHidden");
    addCheck(cleanupFailedChecks, finalSnapshot.stopCleanupProbe.syncLoopsStopped, "stopCleanupProbe:syncLoopsStopped");

    await restoreRealOAuthQaPrivacyConsents().catch(() => undefined);

    return {
      failedChecks: cleanupFailedChecks,
      ok: cleanupFailedChecks.length === 0,
      snapshot: finalSnapshot,
    };
  }

  await restoreRealOAuthQaPrivacyConsents().catch(() => undefined);

  return {
    failedChecks,
    ok: failedChecks.length === 0,
    snapshot,
  };
}

async function readWindowState(
  bubbleType: WidgetWindowBubbleType,
  activeRoomId: string | null,
  serverSelectedRoomId: string | null,
): Promise<TauriWidgetWindowQaState | null> {
  try {
    const state = await tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType });
    return toWindowQaState(state, activeRoomId, serverSelectedRoomId);
  } catch {
    return null;
  }
}

async function readWidgetRuntimeState(
  selectedRoomId: string | null,
  serverSelectedRoomId: string | null,
): Promise<TauriWidgetRuntimeQaSnapshot> {
  const barItems = isTauriRuntime() ? await tauriCommands.getWidgetBarItems().catch(() => [] as WidgetWindowState[]) : [];
  const barWindow = isTauriRuntime()
    ? await readWindowState("bar", selectedRoomId, serverSelectedRoomId)
    : null;
  const windowEntries = await Promise.all(
    WIDGET_BUBBLE_TYPES.map(async (bubbleType) => [
      bubbleType,
      isTauriRuntime() ? await readWindowState(bubbleType, selectedRoomId, serverSelectedRoomId) : null,
    ] as const),
  );
  const windows = Object.fromEntries(windowEntries) as Record<WidgetBubbleType, TauriWidgetWindowQaState | null>;
  const missingVisibleBubbles = WIDGET_BUBBLE_TYPES.filter((bubbleType) => !windows[bubbleType]?.windowVisible);

  return {
    allExpectedWindowsVisible: missingVisibleBubbles.length === 0,
    allWindowRoomContextMatchesActive: WIDGET_BUBBLE_TYPES.every(
      (bubbleType) => windows[bubbleType]?.selectedRoomMatchesActiveRoom,
    ),
    allWindowRoomContextMatchesServer: WIDGET_BUBBLE_TYPES.every(
      (bubbleType) => windows[bubbleType]?.selectedRoomMatchesServerContext,
    ),
    barRestoreItems: {
      count: barItems.length,
      allMatchActiveRoom: barItems.every((item) => roomMatches(item.selectedRoomId, selectedRoomId)),
      selectedRoomIds: [...new Set(barItems.map((item) => item.selectedRoomId ?? null))],
      windowIds: barItems.map((item) => item.windowId ?? item.activeBubble),
    },
    barWindow,
    missingVisibleBubbles,
    windows,
  };
}

function realOAuthAutoSyncLoopsRunning() {
  return isActivityAutoCaptureRunning() && isManagedFolderAutoSyncRunning() && isWidgetUsageAutoSyncRunning();
}

function realOAuthAutoSyncLoopsStopped() {
  return !isActivityAutoCaptureRunning() && !isManagedFolderAutoSyncRunning() && !isWidgetUsageAutoSyncRunning();
}

async function waitForRealOAuthAutoSyncLoops(timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (!realOAuthAutoSyncLoopsRunning() && Date.now() - startedAt < timeoutMs) {
    await waitForMs(250);
  }
}

async function waitForRealOAuthAutoSyncLoopsStopped(timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (!realOAuthAutoSyncLoopsStopped() && Date.now() - startedAt < timeoutMs) {
    await waitForMs(250);
  }
}

async function ensureTauriAuthenticatedSurfacesForQa(localSession: AuthSessionDiagnostics) {
  if (!isTauriRuntime() || !localSession.hasSession) {
    return;
  }

  const timeline = readTauriAuthenticatedSurfacesLaunchTimeline();
  if (timeline.completed && realOAuthAutoSyncLoopsRunning()) {
    return;
  }

  await launchTauriAuthenticatedSurfaces({ retryPolicy: "force", sessionAlreadyValidated: true }).catch(() => undefined);
  await waitForRealOAuthAutoSyncLoops();
}

export async function readTauriAuthWidgetQaSnapshot(
  options: ReadTauriAuthWidgetQaSnapshotOptions = {},
): Promise<TauriAuthWidgetQaSnapshot> {
  let localSession = getStoredAuthSessionDiagnostics();
  let tauriMirrorSession = await readTauriAuthSessionDiagnostics();
  if (options.ensureAuthenticatedSurfaces !== false) {
    await ensureTauriAuthenticatedSurfacesForQa(localSession);
    localSession = getStoredAuthSessionDiagnostics();
    tauriMirrorSession = await readTauriAuthSessionDiagnostics();
  }

  const memoryRoomId = getActiveProjectRoomId();
  const tauriRoom = isTauriRuntime() ? await tauriCommands.readActiveProjectRoom().catch(() => null) : null;
  const hasAuthSession = localSession.hasSession || tauriMirrorSession.hasSession;
  const missingSessionProbe: QaProbe = { code: "MISSING_AUTH_SESSION", ok: false, status: 401 };
  const backendMe = hasAuthSession
    ? await probeBackend(() => authApi.getMe())
    : { probe: missingSessionProbe };
  const backendContext = hasAuthSession
    ? await probeBackend(() => widgetApi.getContext())
    : { probe: missingSessionProbe };
  const contextSelectedRoomId = backendContext.data?.selectedRoomId ?? null;
  const selectedRoomId = memoryRoomId ?? tauriRoom?.roomId ?? contextSelectedRoomId;
  const backendSummary = hasAuthSession
    ? await probeBackend(() => widgetApi.getSummary(selectedRoomId))
    : { probe: missingSessionProbe };
  const serverSelectedRoomId = contextSelectedRoomId ?? backendSummary.data?.context.selectedRoomId ?? null;
  const effectiveSelectedRoomId = memoryRoomId ?? tauriRoom?.roomId ?? serverSelectedRoomId;
  const localSyncProbe = hasAuthSession
    ? await runRealOAuthLocalSyncProbe(effectiveSelectedRoomId ?? null)
    : { enabled: false };
  const widgetRuntime = await readWidgetRuntimeState(effectiveSelectedRoomId ?? null, serverSelectedRoomId);
  const managedFolderStatus = getManagedFolderAutoSyncStatus();
  const syncRuntime = {
    activityAutoCaptureRunning: isActivityAutoCaptureRunning(),
    allAutoSyncLoopsRunning: realOAuthAutoSyncLoopsRunning(),
    managedFolderAutoSyncRunning: isManagedFolderAutoSyncRunning(),
    managedFolderStatus,
    widgetUsageAutoSyncRunning: isWidgetUsageAutoSyncRunning(),
  };
  const stabilityProbe = hasAuthSession
    ? await runRealOAuthStabilityProbe(effectiveSelectedRoomId ?? null, serverSelectedRoomId)
    : { enabled: false };
  const launchTimeline = readTauriAuthenticatedSurfacesLaunchTimeline();
  const sessionRestoreProbe = hasAuthSession
    ? await runRealOAuthSessionRestoreProbe()
    : { enabled: true, error: "missing_auth_session" };
  const stopCleanupProbe =
    options.runStopCleanupProbe === false ? { enabled: false } : await runRealOAuthStopCleanupProbe();

  return {
    activeProjectRoom: {
      hasSelectedRoom: Boolean(effectiveSelectedRoomId),
      memoryRoomId,
      serverSelectedRoomId,
      tauriRoomId: tauriRoom?.roomId ?? null,
      tauriSavedAt: tauriRoom?.savedAt,
      tauriMatchesMemory: roomMatches(tauriRoom?.roomId, memoryRoomId),
      tauriMatchesServerContext: roomMatches(tauriRoom?.roomId, serverSelectedRoomId),
    },
    backend: {
      me: backendMe.probe,
      widgetContext: backendContext.probe,
      widgetSummary: {
        ...backendSummary.probe,
        bubbleCount: backendSummary.data?.bubbles.length,
        enabledBubbleTypes: backendSummary.data?.bubbles
          .filter((bubble) => bubble.enabled)
          .map((bubble) => bubble.bubbleType),
        selectedRoomId: backendSummary.data?.context.selectedRoomId ?? null,
      },
    },
    collectedAt: new Date().toISOString(),
    expectedBubbleTypes: WIDGET_BUBBLE_TYPES,
    localSession,
    localSyncProbe,
    launchTimeline,
    sessionRestoreProbe,
    stabilityProbe,
    stopCleanupProbe,
    syncRuntime,
    tauriMirrorSession,
    widgetRuntime,
  };
}
