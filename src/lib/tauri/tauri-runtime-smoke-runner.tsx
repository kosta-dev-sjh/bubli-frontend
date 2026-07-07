"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { chatApi } from "@/features/communication/api/chatApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { managedFolderApi } from "@/features/managed-folder/api/managedFolderApi";
import { agentApi } from "@/features/agent/api/agentApi";
import { activityApi } from "@/features/activity/api/activityApi";
import { authApi } from "@/features/auth/api/authApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { clearStoredAuthSession, getStoredAuthSession } from "@/lib/auth/auth-session";
import {
  flushActivityAutoCapture,
  getActivityAutoCaptureStatus,
  isActivityAutoCaptureRunning,
  startActivityAutoCapture,
  stopActivityAutoCapture,
} from "@/lib/local/activity-auto-capture";
import {
  flushManagedFolderAutoSync,
  getManagedFolderAutoSyncStatus,
  isManagedFolderAutoSyncRunning,
  startManagedFolderAutoSync,
  stopManagedFolderAutoSync,
} from "@/lib/local/managed-folder-auto-sync";
import {
  analyzePersonalLocalFileWithKeySentences,
  getPersonalLocalFileAnalysisStatus,
} from "@/lib/local/managed-folder-client";
import { syncAllLocalOutboxToServer } from "@/lib/sync/local-sync-client";
import { launchTauriAuthenticatedSurfaces, stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { readTauriAuthWidgetQaSnapshot } from "@/lib/tauri/tauri-auth-widget-qa";
import { tauriCommands } from "@/lib/tauri/commands";
import type { LocalFileEventsSyncStageResult } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { isWidgetUsageAutoSyncRunning } from "@/lib/widget/widget-usage-auto-sync";
import { syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";
import { chatTypingDestinations, getChatRealtimeClient } from "@/lib/websocket/chat-realtime";
import { websocketTopics } from "@/lib/websocket/topics";

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
  timings?: Record<string, number>;
};

type SmokeAssert = (condition: unknown, name: string, detail?: unknown) => asserts condition;
type SmokeWidgetBubble = "agent" | "alert" | "chat" | "memo" | "resource" | "schedule" | "timer" | "todo";

const smokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
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
const smokeTaskItemId = "66666666-6666-4666-8666-666666666661";
const runtimeSmokeFolderMarker = "bubli-tauri-runtime-smoke-";
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
const smokeAutoLoginWidgetBubbles = smokeWidgetBubbles.filter((bubbleType) => bubbleType !== "resource");

function runtimeSmokeWidgetPosition(bubbleType: SmokeWidgetBubble) {
  const index = smokeWidgetBubbles.indexOf(bubbleType);
  return { x: 120 + index * 12, y: 96 + index * 10 };
}

function isWindowsRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("windows");
}

function isMacRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("mac");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function measureSmokeTiming<T>(
  timings: Record<string, number>,
  name: string,
  read: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await read();
  } finally {
    timings[name] = Date.now() - startedAt;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRealtimeChatMessageFor(
  value: unknown,
  chatRoomId: string,
  clientMessageId: string,
): value is { chatRoomId: string; clientMessageId: string; roomSequence?: number } {
  return (
    isObject(value) &&
    value.chatRoomId === chatRoomId &&
    value.clientMessageId === clientMessageId &&
    (value.roomSequence === undefined || typeof value.roomSequence === "number")
  );
}

function isRealtimeTypingEventFor(
  value: unknown,
  chatRoomId: string,
  typing: boolean,
): value is { chatRoomId: string; typing: boolean; userId?: string; userName?: string } {
  return (
    isObject(value) &&
    value.chatRoomId === chatRoomId &&
    value.typing === typing &&
    (value.userId === undefined || typeof value.userId === "string") &&
    (value.userName === undefined || typeof value.userName === "string")
  );
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

async function triggerIndexedFileMutation() {
  const mutationUrl = smokeControlUrl("/mutate-indexed-file");
  if (!mutationUrl) {
    throw new Error("runtime smoke indexed-file mutation endpoint is not configured");
  }

  const response = await fetch(mutationUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`runtime smoke indexed-file mutation failed: ${response.status}`);
  }

  return response.json().catch(() => null) as Promise<{ marker?: string; updatedFileName?: string } | null>;
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

async function waitForLocalAutoSyncCondition<T>(
  read: () => T,
  matches: (value: T) => boolean,
  input?: { attempts?: number; delayMs?: number },
) {
  const attempts = input?.attempts ?? 30;
  const delayMs = input?.delayMs ?? 500;
  let latest = read();

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (matches(latest)) return latest;
    await sleep(delayMs);
    latest = read();
  }

  return latest;
}

function localFileEventNames(events: Array<{ fileName: string }>) {
  return new Set(events.map((event) => event.fileName));
}

const runtimeSmokeAnalysisFilePattern = /^runtime-smoke-(structured|rich)\.(json|rtf)$/i;
const analyzableRuntimeSmokeFilePattern =
  /\.(csv|docx|htm|html|hwpx|json|jsonl|markdown|md|pdf|pptx|rtf|tsv|txt|xlsx|ya?ml)$/i;

async function verifyWidgetRestartLayout(assert: SmokeAssert) {
  const restartedWidgetStates = await Promise.all(
    smokeWidgetBubbles.map((bubbleType) =>
      tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
    ),
  );

  assert(
    restartedWidgetStates.every((widget) => {
      const expected = runtimeSmokeWidgetPosition(widget.activeBubble as SmokeWidgetBubble);
      return (
        widget.selectedRoomId === smokeRoomId &&
        widget.position.x === expected.x &&
        widget.position.y === expected.y
      );
    }),
    "widget layout restored positions and room context after app restart",
    restartedWidgetStates,
  );
  await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
  await tauriCommands.openWidgetWindows({
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
  const rebuiltWidgetStates = await Promise.all(
    smokeWidgetBubbles.map((bubbleType) =>
      tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
    ),
  );

  assert(
    rebuiltWidgetStates.every((widget) => {
      const expected = runtimeSmokeWidgetPosition(widget.activeBubble as SmokeWidgetBubble);
      return (
        widget.mode === "DEFAULT" &&
        widget.windowVisible &&
        widget.selectedRoomId === smokeRoomId &&
        widget.position.x === expected.x &&
        widget.position.y === expected.y
      );
    }),
    "widget layout rebuilt native windows after app restart",
    rebuiltWidgetStates,
  );
}

async function persistWidgetRestartLayoutCheckpoint(assert: SmokeAssert) {
  await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
  await tauriCommands.openWidgetWindows({
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
  const checkpointStates = await Promise.all(
    smokeWidgetBubbles.map((bubbleType) =>
      tauriCommands.setWidgetWindowPosition({
        bubbleType,
        windowId: bubbleType,
        ...runtimeSmokeWidgetPosition(bubbleType),
      }),
    ),
  );

  assert(
    checkpointStates.every((widget) => {
      const expected = runtimeSmokeWidgetPosition(widget.activeBubble as SmokeWidgetBubble);
      return (
        widget.mode === "DEFAULT" &&
        widget.windowVisible &&
        widget.selectedRoomId === smokeRoomId &&
        widget.position.x === expected.x &&
        widget.position.y === expected.y
      );
    }),
    "widget restart layout checkpoint persisted before app restart",
    checkpointStates,
  );
  await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false });
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

async function openRealtimeChatMessageProbe(
  chatRoomId: string,
  clientMessageId: string,
  assert: SmokeAssert,
) {
  assert(
    Boolean(process.env.NEXT_PUBLIC_WS_URL),
    "real backend websocket URL configured for runtime smoke",
    { hasWsUrl: Boolean(process.env.NEXT_PUBLIC_WS_URL) },
  );

  const client = getChatRealtimeClient();
  const destination = websocketTopics.chatRoom(chatRoomId);
  const startedAt = Date.now();
  let settled = false;
  let unsubscribe: () => void = () => undefined;
  let timeout: number | null = null;

  const messagePromise = new Promise<{ chatRoomId: string; clientMessageId: string; roomSequence?: number }>(
    (resolve, reject) => {
      timeout = window.setTimeout(() => {
        finish(
          null,
          new Error(
            `Timed out waiting for runtime smoke STOMP chat delivery after ${Date.now() - startedAt}ms.`,
          ),
        );
      }, 10000);

      unsubscribe = client.subscribe(destination, (message) => {
        if (!isRealtimeChatMessageFor(message, chatRoomId, clientMessageId)) {
          return;
        }
        finish(message);
      });

      function finish(
        message: { chatRoomId: string; clientMessageId: string; roomSequence?: number } | null,
        error?: Error,
      ) {
        if (settled) return;
        settled = true;
        if (timeout) window.clearTimeout(timeout);
        unsubscribe();
        if (error) {
          reject(error);
          return;
        }
        resolve(message as { chatRoomId: string; clientMessageId: string; roomSequence?: number });
      }
    },
  );

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (client.isOpen()) {
      await sleep(150);
      return {
        cancel() {
          if (settled) return;
          settled = true;
          if (timeout) window.clearTimeout(timeout);
          unsubscribe();
        },
        message: messagePromise,
      };
    }
    await sleep(125);
  }

  if (timeout) window.clearTimeout(timeout);
  unsubscribe();
  throw new Error(`Timed out waiting for runtime smoke STOMP connection to ${destination}.`);
}

async function openRealtimeTypingProbe(chatRoomId: string, typing: boolean, assert: SmokeAssert) {
  assert(
    process.env.NEXT_PUBLIC_CHAT_TYPING_RELAY === "true",
    "real backend chat typing relay enabled for runtime smoke",
    { typingRelayEnabled: process.env.NEXT_PUBLIC_CHAT_TYPING_RELAY === "true" },
  );

  const client = getChatRealtimeClient();
  const destination = chatTypingDestinations.subscribe(chatRoomId);
  const startedAt = Date.now();
  let settled = false;
  let unsubscribe: () => void = () => undefined;
  let timeout: number | null = null;

  const messagePromise = new Promise<{ chatRoomId: string; typing: boolean; userId?: string; userName?: string }>(
    (resolve, reject) => {
      timeout = window.setTimeout(() => {
        finish(
          null,
          new Error(
            `Timed out waiting for runtime smoke STOMP typing relay after ${Date.now() - startedAt}ms.`,
          ),
        );
      }, 10000);

      unsubscribe = client.subscribe(destination, (message) => {
        if (!isRealtimeTypingEventFor(message, chatRoomId, typing)) {
          return;
        }
        finish(message);
      });

      function finish(
        message: { chatRoomId: string; typing: boolean; userId?: string; userName?: string } | null,
        error?: Error,
      ) {
        if (settled) return;
        settled = true;
        if (timeout) window.clearTimeout(timeout);
        unsubscribe();
        if (error) {
          reject(error);
          return;
        }
        resolve(message as { chatRoomId: string; typing: boolean; userId?: string; userName?: string });
      }
    },
  );

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (client.isOpen()) {
      await sleep(150);
      return {
        cancel() {
          if (settled) return;
          settled = true;
          if (timeout) window.clearTimeout(timeout);
          unsubscribe();
        },
        message: messagePromise,
      };
    }
    await sleep(125);
  }

  if (timeout) window.clearTimeout(timeout);
  unsubscribe();
  throw new Error(`Timed out waiting for runtime smoke STOMP connection to ${destination}.`);
}

async function verifyRealBackendWidgetItemState(assert: SmokeAssert) {
  await widgetApi.updateItemState(smokeTaskItemId, {
    bubbleType: "TODO",
    itemId: smokeTaskItemId,
    itemType: "TASK",
    state: "PINNED",
  });
  const pinnedStates = await widgetApi.listItemStates([smokeTaskItemId]);
  assert(
    pinnedStates.some(
      (itemState) =>
        itemState.itemId === smokeTaskItemId &&
        itemState.bubbleType === "TODO" &&
        itemState.itemType === "TASK" &&
        itemState.state === "PINNED",
    ),
    "real backend widget item state pinned readback from Tauri runtime",
    pinnedStates,
  );

  await widgetApi.updateItemState(smokeTaskItemId, {
    bubbleType: "TODO",
    itemId: smokeTaskItemId,
    itemType: "TASK",
    state: "VISIBLE",
  });
  const restoredStates = await widgetApi.listItemStates([smokeTaskItemId]);
  assert(
    restoredStates.some(
      (itemState) =>
        itemState.itemId === smokeTaskItemId &&
        itemState.bubbleType === "TODO" &&
        itemState.itemType === "TASK" &&
        itemState.state === "VISIBLE",
    ),
    "real backend widget item state restored after Tauri runtime smoke",
    restoredStates,
  );
}

async function verifyRealBackendWidgetSettings(assert: SmokeAssert) {
  const originalSettings = await widgetApi.getSettings();
  const originalTodoSetting = originalSettings.bubbles.find((bubble) => bubble.bubbleType === "TODO");
  assert(originalTodoSetting?.id, "real backend widget settings included TODO bubble before Tauri patch", originalSettings);

  const restoreTodoSetting = {
    alertEnabled: originalTodoSetting.alertEnabled,
    bubbleType: "TODO" as const,
    enabled: originalTodoSetting.enabled,
    ghostMode: originalTodoSetting.ghostMode,
    height: originalTodoSetting.height ?? null,
    minimized: originalTodoSetting.minimized,
    opacity: originalTodoSetting.opacity ?? null,
    width: originalTodoSetting.width ?? null,
    x: originalTodoSetting.x ?? null,
    y: originalTodoSetting.y ?? null,
  };

  try {
    const patchedSettings = await widgetApi.updateSettings({
      bubbles: [
        {
          alertEnabled: false,
          bubbleType: "TODO",
          enabled: true,
          ghostMode: true,
          height: 333,
          minimized: false,
          opacity: 0.88,
          width: 321,
          x: 77,
          y: 88,
        },
      ],
    });
    const patchedTodoSetting = patchedSettings.bubbles.find((bubble) => bubble.bubbleType === "TODO");
    assert(
      patchedTodoSetting?.id === originalTodoSetting.id &&
        patchedTodoSetting.enabled === true &&
        patchedTodoSetting.x === 77 &&
        patchedTodoSetting.y === 88 &&
        patchedTodoSetting.width === 321 &&
        patchedTodoSetting.height === 333 &&
        patchedTodoSetting.minimized === false &&
        Number(patchedTodoSetting.opacity) === 0.88 &&
        patchedTodoSetting.ghostMode === true &&
        patchedTodoSetting.alertEnabled === false,
      "real backend widget settings PATCH persisted TODO layout and flags in Tauri runtime",
      patchedTodoSetting,
    );

    const readBackSettings = await widgetApi.getSettings();
    const readBackTodoSetting = readBackSettings.bubbles.find((bubble) => bubble.bubbleType === "TODO");
    assert(
      readBackTodoSetting?.id === originalTodoSetting.id &&
        readBackTodoSetting.x === 77 &&
        readBackTodoSetting.y === 88 &&
        readBackTodoSetting.width === 321 &&
        readBackTodoSetting.height === 333 &&
        Number(readBackTodoSetting.opacity) === 0.88 &&
        readBackTodoSetting.ghostMode === true &&
        readBackTodoSetting.alertEnabled === false,
      "real backend widget settings GET read back patched TODO layout in Tauri runtime",
      readBackTodoSetting,
    );
  } finally {
    const restoredSettings = await widgetApi.updateSettings({ bubbles: [restoreTodoSetting] });
    const restoredTodoSetting = restoredSettings.bubbles.find((bubble) => bubble.bubbleType === "TODO");
    assert(
      restoredTodoSetting?.id === originalTodoSetting.id &&
        restoredTodoSetting.enabled === originalTodoSetting.enabled &&
        (restoredTodoSetting.x ?? null) === (originalTodoSetting.x ?? null) &&
        (restoredTodoSetting.y ?? null) === (originalTodoSetting.y ?? null) &&
        (restoredTodoSetting.width ?? null) === (originalTodoSetting.width ?? null) &&
        (restoredTodoSetting.height ?? null) === (originalTodoSetting.height ?? null) &&
        restoredTodoSetting.minimized === originalTodoSetting.minimized &&
        (restoredTodoSetting.opacity ?? null) === (originalTodoSetting.opacity ?? null) &&
        restoredTodoSetting.ghostMode === originalTodoSetting.ghostMode &&
        restoredTodoSetting.alertEnabled === originalTodoSetting.alertEnabled,
      "real backend widget settings restored after Tauri runtime patch",
      restoredTodoSetting,
    );
  }
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

  const roomEvents = await calendarApi.getProjectRoomEvents(smokeRoomId, { afterSequence: 0, limit: 100 });
  assert(
    Array.isArray(roomEvents.items) &&
      typeof roomEvents.latestSequence === "number" &&
      (roomEvents.lastReceivedSequence === null || typeof roomEvents.lastReceivedSequence === "number") &&
      typeof roomEvents.hasNext === "boolean",
    "real backend project room event catch-up returned sequence list shape",
    roomEvents,
  );
  const seededRoomEvent = roomEvents.items.find(
    (event) =>
      event.roomId === smokeRoomId &&
      event.sequence === 1 &&
      event.eventType === "ROOM_UPDATED" &&
      event.actor?.type === "USER" &&
      event.actor?.id === "11111111-1111-4111-8111-111111111111" &&
      event.payload?.source === "codex-local-seed",
  );
  assert(
    Boolean(seededRoomEvent) && roomEvents.latestSequence >= 1 && (roomEvents.lastReceivedSequence ?? 0) >= 1,
    "real backend project room event catch-up loaded seeded history",
    roomEvents,
  );
  const firstLastReceivedSequence = roomEvents.lastReceivedSequence ?? 0;
  const incrementalRoomEvents = await calendarApi.getProjectRoomEvents(smokeRoomId, {
    afterSequence: firstLastReceivedSequence,
    limit: 10,
  });
  assert(
    incrementalRoomEvents.items.every((event) => event.sequence > firstLastReceivedSequence) &&
      incrementalRoomEvents.latestSequence >= roomEvents.latestSequence &&
      (incrementalRoomEvents.lastReceivedSequence === null ||
        incrementalRoomEvents.lastReceivedSequence > firstLastReceivedSequence),
    "real backend project room event catch-up skipped already received sequences",
    incrementalRoomEvents,
  );

  const chatRooms = await chatApi.listRooms();
  const roomChat = chatRooms.items.find((room) => room.roomId === smokeRoomId);
  assert(roomChat?.id, "real backend chat room resolved for project room", chatRooms);

  const clientMessageId = `tauri-runtime-smoke-${Date.now()}`;
  const messageText = "Tauri runtime smoke real backend chat message";
  const realtimeProbe = await openRealtimeChatMessageProbe(roomChat.id, clientMessageId, assert);
  let sentMessage: Awaited<ReturnType<typeof chatApi.sendMessage>>;
  try {
    sentMessage = await chatApi.sendMessage(roomChat.id, {
      body: { text: messageText },
      clientMessageId,
      messageType: "TEXT",
    });
    assert(
      sentMessage.clientMessageId === clientMessageId && sentMessage.body.text === messageText,
      "real backend chat message sent",
      sentMessage,
    );
    const realtimeMessage = await realtimeProbe.message;
    assert(
      realtimeMessage.clientMessageId === clientMessageId &&
        realtimeMessage.chatRoomId === roomChat.id &&
        realtimeMessage.roomSequence === sentMessage.roomSequence,
      "real backend chat message delivered over STOMP",
      {
        chatRoomId: realtimeMessage.chatRoomId,
        clientMessageId: realtimeMessage.clientMessageId,
        roomSequence: realtimeMessage.roomSequence,
      },
    );
  } catch (error) {
    realtimeProbe.cancel();
    throw error;
  }

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

  const typingProbe = await openRealtimeTypingProbe(roomChat.id, true, assert);
  try {
    const published = getChatRealtimeClient().publish(chatTypingDestinations.publish(roomChat.id), {
      typing: true,
    });
    assert(
      published,
      "real backend chat typing event sent over STOMP",
      { chatRoomId: roomChat.id, typing: true },
    );
    const typingEvent = await typingProbe.message;
    assert(
      typingEvent.chatRoomId === roomChat.id &&
        typingEvent.typing === true &&
        typingEvent.userId === "11111111-1111-4111-8111-111111111111" &&
        typeof typingEvent.userName === "string" &&
        typingEvent.userName.length > 0,
      "real backend chat typing event relayed over STOMP",
      {
        chatRoomId: typingEvent.chatRoomId,
        typing: typingEvent.typing,
        userId: typingEvent.userId,
        userNamePresent: Boolean(typingEvent.userName),
      },
    );
  } catch (error) {
    typingProbe.cancel();
    getChatRealtimeClient().publish(chatTypingDestinations.publish(roomChat.id), { typing: false });
    throw error;
  }

  const typingStopProbe = await openRealtimeTypingProbe(roomChat.id, false, assert);
  try {
    const stopped = getChatRealtimeClient().publish(chatTypingDestinations.publish(roomChat.id), {
      typing: false,
    });
    assert(
      stopped,
      "real backend chat typing stop event sent over STOMP",
      { chatRoomId: roomChat.id, typing: false },
    );
    const typingStopEvent = await typingStopProbe.message;
    assert(
      typingStopEvent.chatRoomId === roomChat.id &&
        typingStopEvent.typing === false &&
        typingStopEvent.userId === "11111111-1111-4111-8111-111111111111" &&
        typeof typingStopEvent.userName === "string" &&
        typingStopEvent.userName.length > 0,
      "real backend chat typing stop event relayed over STOMP",
      {
        chatRoomId: typingStopEvent.chatRoomId,
        typing: typingStopEvent.typing,
        userId: typingStopEvent.userId,
        userNamePresent: Boolean(typingStopEvent.userName),
      },
    );
  } catch (error) {
    typingStopProbe.cancel();
    throw error;
  }

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

async function verifyLocalAutoSyncLoops(assert: SmokeAssert) {
  if (!smokeFolderPath) {
    throw new Error("runtime smoke local-auto-sync phase requires NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_FOLDER");
  }

  await cleanupStaleRuntimeSmokeManagedFolders(smokeFolderPath);
  const folder = await tauriCommands.selectManagedFolder({ path: smokeFolderPath });
  let localAutoSyncFolderId: string | null = folder.localFolderId;
  await tauriCommands.setFolderSync({ enabled: true, localFolderId: folder.localFolderId });
  await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);

  try {
    startActivityAutoCapture();
    startManagedFolderAutoSync();

    const firstActivityStatus = await waitForLocalAutoSyncCondition(
      getActivityAutoCaptureStatus,
      (status) => Boolean(status.lastAttemptAt) && status.lastStatus !== "capturing",
      { attempts: 20, delayMs: 500 },
    );
    assert(
      firstActivityStatus.running &&
        Boolean(firstActivityStatus.lastAttemptAt) &&
        firstActivityStatus.lastStatus !== "failed",
      "local auto-sync activity loop captured first status",
      firstActivityStatus,
    );

    const secondActivityStatus = await waitForLocalAutoSyncCondition(
      getActivityAutoCaptureStatus,
      (status) =>
        Boolean(status.lastAttemptAt) &&
        status.lastAttemptAt !== firstActivityStatus.lastAttemptAt &&
        status.lastStatus !== "capturing",
      { attempts: 20, delayMs: 500 },
    );
    assert(
      secondActivityStatus.running &&
        Boolean(secondActivityStatus.lastAttemptAt) &&
        secondActivityStatus.lastAttemptAt !== firstActivityStatus.lastAttemptAt &&
        secondActivityStatus.lastStatus !== "failed",
      "local auto-sync activity loop repeated on smoke interval",
      secondActivityStatus,
    );

    const watchedStatus = await waitForLocalAutoSyncCondition(
      getManagedFolderAutoSyncStatus,
      (status) => (status.lastWatchedCount ?? 0) >= 1,
      { attempts: 20, delayMs: 500 },
    );
    assert(
      watchedStatus.running && (watchedStatus.lastWatchedCount ?? 0) >= 1,
      "local auto-sync managed folder watcher restored active folders",
      watchedStatus,
    );

    const mutation = await triggerManagedFolderMutation();
    const eventStatus = await waitForLocalAutoSyncCondition(
      getManagedFolderAutoSyncStatus,
      (status) => status.lastWatchEventFolderId === folder.localFolderId,
      { attempts: 20, delayMs: 500 },
    );
    assert(
      eventStatus.lastWatchEventFolderId === folder.localFolderId,
      "local auto-sync managed folder listener observed file change",
      { eventStatus, mutation },
    );

    await flushManagedFolderAutoSync();
    const drainedEvents = await tauriCommands.stageLocalFileEventsForSync({
      limit: 20,
      localFolderId: folder.localFolderId,
    });
    const drainedNames = localFileEventNames(drainedEvents.events);
    const drainedStatus = getManagedFolderAutoSyncStatus();
    const handledFileEventCount =
      (drainedStatus.lastFileEventSyncedCount ?? 0) + (drainedStatus.lastFileEventSkippedCount ?? 0);
    const lastDrainSuccessAt = drainedStatus.lastSuccessAt ? Date.parse(drainedStatus.lastSuccessAt) : 0;
    const observedEventAttemptAt = eventStatus.lastAttemptAt ? Date.parse(eventStatus.lastAttemptAt) : 0;
    const autoDrainCompletedAfterWatchEvent =
      drainedStatus.pendingFolderCount === 0 &&
      drainedStatus.lastStatus === "synced" &&
      Number.isFinite(lastDrainSuccessAt) &&
      Number.isFinite(observedEventAttemptAt) &&
      lastDrainSuccessAt >= observedEventAttemptAt;
    assert(
      !drainedNames.has("runtime-smoke-note.txt") &&
        !drainedNames.has("runtime-smoke-delete.txt") &&
        (((drainedStatus.lastFileEventSentCount ?? 0) >= 1 && handledFileEventCount >= 1) ||
          autoDrainCompletedAfterWatchEvent) &&
        (drainedStatus.lastFileAnalysisFailedCount ?? 0) === 0 &&
        drainedStatus.lastStatus !== "failed",
      "local auto-sync managed folder events drained through backend sync",
      { autoDrainCompletedAfterWatchEvent, drainedEvents, drainedStatus },
    );

    await flushActivityAutoCapture();
    const flushedActivityStatus = getActivityAutoCaptureStatus();
    assert(
      flushedActivityStatus.lastStatus !== "failed",
      "local auto-sync activity flush completed without failure",
      flushedActivityStatus,
    );
  } finally {
    await stopActivityAutoCapture({ flush: true });
    await stopManagedFolderAutoSync({ flush: true });
    await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
    if (localAutoSyncFolderId) {
      await cleanupRuntimeSmokeManagedFolder(localAutoSyncFolderId).catch(() => undefined);
      localAutoSyncFolderId = null;
    }
  }

  const stoppedActivityStatus = getActivityAutoCaptureStatus();
  const stoppedFolderStatus = getManagedFolderAutoSyncStatus();
  assert(
    !isActivityAutoCaptureRunning() &&
      !isManagedFolderAutoSyncRunning() &&
      stoppedActivityStatus.running === false &&
      stoppedFolderStatus.running === false,
    "local auto-sync loops stopped cleanly after smoke",
    { stoppedActivityStatus, stoppedFolderStatus },
  );
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
  const timings: Record<string, number> = {};
  let runtimeSmokeManagedFolderId: string | null = null;
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
        timings,
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
        timings,
      });
      return;
    }

    if (smokePhase === "restore-verify") {
      await verifyWidgetRestartLayout(assert);
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
        timings,
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
    if (smokePhase === "local-auto-sync") {
      await verifyLocalAutoSyncLoops(assert);
      await postReport({
        checks,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        platform: navigator.userAgent,
        status: "passed",
        timings,
      });
      return;
    }

    const serverWidgetContext = await measureSmokeTiming(timings, "widgetApi.updateContext", () =>
      widgetApi.updateContext({ selectedRoomId: smokeRoomId }),
    );
    assert(
      serverWidgetContext.selectedRoomId === smokeRoomId && serverWidgetContext.mode === "ROOM",
      "real backend widget context saved from Tauri runtime",
      serverWidgetContext,
    );
    const serverWidgetContextReadback = await measureSmokeTiming(timings, "widgetApi.getContext", () =>
      widgetApi.getContext(),
    );
    assert(
      serverWidgetContextReadback.selectedRoomId === smokeRoomId &&
        serverWidgetContextReadback.mode === "ROOM",
      "real backend widget context read back in Tauri runtime",
      serverWidgetContextReadback,
    );
    const serverWidgetSummary = await measureSmokeTiming(timings, "widgetApi.getSummary", () =>
      widgetApi.getSummary(smokeRoomId),
    );
    assert(
      serverWidgetSummary.context.selectedRoomId === smokeRoomId &&
        serverWidgetSummary.context.mode === "ROOM",
      "real backend widget summary uses selected project room",
      serverWidgetSummary.context,
    );
    await verifyRealBackendWidgetSettings(assert);
    await verifyRealBackendWidgetItemState(assert);
    await verifyRealBackendRoomCommunication(smokeRoomId, assert);

    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    const windows = await measureSmokeTiming(timings, "tauriCommands.openWidgetWindows.initial", () =>
      tauriCommands.openWidgetWindows({
        windows: [
          { bubbleType: "bar", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "bar" },
          ...smokeWidgetBubbles.map((bubbleType) => ({
            bubbleType,
            mode: "DEFAULT" as const,
            selectedRoomId: smokeRoomId,
            windowId: bubbleType,
          })),
        ],
      }),
    );
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
    const widgetStates = await measureSmokeTiming(timings, "tauriCommands.readWidgetStates.initial", () =>
      Promise.all(
        smokeWidgetBubbles.map((bubbleType) =>
          tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
        ),
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
    const positionedWidgetStates = await Promise.all(
      smokeWidgetBubbles.map((bubbleType) => {
        return tauriCommands.setWidgetWindowPosition({
          bubbleType,
          windowId: bubbleType,
          ...runtimeSmokeWidgetPosition(bubbleType),
        });
      }),
    );
    assert(
      positionedWidgetStates.every((widget) => {
        const expected = runtimeSmokeWidgetPosition(widget.activeBubble as SmokeWidgetBubble);
        return (
          widget.position.x === expected.x &&
          widget.position.y === expected.y &&
          widget.selectedRoomId === smokeRoomId
        );
      }),
      "all bubble widget positions persisted with project room context",
      positionedWidgetStates,
    );
    const minimizedWidgetStates = await Promise.all(
      smokeWidgetBubbles.map((bubbleType) =>
        tauriCommands.setWidgetWindowMode({
          bubbleType,
          mode: "MINIMIZED",
          selectedRoomId: smokeRoomId,
          windowId: bubbleType,
        }),
      ),
    );
    assert(
      minimizedWidgetStates.every(
        (widget) =>
          widget.mode === "MINIMIZED" &&
          !widget.windowVisible &&
          widget.selectedRoomId === smokeRoomId,
      ),
      "all bubble widget windows minimized without losing project room context",
      minimizedWidgetStates,
    );
    const barAfterMinimize = await tauriCommands.getWidgetWindowState({ bubbleType: "bar", windowId: "bar" });
    assert(
      barAfterMinimize.windowVisible,
      "widget bar remains visible after all bubble widgets are minimized",
      barAfterMinimize,
    );
    const minimizedBarItems = await tauriCommands.getWidgetBarItems();
    const minimizedBarItemIds = new Set(minimizedBarItems.map((widget) => widget.windowId ?? widget.activeBubble));
    assert(
      smokeWidgetBubbles.every((bubbleType) => minimizedBarItemIds.has(bubbleType)) &&
        minimizedBarItems.every(
          (widget) =>
            widget.mode === "MINIMIZED" &&
            !widget.windowVisible &&
            widget.selectedRoomId === smokeRoomId,
        ),
      "all minimized bubble widgets appear as bar restore items",
      minimizedBarItems,
    );
    await measureSmokeTiming(timings, "tauriCommands.openWidgetWindows.restore", () =>
      tauriCommands.openWidgetWindows({
        windows: smokeWidgetBubbles.map((bubbleType) => ({
          bubbleType,
          mode: "DEFAULT" as const,
          selectedRoomId: smokeRoomId,
          windowId: bubbleType,
        })),
      }),
    );
    const restoredWidgetStates = await measureSmokeTiming(timings, "tauriCommands.readWidgetStates.restored", () =>
      Promise.all(
        smokeWidgetBubbles.map((bubbleType) =>
          tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
        ),
      ),
    );
    assert(
      restoredWidgetStates.every(
        (widget) => {
          const expected = runtimeSmokeWidgetPosition(widget.activeBubble as SmokeWidgetBubble);
          return (
            widget.mode === "DEFAULT" &&
            widget.windowVisible &&
            widget.selectedRoomId === smokeRoomId &&
            widget.position.x === expected.x &&
            widget.position.y === expected.y
          );
        },
      ),
      "all minimized bubble widget windows restore with position and project room context",
      restoredWidgetStates,
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
    const initialTodayWidgetUsage = await widgetApi.getTodayUsageRollups();
    const widgetUsageSummaryDate = initialTodayWidgetUsage.date;
    for (const bubbleType of smokeWidgetBubbles) {
      await tauriCommands.recordWidgetUsageEvent({
        bubbleType,
        eventType: "runtime-smoke:click",
        itemId: `codex-runtime-smoke-${bubbleType}`,
        itemType: bubbleType === "chat" ? "MESSAGE" : "TASK",
        occurredAt: widgetUsageOccurredAt,
        summaryDate: widgetUsageSummaryDate,
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
      await cleanupStaleRuntimeSmokeManagedFolders(smokeFolderPath);
      const folder = await tauriCommands.selectManagedFolder({ path: smokeFolderPath });
      runtimeSmokeManagedFolderId = folder.localFolderId;
      await tauriCommands.setFolderSync({ enabled: true, localFolderId: folder.localFolderId });
      const scan = await tauriCommands.scanManagedFolder({ localFolderId: folder.localFolderId });
      assert(scan.changedCount >= 1, "managed folder scan indexed temp file", scan);

      const search = await tauriCommands.searchLocalFiles({ limit: 5, query: "runtime smoke" });
      assert(search.items.length >= 1, "local file search returned indexed temp file", search);

      const noteSearch = await tauriCommands.searchLocalFiles({ limit: 5, query: "runtime-smoke-note" });
      const noteFile = noteSearch.items.find((item) => item.name === "runtime-smoke-note.txt") ?? noteSearch.items[0];
      assert(noteFile?.localFileId, "managed folder note file resolved for reindex smoke", noteSearch);

      const preview = await tauriCommands.readLocalFilePreview({
        localFileId: noteFile.localFileId,
        maxChars: 500,
      });
      assert(preview.status === "READY", "local file preview is readable", preview);

      const csvSearch = await tauriCommands.searchLocalFiles({ limit: 5, query: "Runtime smoke CSV" });
      const csvFile = csvSearch.items.find((item) => item.name === "runtime-smoke-table.csv");
      assert(csvFile?.localFileId, "managed folder CSV file resolved for tabular preview", csvSearch);
      const csvPreview = await tauriCommands.readLocalFilePreview({
        localFileId: csvFile.localFileId,
        maxChars: 500,
      });
      assert(
        csvPreview.status === "READY" &&
          Boolean(csvPreview.previewText?.includes("Runtime smoke CSV")) &&
          Boolean(csvPreview.previewText?.includes("Managed folder table")),
        "managed folder CSV preview is readable",
        csvPreview,
      );

      const stagedFiles = await tauriCommands.stageLocalFileEventsForSync({
        limit: 20,
        localFolderId: folder.localFolderId,
      });
      assert(stagedFiles.events.length >= 1, "local file events staged for backend sync", stagedFiles);
      const stagedFileNames = localFileEventNames(stagedFiles.events);
      assert(
        stagedFileNames.has("runtime-smoke-table.csv") && !stagedFileNames.has("~$runtime-smoke-temp.csv"),
        "managed folder temp CSV stayed ignored during initial scan",
        stagedFiles,
      );

      const initialSync = await syncStagedLocalFileEventsToBackend(stagedFiles);
      const csvSyncIndex = stagedFiles.events.findIndex((event) => event.fileName === "runtime-smoke-table.csv");
      const csvSyncResult =
        csvSyncIndex >= 0
          ? initialSync.response.results.find(
              (result) => result.localEventId === stagedFiles.events[csvSyncIndex]?.localEventId,
            ) ?? initialSync.response.results[csvSyncIndex]
          : null;
      assert(
        csvSyncResult?.status === "SYNCED" && Boolean(csvSyncResult.resourceId),
        "local CSV file event reached backend sync batch",
        { csvSyncResult, stagedFiles },
      );
      assert(
        initialSync.response.results.every((result) => result.status === "SYNCED") &&
          initialSync.markResult.failedCount === 0 &&
          initialSync.markResult.syncedCount >= 1,
        "local file event sync marked SQLite rows as SYNCED",
        initialSync,
      );

      const indexedMutation = await triggerIndexedFileMutation();
      const reindex = await tauriCommands.reindexFile({ localFileId: noteFile.localFileId });
      assert(
        reindex.changed &&
          reindex.status === "REINDEXED" &&
          reindex.localFileId === noteFile.localFileId &&
          reindex.name === "runtime-smoke-note.txt",
        "local file reindex refreshed changed temp file",
        { indexedMutation, reindex },
      );
      const reindexedSearch = await tauriCommands.searchLocalFiles({ limit: 5, query: "ReindexSignal" });
      assert(
        reindexedSearch.items.some((item) => item.localFileId === noteFile.localFileId),
        "local file reindex refreshed SQLite FTS search",
        reindexedSearch,
      );
      const reindexedPreview = await tauriCommands.readLocalFilePreview({
        localFileId: noteFile.localFileId,
        maxChars: 1_000,
      });
      assert(
        reindexedPreview.status === "READY" &&
          Boolean(reindexedPreview.previewText?.includes("ReindexSignal")),
        "local file reindex refreshed readable preview",
        reindexedPreview,
      );
      const reindexedEvents = await tauriCommands.stageLocalFileEventsForSync({
        limit: 10,
        localFolderId: folder.localFolderId,
      });
      const reindexedNoteEvents = reindexedEvents.events.filter(
        (event) => event.localFileId === noteFile.localFileId && event.eventType === "UPDATED",
      );
      assert(
        reindexedNoteEvents.length >= 1 && reindexedNoteEvents.every((event) => event.resourceId),
        "local file reindex staged update event with backend resource",
        reindexedEvents,
      );
      const reindexSync = await syncStagedLocalFileEventsToBackend({
        ...reindexedEvents,
        events: reindexedNoteEvents,
      });
      assert(
        reindexSync.response.results.every((result) => result.status === "SYNCED") &&
          reindexSync.markResult.failedCount === 0 &&
          reindexSync.markResult.syncedCount >= 1,
        "local file reindex update event synced to backend",
        reindexSync,
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
    await measureSmokeTiming(timings, "launchTauriAuthenticatedSurfaces", () =>
      launchTauriAuthenticatedSurfaces(),
    );
    const launcherWidgetStates = await measureSmokeTiming(timings, "tauriCommands.readWidgetStates.launcher", () =>
      Promise.all(
        smokeAutoLoginWidgetBubbles.map((bubbleType) =>
          tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
        ),
      ),
    );
    assert(
      launcherWidgetStates.every((widget) => widget.windowVisible && widget.selectedRoomId === smokeRoomId),
      "post-login launcher opened all auto-login bubble widgets with project room context",
      launcherWidgetStates,
    );
    const launcherResourceWidgetState = await tauriCommands.getWidgetWindowState({
      bubbleType: "resource",
      windowId: "resource",
    });
    assert(
      !launcherResourceWidgetState.windowVisible,
      "post-login launcher kept standalone resource widget hidden",
      launcherResourceWidgetState,
    );
    await tauriCommands.closeWidgetWindow({ bubbleType: "chat", windowId: "chat" });
    const closedChatWidgetState = await tauriCommands.getWidgetWindowState({ bubbleType: "chat", windowId: "chat" });
    assert(!closedChatWidgetState.windowVisible, "post-login relaunch setup closed one bubble widget", closedChatWidgetState);
    if (isMacRuntime()) {
      const barItemsAfterClose = await tauriCommands.getWidgetBarItems();
      assert(
        barItemsAfterClose.some((item) => item.activeBubble === "chat" && item.mode === "MINIMIZED" && !item.windowVisible),
        "macOS closed chat widget remains restorable from the bar",
        barItemsAfterClose,
      );
    }
    await tauriCommands.openWidgetWindow({
      bubbleType: "chat",
      mode: "DEFAULT",
      selectedRoomId: smokeRoomId,
      windowId: "chat",
    });
    const restoredChatWidgetState = await tauriCommands.getWidgetWindowState({ bubbleType: "chat", windowId: "chat" });
    assert(
      restoredChatWidgetState.windowVisible && restoredChatWidgetState.selectedRoomId === smokeRoomId,
      isMacRuntime()
        ? "macOS closed chat widget restored from the bar with project room context"
        : "closed chat widget reopened with project room context",
      restoredChatWidgetState,
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
    const authWidgetQaSnapshot = await readTauriAuthWidgetQaSnapshot();
    assert(
      authWidgetQaSnapshot.localSession.hasSession &&
        authWidgetQaSnapshot.tauriMirrorSession.hasSession &&
        authWidgetQaSnapshot.localSession.clientType === "TAURI" &&
        authWidgetQaSnapshot.tauriMirrorSession.clientType === "TAURI",
      "post-login QA snapshot confirmed Tauri auth session without raw tokens",
      authWidgetQaSnapshot,
    );
    assert(
      authWidgetQaSnapshot.backend.me.ok &&
        authWidgetQaSnapshot.backend.widgetContext.ok &&
        authWidgetQaSnapshot.backend.widgetSummary.ok,
      "post-login QA snapshot confirmed real backend auth and widget APIs",
      authWidgetQaSnapshot.backend,
    );
    assert(
      authWidgetQaSnapshot.activeProjectRoom.memoryRoomId === smokeRoomId &&
        authWidgetQaSnapshot.activeProjectRoom.tauriRoomId === smokeRoomId &&
        authWidgetQaSnapshot.activeProjectRoom.serverSelectedRoomId === smokeRoomId &&
        authWidgetQaSnapshot.activeProjectRoom.tauriMatchesMemory &&
        authWidgetQaSnapshot.activeProjectRoom.tauriMatchesServerContext,
      "post-login QA snapshot confirmed project room context across memory Tauri and backend",
      authWidgetQaSnapshot.activeProjectRoom,
    );
    assert(
      authWidgetQaSnapshot.widgetRuntime.allExpectedWindowsVisible &&
        authWidgetQaSnapshot.widgetRuntime.allWindowRoomContextMatchesActive &&
        authWidgetQaSnapshot.widgetRuntime.barRestoreItems.allMatchActiveRoom,
      "post-login QA snapshot confirmed all widget windows and restore items",
      authWidgetQaSnapshot.widgetRuntime,
    );
    await stopTauriAuthenticatedSurfaces();
    const stoppedActiveProjectRoom = await tauriCommands.readActiveProjectRoom();
    assert(
      stoppedActiveProjectRoom === null,
      "post-login stop cleared active project room context",
      stoppedActiveProjectRoom,
    );
    const stoppedWidgetStates = await Promise.all(
      smokeWidgetBubbles.map((bubbleType) =>
        tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType }),
      ),
    );
    assert(
      stoppedWidgetStates.every((widget) => !widget.windowVisible),
      "post-login stop closed all bubble widget windows",
      stoppedWidgetStates,
    );
    assert(
      !isActivityAutoCaptureRunning() &&
        !isManagedFolderAutoSyncRunning() &&
        !isWidgetUsageAutoSyncRunning(),
      "post-login stop stopped activity folder and widget sync loops",
      {
        activityAutoCaptureRunning: isActivityAutoCaptureRunning(),
        managedFolderAutoSyncRunning: isManagedFolderAutoSyncRunning(),
        widgetUsageAutoSyncRunning: isWidgetUsageAutoSyncRunning(),
      },
    );
    await persistWidgetRestartLayoutCheckpoint(assert);

    const managedFolderCleanup = await cleanupRuntimeSmokeManagedFolder(runtimeSmokeManagedFolderId);
    runtimeSmokeManagedFolderId = null;
    if (managedFolderCleanup) {
      assert(
        managedFolderCleanup.status === "REMOVED",
        "runtime smoke managed folder removed after Windows QA",
        managedFolderCleanup,
      );
    }

    await postReport({
      checks,
      durationMs: Date.now() - startedAt,
      finishedAt: new Date().toISOString(),
      platform: navigator.userAgent,
      status: "passed",
      timings,
    });
  } catch (error) {
    await stopTauriAuthenticatedSurfaces().catch(() => undefined);
    await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
    await cleanupRuntimeSmokeManagedFolder(runtimeSmokeManagedFolderId).catch(() => undefined);
    runtimeSmokeManagedFolderId = null;
    await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
    await postReport({
      checks,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString(),
      platform: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      status: "failed",
      timings,
    });
  } finally {
    if (smokeShouldQuit) {
      await tauriCommands.quitApp().catch(() => undefined);
    }
  }
}

async function cleanupRuntimeSmokeManagedFolder(localFolderId: string | null) {
  if (!localFolderId) return null;

  await tauriCommands.unwatchAllManagedFolders().catch(() => undefined);
  return tauriCommands.removeManagedFolder({ localFolderId });
}

async function cleanupStaleRuntimeSmokeManagedFolders(currentSmokeFolderPath: string) {
  const folders = await tauriCommands.listManagedFolders().catch(() => null);
  if (!folders) return 0;

  const staleFolders = folders.folders.filter((folder) => {
    return (
      folder.path.includes(runtimeSmokeFolderMarker) &&
      folder.path !== currentSmokeFolderPath &&
      folder.status !== "REMOVED"
    );
  });

  const results = await Promise.allSettled(
    staleFolders.map((folder) => tauriCommands.removeManagedFolder({ localFolderId: folder.localFolderId })),
  );

  return results.filter((result) => result.status === "fulfilled").length;
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
