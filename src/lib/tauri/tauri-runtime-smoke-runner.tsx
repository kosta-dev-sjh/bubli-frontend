"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { chatApi } from "@/features/communication/api/chatApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { managedFolderApi } from "@/features/managed-folder/api/managedFolderApi";
import { agentApi } from "@/features/agent/api/agentApi";
import { activityApi } from "@/features/activity/api/activityApi";
import { authApi } from "@/features/auth/api/authApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { clearStoredAuthSession, getStoredAuthSession } from "@/lib/auth/auth-session";
import { isActivityAutoCaptureRunning } from "@/lib/local/activity-auto-capture";
import { isManagedFolderAutoSyncRunning } from "@/lib/local/managed-folder-auto-sync";
import {
  analyzePersonalLocalFileWithKeySentences,
  getPersonalLocalFileAnalysisStatus,
} from "@/lib/local/managed-folder-client";
import { syncAllLocalOutboxToServer } from "@/lib/sync/local-sync-client";
import { launchTauriAuthenticatedSurfaces, stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { tauriCommands } from "@/lib/tauri/commands";
import type { LocalFileEventsSyncStageResult } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { isWidgetUsageAutoSyncRunning } from "@/lib/widget/widget-usage-auto-sync";
import { syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";

type SmokeCheck = {
  detail?: unknown;
  name: string;
};

type SmokeReport = {
  checks: SmokeCheck[];
  durationMs: number;
  error?: string;
  finishedAt: string;
  platform: string;
  status: "passed" | "failed" | "skipped";
};

type SmokeAssert = (condition: unknown, name: string, detail?: unknown) => asserts condition;
type SmokeWidgetBubble = "agent" | "alert" | "chat" | "memo" | "resource" | "schedule" | "timer" | "todo";

const smokeEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const smokeReportUrl = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_REPORT_URL;
const smokeFolderPath = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_FOLDER;
const smokePhase = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_PHASE ?? "full";
const smokeRoomId =
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_ROOM_ID ??
  "22222222-2222-4222-8222-222222222222";
const smokeShouldQuit = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_QUIT === "true";
const smokeRestoreSnapshotRoomId = "33333333-3333-4333-8333-333333333333";
const smokeRestoreSnapshotMessageId = "codex-restore-snapshot-message";
const smokeRestoreDirtyMessageId = "codex-restore-dirty-message";
const smokeWidgetBubbles: SmokeWidgetBubble[] = [
  "todo",
  "agent",
  "chat",
  "timer",
  "memo",
  "schedule",
  "resource",
  "alert",
];

function isWindowsRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("windows");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function smokeControlUrl(path: string) {
  if (!smokeReportUrl) return null;

  try {
    return new URL(path, smokeReportUrl).toString();
  } catch {
    return null;
  }
}

async function triggerManagedFolderMutation() {
  const mutationUrl = smokeControlUrl("/mutate-folder");
  if (!mutationUrl) {
    throw new Error("runtime smoke mutate-folder endpoint is not configured");
  }

  const response = await fetch(mutationUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`runtime smoke mutate-folder failed: ${response.status}`);
  }

  return response.json().catch(() => null) as Promise<unknown>;
}

async function triggerManualOutboxFileCreation() {
  const mutationUrl = smokeControlUrl("/create-manual-outbox-file");
  if (!mutationUrl) {
    throw new Error("runtime smoke manual-outbox file endpoint is not configured");
  }

  const response = await fetch(mutationUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`runtime smoke manual-outbox file creation failed: ${response.status}`);
  }

  return response.json().catch(() => null) as Promise<unknown>;
}

async function waitForManagedFolderEvents(
  localFolderId: string,
  requiredEventTypes: Array<"CREATED" | "UPDATED" | "DELETED">,
) {
  let latest = await tauriCommands.stageLocalFileEventsForSync({ limit: 20, localFolderId });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stagedTypes = new Set(latest.events.map((event) => event.eventType));
    if (requiredEventTypes.every((eventType) => stagedTypes.has(eventType))) {
      return latest;
    }

    await sleep(250);
    latest = await tauriCommands.stageLocalFileEventsForSync({ limit: 20, localFolderId });
  }

  return latest;
}

function localFileEventNames(events: Array<{ fileName: string }>) {
  return new Set(events.map((event) => event.fileName));
}

const runtimeSmokeAnalysisFilePattern = /^runtime-smoke-(structured|rich)\.(json|rtf)$/i;
const analyzableRuntimeSmokeFilePattern =
  /\.(csv|docx|htm|html|hwpx|json|jsonl|markdown|md|pdf|pptx|rtf|tsv|txt|xlsx|ya?ml)$/i;

async function syncStagedLocalFileEventsToBackend(staged: LocalFileEventsSyncStageResult) {
  const response = await managedFolderApi.syncApprovedLocalFileEvents({
    events: staged.events.map((event) => ({
      eventType: event.eventType,
      fileName: event.fileName,
      fileSizeBytes: event.fileSizeBytes,
      localEventId: event.localEventId,
      mimeType: event.mimeType,
      resourceId: event.resourceId,
    })),
  });
  const markResult = await tauriCommands.markLocalFileEventsSynced({
    results: response.results
      .map((result, index) => {
        const localEventId = result.localEventId ?? staged.events[index]?.localEventId;
        if (!localEventId) return null;

        return {
          localEventId,
          resourceId: result.resourceId,
          status: result.status,
        };
      })
      .filter((result): result is NonNullable<typeof result> => result !== null),
  });

  return { markResult, response };
}

function findSyncedLocalFileAnalysisCandidate(
  staged: LocalFileEventsSyncStageResult,
  syncResult: Awaited<ReturnType<typeof syncStagedLocalFileEventsToBackend>>,
) {
  const candidates = [];

  for (const [index, result] of syncResult.response.results.entries()) {
    const localEvent =
      staged.events.find((event) => event.localEventId === result.localEventId) ?? staged.events[index];

    if (
      result.status === "SYNCED" &&
      result.resourceId &&
      localEvent?.eventType !== "DELETED" &&
      localEvent?.localFileId &&
      analyzableRuntimeSmokeFilePattern.test(localEvent.fileName)
    ) {
      candidates.push({
        fileName: localEvent.fileName,
        localFileId: localEvent.localFileId,
        resourceId: result.resourceId,
      });
    }
  }

  return candidates.find((candidate) => runtimeSmokeAnalysisFilePattern.test(candidate.fileName)) ?? null;
}

async function seedDevAuthSession() {
  const accessToken = process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN;
  if (!accessToken) return null;

  clearStoredAuthSession();
  return authApi.loginWithDevAccessToken(accessToken);
}

async function verifyRealBackendRoomCommunication(smokeRoomId: string, assert: SmokeAssert) {
  const projectRoom = await projectRoomApi.get(smokeRoomId);
  assert(
    projectRoom.id === smokeRoomId && projectRoom.status === "ACTIVE",
    "real backend project room loaded",
    projectRoom,
  );

  const roomMembers = await projectRoomApi.getMembers(smokeRoomId);
  assert(
    roomMembers.items.some((member) => member.userId === "11111111-1111-4111-8111-111111111111"),
    "real backend project room members loaded",
    roomMembers,
  );

  const roomResources = await resourcesApi.listRoomResources(smokeRoomId);
  assert(Array.isArray(roomResources.items), "real backend room resources endpoint loaded", roomResources);

  const chatRooms = await chatApi.listRooms();
  const roomChat = chatRooms.items.find((room) => room.roomId === smokeRoomId);
  assert(roomChat?.id, "real backend chat room resolved for project room", chatRooms);

  const clientMessageId = `tauri-runtime-smoke-${Date.now()}`;
  const messageText = "Tauri runtime smoke real backend chat message";
  const sentMessage = await chatApi.sendMessage(roomChat.id, {
    body: { text: messageText },
    clientMessageId,
    messageType: "TEXT",
  });
  assert(
    sentMessage.clientMessageId === clientMessageId && sentMessage.body.text === messageText,
    "real backend chat message sent",
    sentMessage,
  );

  const messagePage = await chatApi.getMessages(roomChat.id, { size: 20 });
  assert(
    messagePage.items.some((message) => message.clientMessageId === clientMessageId),
    "real backend chat message read back",
    messagePage,
  );

  const readMarker = (await chatApi.markRead(roomChat.id, sentMessage.roomSequence)) as {
    lastReadSequence?: number;
  } | null;
  assert(
    readMarker?.lastReadSequence === sentMessage.roomSequence,
    "real backend chat read marker updated",
    readMarker,
  );

  const voiceRoom = await voiceApi.createRoom({ roomId: smokeRoomId });
  assert(
    voiceRoom.roomId === smokeRoomId && voiceRoom.status === "OPEN",
    "real backend voice room opened",
    voiceRoom,
  );

  const voiceToken = await voiceApi.getToken(voiceRoom.id);
  assert(
    voiceToken.voiceRoomId === voiceRoom.id &&
      voiceToken.participantId &&
      voiceToken.serverUrl &&
      voiceToken.token &&
      voiceToken.expiresAt,
    "real backend voice token issued",
    voiceToken,
  );

  const mutedParticipant = await voiceApi.updateMicStatus(voiceRoom.id, { micStatus: "MUTED" });
  assert(
    mutedParticipant.userId === "11111111-1111-4111-8111-111111111111",
    "real backend voice mic status updated",
    mutedParticipant,
  );

  const leftVoiceRoom = await voiceApi.leave(voiceRoom.id);
  assert(leftVoiceRoom.id === voiceRoom.id, "real backend voice room left", leftVoiceRoom);
}

async function postReport(report: SmokeReport) {
  if (!smokeReportUrl) return;

  await fetch(smokeReportUrl, {
    body: JSON.stringify(report),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
}

async function runSmoke() {
  const startedAt = Date.now();
  const checks: SmokeCheck[] = [];
  const addCheck = (name: string, detail?: unknown) => checks.push({ detail, name });
  const assert: SmokeAssert = (condition, name, detail) => {
    if (!condition) {
      throw new Error(`${name}${detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
    }
    addCheck(name, detail);
  };

  try {
    if (!isTauriRuntime()) {
      await postReport({
        checks,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        platform: "browser",
        status: "skipped",
      });
      return;
    }

    if (!isWindowsRuntime()) {
      await postReport({
        checks,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        platform: navigator.userAgent,
        status: "skipped",
      });
      return;
    }

    await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
    const devToken = await seedDevAuthSession();
    assert(
      devToken?.user.id === "11111111-1111-4111-8111-111111111111",
      "tauri dev access token resolved seed user",
      devToken?.user,
    );
    assert(getStoredAuthSession(), "tauri auth session is available");

    const privacyConsents = await settingsApi.updatePrivacyConsents({
      activityDetectionEnabled: true,
      localFolderEnabled: true,
    });
    assert(
      privacyConsents.activityDetectionEnabled && privacyConsents.localFolderEnabled,
      "backend privacy consent enabled for runtime smoke",
      privacyConsents,
    );

    if (smokePhase === "restore-verify") {
      const restoredMessages = await tauriCommands.readRoomMessages({
        limit: 5,
        roomId: smokeRestoreSnapshotRoomId,
      });
      assert(
        restoredMessages.latestSequence === 777 &&
          restoredMessages.items.some((item) => item.serverMessageId === smokeRestoreSnapshotMessageId) &&
          !restoredMessages.items.some((item) => item.serverMessageId === smokeRestoreDirtyMessageId),
        "local SQLite restore applied after app restart",
        restoredMessages,
      );
      const restoredIntegrity = await tauriCommands.checkLocalSqliteIntegrity();
      assert(restoredIntegrity.ok, "local SQLite integrity passed after restore restart", restoredIntegrity);
      const closedCount = await tauriCommands.closeAllWidgetWindows();
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false });
      addCheck("widget windows cleaned up", { closedCount });
      await postReport({
        checks,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        platform: navigator.userAgent,
        status: "passed",
      });
      return;
    }

    await tauriCommands.storeActiveProjectRoom({
      roomId: smokeRoomId,
      roomLabel: "Codex Runtime Smoke",
    });
    await tauriCommands.setWidgetRoomContext({ selectedRoomId: smokeRoomId });
    const restoredRoom = await tauriCommands.readActiveProjectRoom();
    assert(restoredRoom?.roomId === smokeRoomId, "active project room persisted to SQLite", restoredRoom);
    const serverWidgetContext = await widgetApi.updateContext({ selectedRoomId: smokeRoomId });
    assert(
      serverWidgetContext.selectedRoomId === smokeRoomId && serverWidgetContext.mode === "ROOM",
      "real backend widget context saved from Tauri runtime",
      serverWidgetContext,
    );
    const serverWidgetContextReadback = await widgetApi.getContext();
    assert(
      serverWidgetContextReadback.selectedRoomId === smokeRoomId &&
        serverWidgetContextReadback.mode === "ROOM",
      "real backend widget context read back in Tauri runtime",
      serverWidgetContextReadback,
    );
    const serverWidgetSummary = await widgetApi.getSummary(smokeRoomId);
    assert(
      serverWidgetSummary.context.selectedRoomId === smokeRoomId &&
        serverWidgetSummary.context.mode === "ROOM",
      "real backend widget summary uses selected project room",
      serverWidgetSummary.context,
    );
    await verifyRealBackendRoomCommunication(smokeRoomId, assert);

    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    const windows = await tauriCommands.openWidgetWindows({
      windows: [
        { bubbleType: "bar", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "bar" },
        ...smokeWidgetBubbles.map((bubbleType) => ({
          bubbleType,
          mode: "DEFAULT" as const,
          selectedRoomId: smokeRoomId,
          windowId: bubbleType,
        })),
      ],
    });
    const openedWidgetIds = new Set(windows.map((window) => window.windowId ?? window.activeBubble));
    assert(
      windows.length >= smokeWidgetBubbles.length + 1 &&
        smokeWidgetBubbles.every((bubbleType) => openedWidgetIds.has(bubbleType)) &&
        openedWidgetIds.has("bar"),
      "native bar and all bubble widget windows opened after login",
      windows.map((window) => ({
        activeBubble: window.activeBubble,
        selectedRoomId: window.selectedRoomId,
        windowId: window.windowId,
        windowVisible: window.windowVisible,
      })),
    );

    await tauriCommands.setWidgetRoomContext({ selectedRoomId: smokeRoomId });
    const widgetStates = await Promise.all(
      smokeWidgetBubbles.map((bubbleType) =>
        tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
      ),
    );
    assert(
      widgetStates.every((widget) => widget.windowVisible),
      "all bubble widget windows visible",
      widgetStates,
    );
    assert(
      widgetStates.every((widget) => widget.selectedRoomId === smokeRoomId),
      "project room context propagated to all bubble widgets",
      widgetStates,
    );

    const shortcut = await tauriCommands.registerWidgetShortcut({ shortcut: "CommandOrControl+Shift+B" });
    assert(
      shortcut.shortcut === "CommandOrControl+Shift+B",
      "widget global shortcut registered",
      shortcut,
    );

    const sqlite = await tauriCommands.checkLocalSqliteIntegrity();
    assert(sqlite.ok, "local SQLite quick_check passed", sqlite);

    const snapshotMessages = await tauriCommands.syncRoomMessages({
      messages: [
        {
          bodyJson: JSON.stringify({ marker: "restore-snapshot" }),
          roomSequence: 777,
          serverMessageId: smokeRestoreSnapshotMessageId,
        },
      ],
      roomId: smokeRestoreSnapshotRoomId,
    });
    assert(snapshotMessages.latestSequence === 777, "local SQLite restore snapshot marker written", snapshotMessages);
    const backup = await tauriCommands.backupLocalSqlite();
    assert(backup.backupId && backup.sizeBytes > 0, "local SQLite backup file created", backup);
    const backupManifest = await tauriCommands.listLocalSqliteBackups();
    assert(
      backupManifest.latestBackupId === backup.backupId &&
        backupManifest.backups.some((entry) => entry.backupId === backup.backupId),
      "local SQLite backup manifest lists latest backup",
      { backup, backupManifest },
    );
    const dirtyMessages = await tauriCommands.syncRoomMessages({
      messages: [
        {
          bodyJson: JSON.stringify({ marker: "restore-dirty" }),
          roomSequence: 888,
          serverMessageId: smokeRestoreDirtyMessageId,
        },
      ],
      roomId: smokeRestoreSnapshotRoomId,
    });
    assert(dirtyMessages.latestSequence === 888, "local SQLite dirty state written after backup", dirtyMessages);
    const restore = await tauriCommands.restoreLocalSqliteBackup({ backupId: backup.backupId });
    assert(
      restore.backupId === backup.backupId && restore.requiresRestart,
      "local SQLite restore queued for next app restart",
      restore,
    );
    await tauriCommands.storeActiveProjectRoom({
      roomId: smokeRoomId,
      roomLabel: "Codex Runtime Smoke",
    });

    await tauriCommands.setActivityContextConsent({ enabled: true });
    const foreground = await tauriCommands.readActivityContext();
    assert(foreground.appName.trim().length > 0, "native foreground activity captured", foreground);
    const now = new Date();
    const activity = await tauriCommands.recordActivityContext({
      appName: foreground.appName,
      capturedAt: now.toISOString(),
      durationSeconds: 60,
      endedAt: now.toISOString(),
      roomId: smokeRoomId,
      startedAt: new Date(now.getTime() - 60_000).toISOString(),
      windowTitle: foreground.windowTitle ?? "Windows runtime smoke",
    });
    const stagedActivity = await tauriCommands.stageActivityContextsForSync({ limit: 50 });
    const stagedCurrentActivity = stagedActivity.activities.find(
      (item) => item.localActivityId === activity.localActivityId,
    );
    assert(
      stagedCurrentActivity,
      "activity capture staged from SQLite",
      stagedActivity,
    );
    const syncedActivities = [];
    for (const stagedItem of stagedActivity.activities) {
      const recordedActivity = await activityApi.recordCurrentApp({
        appName: stagedItem.appName,
        durationSeconds: stagedItem.durationSeconds ?? null,
        endedAt: stagedItem.endedAt,
        localActivityId: stagedItem.localActivityId,
        roomId: stagedItem.roomId ?? null,
        startedAt: stagedItem.startedAt,
        windowTitle: stagedItem.windowTitle ?? null,
      });
      const activityMark = await tauriCommands.markActivityContextSynced({
        localActivityId: stagedItem.localActivityId,
        serverActivityLogId: recordedActivity.id,
        status: "SYNCED",
      });
      syncedActivities.push({ activityMark, recordedActivity });
    }
    assert(
      syncedActivities.some(
        ({ activityMark, recordedActivity }) =>
          activityMark.localActivityId === activity.localActivityId && recordedActivity.id.length > 0,
      ),
      "activity buffer reached backend sync API",
      syncedActivities,
    );
    const syncedCurrentActivity = syncedActivities.find(
      ({ activityMark }) => activityMark.localActivityId === activity.localActivityId,
    );
    assert(
      syncedCurrentActivity?.activityMark.syncStatus === "SYNCED",
      "activity buffer sync marked SQLite row as SYNCED",
      syncedCurrentActivity,
    );
    const remainingActivity = await tauriCommands.stageActivityContextsForSync({ limit: 50 });
    assert(
      !remainingActivity.activities.some((item) => item.localActivityId === activity.localActivityId),
      "synced activity capture no longer remains pending",
      remainingActivity,
    );
    const todayActivities = await activityApi.getToday();
    assert(
      todayActivities.some((item) => item.id === syncedCurrentActivity?.recordedActivity.id),
      "synced activity appears in real backend today readback",
      todayActivities,
    );

    const widgetUsageOccurredAt = new Date().toISOString();
    const widgetUsageSummaryDate = widgetUsageOccurredAt.slice(0, 10);
    for (const bubbleType of smokeWidgetBubbles) {
      await tauriCommands.recordWidgetUsageEvent({
        bubbleType,
        eventType: "runtime-smoke:click",
        itemId: `codex-runtime-smoke-${bubbleType}`,
        itemType: bubbleType === "chat" ? "MESSAGE" : "TASK",
        occurredAt: widgetUsageOccurredAt,
      });
    }
    const rollups = await tauriCommands.rollupWidgetUsage({ summaryDate: widgetUsageSummaryDate });
    const smokeRollups = smokeWidgetBubbles
      .map((bubbleType) =>
        rollups.find(
          (rollup) =>
            rollup.rollupKey === `${widgetUsageSummaryDate}:${bubbleType}` &&
            rollup.bubbleType === bubbleType,
        ),
      )
      .filter((rollup): rollup is NonNullable<typeof rollup> => rollup !== undefined);
    assert(
      smokeRollups.length === smokeWidgetBubbles.length &&
        smokeRollups.every((rollup) => rollup.sourceEventCount >= 1 && rollup.interactionCount >= 1),
      "all bubble widget usage rollups created",
      { rollups, smokeRollups },
    );
    const smokeRollupKeys = smokeRollups.map((rollup) => rollup.rollupKey);
    const widgetUsageSync = await syncLocalWidgetUsageSummaryToServer({
      rollupKeys: smokeRollupKeys,
    });
    assert(widgetUsageSync.status === "ready", "widget usage summary reached backend sync API", widgetUsageSync);
    assert(
      widgetUsageSync.status === "ready" &&
        widgetUsageSync.data.failedCount === 0 &&
        widgetUsageSync.data.markedSyncedCount === smokeWidgetBubbles.length &&
        widgetUsageSync.data.sentCount === smokeWidgetBubbles.length &&
        widgetUsageSync.data.stagedCount === smokeWidgetBubbles.length,
      "all bubble widget usage summaries marked SQLite rollups as SYNCED",
      widgetUsageSync,
    );
    const remainingWidgetUsage = await tauriCommands.syncWidgetUsageSummary({
      rollupKeys: smokeRollupKeys,
    });
    assert(
      remainingWidgetUsage.rollups.length === 0 && remainingWidgetUsage.sentCount === 0,
      "synced all bubble widget usage rollups no longer remain pending",
      remainingWidgetUsage,
    );
    const todayWidgetUsage = await widgetApi.getTodayUsageRollups();
    assert(
      widgetUsageSync.status === "ready" &&
        widgetUsageSync.data.responses.length === smokeWidgetBubbles.length &&
        widgetUsageSync.data.responses.every((response) =>
          todayWidgetUsage.byDevice.some((item) => item.id === response.id),
        ),
      "synced all bubble widget usage appears in real backend today readback",
      todayWidgetUsage,
    );

    let manualOutboxFileExpected = false;
    let manualOutboxFolderId: string | null = null;

    if (smokeFolderPath) {
      const folder = await tauriCommands.selectManagedFolder({ path: smokeFolderPath });
      await tauriCommands.setFolderSync({ enabled: true, localFolderId: folder.localFolderId });
      const scan = await tauriCommands.scanManagedFolder({ localFolderId: folder.localFolderId });
      assert(scan.changedCount >= 1, "managed folder scan indexed temp file", scan);

      const search = await tauriCommands.searchLocalFiles({ limit: 5, query: "runtime smoke" });
      assert(search.items.length >= 1, "local file search returned indexed temp file", search);

      const preview = await tauriCommands.readLocalFilePreview({
        localFileId: search.items[0].localFileId,
        maxChars: 500,
      });
      assert(preview.status === "READY", "local file preview is readable", preview);

      const stagedFiles = await tauriCommands.stageLocalFileEventsForSync({
        limit: 10,
        localFolderId: folder.localFolderId,
      });
      assert(stagedFiles.events.length >= 1, "local file events staged for backend sync", stagedFiles);

      const initialSync = await syncStagedLocalFileEventsToBackend(stagedFiles);
      assert(
        initialSync.response.results.every((result) => result.status === "SYNCED") &&
          initialSync.markResult.failedCount === 0 &&
          initialSync.markResult.syncedCount >= 1,
        "local file event sync marked SQLite rows as SYNCED",
        initialSync,
      );
      const analysisCandidate = findSyncedLocalFileAnalysisCandidate(stagedFiles, initialSync);
      assert(analysisCandidate, "synced structured or RTF local file has backend resource for analysis", {
        initialSync,
        stagedFiles,
      });
      const localFileAnalysis = await analyzePersonalLocalFileWithKeySentences({
        consentGranted: true,
        localFileId: analysisCandidate.localFileId,
        maxChars: 1_200,
        maxSentenceChars: 240,
        maxSentences: 3,
        resourceId: analysisCandidate.resourceId,
      });
      assert(
        localFileAnalysis.status === "ready" &&
          localFileAnalysis.data.extraction.keySentences.length >= 1 &&
          localFileAnalysis.data.job.jobType === "ANALYZE_RESOURCE" &&
          localFileAnalysis.data.job.jobId &&
          localFileAnalysis.data.job.resourceId === analysisCandidate.resourceId,
        "local file key-sentence analysis reached real backend job",
        localFileAnalysis,
      );
      const localFileAnalysisJobReadback = await agentApi.getJob(localFileAnalysis.data.job.jobId);
      assert(
        localFileAnalysisJobReadback.jobId === localFileAnalysis.data.job.jobId &&
          localFileAnalysisJobReadback.jobType === "ANALYZE_RESOURCE" &&
          localFileAnalysisJobReadback.resourceId === analysisCandidate.resourceId,
        "local file analysis backend job read back",
        localFileAnalysisJobReadback,
      );
      const localFileAnalysisStatus = await getPersonalLocalFileAnalysisStatus({
        consentGranted: true,
        maxAttempts: 3,
      });
      assert(
        localFileAnalysisStatus.status === "ready" && localFileAnalysisStatus.data.syncedCount >= 1,
        "local file analysis ledger marked SYNCED in SQLite",
        localFileAnalysisStatus,
      );
      const remainingAnalysisBackfill = await tauriCommands.stageLocalFileAnalysisBackfill({
        limit: 20,
        maxAttempts: 3,
      });
      assert(
        !remainingAnalysisBackfill.candidates.some(
          (candidate) => candidate.localFileId === analysisCandidate.localFileId,
        ),
        "synced local file analysis no longer remains pending",
        remainingAnalysisBackfill,
      );

      const watch = await tauriCommands.watchManagedFolder({ localFolderId: folder.localFolderId });
      assert(watch.watching, "managed folder watcher started", watch);
      await sleep(500);
      const mutation = await triggerManagedFolderMutation();
      const watchedEvents = await waitForManagedFolderEvents(folder.localFolderId, ["UPDATED", "DELETED"]);
      const watchedTypes = new Set(watchedEvents.events.map((event) => event.eventType));
      assert(
        watchedTypes.has("UPDATED") && watchedTypes.has("DELETED"),
        "managed folder watcher staged update and delete events",
        { mutation, watchedEvents },
      );
      const watchedSync = await syncStagedLocalFileEventsToBackend(watchedEvents);
      assert(
        watchedSync.response.results.every((result) => result.status === "SYNCED") &&
          watchedSync.markResult.failedCount === 0 &&
          watchedSync.markResult.syncedCount >= 2,
        "watched file event sync marked SQLite rows as SYNCED",
        watchedSync,
      );
      const remainingWatchedEvents = await tauriCommands.stageLocalFileEventsForSync({
        limit: 20,
        localFolderId: folder.localFolderId,
      });
      const remainingNames = localFileEventNames(remainingWatchedEvents.events);
      assert(
        !remainingNames.has("runtime-smoke-note.txt") && !remainingNames.has("runtime-smoke-delete.txt"),
        "synced watched file events no longer remain pending",
        remainingWatchedEvents,
      );
      const manualOutboxFile = await triggerManualOutboxFileCreation();
      const manualOutboxFileEvents = await waitForManagedFolderEvents(folder.localFolderId, ["CREATED"]);
      assert(
        localFileEventNames(manualOutboxFileEvents.events).has("runtime-smoke-manual-outbox.dat"),
        "manual outbox file event staged for integrated sync",
        { manualOutboxFile, manualOutboxFileEvents },
      );
      manualOutboxFileExpected = true;
      manualOutboxFolderId = folder.localFolderId;
      await tauriCommands.unwatchAllManagedFolders();
    }

    const manualOutboxNow = new Date();
    const manualOutboxActivity = await tauriCommands.recordActivityContext({
      appName: "Codex Tauri manual outbox smoke",
      capturedAt: manualOutboxNow.toISOString(),
      durationSeconds: 45,
      endedAt: manualOutboxNow.toISOString(),
      roomId: smokeRoomId,
      startedAt: new Date(manualOutboxNow.getTime() - 45_000).toISOString(),
      windowTitle: "Integrated local outbox sync",
    });
    await tauriCommands.recordWidgetUsageEvent({
      bubbleType: "todo",
      eventType: "runtime-smoke:manual-outbox",
      itemId: "codex-runtime-smoke-manual-outbox",
      itemType: "TASK",
      occurredAt: manualOutboxNow.toISOString(),
    });
    const manualOutboxWidgetRollupKey = `${manualOutboxNow.toISOString().slice(0, 10)}:todo`;
    const manualOutboxSync = await syncAllLocalOutboxToServer({ limit: 50 });
    assert(manualOutboxSync.status === "ready", "manual integrated outbox sync reached backend paths", manualOutboxSync);
    assert(
      manualOutboxSync.data.activityFailedCount === 0 &&
        manualOutboxSync.data.widgetFailedCount === 0 &&
        manualOutboxSync.data.activitySentCount >= 1 &&
        manualOutboxSync.data.widgetSentCount >= 1 &&
        (!manualOutboxFileExpected || manualOutboxSync.data.fileSentCount >= 1),
      "manual integrated outbox sync sent file activity and widget usage",
      manualOutboxSync,
    );
    const remainingManualActivity = await tauriCommands.stageActivityContextsForSync({ limit: 50 });
    assert(
      !remainingManualActivity.activities.some((item) => item.localActivityId === manualOutboxActivity.localActivityId),
      "manual outbox activity no longer remains pending",
      remainingManualActivity,
    );
    const remainingManualWidgetUsage = await tauriCommands.syncWidgetUsageSummary();
    assert(
      !remainingManualWidgetUsage.rollups.some((rollup) => rollup.rollupKey === manualOutboxWidgetRollupKey),
      "manual outbox widget usage no longer remains pending",
      remainingManualWidgetUsage,
    );
    if (manualOutboxFolderId) {
      const remainingManualFileEvents = await tauriCommands.stageLocalFileEventsForSync({
        limit: 20,
        localFolderId: manualOutboxFolderId,
      });
      assert(
        !localFileEventNames(remainingManualFileEvents.events).has("runtime-smoke-manual-outbox.dat"),
        "manual outbox file event no longer remains pending",
        remainingManualFileEvents,
      );
    }

    await tauriCommands.closeAllWidgetWindows();
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false });
    await launchTauriAuthenticatedSurfaces();
    const launcherWidgetStates = await Promise.all(
      smokeWidgetBubbles.map((bubbleType) =>
        tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
      ),
    );
    assert(
      launcherWidgetStates.every((widget) => widget.windowVisible && widget.selectedRoomId === smokeRoomId),
      "post-login launcher opened all bubble widgets with project room context",
      launcherWidgetStates,
    );
    assert(
      isActivityAutoCaptureRunning() &&
        isManagedFolderAutoSyncRunning() &&
        isWidgetUsageAutoSyncRunning(),
      "post-login launcher started activity folder and widget sync loops",
      {
        activityAutoCaptureRunning: isActivityAutoCaptureRunning(),
        managedFolderAutoSyncRunning: isManagedFolderAutoSyncRunning(),
        widgetUsageAutoSyncRunning: isWidgetUsageAutoSyncRunning(),
      },
    );
    await stopTauriAuthenticatedSurfaces();

    const closedCount = await tauriCommands.closeAllWidgetWindows();
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false });
    addCheck("widget windows cleaned up", { closedCount });

    await postReport({
      checks,
      durationMs: Date.now() - startedAt,
      finishedAt: new Date().toISOString(),
      platform: navigator.userAgent,
      status: "passed",
    });
  } catch (error) {
    await stopTauriAuthenticatedSurfaces().catch(() => undefined);
    await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
    await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
    await postReport({
      checks,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString(),
      platform: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      status: "failed",
    });
  } finally {
    if (smokeShouldQuit) {
      await tauriCommands.quitApp().catch(() => undefined);
    }
  }
}

export function TauriRuntimeSmokeRunner() {
  const pathname = usePathname();
  const isDesktopWidgetSurface = pathname === "/desktop-widget" || pathname.startsWith("/desktop-widget/");

  useEffect(() => {
    if (!smokeEnabled || isDesktopWidgetSurface) return;

    const timer = window.setTimeout(() => {
      void runSmoke();
    }, 1_500);

    return () => window.clearTimeout(timer);
  }, [isDesktopWidgetSurface]);

  return null;
}
