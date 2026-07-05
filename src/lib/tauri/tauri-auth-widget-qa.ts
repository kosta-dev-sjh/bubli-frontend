"use client";

import { authApi } from "@/features/auth/api/authApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import {
  getStoredAuthSessionDiagnostics,
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
import { syncAllLocalOutboxToServer } from "@/lib/sync/local-sync-client";
import {
  tauriCommands,
  type WidgetBubbleType,
  type WidgetWindowBubbleType,
  type WidgetWindowState,
} from "@/lib/tauri/commands";
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
    queued: boolean;
    syncStatus?: string;
  };
  enabled: boolean;
  error?: string;
  outbox?: {
    activityFailedCount?: number;
    activitySentCount?: number;
    activityStagedCount?: number;
    failedCount?: number;
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

export type TauriWidgetWindowQaState = Pick<WidgetWindowState, "mode" | "selectedRoomId" | "windowVisible"> & {
  bubbleType: WidgetWindowBubbleType;
  selectedRoomMatchesActiveRoom: boolean;
  selectedRoomMatchesServerContext: boolean;
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
  syncRuntime: {
    activityAutoCaptureRunning: boolean;
    allAutoSyncLoopsRunning: boolean;
    managedFolderAutoSyncRunning: boolean;
    managedFolderStatus: ManagedFolderAutoSyncStatus;
    widgetUsageAutoSyncRunning: boolean;
  };
  tauriMirrorSession: AuthSessionDiagnostics;
  widgetRuntime: {
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
    const occurredAt = new Date();
    const activityStartedAt = new Date(occurredAt.getTime() - 30_000).toISOString();
    const activity =
      privacyConsents.activityDetectionEnabled
        ? await tauriCommands.recordActivityContext({
            appName: "Bubli real OAuth QA",
            capturedAt: occurredAt.toISOString(),
            durationSeconds: 30,
            endedAt: occurredAt.toISOString(),
            roomId,
            startedAt: activityStartedAt,
            windowTitle: "Real OAuth local sync probe",
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
        queued: Boolean(activity?.localActivityId),
        syncStatus: activity?.syncStatus,
      },
      outbox:
        outbox.status === "ready"
          ? {
              activityFailedCount: outbox.data.activityFailedCount,
              activitySentCount: outbox.data.activitySentCount,
              activityStagedCount: outbox.data.activityStagedCount,
              failedCount: outbox.data.failedCount,
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

  const barItems = isTauriRuntime() ? await tauriCommands.getWidgetBarItems().catch(() => [] as WidgetWindowState[]) : [];
  const barWindow = isTauriRuntime()
    ? await readWindowState("bar", selectedRoomId ?? null, serverSelectedRoomId)
    : null;
  const windowEntries = await Promise.all(
    WIDGET_BUBBLE_TYPES.map(async (bubbleType) => [
      bubbleType,
      isTauriRuntime() ? await readWindowState(bubbleType, selectedRoomId ?? null, serverSelectedRoomId) : null,
    ] as const),
  );
  const windows = Object.fromEntries(windowEntries) as Record<WidgetBubbleType, TauriWidgetWindowQaState | null>;
  const missingVisibleBubbles = WIDGET_BUBBLE_TYPES.filter((bubbleType) => !windows[bubbleType]?.windowVisible);
  const managedFolderStatus = getManagedFolderAutoSyncStatus();

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
    syncRuntime: {
      activityAutoCaptureRunning: isActivityAutoCaptureRunning(),
      allAutoSyncLoopsRunning:
        isActivityAutoCaptureRunning() &&
        isManagedFolderAutoSyncRunning() &&
        isWidgetUsageAutoSyncRunning(),
      managedFolderAutoSyncRunning: isManagedFolderAutoSyncRunning(),
      managedFolderStatus,
      widgetUsageAutoSyncRunning: isWidgetUsageAutoSyncRunning(),
    },
    tauriMirrorSession,
    widgetRuntime: {
      allExpectedWindowsVisible: missingVisibleBubbles.length === 0,
      allWindowRoomContextMatchesActive: WIDGET_BUBBLE_TYPES.every(
        (bubbleType) => windows[bubbleType]?.selectedRoomMatchesActiveRoom,
      ),
      allWindowRoomContextMatchesServer: WIDGET_BUBBLE_TYPES.every(
        (bubbleType) => windows[bubbleType]?.selectedRoomMatchesServerContext,
      ),
      barRestoreItems: {
        count: barItems.length,
        allMatchActiveRoom: barItems.every((item) => roomMatches(item.selectedRoomId, selectedRoomId ?? null)),
        selectedRoomIds: [...new Set(barItems.map((item) => item.selectedRoomId ?? null))],
        windowIds: barItems.map((item) => item.windowId ?? item.activeBubble),
      },
      barWindow,
      missingVisibleBubbles,
      windows,
    },
  };
}
