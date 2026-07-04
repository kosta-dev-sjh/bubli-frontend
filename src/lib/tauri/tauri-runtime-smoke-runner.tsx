"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { managedFolderApi } from "@/features/managed-folder/api/managedFolderApi";
import { activityApi } from "@/features/activity/api/activityApi";
import { authApi } from "@/features/auth/api/authApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { clearStoredAuthSession, getStoredAuthSession } from "@/lib/auth/auth-session";
import { tauriCommands } from "@/lib/tauri/commands";
import type { LocalFileEventsSyncStageResult } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
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

async function waitForManagedFolderEvents(localFolderId: string, requiredEventTypes: Array<"UPDATED" | "DELETED">) {
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

async function seedDevAuthSession() {
  const accessToken = process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN;
  if (!accessToken) return null;

  clearStoredAuthSession();
  return authApi.loginWithDevAccessToken(accessToken);
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

    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    const windows = await tauriCommands.openWidgetWindows({
      windows: [
        { bubbleType: "bar", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "bar" },
        { bubbleType: "todo", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "todo" },
        { bubbleType: "chat", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "chat" },
        { bubbleType: "timer", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "timer" },
      ],
    });
    assert(windows.length >= 4, "native widget windows opened", windows.map((window) => window.windowId));

    await tauriCommands.setWidgetRoomContext({ selectedRoomId: smokeRoomId });
    const todoWindow = await tauriCommands.getWidgetWindowState({ windowId: "todo" });
    assert(todoWindow.windowVisible, "todo widget window visible", todoWindow);
    assert(todoWindow.selectedRoomId === smokeRoomId, "widget room context propagated", todoWindow);

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

    const widgetUsageOccurredAt = new Date().toISOString();
    const widgetUsageSummaryDate = widgetUsageOccurredAt.slice(0, 10);
    await tauriCommands.recordWidgetUsageEvent({
      bubbleType: "todo",
      eventType: "runtime-smoke:click",
      itemId: "codex-runtime-smoke",
      itemType: "TASK",
      occurredAt: widgetUsageOccurredAt,
    });
    const rollups = await tauriCommands.rollupWidgetUsage({ summaryDate: widgetUsageSummaryDate });
    const smokeRollup = rollups.find(
      (rollup) => rollup.rollupKey === `${widgetUsageSummaryDate}:todo` && rollup.bubbleType === "todo",
    );
    assert(
      smokeRollup && smokeRollup.sourceEventCount >= 1 && smokeRollup.interactionCount >= 1,
      "widget usage rollup created",
      smokeRollup ?? rollups,
    );
    const widgetUsageSync = await syncLocalWidgetUsageSummaryToServer({
      rollupKeys: [smokeRollup.rollupKey],
    });
    assert(widgetUsageSync.status === "ready", "widget usage summary reached backend sync API", widgetUsageSync);
    assert(
      widgetUsageSync.status === "ready" &&
        widgetUsageSync.data.failedCount === 0 &&
        widgetUsageSync.data.markedSyncedCount === 1 &&
        widgetUsageSync.data.sentCount === 1 &&
        widgetUsageSync.data.stagedCount === 1,
      "widget usage summary marked SQLite rollups as SYNCED",
      widgetUsageSync,
    );
    const remainingWidgetUsage = await tauriCommands.syncWidgetUsageSummary({
      rollupKeys: [smokeRollup.rollupKey],
    });
    assert(
      remainingWidgetUsage.rollups.length === 0 && remainingWidgetUsage.sentCount === 0,
      "synced widget usage rollup no longer remains pending",
      remainingWidgetUsage,
    );

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
      await tauriCommands.unwatchAllManagedFolders();
    }

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
