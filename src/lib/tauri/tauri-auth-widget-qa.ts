"use client";

import { authApi } from "@/features/auth/api/authApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import {
  getStoredAuthSessionDiagnostics,
  probeStoredAuthSessionRestoreFromTauriMirrorForQa,
  readTauriAuthSessionDiagnostics,
  type AuthSessionDiagnostics,
} from "@/lib/auth/auth-session";
import { ApiClientError } from "@/lib/api/errors";
import { isActivityAutoCaptureRunning } from "@/lib/local/activity-auto-capture";
import {
  getManagedFolderAutoSyncStatus,
  isManagedFolderAutoSyncRunning,
  type ManagedFolderAutoSyncStatus,
} from "@/lib/local/managed-folder-auto-sync";
import { syncPersonalLocalFileEventsToServer } from "@/lib/local/managed-folder-client";
import { syncAllLocalOutboxToServer } from "@/lib/sync/local-sync-client";
import {
  tauriCommands,
  type WidgetBubbleType,
  type WidgetWindowBubbleType,
  type WidgetWindowState,
} from "@/lib/tauri/commands";
import { stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { isWidgetUsageAutoSyncRunning } from "@/lib/widget/widget-usage-auto-sync";
import { WIDGET_BUBBLE_TYPES } from "@/lib/widget/widget-types";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

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
    initialSyncFailedCount?: number;
    initialSyncSentCount?: number;
    initialSyncSyncedCount?: number;
    localFolderId?: string;
    mutationRequested?: boolean;
    reindexChanged?: boolean;
    reindexStatus?: string;
    remainingQaEvents?: number;
    scanFileCount?: number;
    stagedCreatedCount?: number;
    stagedUpdatedCount?: number;
    updatedPreviewIncludesMarker?: boolean;
    updatedPreviewReady?: boolean;
    updatedSearchMatched?: boolean;
    updateSyncFailedCount?: number;
    updateSyncSentCount?: number;
    updateSyncSyncedCount?: number;
  };
  outbox?: {
    activityFailedCount?: number;
    activitySentCount?: number;
    activityStagedCount?: number;
    failedCount?: number;
    fileFailedCount?: number;
    fileSentCount?: number;
    fileSyncedCount?: number;
    pendingCount?: number;
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

function toProbe(error: unknown): QaProbe {
  if (error instanceof ApiClientError) {
    return { code: error.code, ok: false, status: error.status };
  }

  return { ok: false };
}

async function probeBackend<T>(read: () => Promise<T>): Promise<{ data?: T; probe: QaProbe }> {
  try {
    return { data: await read(), probe: { ok: true } };
  } catch (error) {
    return { probe: toProbe(error) };
  }
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

async function runRealOAuthLocalFileProbe(consentGranted: boolean): Promise<NonNullable<TauriRealOAuthLocalSyncProbe["localFiles"]>> {
  const fixturePath = resolveRealOAuthLocalSyncFolderPath();
  if (!fixturePath) {
    return { enabled: false };
  }

  if (!consentGranted) {
    return { enabled: true, error: "local_folder_consent_disabled", fixturePath };
  }

  try {
    const folder = await tauriCommands.selectManagedFolder({ path: fixturePath });
    const scan = await tauriCommands.scanManagedFolder({ localFolderId: folder.localFolderId });
    const initialSearch = await tauriCommands.searchLocalFiles({ limit: 10, query: "RealOAuthLocalSyncInitial" });
    const noteFile = initialSearch.items.find((item) => item.name === "real-oauth-local-sync-note.txt") ?? initialSearch.items[0];
    if (!noteFile?.localFileId) {
      return {
        enabled: true,
        error: "fixture_file_not_indexed",
        fixturePath,
        localFolderId: folder.localFolderId,
        scanFileCount: scan.changedCount,
      };
    }

    const initialPreview = await tauriCommands.readLocalFilePreview({
      localFileId: noteFile.localFileId,
      maxChars: 1_000,
    });
    const createdEvents = await tauriCommands.stageLocalFileEventsForSync({
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const qaCreatedEvents = createdEvents.events.filter(
      (event) => event.fileName === "real-oauth-local-sync-note.txt" && event.eventType === "CREATED",
    );
    const initialSync = await syncPersonalLocalFileEventsToServer({
      consentGranted,
      limit: 20,
      localFolderId: folder.localFolderId,
    });

    const mutateUrl = resolveRealOAuthLocalSyncMutateUrl();
    let mutationRequested = false;
    if (mutateUrl) {
      const response = await fetch(mutateUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error(`fixture mutation failed: ${response.status}`);
      }
      mutationRequested = true;
    }

    const reindex = await tauriCommands.reindexFile({ localFileId: noteFile.localFileId });
    const updatedSearch = await tauriCommands.searchLocalFiles({ limit: 10, query: "RealOAuthLocalSyncUpdated" });
    const updatedPreview = await tauriCommands.readLocalFilePreview({
      localFileId: noteFile.localFileId,
      maxChars: 1_000,
    });
    const updatedEvents = await tauriCommands.stageLocalFileEventsForSync({
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const qaUpdatedEvents = updatedEvents.events.filter(
      (event) => event.localFileId === noteFile.localFileId && event.eventType === "UPDATED",
    );
    const updateSync = await syncPersonalLocalFileEventsToServer({
      consentGranted,
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const remainingEvents = await tauriCommands.stageLocalFileEventsForSync({
      limit: 20,
      localFolderId: folder.localFolderId,
    });

    return {
      enabled: true,
      fixturePath,
      initialPreviewIncludesMarker: Boolean(initialPreview.previewText?.includes("RealOAuthLocalSyncInitial")),
      initialPreviewReady: initialPreview.status === "READY",
      initialSearchMatched: initialSearch.items.some((item) => item.localFileId === noteFile.localFileId),
      initialSyncFailedCount: initialSync.status === "ready" ? initialSync.data.failedCount : undefined,
      initialSyncSentCount: initialSync.status === "ready" ? initialSync.data.sentCount : undefined,
      initialSyncSyncedCount: initialSync.status === "ready" ? initialSync.data.syncedCount : undefined,
      localFolderId: folder.localFolderId,
      mutationRequested,
      reindexChanged: reindex.changed,
      reindexStatus: reindex.status,
      remainingQaEvents: remainingEvents.events.filter((event) => event.fileName === "real-oauth-local-sync-note.txt").length,
      scanFileCount: scan.changedCount,
      stagedCreatedCount: qaCreatedEvents.length,
      stagedUpdatedCount: qaUpdatedEvents.length,
      updatedPreviewIncludesMarker: Boolean(updatedPreview.previewText?.includes("RealOAuthLocalSyncUpdated")),
      updatedPreviewReady: updatedPreview.status === "READY",
      updatedSearchMatched: updatedSearch.items.some((item) => item.localFileId === noteFile.localFileId),
      updateSyncFailedCount: updateSync.status === "ready" ? updateSync.data.failedCount : undefined,
      updateSyncSentCount: updateSync.status === "ready" ? updateSync.data.sentCount : undefined,
      updateSyncSyncedCount: updateSync.status === "ready" ? updateSync.data.syncedCount : undefined,
    };
  } catch (error) {
    return {
      enabled: true,
      error: errorMessage(error),
      fixturePath,
    };
  }
}

async function runRealOAuthLocalSyncProbe(roomId: string | null): Promise<TauriRealOAuthLocalSyncProbe> {
  if (!shouldRunRealOAuthLocalSyncProbe()) {
    return { enabled: false };
  }

  if (!isTauriRuntime()) {
    return { enabled: true, error: "not_tauri_runtime" };
  }

  try {
    const privacyConsents = await settingsApi.getPrivacyConsents();
    const sqlite = await tauriCommands.checkLocalSqliteIntegrity();
    const localFiles = await runRealOAuthLocalFileProbe(privacyConsents.localFolderEnabled);
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
    const outbox = await syncAllLocalOutboxToServer({ limit: 50 });

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
              fileFailedCount: outbox.data.fileFailedCount,
              fileSentCount: outbox.data.fileSentCount,
              fileSyncedCount: outbox.data.fileSyncedCount,
              pendingCount: outbox.data.pendingCount,
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
    const allAutoSyncLoopsRunning =
      isActivityAutoCaptureRunning() &&
      isManagedFolderAutoSyncRunning() &&
      isWidgetUsageAutoSyncRunning();

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
  const snapshot = await readTauriAuthWidgetQaSnapshot();
  const failedChecks: string[] = [];

  assertRealGoogleSessionDiagnostics(failedChecks, snapshot.localSession, "local");
  assertRealGoogleSessionDiagnostics(failedChecks, snapshot.tauriMirrorSession, "tauriMirror");
  addCheck(failedChecks, snapshot.backend.me.ok, "backend:/api/me");
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

export async function readTauriAuthWidgetQaSnapshot(): Promise<TauriAuthWidgetQaSnapshot> {
  const localSession = getStoredAuthSessionDiagnostics();
  const tauriMirrorSession = await readTauriAuthSessionDiagnostics();

  const memoryRoomId = getActiveProjectRoomId();
  const tauriRoom = isTauriRuntime() ? await tauriCommands.readActiveProjectRoom().catch(() => null) : null;
  const backendMe = await probeBackend(() => authApi.getMe());
  const backendContext = await probeBackend(() => widgetApi.getContext());
  const serverSelectedRoomId = backendContext.data?.selectedRoomId ?? null;
  const selectedRoomId = memoryRoomId ?? tauriRoom?.roomId ?? serverSelectedRoomId;
  const backendSummary = await probeBackend(() => widgetApi.getSummary(selectedRoomId));
  const localSyncProbe = await runRealOAuthLocalSyncProbe(selectedRoomId ?? null);
  const widgetRuntime = await readWidgetRuntimeState(selectedRoomId ?? null, serverSelectedRoomId);
  const managedFolderStatus = getManagedFolderAutoSyncStatus();
  const syncRuntime = {
    activityAutoCaptureRunning: isActivityAutoCaptureRunning(),
    allAutoSyncLoopsRunning:
      isActivityAutoCaptureRunning() &&
      isManagedFolderAutoSyncRunning() &&
      isWidgetUsageAutoSyncRunning(),
    managedFolderAutoSyncRunning: isManagedFolderAutoSyncRunning(),
    managedFolderStatus,
    widgetUsageAutoSyncRunning: isWidgetUsageAutoSyncRunning(),
  };
  const stabilityProbe = await runRealOAuthStabilityProbe(selectedRoomId ?? null, serverSelectedRoomId);
  const sessionRestoreProbe = await runRealOAuthSessionRestoreProbe();
  const stopCleanupProbe = await runRealOAuthStopCleanupProbe();

  return {
    activeProjectRoom: {
      hasSelectedRoom: Boolean(selectedRoomId),
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
    sessionRestoreProbe,
    stabilityProbe,
    stopCleanupProbe,
    syncRuntime,
    tauriMirrorSession,
    widgetRuntime,
  };
}
