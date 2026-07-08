"use client";

import { Room, RoomEvent, Track } from "livekit-client";
import type { Participant, RemoteTrack } from "livekit-client";
import { Phone } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { dispatchEmojiSplash, extractEmojiSplashEmojis } from "@/features/communication/components/emoji-splash-layer";
import { inferAgentCommandMode, parseAgentCommandText } from "@/features/communication/lib/agent-commands";
import {
  widgetDisplayApi,
  type WidgetAgentSuggestionResponse,
  type WidgetChatMessageResponse,
  type WidgetChatRoomResponse,
  type WidgetDashboardWorkResponse,
  type WidgetFriendResponse,
  type WidgetMemoResponse,
  type WidgetNotificationResponse,
  type WidgetProjectRoomResponse,
  type WidgetResourceResponse,
  type WidgetScheduleResponse,
  type WidgetTaskResponse,
  type WidgetVoiceRoomResponse,
} from "@/features/widget/api/widgetDisplayApi";
import { agentApi } from "@/features/agent/api/agentApi";
import { authApi } from "@/features/auth/api/authApi";
import { resolveResourceDownloadUrl } from "@/features/resources/components/resource-board-common";
import { ApiClientError } from "@/lib/api/errors";
import type { FriendRequestApiResponse } from "@/types/api/friend";
import {
  widgetApi,
  type BackendWidgetBubbleType,
  type BackendWidgetItemType,
  type WidgetBubbleSettingResponse,
  type WidgetContextResponse,
} from "@/features/widget/api/widgetApi";
import {
  widgetCommunicationApi,
  type PersonalAgentCommandResponse,
  type PersonalAgentMemoryMessage,
} from "@/features/widget/api/widgetCommunicationApi";
import { DesktopWidgetBubble, DesktopWidgetBubbleBar, desktopWidgetBubbleTypes, widgetInteractiveRectSelector } from "@/features/widget/components/desktop-widget-bubble";
import {
  getWidgetPreviewBubble,
  type WidgetNotificationSignal,
  type WidgetPreviewBubble,
  type WidgetPreviewItem,
} from "@/features/widget/desktop-widget-preview-data";
import { notificationApi } from "@/features/notification/api/notificationApi";
import { formatNotificationContent, isUnreadNotificationInboxItem } from "@/features/notification/format-notification";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { timerApi } from "@/features/timer/api/timerApi";
import { todoApi } from "@/features/todo/api/todoApi";
import { AUTH_SESSION_CHANGE_EVENT, clearStoredAuthSession, getStoredAuthSession, restoreStoredAuthSessionFromTauri } from "@/lib/auth/auth-session";
import { notifyDataChanged, type DataChangedDomain } from "@/lib/data-changed";
import { playNotificationSound } from "@/lib/sound/notification-sound";
import { startCallRingtone, stopCallRingtone } from "@/lib/sound/call-sound";
import { projectRoomRoute } from "@/lib/project-room-routes";
import { openTauriChatWidget } from "@/lib/tauri/chat-widget-routing";
import { setWidgetWindowDragLocked, tauriCommands, waitForPendingWidgetUsageEventRecords, type AppMonitorInfo, type WidgetArrangeLayout, type WidgetBubbleType, type WidgetInteractiveRect, type WidgetWindowBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";
import {
  emitWidgetDataChanged,
  emitWidgetIncomingCallChanged,
  emitWidgetVoiceCallStateChanged,
  listenWidgetBarItemsChanged,
  listenWidgetDataChanged,
  listenWidgetIncomingCallChanged,
  listenWidgetRoomContextChanged,
  listenWidgetVoiceCallStateChanged,
  listenWidgetWindowStateChanged,
} from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { sendTauriNotification } from "@/lib/tauri/notification";
import { defaultTauriStartupOptimizationConfig, readTauriStartupOptimizationConfig } from "@/lib/tauri/startup-optimization";
import { readCachedWidgetRoomNames, readWidgetSummary, writeCachedWidgetRoomNames, type WidgetRoomNameMap } from "@/lib/widget";
import {
  readWidgetAgentReplyReadMarker,
  readWidgetWorkTimerSnapshot,
  writeWidgetAgentReplyLastReadSequence,
  writeWidgetWorkTimerSnapshot,
} from "@/lib/widget/widget-pref-client";
import { syncActiveProjectRoomFromWidgetContext } from "@/lib/workspace-active-room";
import { getChatRealtimeClient } from "@/lib/websocket/chat-realtime";
import { websocketTopics } from "@/lib/websocket/topics";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { AgentJobType, GeneratedDocumentResponse } from "@/types/api/agent";
import type { PageResponse } from "@/types/api/common";
import type { TimeLogResponse } from "@/types/api/timer";
import type { NotificationResponse } from "@/types/api/notification";
import type { WidgetSummaryResponse } from "@/types/api/widget";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

// 메뉴 오브 창은 ?bubble=menu 경로에서 렌더되어 바 메뉴 분리 동작을 담당한다.
// 기본 청크에서 제외하기 위해 next/dynamic으로 지연 로드한다(단일 라우트라 유일한 분할 지점).
const DesktopWidgetMenuOrb = dynamic(
  () => import("@/features/widget/components/desktop-widget-menu-orb").then((mod) => mod.DesktopWidgetMenuOrb),
  { ssr: false },
);

const apiBubbleTypeMap: Partial<Record<WidgetBubbleType, BackendWidgetBubbleType>> = {
  agent: "AGENT",
  alert: "ALERT",
  chat: "CHAT",
  memo: "MEMO",
  resource: "RESOURCE",
  schedule: "SCHEDULE",
  timer: "TIMER",
  todo: "TODO",
};

const apiItemBubbleTypeMap: Partial<Record<WidgetBubbleType, BackendWidgetBubbleType>> = {
  agent: "AGENT",
  alert: "ALERT",
  chat: "CHAT",
  memo: "MEMO",
  resource: "RESOURCE",
  schedule: "SCHEDULE",
  timer: "TIMER",
  todo: "TODO",
};

const devVoiceRoomId =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_BUBLI_WIDGET_DEV_VOICE_ROOM_ID ?? null
    : null;

const WIDGET_SESSION_RESTORE_GRACE_ATTEMPTS = 6;
const WIDGET_SESSION_RESTORE_GRACE_DELAY_MS = 250;
const MAX_MESSAGE_TOASTS = 3;
const TIMER_HEARTBEAT_INTERVAL_MS = 60_000;
const AGENT_REPLY_BADGE_MESSAGE_LIMIT = 20;
const PERSONAL_AGENT_MEMORY_LIMIT = 10;
const WIDGET_NOTIFICATION_DISPLAY_LIMIT = 20;
const WIDGET_NOTIFICATION_PAGE_SIZE = 20;
type WidgetItemStateAction = "VISIBLE" | "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED";
type WidgetAgentSuggestionReviewAction = "APPROVE" | "HOLD" | "REJECT";
type WidgetRoomOption = { id: string; name: string };
type EnrichedWidgetNotificationResponse = WidgetNotificationResponse & {
  jobType?: AgentJobType | null;
  resourceTitle?: string | null;
};

const widgetAgentNotificationTargetCache = new Map<string, Promise<Pick<EnrichedWidgetNotificationResponse, "jobType" | "resourceTitle"> | null>>();
const widgetResourceTitleCache = new Map<string, Promise<string | null>>();

function waitForWidgetSessionRestore(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function restoreWidgetStoredAuthSessionWithGrace() {
  const storedSession = getStoredAuthSession();
  if (storedSession) return storedSession;

  let restoredSession = await restoreStoredAuthSessionFromTauri();
  if (restoredSession || !isTauriRuntime()) return restoredSession;

  for (let attempt = 0; attempt < WIDGET_SESSION_RESTORE_GRACE_ATTEMPTS; attempt += 1) {
    await waitForWidgetSessionRestore(WIDGET_SESSION_RESTORE_GRACE_DELAY_MS);
    restoredSession = await restoreStoredAuthSessionFromTauri();
    if (restoredSession) return restoredSession;
  }

  return null;
}

type NotificationToastKind = "chat-invite" | "friend-accepted" | "friend-request" | "message" | "room-invite";

function roomQuery(roomId?: string | null) {
  return roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
}

// LiveKit은 원격 트랙을 구독해도 오디오를 자동 재생하지 않는다 —
// TrackSubscribed에서 직접 <audio> 엘리먼트를 만들어 DOM에 붙여야 실제로 들린다.
function attachWidgetRemoteAudioTrack(track: RemoteTrack) {
  if (track.kind !== Track.Kind.Audio) return;
  const element = track.attach();
  element.dataset.livekitAudioTrack = track.sid ?? "";
  element.autoplay = true;
  document.body.appendChild(element);
}

function detachWidgetRemoteAudio(room: Room) {
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => {
      publication.track?.detach().forEach((element) => element.remove());
    });
  });
}

function roomWorkRoute(roomId?: string | null) {
  return roomId ? projectRoomRoute(roomId, "work") : "/app";
}

function roomResourceRoute(roomId?: string | null) {
  return roomId ? projectRoomRoute(roomId, "resources") : "/app/resources";
}

function resourceDetailRoute(roomId: string | null | undefined, resourceId: string) {
  return `${roomResourceRoute(roomId)}?resourceId=${encodeURIComponent(resourceId)}`;
}

function roomScopedRoute(path: string, roomId?: string | null) {
  return `${path}${roomQuery(roomId)}`;
}

function subscribeToClientMount(onStoreChange: () => void) {
  const timeoutId = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(timeoutId);
}

function getClientMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

function getRequestedBubble(value: string | null): WidgetBubbleType {
  return desktopWidgetBubbleTypes.includes(value as WidgetBubbleType) ? (value as WidgetBubbleType) : "todo";
}

function isDesktopWidgetBubble(value: string): value is WidgetBubbleType {
  return desktopWidgetBubbleTypes.includes(value as WidgetBubbleType);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getRequestedMode(value: string | null): WidgetWindowMode {
  if (value === "GHOST" || value === "MINIMIZED" || value === "TRANSLUCENT") return value;
  return "DEFAULT";
}

function resolveWidgetBubble(value: string, fallback: WidgetBubbleType): WidgetBubbleType {
  return desktopWidgetBubbleTypes.includes(value as WidgetBubbleType) ? (value as WidgetBubbleType) : fallback;
}

function widgetWindowStateBelongsToSurface(
  state: WidgetWindowState,
  currentWindowBubble: WidgetWindowBubbleType,
  windowId?: string,
) {
  // Treat native state payloads as cross-window until proven otherwise; applying a
  // timer/schedule payload in the memo window turns the already-open window into
  // the last restored bubble.
  if (state.activeBubble !== currentWindowBubble) return false;

  const expectedKeys = new Set<string>([currentWindowBubble]);
  const requestedWindowId = windowId?.trim();
  if (requestedWindowId) expectedKeys.add(requestedWindowId);

  const stateKeys = new Set<string>([state.activeBubble]);
  const stateWindowId = state.windowId?.trim();
  if (stateWindowId) stateKeys.add(stateWindowId);

  for (const key of stateKeys) {
    if (expectedKeys.has(key)) return true;
  }
  return false;
}

function getModeFromSetting(setting?: WidgetBubbleSettingResponse): WidgetWindowMode | null {
  if (!setting) return null;
  if (setting.minimized) return "MINIMIZED";
  if (setting.ghostMode) return "GHOST";
  if (setting.opacity !== null && setting.opacity !== undefined && setting.opacity < 0.95) return "TRANSLUCENT";
  return "DEFAULT";
}

function getSettingPatch(bubbleType: WidgetBubbleType, mode: WidgetWindowMode) {
  const backendBubbleType = apiBubbleTypeMap[bubbleType];
  if (!backendBubbleType) return null;

  return {
    bubbleType: backendBubbleType,
    enabled: true,
    ghostMode: mode === "GHOST",
    minimized: mode === "MINIMIZED",
    opacity: mode === "TRANSLUCENT" ? 0.72 : mode === "GHOST" ? 0.62 : 1,
  };
}

// src-tauri/src/lib.rs widget_window_size와 반드시 동기화한다(콘텐츠 자동 높이 + 버블별 창 크기).
const WIDGET_WINDOW_GUTTER = 44;

// Rust 쪽 "저장 전 기본 자리" 좌표 센티널(i32::MIN)은 실제 좌표가 아니므로 서버 설정에 반영하지 않는다.
const WIDGET_POSITION_UNSET_THRESHOLD = -1_000_000;

function widgetSettingCoordinate(value: number) {
  return value <= WIDGET_POSITION_UNSET_THRESHOLD ? undefined : value;
}

function getWidgetWindowSize(bubbleType: WidgetBubbleType, mode: WidgetWindowMode) {
  if (mode === "MINIMIZED") return { height: 92, width: 208 };
  // 고스트 창 크기는 src-tauri widget_window_size의 GHOST 분기와 동기화한다(버블별로 넉넉히).
  if (mode === "GHOST") {
    if (bubbleType === "timer") return { height: 232, width: 300 };
    if (bubbleType === "todo") return { height: 300, width: 288 };
    return { height: 212, width: 212 };
  }
  if (bubbleType === "chat") return { height: 420 + WIDGET_WINDOW_GUTTER, width: 336 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "agent") return { height: 420 + WIDGET_WINDOW_GUTTER, width: 332 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "timer") return { height: 400 + WIDGET_WINDOW_GUTTER, width: 356 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "resource") return { height: 330 + WIDGET_WINDOW_GUTTER, width: 324 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "memo") return { height: 320 + WIDGET_WINDOW_GUTTER, width: 308 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "schedule") return { height: 340 + WIDGET_WINDOW_GUTTER, width: 324 + WIDGET_WINDOW_GUTTER };
  return { height: 360 + WIDGET_WINDOW_GUTTER, width: 324 + WIDGET_WINDOW_GUTTER };
}

// 위젯 창은 보이는 콘텐츠(pill/셸/팝오버)보다 큰 투명 사각형이므로, 마우스를 받아야 하는
// 콘텐츠 rect(논리 px, 창-로컬)를 Rust 커서 폴러에 보고해 투명 영역 클릭을 아래 앱으로 통과시킨다.
const INTERACTIVE_RECT_EPSILON = 0.5;

function collectWidgetInteractiveRects(): WidgetInteractiveRect[] {
  return Array.from(document.querySelectorAll<HTMLElement>(widgetInteractiveRectSelector))
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({ height: rect.height, width: rect.width, x: rect.x, y: rect.y }));
}

function widgetInteractiveRectsChanged(previous: WidgetInteractiveRect[] | null, next: WidgetInteractiveRect[]) {
  if (!previous || previous.length !== next.length) return true;
  return next.some((rect, index) => {
    const before = previous[index];
    return (
      Math.abs(before.x - rect.x) > INTERACTIVE_RECT_EPSILON ||
      Math.abs(before.y - rect.y) > INTERACTIVE_RECT_EPSILON ||
      Math.abs(before.width - rect.width) > INTERACTIVE_RECT_EPSILON ||
      Math.abs(before.height - rect.height) > INTERACTIVE_RECT_EPSILON
    );
  });
}

// 주기 폴링 결과가 내용까지 같으면 이전 상태 객체를 그대로 유지해,
// 참조만 바뀐 setState가 위젯 리렌더(깜빡임)를 만들지 않게 한다.
function keepIfDeepEqual<T>(current: T, next: T): T {
  return JSON.stringify(current) === JSON.stringify(next) ? current : next;
}

// 버블 맵 전용 deep-equal: 전체가 같으면 이전 맵 참조를, 일부만 바뀌면 안 바뀐 버블의
// 이전 참조를 그대로 유지한다 — memo된 버블 셸/행이 "실제로 바뀐 버블"만 다시 그린다.
function keepBubbleMapIfDeepEqual(
  current: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
  next: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  if (JSON.stringify(current) === JSON.stringify(next)) return current;

  const merged = { ...next };
  for (const bubbleType of Object.keys(next) as WidgetBubbleType[]) {
    const currentBubble = current[bubbleType];
    const nextBubble = next[bubbleType];
    if (currentBubble && nextBubble && JSON.stringify(currentBubble) === JSON.stringify(nextBubble)) {
      merged[bubbleType] = currentBubble;
    }
  }
  return merged;
}

// 상호작용 표면 위에서 실제 마우스 이벤트를 받으면 Rust에 알리는 최소 간격.
const WIDGET_POINTER_SEEN_THROTTLE_MS = 250;

function useWidgetInteractiveRectReporting(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let lastReported: WidgetInteractiveRect[] | null = null;
    let frameId: number | null = null;

    const report = () => {
      frameId = null;
      const rects = collectWidgetInteractiveRects();
      if (!widgetInteractiveRectsChanged(lastReported, rects)) return;
      lastReported = rects;
      void tauriCommands.setWidgetInteractiveRects({ rects }).catch(() => {
        // 다음 변경 때 재시도할 수 있도록 마지막 보고값을 비운다.
        lastReported = null;
      });
    };
    const scheduleReport = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(report);
    };

    scheduleReport();

    // hover 팝오버·메뉴 패널 mount/unmount와 모드 전환(클래스 변경)을 감지한다.
    const mutationObserver = new MutationObserver(scheduleReport);
    mutationObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
    const resizeObserver = new ResizeObserver(scheduleReport);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", scheduleReport);
    // 폰트 로드·비동기 데이터로 인한 레이아웃 드리프트 대비 저빈도 재확인(변경 없으면 invoke 없음).
    const intervalId = window.setInterval(scheduleReport, 1000);

    // 안전망: 상호작용 표면(data-bubli-interactive) 위에서 웹뷰가 실제 마우스 이벤트를 받으면
    // Rust에 "커서가 창 안" 힌트를 보내, Retina 배율/좌표 드리프트로 커서 폴러의 rect 판정이
    // 어긋나도 헤더 드래그·클릭이 죽지 않게 한다. 투명 영역에서 온 이벤트는 힌트를 보내지
    // 않아 클릭 통과 동작을 깨지 않는다.
    let lastPointerSeenNotifiedAt = 0;
    const notifyPointerSeen = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.(widgetInteractiveRectSelector)) return;
      const now = Date.now();
      if (now - lastPointerSeenNotifiedAt < WIDGET_POINTER_SEEN_THROTTLE_MS) return;
      lastPointerSeenNotifiedAt = now;
      void tauriCommands.notifyWidgetPointerSeen().catch(() => undefined);
    };
    window.addEventListener("pointermove", notifyPointerSeen, { passive: true });
    window.addEventListener("pointerdown", notifyPointerSeen, { passive: true });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleReport);
      window.clearInterval(intervalId);
      window.removeEventListener("pointermove", notifyPointerSeen);
      window.removeEventListener("pointerdown", notifyPointerSeen);
    };
  }, [enabled]);
}

function formatShortTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", hour12: false, minute: "2-digit" }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDue(t: TranslateFn, value?: string | null) {
  if (!value) return "";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "";
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diff = Math.round((target - start) / dayMs);
  if (diff === 0) return formatShortTime(value) || t("widget.due.today");
  if (diff === 1) return t("widget.due.tomorrow");
  if (diff > 1) return `D-${diff}`;
  return t("widget.due.past");
}

// 마감(d-day)이 있는 투두 칩에 붙일 D-n 태그. 오늘=D-DAY, 남았으면 D-n, 지났으면 D+n.
function formatDDay(value?: string | null) {
  if (!value) return "";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "";
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diff = Math.round((target - start) / dayMs);
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff}`;
}

// 마감 칩 톤: 지남/오늘/내일/이후 — formatDue와 같은 날짜 기준(로컬 자정)으로 계산한다.
function widgetDueTone(value?: string | null): WidgetPreviewItem["dueTone"] {
  if (!value) return undefined;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return undefined;
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diff = Math.round((target - start) / dayMs);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "later";
}

function taskStatusLabel(t: TranslateFn, status: WidgetTaskResponse["status"]) {
  const labels: Record<WidgetTaskResponse["status"], MessageKey> = {
    BLOCKED: "widget.task.blocked",
    DONE: "widget.task.done",
    IN_PROGRESS: "widget.task.inProgress",
    REVIEW: "widget.task.review",
    TODO: "widget.task.todo",
  };
  return t(labels[status]);
}

function resourceStatusLabel(t: TranslateFn, status: WidgetResourceResponse["status"]) {
  const labels: Record<WidgetResourceResponse["status"], MessageKey> = {
    ANALYZED: "widget.resourceStatus.analyzed",
    ANALYZING: "widget.resourceStatus.analyzing",
    FAILED: "widget.resourceStatus.failed",
    READY: "widget.resourceStatus.ready",
    UPLOADING: "widget.resourceStatus.uploading",
  };
  return t(labels[status]);
}

function memoTitle(t: TranslateFn, memo: WidgetMemoResponse) {
  const firstLine = memo.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return t("widget.memo.empty");
  return firstLine.length > 36 ? `${firstLine.slice(0, 36)}...` : firstLine;
}

function suggestionStatusLabel(t: TranslateFn, status: WidgetAgentSuggestionResponse["status"]) {
  const labels: Record<WidgetAgentSuggestionResponse["status"], MessageKey> = {
    APPROVED: "widget.suggestion.approved",
    DRAFT: "widget.suggestion.draft",
    HELD: "widget.suggestion.held",
    REJECTED: "widget.suggestion.rejected",
  };
  return t(labels[status]);
}

function suggestionTitle(suggestion: WidgetAgentSuggestionResponse) {
  const title = suggestion.payloadJson.title;
  if (typeof title === "string" && title.trim()) return title;
  const text = suggestion.payloadJson.text ?? suggestion.payloadJson.content ?? suggestion.payloadJson.summary;
  if (typeof text === "string" && text.trim()) return text;
  return suggestion.suggestionType;
}

function messageText(message: WidgetChatMessageResponse) {
  const text = message.body.text ?? message.body.message ?? message.body.content;
  if (typeof text === "string" && text.trim()) return text;
  return message.messageType;
}

type WidgetAgentReplyLike = Pick<WidgetChatMessageResponse, "messageType" | "roomSequence" | "sender">;

function isWidgetAgentReplyMessage(message: WidgetAgentReplyLike) {
  return message.messageType === "AGENT_RESPONSE" || message.sender.type === "AGENT";
}

function latestWidgetAgentReplySequence(messages: WidgetAgentReplyLike[]) {
  return messages.reduce(
    (max, item) => (isWidgetAgentReplyMessage(item) ? Math.max(max, item.roomSequence) : max),
    0,
  );
}

function countUnreadWidgetAgentReplies(messages: WidgetAgentReplyLike[], lastReadSequence: number) {
  return messages.filter((item) => isWidgetAgentReplyMessage(item) && item.roomSequence > lastReadSequence).length;
}

async function loadWidgetAgentRoomMessages(selectedRoomId: string) {
  const rooms = await widgetDisplayApi.listChatRooms(20).catch(() => null);
  const chatRoom = resolveActiveWidgetChatRoom(rooms?.items ?? [], selectedRoomId);
  if (!chatRoom) return null;

  const messages = await widgetDisplayApi.listChatMessages(chatRoom.id, AGENT_REPLY_BADGE_MESSAGE_LIMIT).catch(() => null);
  return {
    chatRoom,
    messages: messages?.items ?? [],
  };
}

async function readWidgetAgentReplyBadgeCount(selectedRoomId: string, options: { markRead?: boolean } = {}) {
  const result = await loadWidgetAgentRoomMessages(selectedRoomId);
  if (!result) return 0;

  const latestSequence = latestWidgetAgentReplySequence(result.messages);
  const readMarker = await readWidgetAgentReplyReadMarker(result.chatRoom.id, selectedRoomId);
  if (options.markRead || readMarker === null) {
    await writeWidgetAgentReplyLastReadSequence(result.chatRoom.id, latestSequence, selectedRoomId);
    return 0;
  }

  return countUnreadWidgetAgentReplies(result.messages, readMarker);
}

function personalAgentResponseText(result: PersonalAgentCommandResponse) {
  const text = result.message.body.text ?? result.message.body.message ?? result.message.body.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

async function readPersonalAgentMemory(): Promise<{ recentMessages: PersonalAgentMemoryMessage[]; summaries: [] }> {
  if (!isTauriRuntime()) return { recentMessages: [], summaries: [] };

  const result = await tauriCommands.readLocalAgentMessages({ limit: PERSONAL_AGENT_MEMORY_LIMIT }).catch(() => null);
  return {
    recentMessages:
      result?.items.map((item) => ({
        createdAt: item.createdAt,
        role: item.role,
        text: item.text,
      })) ?? [],
    summaries: [],
  };
}

async function storePersonalAgentLocalResult(input: {
  agentText: string;
  requestText: string;
  response: PersonalAgentCommandResponse;
  userCreatedAt: string;
}) {
  if (!isTauriRuntime()) return;

  await Promise.allSettled([
    tauriCommands.storeLocalAgentMessages({
      messages: [
        {
          createdAt: input.userCreatedAt,
          role: "USER",
          source: "PERSONAL_AGENT_WIDGET",
          text: input.requestText,
        },
        {
          bodyJson: JSON.stringify(input.response.message.body),
          createdAt: input.response.message.createdAt || new Date().toISOString(),
          role: "AGENT",
          source: "PERSONAL_AGENT_WIDGET",
          text: input.agentText,
        },
      ],
    }),
    input.response.suggestions.length > 0
      ? tauriCommands.storeLocalAgentSuggestions({
          suggestions: input.response.suggestions.map((suggestion) => ({
            evidenceJson: suggestion.evidence ? JSON.stringify(suggestion.evidence) : null,
            localSuggestionId: suggestion.localSuggestionId,
            payloadJson: JSON.stringify(suggestion.payload),
            suggestionType: suggestion.suggestionType,
          })),
        })
      : Promise.resolve(null),
  ]);
}

function isWidgetChatMessageResponse(value: unknown): value is WidgetChatMessageResponse {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<WidgetChatMessageResponse>;
  return (
    typeof message.id === "string" &&
    typeof message.chatRoomId === "string" &&
    typeof message.createdAt === "string" &&
    typeof message.messageType === "string" &&
    typeof message.roomSequence === "number" &&
    !!message.body &&
    typeof message.body === "object" &&
    !!message.sender &&
    typeof message.sender === "object" &&
    typeof message.sender.name === "string"
  );
}

function parseCachedWidgetChatMessages(items: Array<{ bodyJson: string }>): WidgetChatMessageResponse[] {
  return items.flatMap((item) => {
    try {
      const parsed = JSON.parse(item.bodyJson);
      return isWidgetChatMessageResponse(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  });
}

function resolveActiveWidgetChatRoom(rooms: WidgetChatRoomResponse[], selectedRoomId?: string | null) {
  if (!selectedRoomId) return null;
  return rooms.find((room) => room.status === "ACTIVE" && room.chatType === "ROOM" && room.roomId === selectedRoomId) ?? null;
}

function resolveSelectedPeerChatRoom(peerRooms: WidgetChatRoomResponse[], selectedPeerChatRoomId?: string | null) {
  if (!selectedPeerChatRoomId) return null;
  return peerRooms.find((room) => room.id === selectedPeerChatRoomId) ?? null;
}

type TimerDisplay = WidgetDashboardWorkResponse["runningTimer"] | TimeLogResponse | null | undefined;

function elapsedTimerLabel(timer?: TimerDisplay) {
  if (!timer) return "00:00";
  const startedAt = new Date(timer.lastStartedAt ?? timer.startedAt).getTime();
  if (Number.isNaN(startedAt)) return "00:00";
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000) + (timer.durationSeconds ?? 0));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function timerStatusLabel(t: TranslateFn, status: NonNullable<TimerDisplay>["status"]) {
  const labels: Record<NonNullable<TimerDisplay>["status"], MessageKey> = {
    ENDED: "widget.timerStatus.ended",
    NEEDS_RECOVERY: "widget.timerStatus.needsRecovery",
    PAUSED: "widget.timerStatus.paused",
    RUNNING: "widget.timerStatus.running",
  };
  return labels[status] ? t(labels[status]) : status;
}

function timerActionLabel(t: TranslateFn, timer?: TimerDisplay) {
  if (!timer) return t("widget.timerAction.start");
  if (timer.status === "PAUSED") return t("widget.timerAction.resume");
  if (timer.status === "RUNNING") return t("widget.timer.pause");
  return t("widget.timerAction.start");
}

function roomLabel(t: TranslateFn, room?: WidgetProjectRoomResponse | null, fallbackRoomId?: string | null) {
  if (room?.name) return room.name;
  return fallbackRoomId ? t("widget.room.selected") : t("widget.room.personal");
}

function withBubble(id: WidgetBubbleType, patch: Partial<WidgetPreviewBubble>): WidgetPreviewBubble {
  return {
    ...getWidgetPreviewBubble(id),
    ...patch,
    id,
    rows: patch.rows ?? [],
  };
}

function pinnedRowsFirst(rows: WidgetPreviewItem[]) {
  return [...rows].sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)));
}

function setRowPinned(rows: WidgetPreviewItem[] | undefined, itemId: string, pinned: boolean) {
  return rows ? pinnedRowsFirst(rows.map((row) => (row.id === itemId ? { ...row, pinned } : row))) : undefined;
}

function applyItemStateActionToBubble(
  bubble: WidgetPreviewBubble | undefined,
  itemId: string,
  state: WidgetItemStateAction,
): WidgetPreviewBubble | undefined {
  if (!bubble) return bubble;
  if (state === "CONFIRMED" || state === "HIDDEN" || state === "SNOOZED") {
    return {
      ...bubble,
      personalCandidateRows: bubble.personalCandidateRows?.filter((row) => row.id !== itemId),
      personalResourceRows: bubble.personalResourceRows?.filter((row) => row.id !== itemId),
      personalRows: bubble.personalRows?.filter((row) => row.id !== itemId),
      resourceRows: bubble.resourceRows?.filter((row) => row.id !== itemId),
      roomRows: bubble.roomRows?.filter((row) => row.id !== itemId),
      rows: bubble.rows.filter((row) => row.id !== itemId),
    };
  }

  const target =
    bubble.rows.find((row) => row.id === itemId) ??
    bubble.resourceRows?.find((row) => row.id === itemId) ??
    bubble.personalCandidateRows?.find((row) => row.id === itemId) ??
    bubble.personalResourceRows?.find((row) => row.id === itemId) ??
    bubble.personalRows?.find((row) => row.id === itemId) ??
    bubble.roomRows?.find((row) => row.id === itemId);
  if (!target) return bubble;
  const pinned = state === "PINNED";
  return {
    ...bubble,
    personalCandidateRows: setRowPinned(bubble.personalCandidateRows, itemId, pinned),
    personalResourceRows: setRowPinned(bubble.personalResourceRows, itemId, pinned),
    personalRows: setRowPinned(bubble.personalRows, itemId, pinned),
    resourceRows: setRowPinned(bubble.resourceRows, itemId, pinned),
    roomRows: setRowPinned(bubble.roomRows, itemId, pinned),
    rows: setRowPinned(bubble.rows, itemId, pinned) ?? [],
  };
}

function applyItemStateOverrides(
  bubbles: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
  overrides: Record<string, WidgetItemStateAction>,
): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  return Object.fromEntries(
    Object.entries(bubbles).map(([bubbleType, bubble]) => {
      if (!bubble) return [bubbleType, bubble];
      return [
        bubbleType,
        Object.entries(overrides).reduce<WidgetPreviewBubble>(
          (current, [itemId, state]) => applyItemStateActionToBubble(current, itemId, state) ?? current,
          bubble,
        ),
      ];
    }),
  ) as Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
}

function collectWidgetItemIds(bubbles: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>) {
  return [
    ...new Set(
      Object.values(bubbles)
        .flatMap((bubble) => [
          ...(bubble?.rows ?? []),
          ...(bubble?.roomRows ?? []),
          ...(bubble?.personalRows ?? []),
          ...(bubble?.resourceRows ?? []),
          ...(bubble?.personalResourceRows ?? []),
          ...(bubble?.personalCandidateRows ?? []),
        ])
        .map((row) => row.id)
        .filter(isUuid),
    ),
  ];
}

function itemStateResponseToOverrides(
  states: Awaited<ReturnType<typeof widgetApi.listItemStates>>,
): Record<string, WidgetItemStateAction> {
  return Object.fromEntries(
    states.flatMap((itemState) => {
      if (
        itemState.state === "CONFIRMED" ||
        itemState.state === "HIDDEN" ||
        itemState.state === "PINNED" ||
        itemState.state === "SNOOZED" ||
        itemState.state === "VISIBLE"
      ) {
        return [[itemState.itemId, itemState.state]];
      }
      return [];
    }),
  );
}

function buildNotificationSignal(t: TranslateFn, notifications: WidgetNotificationResponse[]): WidgetNotificationSignal {
  const unread = filterWidgetVisibleUnreadNotifications(notifications);
  const unreadCount = unread.length;
  return {
    compactLabel: t("widget.signal.alertCount", { count: unreadCount }),
    metric: String(unreadCount),
    notificationLabel: unreadCount > 0 ? t("widget.signal.newAlertCount", { count: unreadCount }) : t("widget.signal.noNewAlert"),
    rows: unread.map((item) => notificationToWidgetRow(t, item, notificationWidgetRoutes())),
  };
}

function filterWidgetVisibleUnreadNotifications(notifications: WidgetNotificationResponse[]) {
  return notifications.filter(isUnreadNotificationInboxItem);
}

async function listWidgetVisibleUnreadNotifications(
  limit = WIDGET_NOTIFICATION_DISPLAY_LIMIT,
  maxScanPages = 0,
): Promise<PageResponse<WidgetNotificationResponse>> {
  if (limit <= 0) {
    return { hasNext: false, items: [], page: 0, size: 0, totalPages: 0 };
  }

  const items: WidgetNotificationResponse[] = [];
  const seenIds = new Set<string>();
  let page = 0;
  let lastPage: PageResponse<WidgetNotificationResponse> | null = null;

  do {
    lastPage = await widgetDisplayApi.listNotifications(WIDGET_NOTIFICATION_PAGE_SIZE, page);
    for (const notification of lastPage.items) {
      if (items.length >= limit) break;
      if (!isUnreadNotificationInboxItem(notification) || seenIds.has(notification.id)) continue;
      seenIds.add(notification.id);
      items.push(notification);
    }
    page += 1;
  } while (
    lastPage.hasNext &&
    lastPage.items.length > 0 &&
    items.length < limit &&
    (maxScanPages <= 0 || page < maxScanPages)
  );

  return {
    ...(lastPage ?? { hasNext: false, page: 0, size: WIDGET_NOTIFICATION_PAGE_SIZE, totalPages: 0 }),
    items: await enrichWidgetNotifications(items),
    page: 0,
    size: items.length,
  };
}

function resolveWidgetResourceTitle(resourceId: string) {
  const cached = widgetResourceTitleCache.get(resourceId);
  if (cached) return cached;

  const pending = widgetDisplayApi
    .getResource(resourceId)
    .then((resource) => resource.title || resource.currentVersion?.originalName || null)
    .catch(() => null);

  widgetResourceTitleCache.set(resourceId, pending);
  return pending;
}

function resolveWidgetNotificationTarget(notification: WidgetNotificationResponse) {
  if (!notification.sourceId) return Promise.resolve(null);

  if (notification.sourceType === "COMMENT" || notification.sourceType === "RESOURCE") {
    return resolveWidgetResourceTitle(notification.sourceId).then((resourceTitle) => ({ resourceTitle }));
  }

  if (notification.sourceType !== "AGENT") return Promise.resolve(null);

  const cached = widgetAgentNotificationTargetCache.get(notification.sourceId);
  if (cached) return cached;

  const pending = widgetDisplayApi
    .getAgentJob(notification.sourceId)
    .then(async (job) => ({
      jobType: job.jobType,
      resourceTitle: job.resourceId ? await resolveWidgetResourceTitle(job.resourceId) : null,
    }))
    .catch(() => null);

  widgetAgentNotificationTargetCache.set(notification.sourceId, pending);
  return pending;
}

async function enrichWidgetNotifications(
  notifications: WidgetNotificationResponse[],
): Promise<EnrichedWidgetNotificationResponse[]> {
  return Promise.all(
    notifications.map(async (notification) => {
      const target = await resolveWidgetNotificationTarget(notification);
      return target ? { ...notification, ...target } : notification;
    }),
  );
}

function notificationWidgetRoutes(roomId?: string | null) {
  return {
    agent: roomScopedRoute("/app/agent", roomId),
    chat: roomId ? `/app/project-rooms/${encodeURIComponent(roomId)}/chat` : "/app/chat",
    home: "/app",
    resource: roomResourceRoute(roomId),
  };
}

function notificationToWidgetKind(sourceType: WidgetNotificationResponse["sourceType"]): WidgetPreviewItem["kind"] {
  if (sourceType === "CHAT_INVITE") return "message";
  if (sourceType === "COMMENT" || sourceType === "RESOURCE") return "resource";
  if (sourceType === "FRIEND_ACCEPTED" || sourceType === "FRIEND_REQUEST" || sourceType === "ROOM_INVITE") return "friend";
  if (sourceType === "AGENT") return "agent";
  return undefined;
}

function notificationToWidgetHandoffUrl(
  sourceType: WidgetNotificationResponse["sourceType"],
  routes: ReturnType<typeof notificationWidgetRoutes>,
) {
  if (sourceType === "MESSAGE" || sourceType === "CHAT_INVITE") return routes.chat;
  if (sourceType === "FRIEND_ACCEPTED" || sourceType === "FRIEND_REQUEST") return "/app/chat?mode=direct&friends=1";
  if (sourceType === "ROOM_INVITE") return "/app/project-rooms";
  if (sourceType === "RESOURCE" || sourceType === "COMMENT") return routes.resource;
  if (sourceType === "AGENT") return routes.agent;
  return routes.home;
}

function notificationToWidgetRow(
  t: TranslateFn,
  notification: WidgetNotificationResponse,
  routes: ReturnType<typeof notificationWidgetRoutes>,
): WidgetPreviewItem {
  const display = formatNotificationContent(t, notification);

  return {
    detail: display.body && display.body !== display.title ? display.body : undefined,
    id: notification.id,
    handoffLabel: "",
    handoffUrl: notificationToWidgetHandoffUrl(notification.sourceType, routes),
    kind: notificationToWidgetKind(notification.sourceType),
    label: display.title || display.body || t("widget.kind.notification"),
    status: "",
  };
}

function buildDisplayBubbles(input: {
  currentUserId?: string | null;
  currentUserBubliId?: string | null;
  chatScope?: "direct" | "room";
  peerRooms?: WidgetChatRoomResponse[];
  selectedPeerChatRoomId?: string | null;
  friendRequests?: FriendRequestApiResponse[];
  dashboard?: WidgetDashboardWorkResponse | null;
  friends: WidgetFriendResponse[];
  memos: WidgetMemoResponse[];
  messages: WidgetChatMessageResponse[];
  notifications: WidgetNotificationResponse[];
  /** AI 에이전트 초안 생성 탭의 현재 범위 초안. */
  generatedDocuments?: GeneratedDocumentResponse[];
  /** 룸 컨텍스트에서도 초안 생성 탭에서 분리해 보여줄 개인 초안. */
  personalGeneratedDocuments?: GeneratedDocumentResponse[];
  /** 룸 컨텍스트에서도 메모 버블 내부 토글로 보여줄 개인 메모. */
  personalMemos?: WidgetMemoResponse[];
  /** 룸 컨텍스트에서도 일정 버블 내부 토글로 보여줄 개인 일정. */
  personalSchedules?: WidgetScheduleResponse[];
  /** 룸 컨텍스트에서도 개인 오늘 항목을 뒤이어 보여주기 위한 개인 범위 오늘 TODO. */
  personalTodayTasks?: WidgetTaskResponse[];
  /** 룸 컨텍스트에서도 후보 탭에서 분리해 보여줄 개인 승인 전 후보. */
  personalSuggestions?: WidgetAgentSuggestionResponse[];
  /** 내 할 일 탭: 개인 TODO + 나에게 배정된 룸 태스크(/api/tasks). '오늘' 필터 없이 전체. */
  myTasks?: WidgetTaskResponse[];
  /** 프로젝트룸 탭: 선택 룸 보드 전체(/api/project-rooms/{roomId}/tasks). */
  roomBoardTasks?: WidgetTaskResponse[];
  resources: WidgetResourceResponse[];
  room?: WidgetProjectRoomResponse | null;
  /** 룸 태스크 행의 룸 칩 라벨용 roomId → 룸 이름 매핑(서버 목록 또는 로컬 캐시). */
  roomNames?: WidgetRoomNameMap;
  chatRoom?: WidgetChatRoomResponse | null;
  roomId?: string | null;
  schedules: WidgetScheduleResponse[];
  suggestions: WidgetAgentSuggestionResponse[];
  tasks: WidgetTaskResponse[];
  timer?: TimerDisplay;
  voiceConnectionLabel?: string | null;
  voiceRoom?: WidgetVoiceRoomResponse | null;
}, t: TranslateFn): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  const label = roomLabel(t, input.room, input.roomId);
  const isRoomScoped = Boolean(input.roomId);
  const agentRoute = roomScopedRoute("/app/agent", input.roomId);
  const scheduleRoute = roomScopedRoute("/app/calendar", input.roomId);
  const personalScheduleRoute = roomScopedRoute("/app/calendar", null);
  // 실행 중(또는 일시정지) 타이머는 사용자당 1개뿐이라, 위젯 스코프와 무관하게 타이머 버블에 항상 노출한다.
  // 다른 룸에 걸린 타이머도 여기서 바로 일시정지/재개할 수 있어야 "안 보여서 멈추지도 못하는" 데드락
  // (새 start가 서버에서 409로 막힘)이 생기지 않는다. 어느 룸 타이머인지는 아래 timer row의 roomName 라벨로 구분한다.
  const activeTimer = input.timer ?? input.dashboard?.runningTimer ?? null;
  // 실행 중 타이머가 귀속된 "그 룸"의 이름(현재 위젯 스코프가 아니라 타이머 자신의 룸 기준).
  const activeTimerRoomLabel = activeTimer?.roomId
    ? (input.roomNames?.[activeTimer.roomId] ?? (activeTimer.roomId === input.roomId ? (input.room?.name ?? null) : null))
    : null;
  // 캘린더는 오늘뿐 아니라 향후 일정 전체(14일 창)가 보여야 하므로, 전체 목록(input.schedules)을
  // 우선한다. 예전엔 오늘 일정이 있으면 todaySchedules(오늘만)가 전체를 가려, 캘린더에 이번주·다음주
  // 일정이 아예 안 뜨던 문제가 있었다. 전체가 비었을 때만 오늘 목록으로 폴백한다.
  const scheduleSource = isRoomScoped
    ? input.schedules
    : (input.schedules.length ? input.schedules : (input.dashboard?.todaySchedules ?? []));
  const personalScheduleSource = isRoomScoped
    ? (input.personalSchedules ?? [])
    : (input.schedules.length ? input.schedules : (input.dashboard?.todaySchedules ?? []));

  // ---------- TODO: 개인 TODO + 나에게 할당된 룸 태스크 병합 ----------
  // 제품 모델: 룸 태스크에 내가 담당자로 지정되면 개인 TODO에도 따라온다(백엔드
  // /api/tasks scope=personal · /api/dashboard/tasks · /api/dashboard/work가 이미
  // "내 개인 TODO + 내가 담당자인 룸 태스크"를 내려준다 — roomId로 귀속을 구분).
  // ---------- TODO: 2탭(내 할 일 / 프로젝트룸) ----------
  // 내 할 일 = /api/tasks(개인 + 나에게 배정된 룸 태스크). '오늘 마감'으로 거르지 않고
  // 미완료 전체를 마감 섹션(지남/오늘/내일/이후/없음)으로 정렬 — 마감 없는 새 할 일도 바로 뜬다.
  // 프로젝트룸 = 선택 룸 보드에서 담당자 미지정 또는 나에게 배정된 태스크 + 칸반 상태칩.
  const isDoneTask = (task: WidgetTaskResponse) => task.status === "DONE";
  const meId = input.currentUserId ?? null;
  const myTasksSource = input.myTasks ?? input.tasks;
  const roomBoardSource = input.roomBoardTasks ?? (isRoomScoped ? input.tasks : []);

  const dueSectionRank = (tone: WidgetPreviewItem["dueTone"]): number => {
    switch (tone) {
      case "overdue":
        return 0;
      case "today":
        return 1;
      case "tomorrow":
        return 2;
      case "later":
        return 3;
      default:
        return 4;
    }
  };
  const kanbanRank: Record<WidgetTaskResponse["status"], number> = {
    IN_PROGRESS: 0,
    REVIEW: 1,
    TODO: 2,
    BLOCKED: 3,
    DONE: 4,
  };
  const dueMillis = (value?: string | null): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
  };
  const updatedMillis = (value?: string | null): number => {
    if (!value) return 0;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };
  const byDueThenRecent = (a: WidgetTaskResponse, b: WidgetTaskResponse): number => {
    const ad = dueMillis(a.dueAt);
    const bd = dueMillis(b.dueAt);
    if (ad !== bd) return ad - bd;
    return updatedMillis(b.updatedAt) - updatedMillis(a.updatedAt);
  };
  const todoTaskToRow = (
    task: WidgetTaskResponse,
    sourceKind: "personal" | "room",
    withKanban: boolean,
  ): WidgetPreviewItem => ({
    checked: task.status === "DONE",
    dueTone: widgetDueTone(task.dueAt),
    handoffLabel: formatDue(t, task.dueAt) || taskStatusLabel(t, task.status),
    // 룸 태스크는 그 룸의 작업 보드로, 개인 TODO는 개인 홈으로 넘어간다(상세는 사이트에서).
    handoffUrl: roomWorkRoute(task.roomId ?? (isRoomScoped ? input.roomId : null)),
    id: task.id,
    kanbanLabel: withKanban ? taskStatusLabel(t, task.status) : undefined,
    kanbanTone: withKanban ? task.status : undefined,
    kind: "task",
    label: task.title,
    // "내 할 일" 탭(withKanban=false)에서 룸에서 부여된 항목은 룸 이름 태그로 구분한다.
    // 룸 컨텍스트(isRoomScoped)에서도 태그를 보여준다. 프로젝트룸 탭(withKanban=true)은
    // 전부 그 룸이라 태그가 군더더기라 생략한다.
    roomName:
      sourceKind === "room" && !withKanban && task.roomId
        ? input.roomNames?.[task.roomId] ?? t("widget.todo.roomFallback")
        : undefined,
    sourceKind,
    // 마감이 있으면 칩에 D-n 태그(D-DAY/D-3/D+2). 마감 없으면 상태 라벨.
    status: formatDDay(task.dueAt) || taskStatusLabel(t, task.status),
  });
  // 내 할 일: 미완료(마감 섹션 정렬) → 완료(최근 수정순, 하단).
  const myOpenTasks = myTasksSource
    .filter((task) => !isDoneTask(task))
    .sort((a, b) => {
      const rank = dueSectionRank(widgetDueTone(a.dueAt)) - dueSectionRank(widgetDueTone(b.dueAt));
      return rank !== 0 ? rank : byDueThenRecent(a, b);
    });
  const myDoneTasks = myTasksSource
    .filter(isDoneTask)
    .sort((a, b) => updatedMillis(b.updatedAt) - updatedMillis(a.updatedAt));
  const myRows = [
    ...myOpenTasks.map((task) => todoTaskToRow(task, task.roomId ? "room" : "personal", false)),
    ...myDoneTasks.map((task) => todoTaskToRow(task, task.roomId ? "room" : "personal", false)),
  ];

  // 프로젝트룸: 담당자 미지정 또는 나에게 배정된 것만(남의 담당 상세는 사이트에서 확인).
  const roomRelevantTasks = roomBoardSource.filter(
    (task) => task.assigneeUserId == null || (meId != null && task.assigneeUserId === meId),
  );
  const roomOpenTasks = roomRelevantTasks
    .filter((task) => !isDoneTask(task))
    .sort((a, b) => {
      const rank = kanbanRank[a.status] - kanbanRank[b.status];
      return rank !== 0 ? rank : byDueThenRecent(a, b);
    });
  const roomDoneTasks = roomRelevantTasks
    .filter(isDoneTask)
    .sort((a, b) => updatedMillis(b.updatedAt) - updatedMillis(a.updatedAt));
  const roomRows = [
    ...roomOpenTasks.map((task) => todoTaskToRow(task, "room", true)),
    ...roomDoneTasks.map((task) => todoTaskToRow(task, "room", true)),
  ];

  const todoOpenCount = myOpenTasks.length;
  const todoDoneCount = myDoneTasks.length;
  const todoProgressRatio =
    todoOpenCount + todoDoneCount > 0 ? todoDoneCount / (todoOpenCount + todoDoneCount) : 0;
  const todoView: NonNullable<WidgetPreviewBubble["todoView"]> = {
    hasRoom: Boolean(input.roomId),
    mine: myRows,
    room: roomRows,
    roomName: input.roomId ? input.roomNames?.[input.roomId] ?? label : undefined,
  };

  const scheduleTimeLabel = (item: WidgetScheduleResponse) => (item.allDay ? t("widget.schedule.allDay") : formatShortTime(item.startsAt));
  const scheduleToRow = (item: WidgetScheduleResponse, route: string): WidgetPreviewItem => ({
    id: item.id,
    handoffLabel: scheduleTimeLabel(item),
    handoffUrl: route,
    kind: "schedule",
    label: item.title,
    status: scheduleTimeLabel(item),
    // 위젯 캘린더(월/주/WBS)가 날짜별 배치를 계산하도록 원본 시각을 함께 내려준다.
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    allDay: item.allDay,
  });
  const scheduleItems = scheduleSource.map((item) => scheduleToRow(item, scheduleRoute));
  const personalScheduleItems = personalScheduleSource.map((item) => scheduleToRow(item, personalScheduleRoute));
  const memoItems = input.memos.filter((item) => item.status === "ACTIVE");
  const personalMemoItems = (input.personalMemos ?? []).filter((item) => item.status === "ACTIVE");
  const memoToRow = (item: WidgetMemoResponse, roomId?: string | null): WidgetPreviewItem => {
    const title = memoTitle(t, item);
    // 바 hover 팝오버에서 제목 한 줄만으로는 내용을 알기 어려워, 본문 요약(detail)을 같이 내려준다.
    // 제목이 본문 첫 줄과 같으면(짧은 메모) 중복이라 생략한다.
    const body = item.body.trim();
    const detail = body && body !== title && !title.startsWith(body) ? body : undefined;
    return {
      detail,
      id: item.id,
      handoffLabel: formatShortTime(item.updatedAt),
      handoffUrl: roomScopedRoute("/app", roomId),
      kind: "memo",
      label: title,
      memoBody: item.body,
      status: formatShortTime(item.updatedAt),
    };
  };
  const fileItems = input.resources.filter((item) => item.kind !== "MEMO");
  const resourceToRow = (item: WidgetResourceResponse, fallbackRoomId?: string | null): WidgetPreviewItem => ({
    id: item.id,
    handoffLabel: resourceStatusLabel(t, item.status),
    handoffUrl: resourceDetailRoute(item.roomId ?? fallbackRoomId, item.id),
    kind: "resource",
    label: item.title,
    status: resourceStatusLabel(t, item.status),
  });
  const generatedDocumentToRow = (
    item: GeneratedDocumentResponse,
    sourceKind: NonNullable<WidgetPreviewItem["sourceKind"]>,
  ): WidgetPreviewItem => ({
    handoffLabel: item.documentType || t("widget.agent.generatedDraft"),
    id: item.id,
    kind: "document",
    label: item.title,
    sourceKind,
    status: item.documentType || t("widget.agent.generatedDraft"),
  });
  const suggestionToRow = (
    item: WidgetAgentSuggestionResponse,
    route: string,
    sourceKind: NonNullable<WidgetPreviewItem["sourceKind"]>,
  ): WidgetPreviewItem => ({
    id: item.suggestionId,
    kind: "agent",
    handoffLabel: suggestionStatusLabel(t, item.status),
    handoffUrl: route,
    label: suggestionTitle(item),
    reviewable: true,
    sourceKind,
    status: suggestionStatusLabel(t, item.status),
  });
  const agentRows =
    input.suggestions.length > 0
      ? input.suggestions.map((item) => suggestionToRow(item, agentRoute, input.roomId ? "room" : "personal"))
      : (input.dashboard?.agentSuggestionSummary ?? []).map((line, index) => ({
          id: `agent-summary-${index}`,
          kind: "agent" as const,
          handoffLabel: t("widget.suggestion.draft"),
          handoffUrl: agentRoute,
          label: line,
          status: t("widget.suggestion.draft"),
        }));
  const personalAgentRows = input.roomId
    ? (input.personalSuggestions ?? []).map((item) => suggestionToRow(item, "/app/agent", "personal"))
    : [];
  const unreadNotifications = filterWidgetVisibleUnreadNotifications(input.notifications);
  const unreadCount = unreadNotifications.length;
  const voiceParticipants = input.voiceRoom?.participants.filter((item) => item.status === "JOINED") ?? [];
  const isPersonalAgent = !input.roomId;

  return {
    agent: withBubble("agent", {
      compactLabel: t("widget.agent.candidateCount", { count: agentRows.length }),
      metric: String(agentRows.length),
      metricLabel: t("widget.data.agent.metricLabel"),
      notificationLabel: isPersonalAgent ? t("widget.agent.personalChatReady") : t("widget.agent.roomChatReady"),
      panelBody: isPersonalAgent ? t("widget.agent.personalChatBody") : t("widget.agent.roomChatBody"),
      panelLabel: t("widget.data.agent.panelLabel"),
      personalCandidateRows: personalAgentRows,
      personalResourceRows: input.roomId
        ? (input.personalGeneratedDocuments ?? []).map((item) => generatedDocumentToRow(item, "personal"))
        : undefined,
      resourceRows: (input.generatedDocuments ?? []).map((item) => generatedDocumentToRow(item, input.roomId ? "room" : "personal")),
      roomId: input.roomId,
      roomLabel: isPersonalAgent ? t("widget.agent.personalMode") : label,
      rows: agentRows,
    }),
    alert: withBubble("alert", {
      actionLabel: t("widget.alert.action"),
      compactLabel: t("widget.signal.alertCount", { count: unreadCount }),
      metric: String(unreadCount),
      metricLabel: t("widget.alert.unread"),
      notificationLabel: unreadCount > 0 ? t("widget.signal.newAlertCount", { count: unreadCount }) : t("widget.signal.noNewAlert"),
      panelBody: unreadCount > 0 ? t("widget.alert.needCheck") : t("widget.alert.noneNow"),
      panelLabel: t("widget.alert.panelLabel"),
      roomId: null,
      roomLabel: t("widget.kind.notification"),
      rows: unreadNotifications.map((item) => notificationToWidgetRow(t, item, notificationWidgetRoutes())),
    }),
    chat: withBubble("chat", {
      // 1:1/그룹 스코프에서는 선택된 상대 채팅방을, 프로젝트룸 스코프에서는 프로젝트룸의 채팅을
      // 가리켜야 한다. 이 두 값을 안 나누면(항상 input.chatRoom?.id) 1:1 스코프에서 메시지 전송·
      // 보이스 시작이 전부 "현재 열려있는 프로젝트룸"의 채팅방/보이스로 잘못 나간다 — 상대는
      // 아무 알림도 못 받고, 발신자만 "성공"으로 보이는 조용한 오발신 버그가 된다.
      chatRoomId: input.chatScope === "direct" ? (input.selectedPeerChatRoomId ?? undefined) : input.chatRoom?.id,
      chatScope: input.chatScope,
      isDirectChat: input.chatRoom?.chatType === "DIRECT",
      currentUserId: input.currentUserId,
      myBubliId: input.currentUserBubliId,
      peerRooms: input.peerRooms ?? [],
      selectedPeerChatRoomId: input.selectedPeerChatRoomId,
      friendRequests: input.friendRequests ?? [],
      friends: input.friends,
      hasProjectRoomScope: Boolean(input.roomId),
      compactLabel: t("widget.chat.count", { count: input.messages.length + voiceParticipants.length }),
      lastMessageSequence: input.messages.reduce((max, item) => Math.max(max, item.roomSequence), 0),
      metric: String(input.messages.length),
      notificationLabel: unreadCount > 0 ? t("widget.chat.unreadCount", { count: unreadCount }) : t("widget.chat.noNew"),
      panelBody: t("widget.chat.body"),
      // 1:1/그룹 채팅은 백엔드 chat room name을, 프로젝트룸 채팅은 항상 프로젝트룸 이름 자체를
      // 쓴다 — chatRoom.name이 빈 문자열이 아닌 다른 값으로 채워져 있으면 예전처럼 || 폴백만
      // 믿었을 때 엉뚱한 값이 새어나올 수 있어 스코프로 명확히 나눈다.
      panelLabel: t("widget.chat.panelLabel", {
        label: input.chatScope === "direct" ? input.chatRoom?.name?.trim() || label : label,
      }),
      participantLabels: input.friends.slice(0, 3).map((item) => item.name),
      roomId: input.chatScope === "direct" ? null : input.roomId,
      roomLabel: label,
      voiceLabel: input.voiceConnectionLabel ?? (input.voiceRoom?.status === "OPEN" ? t("widget.chat.voiceOpen") : t("widget.chat.voiceWaiting")),
      voiceParticipants: voiceParticipants.map((item) => item.userName).filter(Boolean).join(" · ") || t("widget.chat.noParticipants"),
      voiceParticipantList: voiceParticipants.map((item) => ({ userId: item.userId, userName: item.userName })),
      voiceRoomId: input.voiceRoom?.id,
      // 스레드 화면에서 실제 대화 내용을 웹처럼 스크롤로 쭉 보여주기 위한 전체 메시지 목록.
      // rows는 바/고스트 미리보기용으로 최근 3개만 담기지만, 스레드는 그것과 별개로 전체를 쓴다.
      messageThread: [...input.messages]
        .sort((a, b) => a.roomSequence - b.roomSequence)
        .map((item) => ({
          createdAt: item.createdAt,
          id: item.id,
          mine: Boolean(input.currentUserId) && item.sender.id === input.currentUserId,
          senderName: item.sender.name,
          text: messageText(item),
        })),
      rows: [
        ...input.friends.slice(0, 1).map((item) => ({
          id: item.userId,
          kind: "friend" as const,
          label: item.name,
          status: t("widget.chat.people"),
        })),
        ...(input.voiceRoom
          ? [
              {
                id: input.voiceRoom.id,
                kind: "voice" as const,
                label: input.voiceRoom.status === "OPEN" ? t("widget.chat.voiceOpen") : t("widget.chat.voiceEnded"),
                status: t("widget.chat.participantCount", { count: voiceParticipants.length }),
              },
            ]
          : []),
        // handoffUrl을 안 준다 — 이 rows는 바 hover 미리보기/최소화 배지용이고, 실제 스레드
        // 화면은 messageThread(전체 대화)를 따로 그린다. 예전엔 여기 handoffUrl이 있어서
        // ChatBody의 handoffItem(.find(item => item.handoffUrl))이 최신 메시지를 집어다가
        // 스레드 위에 "발신자: 내용" 칩으로 중복 표시했다.
        ...input.messages.slice(0, 3).map((item) => ({
          id: item.id,
          kind: "message" as const,
          label: `${item.sender.name}: ${messageText(item)}`,
          status: formatShortTime(item.createdAt),
        })),
      ],
    }),
    memo: withBubble("memo", {
      compactLabel: t("widget.memo.count", { count: memoItems.length }),
      metric: String(memoItems.length),
      notificationLabel: memoItems.length > 0 ? t("widget.memo.saved") : t("widget.memo.noneSaved"),
      panelBody: input.roomId ? t("widget.memo.roomBody") : t("widget.memo.personalBody"),
      personalRows: isRoomScoped ? personalMemoItems.map((item) => memoToRow(item, null)) : undefined,
      roomRows: isRoomScoped ? memoItems.map((item) => memoToRow(item, input.roomId)) : undefined,
      roomId: input.roomId,
      roomLabel: label,
      rows: memoItems.map((item) => memoToRow(item, input.roomId)),
    }),
    resource: withBubble("resource", {
      compactLabel: t("widget.resource.count", { count: fileItems.length }),
      metric: String(fileItems.length),
      notificationLabel: fileItems.length > 0 ? t("widget.resource.toCheck") : t("widget.resource.noneToCheck"),
      panelBody: fileItems.length > 0 ? t("widget.resource.roomBody") : t("widget.resource.noneBody"),
      roomId: input.roomId,
      roomLabel: label,
      rows: fileItems.map((item) => resourceToRow(item, input.roomId)),
    }),
    schedule: withBubble("schedule", {
      compactLabel: t("widget.schedule.count", { count: scheduleItems.length }),
      metric: scheduleItems[0]?.status || "0",
      notificationLabel: scheduleItems[0]?.label ?? t("widget.schedule.none"),
      panelBody: t("widget.schedule.body"),
      personalRows: isRoomScoped ? personalScheduleItems : undefined,
      roomRows: isRoomScoped ? scheduleItems : undefined,
      roomId: input.roomId,
      roomLabel: label,
      rows: scheduleItems,
    }),
    timer: withBubble("timer", {
      actionLabel: timerActionLabel(t, activeTimer),
      compactLabel: t("widget.timer.count", { value: elapsedTimerLabel(activeTimer ?? undefined) }),
      metric: elapsedTimerLabel(activeTimer ?? undefined),
      metricLabel: activeTimer ? timerStatusLabel(t, activeTimer.status) : t("widget.timer.waiting"),
      notificationLabel: activeTimer ? t("widget.timer.recording") : t("widget.timer.noneRunning"),
      panelBody: t("widget.timer.body"),
      roomId: input.roomId,
      roomLabel: label,
      rows: activeTimer
        ? [
            {
              id: activeTimer.id,
              kind: "time",
              label: activeTimer.timerType === "WORK" ? t("widget.timer.workTimer") : t("widget.timer.generalTimer"),
              // 타이머가 귀속된 룸 이름(다른 룸에 걸린 타이머를 개인/다른 룸 스코프에서 볼 때 구분용).
              roomName: activeTimerRoomLabel ?? undefined,
              status: activeTimer.status,
              timerDurationSeconds: activeTimer.durationSeconds ?? null,
              timerLastStartedAt: activeTimer.lastStartedAt ?? null,
              timerStartedAt: activeTimer.startedAt,
            },
          ]
        : [],
    }),
    todo: withBubble("todo", {
      progressRatio: todoProgressRatio,
      // 카운트/링은 '내 할 일'의 미완료 개수를 가리킨다(없으면 0 — 유령 카운트 없음).
      compactLabel: t("widget.todo.count", { count: todoOpenCount }),
      metric: String(todoOpenCount),
      notificationLabel: myOpenTasks.length ? myRows[0].label : t("widget.todo.none"),
      panelBody: t("widget.todo.body"),
      roomId: input.roomId,
      roomLabel: label,
      // rows는 고스트·바 표시용(내 할 일). 본문 2탭은 todoView로 렌더한다.
      rows: myRows,
      todoView,
    }),
  };
}

function buildEmptyDisplayBubbles(t: TranslateFn, roomId?: string | null) {
  return buildDisplayBubbles({
    chatRoom: null,
    dashboard: null,
    friends: [],
    memos: [],
    messages: [],
    notifications: [],
    resources: [],
    room: null,
    roomId,
    schedules: [],
    suggestions: [],
    tasks: [],
  }, t);
}

type WidgetDisplayLoadState = "error" | "loading";

const widgetDisplayLoadLabels: Record<WidgetDisplayLoadState, { body: MessageKey; compact: MessageKey; notification: MessageKey }> = {
  error: {
    body: "widget.data.loadIssueBody",
    compact: "widget.data.loadIssueCompact",
    notification: "widget.data.loadIssue",
  },
  loading: {
    body: "widget.data.loadingBody",
    compact: "widget.data.loadingCompact",
    notification: "widget.data.loading",
  },
};

function withWidgetDisplayLoadState(
  bubbles: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
  state: WidgetDisplayLoadState,
): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  const labels = widgetDisplayLoadLabels[state];
  return Object.fromEntries(
    Object.entries(bubbles).map(([bubbleType, bubble]) => [
      bubbleType,
      bubble
        ? {
            ...bubble,
            compactLabel: labels.compact,
            metric: state === "loading" ? "..." : "!",
            notificationLabel: labels.notification,
            panelBody: labels.body,
            personalCandidateRows: [],
            personalResourceRows: [],
            personalRows: [],
            resourceRows: [],
            roomRows: [],
            rows: [],
          }
        : bubble,
    ]),
  ) as Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
}

function withFailedWidgetDisplayBubbles(
  bubbles: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
  failedBubbles: Set<WidgetBubbleType>,
): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  if (failedBubbles.size === 0) return bubbles;

  return Object.fromEntries(
    Object.entries(bubbles).map(([bubbleType, bubble]) => [
      bubbleType,
      bubble && failedBubbles.has(bubbleType as WidgetBubbleType)
        ? {
            ...bubble,
            notificationLabel: "widget.data.partialIssue",
            panelBody: "widget.data.partialIssueBody",
          }
        : bubble,
    ]),
  ) as Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
}

function preserveFailedWidgetDisplayBubbles(
  nextBubbles: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
  currentBubbles: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>,
  failedBubbles: Set<WidgetBubbleType>,
): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  if (failedBubbles.size === 0) return nextBubbles;

  return Object.fromEntries(
    Object.entries(nextBubbles).map(([bubbleType, bubble]) => [
      bubbleType,
      failedBubbles.has(bubbleType as WidgetBubbleType)
        ? (currentBubbles[bubbleType as WidgetBubbleType] ?? bubble)
        : bubble,
    ]),
  ) as Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
}

function widgetDisplayLoadSignal(state: WidgetDisplayLoadState): WidgetNotificationSignal {
  const labels = widgetDisplayLoadLabels[state];
  return {
    compactLabel: labels.compact,
    metric: state === "loading" ? "..." : "!",
    notificationLabel: labels.notification,
    rows: [],
  };
}

function summaryTaskToWidgetTask(task: NonNullable<WidgetSummaryResponse["tasks"]>[number]): WidgetTaskResponse {
  return {
    assigneeUserId: task.assigneeUserId ?? null,
    createdAt: task.createdAt,
    description: task.description ?? null,
    dueAt: task.dueAt ?? null,
    id: task.id,
    ownerUserId: task.ownerUserId ?? null,
    roomId: task.roomId ?? null,
    status: task.status,
    title: task.title,
    updatedAt: task.updatedAt,
    wbsItemId: task.wbsItemId ?? null,
  };
}

function summaryScheduleToWidgetSchedule(
  schedule: NonNullable<WidgetSummaryResponse["schedules"]>[number],
): WidgetScheduleResponse {
  return {
    allDay: schedule.allDay,
    createdAt: schedule.createdAt,
    endsAt: schedule.endsAt ?? null,
    googleEventId: schedule.googleEventId ?? null,
    id: schedule.id,
    lastSyncedAt: schedule.lastSyncedAt ?? null,
    ownerUserId: schedule.ownerUserId,
    roomId: schedule.roomId ?? null,
    startsAt: schedule.startsAt,
    syncStatus: schedule.syncStatus,
    taskId: schedule.taskId ?? null,
    title: schedule.title,
    updatedAt: schedule.updatedAt,
    wbsItemId: schedule.wbsItemId ?? null,
  };
}

function dashboardFromWidgetSummary(summary: WidgetSummaryResponse | null): WidgetDashboardWorkResponse | null {
  if (!summary) return null;

  const todayTasks = (summary.tasks ?? []).map(summaryTaskToWidgetTask);
  const todaySchedules = (summary.schedules ?? []).map(summaryScheduleToWidgetSchedule);

  return {
    agentSuggestionSummary: summary.agentSuggestionSummary ?? [],
    runningTimer: summary.runningTimer ?? null,
    todaySchedules,
    todayTasks,
    unreadNotificationCount: summary.unreadNotificationCount ?? 0,
    upcomingDeadlines: [],
  };
}

function normalizeWidgetRoomId(roomId?: string | null) {
  return roomId?.trim() || null;
}

function todayLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function widgetContextForRoomId(roomId?: string | null): WidgetContextResponse {
  const selectedRoomId = normalizeWidgetRoomId(roomId);
  return selectedRoomId ? { mode: "ROOM", selectedRoomId } : { mode: "PERSONAL", selectedRoomId: null };
}

async function resolveWidgetRoomContextTarget() {
  const localActiveRoom = await tauriCommands.readActiveProjectRoom().catch(() => null);
  return normalizeWidgetRoomId(localActiveRoom?.roomId);
}

function nextWidgetScheduleStart() {
  const next = new Date();
  const minutes = next.getMinutes();
  next.setMinutes(minutes < 30 ? 30 : 60, 0, 0);
  return next.toISOString();
}

function widgetSummaryMatchesRequestedRoom(summary: WidgetSummaryResponse, requestedRoomId?: string | null) {
  const requested = normalizeWidgetRoomId(requestedRoomId);
  if (!requested) return true;

  return normalizeWidgetRoomId(summary.context.selectedRoomId) === requested;
}

function resolveWidgetContextFromSummary(
  summary: WidgetSummaryResponse,
  requestedRoomId: string | null,
  current: WidgetContextResponse | null,
) {
  const requested = normalizeWidgetRoomId(requestedRoomId);
  if (requested && normalizeWidgetRoomId(summary.context.selectedRoomId) !== requested) {
    return current?.selectedRoomId === requested ? current : { mode: "ROOM" as const, selectedRoomId: requested };
  }

  if (!requested && current?.mode === "PERSONAL" && !normalizeWidgetRoomId(current.selectedRoomId)) {
    return current;
  }

  if (summary.context.selectedRoomId || !requested) return summary.context;
  return current ?? { mode: "ROOM", selectedRoomId: requested };
}

type WidgetDisplaySummaryReadOptions = {
  allowServerFallback?: boolean;
  refreshServerOnCacheHit?: boolean;
};

async function readWidgetDisplaySummary(
  requestedRoomId?: string | null,
  options: WidgetDisplaySummaryReadOptions = {},
): Promise<WidgetSummaryResponse | null> {
  if (isTauriRuntime()) {
    const cacheResult = await readWidgetSummary({
      fetchServerSummary: () => Promise.reject(new Error("local widget summary cache empty")),
      selectedRoomId: requestedRoomId,
    }).catch(() => null);

    if (cacheResult?.status === "ready") {
      if (options.refreshServerOnCacheHit) {
        void readWidgetSummary({ preferLocalCache: false, selectedRoomId: requestedRoomId })
          .then((serverResult) => {
            if (serverResult.status !== "failed") return;
            void tauriCommands
              .recordWidgetUsageEvent({
                bubbleType: "bar",
                eventType: `summary:server-refresh-failed:${serverResult.fallbackReason ?? "unknown"}`,
                occurredAt: new Date().toISOString(),
              })
              .catch(() => undefined);
          })
          .catch(() => {
            void tauriCommands
              .recordWidgetUsageEvent({
                bubbleType: "bar",
                eventType: "summary:server-refresh-error",
                occurredAt: new Date().toISOString(),
              })
              .catch(() => undefined);
          });
      }
      if (widgetSummaryMatchesRequestedRoom(cacheResult.data, requestedRoomId)) {
        return cacheResult.data;
      }
    }
  }

  if (options.allowServerFallback === false) return null;

  const serverResult = await readWidgetSummary({ preferLocalCache: false, selectedRoomId: requestedRoomId }).catch(() => null);
  return serverResult?.status === "ready" ? serverResult.data : null;
}

function DesktopWidgetSurface() {
  const { t } = useI18n();
  const isTauri = isTauriRuntime();
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(subscribeToClientMount, getClientMountSnapshot, getServerMountSnapshot);
  const requestedSurface = searchParams.get("bubble");
  const isBubbleBar = requestedSurface === "bar";
  const isMenuOrb = requestedSurface === "menu";
  const isWidgetChrome = isBubbleBar || isMenuOrb;
  const [startupOptimization, setStartupOptimization] = useState(defaultTauriStartupOptimizationConfig);
  const requestedBubble = getRequestedBubble(requestedSurface);
  const currentWindowBubble: WidgetWindowBubbleType = isBubbleBar ? "bar" : isMenuOrb ? "menu" : requestedBubble;
  const requestedMode = getRequestedMode(searchParams.get("mode"));
  const requestedRoomId = searchParams.get("roomId") ?? null;
  const windowId = searchParams.get("windowId") ?? undefined;
  const [authReady, setAuthReady] = useState(!isTauri);
  const [hasAuthSession, setHasAuthSession] = useState(!isTauri);
  // 룸 컨텍스트에서 "내 담당 태스크 우선" 정렬에 쓰는 현재 사용자 id.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserBubliId, setCurrentUserBubliId] = useState<string | null>(null);
  // 소통 버블 전용 — 1:1/그룹 ↔ 프로젝트룸 모드와 1:1/그룹 목록에서 선택한 대화방.
  // 창별 로컬 상태로 둔다(activeBubble/mode처럼 창 간 동기화하지 않음).
  const [chatScope, setChatScope] = useState<"direct" | "room">("direct");
  const [selectedPeerChatRoomId, setSelectedPeerChatRoomId] = useState<string | null>(null);
  const [activeBubble, setActiveBubble] = useState<WidgetBubbleType>(requestedBubble);
  const [mode, setMode] = useState<WidgetWindowMode>(requestedMode);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  // 핀 고정(상단 고정)을 켜면 콘텐츠 버블의 위치를 잠근다 — 드래그 헬퍼가 이 값을 읽어 이동을 막는다.
  // 단, 원형 메뉴(오브)와 바는 사용자가 자유롭게 옮겨야 하는 크롬이라 항상 잠금에서 제외한다
  // (오브는 alwaysOnTop이 기본 true라, 잠그면 이동이 아예 막혀버린다).
  useEffect(() => {
    setWidgetWindowDragLocked(!isWidgetChrome && alwaysOnTop);
  }, [alwaysOnTop, isWidgetChrome]);
  const [clickThrough, setClickThrough] = useState(false);
  const [windowVisible, setWindowVisible] = useState(true);
  const [barFullDisplayDelayElapsed, setBarFullDisplayDelayElapsed] = useState(false);
  const [widgetContext, setWidgetContext] = useState<WidgetContextResponse | null>(
    requestedRoomId ? widgetContextForRoomId(requestedRoomId) : null,
  );
  const [barItems, setBarItems] = useState<WidgetWindowState[]>([]);
  const [widgetRoomOptions, setWidgetRoomOptions] = useState<WidgetRoomOption[]>([]);
  const [displayBubbles, setDisplayBubbles] = useState<Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>>(() =>
    withWidgetDisplayLoadState(buildEmptyDisplayBubbles(t, requestedRoomId), "loading"),
  );
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(devVoiceRoomId);
  // 발신자 링백 판단용 — 최근 로드된 통화방을 들고 있는다(참여자·상태·개설자).
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<WidgetVoiceRoomResponse | null>(null);
  // "말하는 중" 표시 — 웹(livekit-client.ts)과 동일하게 LiveKit identity(=userId)로 판단한다.
  const [speakingUserIds, setSpeakingUserIds] = useState<ReadonlySet<string>>(new Set());
  const handleWidgetActiveSpeakersChanged = useCallback((speakers: Participant[]) => {
    setSpeakingUserIds(new Set(speakers.map((participant) => participant.identity)));
  }, []);
  // 알림 구독 콜백(의존성 배열이 좁아 클로저가 갱신되지 않음)에서 최신 값을 읽기 위한 ref.
  const activeVoiceRoomRef = useRef(activeVoiceRoom);
  useEffect(() => {
    activeVoiceRoomRef.current = activeVoiceRoom;
  }, [activeVoiceRoom]);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  // 통화는 채팅(chat) 창에서 시작되지만 발신 팝업은 바(bar) 창에만 그려진다 — 서로 다른
  // 웹뷰/React 인스턴스라 activeVoiceRoomId를 공유하지 않으면 바 창은 통화가 시작된 것 자체를
  // 몰라 팝업을 못 띄운다. 창 간 브로드캐스트로 받은 id를 이 창의 로컬 상태에도 반영한다 —
  // 그러면 기존 폴링 effect가 알아서 전체 방 정보(activeVoiceRoom)까지 채워준다.
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    void listenWidgetVoiceCallStateChanged((payload) => {
      if (cancelled) return;
      setActiveVoiceRoomId(payload.voiceRoomId);
      if (!payload.voiceRoomId) {
        setActiveVoiceRoom(null);
        setSpeakingUserIds(new Set());
      }
    }).then((nextUnlisten) => {
      if (cancelled) {
        nextUnlisten();
        return;
      }
      unlisten = nextUnlisten;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
  const [agentRevision, setAgentRevision] = useState(0);
  const [agentReplyBadgeCount, setAgentReplyBadgeCount] = useState(0);
  const [communicationRevision, setCommunicationRevision] = useState(0);
  const [itemStateOverrides, setItemStateOverrides] = useState<Record<string, WidgetItemStateAction>>({});
  const [memoRevision, setMemoRevision] = useState(0);
  const [notificationRevision, setNotificationRevision] = useState(0);
  const [resourceRevision, setResourceRevision] = useState(0);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [todoRevision, setTodoRevision] = useState(0);
  const [timerRevision, setTimerRevision] = useState(0);
  const [displayRefreshRevision, setDisplayRefreshRevision] = useState(0);
  const [timerSnapshot, setTimerSnapshot] = useState<TimeLogResponse | null>(null);
  // 타이머 시작/일시정지/재개 실패 안내(권한 없음·이미 실행 중 등). 잠깐 떴다가 자동으로 사라진다.
  const [timerActionNotice, setTimerActionNotice] = useState<string | null>(null);
  const [activeTimerHeartbeatId, setActiveTimerHeartbeatId] = useState<string | null>(null);
  const [voiceConnectionLabel, setVoiceConnectionLabel] = useState<string | null>(null);
  const [voiceMicMuted, setVoiceMicMuted] = useState(false);
  const [notificationSignal, setNotificationSignal] = useState<WidgetNotificationSignal>(() => widgetDisplayLoadSignal("loading"));
  const [menuUsageSummary, setMenuUsageSummary] = useState<string | null>(null);
  // Bubli 메뉴 "모니터로 이동" 섹션용 모니터 목록 — 바 창에서만 주기적으로 갱신한다.
  const [appMonitors, setAppMonitors] = useState<AppMonitorInfo[]>([]);
  // 1:1/그룹 보이스 통화 실시간 "전화 옴" 알림 — 구독은 바(bar) 창에서만 하지만, 팝업 UI는
  // 채팅(chat) 창에 소통 위젯과 한 몸으로 그린다(따로 떠 있는 별개 창처럼 보이지 않도록). 그래서
  // 바 창이 받은 값을 브로드캐스트로 채팅 창에도 반영하고, 채팅 창의 수락/거절도 다시 바 창에
  // 반영해 통화음·타임아웃 안전망이 같이 멈추도록 양방향으로 동기화한다.
  const [incomingVoiceCall, setIncomingVoiceCall] = useState<{
    callerName: string;
    chatRoomId: string;
    notificationId: string;
  } | null>(null);
  const incomingVoiceCallRef = useRef(incomingVoiceCall);
  useEffect(() => {
    incomingVoiceCallRef.current = incomingVoiceCall;
  }, [incomingVoiceCall]);
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    void listenWidgetIncomingCallChanged((payload) => {
      if (cancelled) return;
      setIncomingVoiceCall(payload.call);
    }).then((nextUnlisten) => {
      if (cancelled) {
        nextUnlisten();
        return;
      }
      unlisten = nextUnlisten;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
  const [voiceCallResponding, setVoiceCallResponding] = useState(false);
  // 발신 중 팝업에 잠깐 띄우는 상태 문구("상대가 거절했습니다" 등) — 몇 초 뒤 자동으로 사라진다.
  const [widgetOutgoingCallNotice, setWidgetOutgoingCallNotice] = useState<string | null>(null);
  // 카카오톡 스타일 실시간 미리보기 토스트 — 메시지뿐 아니라 친구 요청/수락, 룸 초대, 1:1·그룹 초대도 표시한다.
  const [messageToasts, setMessageToasts] = useState<
    { chatRoomId?: string; id: string; kind: NotificationToastKind; senderName: string; text: string }[]
  >([]);
  const liveKitRoomRef = useRef<Room | null>(null);
  const surfaceReadySentRef = useRef(false);
  const appReadySentRef = useRef(false);
  // 첫 로드 성공 후의 배경 재조회 실패는 조용히 이전 데이터를 유지한다(에러 스켈레톤 스왑 금지).
  const displayLoadedOnceRef = useRef(false);
  const widgetContextInitialized = widgetContext !== null;
  const selectedWidgetRoomId = widgetContext ? normalizeWidgetRoomId(widgetContext.selectedRoomId) : normalizeWidgetRoomId(requestedRoomId);
  const widgetSessionReady = !isTauri || (authReady && hasAuthSession);
  const requestDisplayRefresh = useCallback(() => {
    setDisplayRefreshRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;

    void readTauriStartupOptimizationConfig().then((config) => {
      if (!cancelled) setStartupOptimization(config);
    });

    return () => {
      cancelled = true;
    };
  }, [isTauri]);

  const shouldDeferBarFullDisplay =
    isTauri && isBubbleBar && startupOptimization.deferBarFullDisplayUntilAfterFirstPaint;
  const barFullDisplayReady =
    !shouldDeferBarFullDisplay || (widgetSessionReady && windowVisible && barFullDisplayDelayElapsed);

  useEffect(() => {
    if (!shouldDeferBarFullDisplay || !widgetSessionReady || !windowVisible || barFullDisplayDelayElapsed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBarFullDisplayDelayElapsed(true);
    }, startupOptimization.deferredBarFullDisplayDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    barFullDisplayDelayElapsed,
    shouldDeferBarFullDisplay,
    startupOptimization.deferredBarFullDisplayDelayMs,
    widgetSessionReady,
    windowVisible,
  ]);

  // 창별 상호작용 rect 보고(투명 영역 클릭 통과). 브라우저 미리보기에서는 동작하지 않는다.
  useWidgetInteractiveRectReporting(isTauri && mounted && widgetSessionReady && windowVisible);

  useLayoutEffect(() => {
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previous = {
      bodyBackground: bodyStyle.background,
      bodyMargin: bodyStyle.margin,
      bodyMinHeight: bodyStyle.minHeight,
      bodyOverflow: bodyStyle.overflow,
      bodyWidth: bodyStyle.width,
      bodyHeight: bodyStyle.height,
      bodyDisplay: bodyStyle.display,
      htmlBackground: htmlStyle.background,
      htmlMargin: htmlStyle.margin,
      htmlMinHeight: htmlStyle.minHeight,
      htmlOverflow: htmlStyle.overflow,
      htmlWidth: htmlStyle.width,
      htmlHeight: htmlStyle.height,
    };

    document.documentElement.dataset.bubliSurface = "desktop-widget";
    document.body.dataset.bubliSurface = "desktop-widget";
    htmlStyle.background = "transparent";
    htmlStyle.margin = "0";
    htmlStyle.minHeight = "0";
    htmlStyle.overflow = "hidden";
    htmlStyle.width = "100%";
    htmlStyle.height = "100%";
    bodyStyle.background = "transparent";
    bodyStyle.margin = "0";
    bodyStyle.minHeight = "0";
    bodyStyle.overflow = "hidden";
    bodyStyle.width = "100%";
    bodyStyle.height = "100%";
    bodyStyle.display = "grid";

    return () => {
      delete document.documentElement.dataset.bubliSurface;
      delete document.body.dataset.bubliSurface;
      htmlStyle.background = previous.htmlBackground;
      htmlStyle.margin = previous.htmlMargin;
      htmlStyle.minHeight = previous.htmlMinHeight;
      htmlStyle.overflow = previous.htmlOverflow;
      htmlStyle.width = previous.htmlWidth;
      htmlStyle.height = previous.htmlHeight;
      bodyStyle.background = previous.bodyBackground;
      bodyStyle.margin = previous.bodyMargin;
      bodyStyle.minHeight = previous.bodyMinHeight;
      bodyStyle.overflow = previous.bodyOverflow;
      bodyStyle.width = previous.bodyWidth;
      bodyStyle.height = previous.bodyHeight;
      bodyStyle.display = previous.bodyDisplay;
    };
  }, [isTauri]);

  const validateWidgetAuthSession = useCallback(async () => {
    const session = await restoreWidgetStoredAuthSessionWithGrace();
    if (!session) {
      return false;
    }

    try {
      await authApi.getMe();
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuthSession();
        return false;
      }

      // A transient backend/network failure should not close a freshly opened widget window.
      // Later data requests will show their own loading/error state while the session mirror remains valid.
      return true;
    }
  }, []);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    async function restoreWidgetAuthSession() {
      const hasValidSession = await validateWidgetAuthSession();
      if (cancelled) return;

      setHasAuthSession(hasValidSession);
      setAuthReady(true);
    }

    void restoreWidgetAuthSession();

    return () => {
      cancelled = true;
    };
  }, [isTauri, validateWidgetAuthSession]);

  useEffect(() => {
    if (!isTauri) return;

    let validationRun = 0;

    const handleAuthSessionChange = () => {
      const currentRun = ++validationRun;
      setAuthReady(false);
      void validateWidgetAuthSession().then((hasValidSession) => {
        if (currentRun !== validationRun) return;
        setHasAuthSession(hasValidSession);
        setAuthReady(true);
      });
    };

    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      validationRun += 1;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isTauri, validateWidgetAuthSession]);

  useEffect(() => {
    if (!isTauri || !authReady || hasAuthSession) return;

    void tauriCommands.closeWidgetWindow({ bubbleType: currentWindowBubble, windowId }).catch(() => undefined);
  }, [authReady, currentWindowBubble, hasAuthSession, isTauri, windowId]);

  useEffect(() => {
    if (!widgetSessionReady || isMenuOrb) return;

    let cancelled = false;

    void authApi
      .getMe()
      .then((me) => {
        if (!cancelled) {
          setCurrentUserId(me.id);
          setCurrentUserBubliId(me.bubliId);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isMenuOrb, widgetSessionReady]);

  useEffect(() => {
    if (!isTauri || !mounted || surfaceReadySentRef.current) return;

    surfaceReadySentRef.current = true;
    void tauriCommands.appReady({ surfaceReadyOnly: true }).catch(() => {
      surfaceReadySentRef.current = false;
    });
  }, [isTauri, mounted]);

  useEffect(() => {
    if (!isTauri || !mounted || !widgetSessionReady || appReadySentRef.current) return;

    appReadySentRef.current = true;
    void tauriCommands.appReady({
      qaAllWidgets: searchParams.get("qaAllWidgets") === "1",
      selectedRoomId: selectedWidgetRoomId,
    }).catch(() => {
      appReadySentRef.current = false;
    });
  }, [isTauri, mounted, searchParams, selectedWidgetRoomId, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isWidgetChrome) return;

    const timeoutId = window.setTimeout(() => {
      setActiveBubble(requestedBubble);
      if (!isTauri) setMode(requestedMode);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isTauri, isWidgetChrome, requestedBubble, requestedMode, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isWidgetChrome) return;
    if (!isTauri) return;

    void tauriCommands
      .getWidgetWindowState({ bubbleType: requestedBubble, windowId })
      .then(async (state) => {
        const nextState = requestedMode !== state.mode
          ? await tauriCommands.setWidgetWindowMode({
            bubbleType: requestedBubble,
            mode: requestedMode,
            selectedRoomId: selectedWidgetRoomId,
            windowId,
          })
          : state;

        if (!widgetWindowStateBelongsToSurface(nextState, currentWindowBubble, windowId)) return;
        setActiveBubble(resolveWidgetBubble(nextState.activeBubble, requestedBubble));
        setMode(nextState.mode);
        setAlwaysOnTop(nextState.alwaysOnTop);
        setClickThrough(nextState.clickThrough);
        setWindowVisible(nextState.windowVisible);
      })
      .catch(() => {
        // Browser previews and incomplete Tauri permissions should not break the widget surface.
      });
  }, [currentWindowBubble, isTauri, isWidgetChrome, requestedBubble, requestedMode, selectedWidgetRoomId, widgetSessionReady, windowId]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isWidgetChrome) return;

    let cancelled = false;

    async function loadWidgetApiState() {
      try {
        const summary = await readWidgetDisplaySummary(requestedRoomId);
        if (cancelled) return;
        if (!summary) return;

        const settings = summary.bubbles ?? [];
        setWidgetContext((current) => resolveWidgetContextFromSummary(summary, requestedRoomId, current));

        const backendBubbleType = apiBubbleTypeMap[requestedBubble];
        const activeSetting = backendBubbleType ? settings.find((item) => item.bubbleType === backendBubbleType) : undefined;
        const serverMode = getModeFromSetting(activeSetting);
        if (!isTauri && serverMode && requestedMode === "DEFAULT") {
          setMode(serverMode);
          setClickThrough(false);
          setWindowVisible(serverMode !== "MINIMIZED");
        }

      } catch {
        // 인증 전이거나 서버가 없으면 기본 버블 데이터로 유지한다.
      }
    }

    void loadWidgetApiState();

    return () => {
      cancelled = true;
    };
  }, [isTauri, isWidgetChrome, requestedBubble, requestedMode, requestedRoomId, widgetSessionReady]);

  // 바로 숨었던 창은 웹뷰를 재사용(hide→show)하므로, 복원 시 Rust가 보내는 창 상태 이벤트로
  // React 상태를 되살린다. 안 받으면 창은 다시 보이는데 windowVisible=false로 남아
  // 인터랙티브 영역 보고가 꺼진 채(전면 클릭 통과) 굳는다.
  useEffect(() => {
    if (!isTauri) return;
    if (isWidgetChrome) return;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void listenWidgetWindowStateChanged((state) => {
      if (!widgetWindowStateBelongsToSurface(state, currentWindowBubble, windowId)) return;
      setActiveBubble(resolveWidgetBubble(state.activeBubble, requestedBubble));
      setMode(state.mode);
      setAlwaysOnTop(state.alwaysOnTop);
      setClickThrough(state.clickThrough);
      setWindowVisible(state.windowVisible);
    }).then((nextUnlisten) => {
      if (cancelled) {
        nextUnlisten();
        return;
      }
      unlisten = nextUnlisten;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [currentWindowBubble, isTauri, isWidgetChrome, requestedBubble, windowId]);

  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void listenWidgetRoomContextChanged((payload) => {
      const roomId = payload.selectedRoomId?.trim() || null;
      if (roomId) {
        syncActiveProjectRoomFromWidgetContext(roomId);
      } else {
        void widgetApi.updateContext({ selectedRoomId: null }).catch(() => undefined);
      }
      setWidgetContext(widgetContextForRoomId(roomId));
      setAgentRevision((current) => current + 1);
      setCommunicationRevision((current) => current + 1);
      setMemoRevision((current) => current + 1);
      setNotificationRevision((current) => current + 1);
      setResourceRevision((current) => current + 1);
      setScheduleRevision((current) => current + 1);
      setTimerRevision((current) => current + 1);
      setTodoRevision((current) => current + 1);
      requestDisplayRefresh();
    }).then((nextUnlisten) => {
      if (cancelled) {
        nextUnlisten();
        return;
      }
      unlisten = nextUnlisten;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [isTauri, requestDisplayRefresh]);

  // 메인(하이브리드) 창의 bubli:data-changed가 브릿지를 타고 tauri 이벤트로 도착하면
  // 해당 도메인 revision을 즉시 올려 조용한 재조회를 트리거한다(폴링 대기 없음 — 폴링은 fallback).
  // 연쇄 저장이 이벤트를 몰아서 보내면 짧게(250ms) 모아 한 번만 재조회한다.
  const pendingDataChangedDomainsRef = useRef<Set<DataChangedDomain>>(new Set());
  const dataChangedFlushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTauri || isMenuOrb) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;
    const pendingDomains = pendingDataChangedDomainsRef.current;

    const bumpRevisionByDomain: Record<DataChangedDomain, () => void> = {
      agent: () => setAgentRevision((current) => current + 1),
      chat: () => setCommunicationRevision((current) => current + 1),
      friend: () => setCommunicationRevision((current) => current + 1),
      memo: () => setMemoRevision((current) => current + 1),
      notification: () => setNotificationRevision((current) => current + 1),
      "project-room": requestDisplayRefresh,
      resource: () => setResourceRevision((current) => current + 1),
      schedule: () => setScheduleRevision((current) => current + 1),
      timer: () => setTimerRevision((current) => current + 1),
      todo: () => setTodoRevision((current) => current + 1),
    };

    const flushPendingDomains = () => {
      dataChangedFlushTimerRef.current = null;
      const domains = [...pendingDomains];
      pendingDomains.clear();
      // 같은 렌더 배치에서 함께 올라가므로 재조회 이펙트는 한 번만 다시 돈다.
      for (const domain of domains) bumpRevisionByDomain[domain]?.();
    };

    void listenWidgetDataChanged((payload) => {
      if (cancelled) return;
      pendingDomains.add(payload.domain);
      if (dataChangedFlushTimerRef.current !== null) return;
      dataChangedFlushTimerRef.current = window.setTimeout(flushPendingDomains, 250);
    }).then((nextUnlisten) => {
      if (cancelled) {
        nextUnlisten();
        return;
      }
      unlisten = nextUnlisten;
    });

    return () => {
      cancelled = true;
      if (dataChangedFlushTimerRef.current !== null) {
        window.clearTimeout(dataChangedFlushTimerRef.current);
        dataChangedFlushTimerRef.current = null;
      }
      pendingDomains.clear();
      unlisten?.();
    };
  }, [isMenuOrb, isTauri, requestDisplayRefresh]);

  useEffect(() => {
    if (!widgetSessionReady || isMenuOrb) return;

    let lastRefreshAt = 0;
    const refreshVisibleWidget = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRefreshAt < 1500) return;
      lastRefreshAt = now;
      requestDisplayRefresh();
    };

    window.addEventListener("focus", refreshVisibleWidget);
    document.addEventListener("visibilitychange", refreshVisibleWidget);

    return () => {
      window.removeEventListener("focus", refreshVisibleWidget);
      document.removeEventListener("visibilitychange", refreshVisibleWidget);
    };
  }, [isMenuOrb, requestDisplayRefresh, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady || isMenuOrb || displayLoadedOnceRef.current) return;

    const retryDelays = [800, 2400, 5000];
    const timeoutIds = retryDelays.map((delay) =>
      window.setTimeout(() => {
        if (!displayLoadedOnceRef.current) requestDisplayRefresh();
      }, delay),
    );

    return () => {
      for (const timeoutId of timeoutIds) window.clearTimeout(timeoutId);
    };
  }, [isMenuOrb, requestDisplayRefresh, widgetSessionReady]);

  // 버블 안 액션이 서버에 반영된 직후 같은 데이터 변경 이벤트를 발행한다 —
  // 같은 창은 window CustomEvent(notifyDataChanged), 다른 창(메인 앱·다른 버블)은
  // tauri emit → 메인 창 브릿지가 window 이벤트로 재발행해 useDataRefresh 구독 표면이 갱신된다.
  const publishWidgetDataChanged = useCallback((domain: DataChangedDomain) => {
    notifyDataChanged(domain, { source: "desktop-widget" });
    void emitWidgetDataChanged(domain).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!widgetSessionReady || !isMenuOrb) return;

    let cancelled = false;

    async function refreshMenuOrbAgentReplyBadge() {
      let roomId = selectedWidgetRoomId;
      if (!roomId) {
        const context = await widgetApi.getContext().catch(() => null);
        if (cancelled) return;
        roomId = normalizeWidgetRoomId(context?.selectedRoomId);
        if (context) setWidgetContext(widgetContextForRoomId(context.selectedRoomId));
      }
      if (!roomId) {
        const summary = await readWidgetDisplaySummary(null, { refreshServerOnCacheHit: true }).catch(() => null);
        if (cancelled) return;
        roomId = normalizeWidgetRoomId(summary?.context.selectedRoomId);
        if (summary?.context) setWidgetContext(widgetContextForRoomId(summary.context.selectedRoomId));
      }
      if (!roomId) {
        setAgentReplyBadgeCount(0);
        return;
      }

      const count = await readWidgetAgentReplyBadgeCount(roomId).catch(() => 0);
      if (!cancelled) setAgentReplyBadgeCount(count);
    }

    void refreshMenuOrbAgentReplyBadge();
    const intervalId = window.setInterval(() => {
      void refreshMenuOrbAgentReplyBadge();
    }, startupOptimization.menuOrbBadgeRefreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    communicationRevision,
    isMenuOrb,
    selectedWidgetRoomId,
    startupOptimization.menuOrbBadgeRefreshIntervalMs,
    widgetSessionReady,
  ]);

  useEffect(() => {
    if (!widgetSessionReady || isWidgetChrome || activeBubble !== "agent" || !selectedWidgetRoomId) return;

    let cancelled = false;
    void readWidgetAgentReplyBadgeCount(selectedWidgetRoomId, { markRead: true })
      .then(() => {
        if (!cancelled) setAgentReplyBadgeCount(0);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeBubble, agentRevision, communicationRevision, isWidgetChrome, selectedWidgetRoomId, widgetSessionReady]);

  useEffect(() => {
    return () => {
      if (liveKitRoomRef.current) {
        detachWidgetRemoteAudio(liveKitRoomRef.current);
        liveKitRoomRef.current.disconnect();
      }
      liveKitRoomRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isWidgetChrome) return;

    let cancelled = false;

    async function refreshWidgetContext() {
      const context = await widgetApi.getContext().catch(() => null);
      if (cancelled || !context) return;

      setWidgetContext((current) => {
        const nextContext = widgetContextForRoomId(context.selectedRoomId);
        if (
          current?.mode === nextContext?.mode &&
          current?.selectedRoomId === nextContext?.selectedRoomId
        ) {
          return current;
        }
        return nextContext;
      });
      // 배경 갱신은 내용이 같으면 이전 참조를 유지해 리렌더/깜빡임을 만들지 않는다.
    }

    const intervalId = window.setInterval(() => {
      void refreshWidgetContext();
    }, startupOptimization.widgetContextRefreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isWidgetChrome, requestedRoomId, startupOptimization.widgetContextRefreshIntervalMs, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isMenuOrb) return;

    let cancelled = false;

    async function loadDisplayApiState() {
      let selectedRoomId = selectedWidgetRoomId;
      const isWindowsStartupProfile = isTauri && startupOptimization.profile === "windows";
      const loadFullDisplay = isBubbleBar && barFullDisplayReady;
      const deferInitialWindowsBarServerLoad =
        isWindowsStartupProfile && isBubbleBar && !loadFullDisplay && !displayLoadedOnceRef.current;
      const summary = await readWidgetDisplaySummary(selectedRoomId, {
        allowServerFallback: !deferInitialWindowsBarServerLoad,
        refreshServerOnCacheHit: isBubbleBar && !deferInitialWindowsBarServerLoad,
      });
      if (summary?.context) {
        selectedRoomId = selectedRoomId ?? (!widgetContextInitialized ? normalizeWidgetRoomId(summary.context.selectedRoomId) : null);
        if (!cancelled) {
          setWidgetContext((current) => resolveWidgetContextFromSummary(summary, selectedRoomId, current));
        }
      }

      const shouldLoadBubbleData = (...bubbleTypes: WidgetBubbleType[]) =>
        loadFullDisplay || (!isWidgetChrome && bubbleTypes.includes(activeBubble));
      const deferBarAgentCollections =
        isTauri &&
        loadFullDisplay &&
        startupOptimization.deferBarAgentCollectionsOnInitialDisplay &&
        !displayLoadedOnceRef.current;
      const voiceRoomId = activeVoiceRoomId;
      const loadDashboard = shouldLoadBubbleData("timer", "todo", "schedule", "alert");
      const loadTasks = shouldLoadBubbleData("todo");
      const loadSchedules = shouldLoadBubbleData("schedule");
      const loadResources = shouldLoadBubbleData("resource");
      const loadSuggestions = shouldLoadBubbleData("agent") && !deferBarAgentCollections;
      const loadGeneratedDocuments = shouldLoadBubbleData("agent") && !deferBarAgentCollections;
      const loadMemos = shouldLoadBubbleData("memo");
      const loadNotifications = shouldLoadBubbleData("alert", "chat");
      const loadChat = shouldLoadBubbleData("chat");
      const loadRoom =
        Boolean(selectedRoomId) &&
        (loadFullDisplay || (!isBubbleBar && activeBubble !== "alert") || (isBubbleBar && !isWindowsStartupProfile));
      const loadRoomBoard = Boolean(selectedRoomId) && shouldLoadBubbleData("todo");
      const initialDisplayPageSize =
        isTauri && !displayLoadedOnceRef.current && startupOptimization.initialDisplayPageSize > 0
          ? startupOptimization.initialDisplayPageSize
          : 0;
      const initialNotificationScanPages =
        isTauri && !displayLoadedOnceRef.current && startupOptimization.initialNotificationScanPages > 0
          ? startupOptimization.initialNotificationScanPages
          : 0;
      const loadProjectRooms =
        (isBubbleBar && (!isWindowsStartupProfile || loadFullDisplay || displayLoadedOnceRef.current)) ||
        loadFullDisplay ||
        activeBubble === "agent" ||
        activeBubble === "todo" ||
        activeBubble === "memo" ||
        activeBubble === "schedule";
      const [
        dashboardResult,
        tasksResult,
        schedulesResult,
        resourcesResult,
        memosResult,
        personalMemosResult,
        personalSchedulesResult,
        notificationsResult,
        chatRoomsResult,
        friendsResult,
        friendRequestsResult,
        roomResult,
        voiceResult,
        projectRoomsResult,
        roomBoardResult,
        suggestionsResult,
        personalSuggestionsResult,
        generatedDocumentsResult,
        personalGeneratedDocumentsResult,
      ] =
        await Promise.allSettled([
          loadDashboard ? widgetDisplayApi.getDashboardWork() : Promise.resolve(null),
          loadTasks ? widgetDisplayApi.listMyTasks(30) : Promise.resolve(null),
          loadSchedules
            ? initialDisplayPageSize > 0
              ? widgetDisplayApi.listSchedules(selectedRoomId, initialDisplayPageSize)
              : widgetDisplayApi.listAllSchedules(selectedRoomId)
            : Promise.resolve(null),
          loadResources
            ? initialDisplayPageSize > 0
              ? widgetDisplayApi.listResources(selectedRoomId, initialDisplayPageSize)
              : widgetDisplayApi.listAllResources(selectedRoomId)
            : Promise.resolve(null),
          loadMemos
            ? initialDisplayPageSize > 0
              ? widgetDisplayApi.listMemos(selectedRoomId, initialDisplayPageSize)
              : widgetDisplayApi.listAllMemos(selectedRoomId)
            : Promise.resolve(null),
          loadMemos && selectedRoomId
            ? initialDisplayPageSize > 0
              ? widgetDisplayApi.listMemos(null, initialDisplayPageSize)
              : widgetDisplayApi.listAllMemos(null)
            : Promise.resolve(null),
          loadSchedules && selectedRoomId
            ? initialDisplayPageSize > 0
              ? widgetDisplayApi.listSchedules(null, initialDisplayPageSize)
              : widgetDisplayApi.listAllSchedules(null)
            : Promise.resolve(null),
          loadNotifications ? listWidgetVisibleUnreadNotifications(WIDGET_NOTIFICATION_DISPLAY_LIMIT, initialNotificationScanPages) : Promise.resolve(null),
          loadChat ? widgetDisplayApi.listChatRooms(20) : Promise.resolve(null),
          loadChat ? widgetDisplayApi.listFriends() : Promise.resolve(null),
          loadChat ? widgetDisplayApi.listFriendRequests() : Promise.resolve(null),
          loadRoom && selectedRoomId ? widgetDisplayApi.getProjectRoom(selectedRoomId) : Promise.resolve(null),
          loadChat && voiceRoomId ? widgetDisplayApi.getVoiceRoom(voiceRoomId) : Promise.resolve(null),
          loadProjectRooms ? widgetDisplayApi.listProjectRooms() : Promise.resolve(null),
          loadRoomBoard && selectedRoomId ? widgetDisplayApi.listRoomBoard(selectedRoomId, 50) : Promise.resolve(null),
          loadSuggestions ? widgetDisplayApi.listAgentSuggestions(selectedRoomId) : Promise.resolve(null),
          loadSuggestions && selectedRoomId ? widgetDisplayApi.listAgentSuggestions(null) : Promise.resolve(null),
          loadGeneratedDocuments
            ? selectedRoomId
              ? agentApi.listRoomGeneratedDocuments(selectedRoomId)
              : agentApi.listGeneratedDocuments()
            : Promise.resolve(null),
          loadGeneratedDocuments && selectedRoomId ? agentApi.listGeneratedDocuments() : Promise.resolve(null),
        ]);

      if (cancelled) return;

      const dashboardValue = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
      const tasksValue = tasksResult.status === "fulfilled" ? tasksResult.value : null;
      const schedulesValue = schedulesResult.status === "fulfilled" ? schedulesResult.value : null;
      const resourcesValue = resourcesResult.status === "fulfilled" ? resourcesResult.value : null;
      const memosValue = memosResult.status === "fulfilled" ? memosResult.value : null;
      const personalMemosValue = personalMemosResult.status === "fulfilled" ? personalMemosResult.value : null;
      const personalSchedulesValue = personalSchedulesResult.status === "fulfilled" ? personalSchedulesResult.value : null;
      const notificationsValue = notificationsResult.status === "fulfilled" ? notificationsResult.value : null;
      const chatRoomsValue = chatRoomsResult.status === "fulfilled" ? chatRoomsResult.value : null;
      const friendsValue = friendsResult.status === "fulfilled" ? friendsResult.value : null;
      const friendRequestsValue = friendRequestsResult.status === "fulfilled" ? friendRequestsResult.value : null;
      const roomValue = roomResult.status === "fulfilled" ? roomResult.value : null;
      const voiceValue = voiceResult.status === "fulfilled" ? voiceResult.value : null;
      setActiveVoiceRoom(voiceValue);
      const projectRoomsValue = projectRoomsResult.status === "fulfilled" ? projectRoomsResult.value : null;
      if (!cancelled && projectRoomsValue) {
        const nextRoomOptions = projectRoomsValue.items
          .filter((room) => room.status === "ACTIVE")
          .map((room) => ({ id: room.id, name: room.name }));
        setWidgetRoomOptions((current) => keepIfDeepEqual(current, nextRoomOptions));
      }
      const suggestionsValue = suggestionsResult.status === "fulfilled" ? suggestionsResult.value : null;
      const personalSuggestionsValue = personalSuggestionsResult.status === "fulfilled" ? personalSuggestionsResult.value : null;
      const generatedDocumentsValue = generatedDocumentsResult.status === "fulfilled" ? generatedDocumentsResult.value : null;
      const personalGeneratedDocumentsValue =
        personalGeneratedDocumentsResult.status === "fulfilled" ? personalGeneratedDocumentsResult.value : null;
      const notifications = notificationsValue?.items ?? [];
      const rooms = chatRoomsValue?.items ?? [];
      const peerRooms = rooms.filter((room) => room.status === "ACTIVE" && (room.chatType === "DIRECT" || room.chatType === "GROUP"));
      let activeRoom =
        chatScope === "room"
          ? resolveActiveWidgetChatRoom(rooms, selectedRoomId)
          : resolveSelectedPeerChatRoom(peerRooms, selectedPeerChatRoomId);
      if (loadChat && chatScope === "room" && selectedRoomId && !activeRoom) {
        activeRoom = await widgetDisplayApi.createProjectRoomChatRoom(selectedRoomId).catch(() => null);
      }
      if (cancelled) return;
      // 스레드 화면에서 최근 메시지 한두 개가 아니라 웹처럼 스크롤 가능한 대화 전체를 보여줘야
      // 해서 6개가 아니라 넉넉히 가져온다.
      const messages = loadChat && activeRoom ? await widgetDisplayApi.listChatMessages(activeRoom.id, 40).catch(() => null) : null;
      const cachedMessages =
        loadChat && isTauri && activeRoom && !messages
          ? await tauriCommands
              .readRoomMessages({ limit: 40, roomId: activeRoom.id })
              .then((result) => parseCachedWidgetChatMessages(result.items))
              .catch(() => [])
          : [];

      if (cancelled) return;

      const failedBubbles = new Set<WidgetBubbleType>();
      if (loadDashboard && dashboardResult.status === "rejected") {
        failedBubbles.add("timer");
        failedBubbles.add("todo");
        failedBubbles.add("schedule");
        failedBubbles.add("alert");
      }
      if (loadTasks && tasksResult.status === "rejected") failedBubbles.add("todo");
      if (loadSchedules && schedulesResult.status === "rejected") failedBubbles.add("schedule");
      if (loadResources && resourcesResult.status === "rejected") {
        failedBubbles.add("resource");
      }
      if (loadMemos && memosResult.status === "rejected") failedBubbles.add("memo");
      if (loadMemos && selectedRoomId && personalMemosResult.status === "rejected") failedBubbles.add("memo");
      if (loadSchedules && selectedRoomId && personalSchedulesResult.status === "rejected") failedBubbles.add("schedule");
      if (
        loadSuggestions &&
        (suggestionsResult.status === "rejected" ||
          (selectedRoomId && personalSuggestionsResult.status === "rejected"))
      ) {
        failedBubbles.add("agent");
      }
      if (
        loadGeneratedDocuments &&
        (generatedDocumentsResult.status === "rejected" ||
          (selectedRoomId && personalGeneratedDocumentsResult.status === "rejected"))
      ) {
        failedBubbles.add("agent");
      }
      if (loadNotifications && notificationsResult.status === "rejected") failedBubbles.add("alert");
      if (
        loadChat &&
        (chatRoomsResult.status === "rejected" ||
          friendsResult.status === "rejected" ||
          friendRequestsResult.status === "rejected" ||
          (activeRoom && !messages) ||
          (voiceRoomId && voiceResult.status === "rejected"))
      ) {
        failedBubbles.add("chat");
      }

      if (isTauri && activeRoom && messages?.items.length) {
        void tauriCommands
          .syncRoomMessages({
            afterSequence: 0,
            messages: messages.items.map((message) => ({
              bodyJson: JSON.stringify(message),
              roomSequence: message.roomSequence,
              serverMessageId: message.id,
            })),
            roomId: activeRoom.id,
          })
          .catch(() => undefined);
      }

      // 룸 칩 라벨용 roomId → 룸 이름 매핑: 서버 목록 성공 시 로컬 캐시에 병합 저장하고,
      // 실패 시 Tauri 로컬 캐시(roomNames 필드)에서 복원한다. 선택 룸 단건 조회 결과도 합친다.
      let roomNames: WidgetRoomNameMap = {};
      if (projectRoomsValue) {
        roomNames = Object.fromEntries(projectRoomsValue.items.map((room) => [room.id, room.name]));
        if (isTauri) void writeCachedWidgetRoomNames(roomNames, selectedRoomId).catch(() => undefined);
      } else if (isTauri) {
        roomNames = (await readCachedWidgetRoomNames(selectedRoomId).catch(() => null)) ?? {};
      }
      if (roomValue) {
        roomNames = { ...roomNames, [roomValue.id]: roomValue.name };
      }
      if (cancelled) return;

      const summaryDashboard = dashboardFromWidgetSummary(summary);
      const dashboard = selectedRoomId ? null : dashboardValue ?? summaryDashboard;
      // 룸 컨텍스트에서도 개인 오늘 항목(할당 룸 태스크 제외)을 뒤이어 보여준다.
      const personalTodayTasks =
        dashboardValue
          ? dashboardValue.todayTasks
          : selectedRoomId
            ? []
            : (summaryDashboard?.todayTasks ?? []);
      // 실행 중(또는 일시정지) 타이머는 사용자당 1개뿐이라, 위젯 스코프와 무관하게 항상 노출한다.
      // (다른 룸에 걸린 타이머도 어디서든 바로 일시정지/재개할 수 있어야 데드락이 안 생긴다. 룸 구분은 라벨로.)
      const rememberedTimerSnapshot = timerSnapshot ?? (await readWidgetWorkTimerSnapshot(null).catch(() => null));
      const activeTimer = dashboard?.runningTimer ?? rememberedTimerSnapshot;
      const messageItems = messages?.items ?? cachedMessages;
      const schedules = schedulesValue?.items ?? (selectedRoomId ? [] : (summaryDashboard?.todaySchedules ?? []));
      const tasks = tasksValue?.items ?? (selectedRoomId ? [] : (summaryDashboard?.todayTasks ?? []));
      const roomBoardTasks =
        roomBoardResult.status === "fulfilled" && roomBoardResult.value ? roomBoardResult.value.items : [];
      const hadLoadedDisplay = displayLoadedOnceRef.current;
      const nextNotificationSignal =
        loadNotifications && notificationsResult.status === "rejected"
          ? widgetDisplayLoadSignal("error")
          : buildNotificationSignal(t, notifications);
      setNotificationSignal((current) =>
        hadLoadedDisplay && loadNotifications && notificationsResult.status === "rejected"
          ? current
          : keepIfDeepEqual(current, nextNotificationSignal),
      );
      // 앱 아이콘 배지(맥 독 숫자 / 윈도우 오버레이 점) — 항상 떠 있는 바 창이 단독으로 갱신한다.
      if (isTauri && isBubbleBar && loadNotifications && notificationsResult.status !== "rejected") {
        const unreadBadgeCount = notifications.filter((item) => item.status === "UNREAD").length;
        void tauriCommands.setAppBadgeCount(unreadBadgeCount).catch(() => undefined);
      }
      setActiveTimerHeartbeatId(activeTimer?.status === "RUNNING" ? activeTimer.id : null);

      const nextDisplayBubbles = buildDisplayBubbles({
          chatRoom: activeRoom ?? null,
          chatScope,
          currentUserId,
          currentUserBubliId,
          friendRequests: friendRequestsValue ?? [],
          peerRooms,
          selectedPeerChatRoomId,
          dashboard,
          friends: friendsValue ?? [],
          memos: memosValue?.items ?? [],
          messages: messageItems,
          notifications,
          generatedDocuments: generatedDocumentsValue?.items ?? [],
          personalMemos: personalMemosValue?.items ?? [],
          personalGeneratedDocuments: personalGeneratedDocumentsValue?.items ?? [],
          personalSchedules: personalSchedulesValue?.items ?? [],
          personalSuggestions: personalSuggestionsValue ?? [],
          personalTodayTasks,
          resources: resourcesValue?.items ?? [],
          room: roomValue,
          roomId: selectedRoomId,
          roomNames,
          schedules,
          suggestions: suggestionsValue ?? [],
          tasks,
          myTasks: tasks,
          roomBoardTasks,
          timer: activeTimer,
          voiceConnectionLabel,
          voiceRoom: voiceValue,
        }, t);
      const persistedItemStates = await widgetApi
        .listItemStates(collectWidgetItemIds(nextDisplayBubbles))
        .catch(() => []);
      const persistedOverrides = itemStateResponseToOverrides(persistedItemStates);
      const nextBubblesBase = applyItemStateOverrides(nextDisplayBubbles, { ...persistedOverrides, ...itemStateOverrides });
      const nextBubbles = hadLoadedDisplay ? nextBubblesBase : withFailedWidgetDisplayBubbles(nextBubblesBase, failedBubbles);
      // 배경 재조회 결과가 기존과 같으면 이전 데이터를 그대로 유지하고(로딩 스켈레톤 재노출 없음),
      // 일부만 바뀌면 안 바뀐 버블의 참조를 보존한다 — memo된 셸/행이 바뀐 버블만 다시 그린다.
      setDisplayBubbles((current) =>
        keepBubbleMapIfDeepEqual(
          current,
          hadLoadedDisplay ? preserveFailedWidgetDisplayBubbles(nextBubbles, current, failedBubbles) : nextBubbles,
        ),
      );
      displayLoadedOnceRef.current = true;
    }

    void loadDisplayApiState().catch(() => {
      // 첫 로드 전 실패만 에러 상태로 바꾸고, 배경 재조회 실패는 이전 데이터를 유지한다.
      if (!cancelled && !displayLoadedOnceRef.current) {
        setDisplayBubbles(withWidgetDisplayLoadState(buildEmptyDisplayBubbles(t, selectedWidgetRoomId), "error"));
        setNotificationSignal(widgetDisplayLoadSignal("error"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeBubble, activeVoiceRoomId, agentRevision, barFullDisplayReady, chatScope, communicationRevision, currentUserBubliId, currentUserId, displayRefreshRevision, isBubbleBar, isMenuOrb, isTauri, isWidgetChrome, itemStateOverrides, memoRevision, notificationRevision, resourceRevision, scheduleRevision, selectedPeerChatRoomId, selectedWidgetRoomId, startupOptimization.deferBarAgentCollectionsOnInitialDisplay, startupOptimization.initialDisplayPageSize, startupOptimization.initialNotificationScanPages, startupOptimization.profile, t, timerRevision, timerSnapshot, todoRevision, voiceConnectionLabel, widgetContextInitialized, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (!isBubbleBar) return;

    let cancelled = false;
    let unlistenBarItemsChanged: (() => void) | null = null;

    async function loadBarItems() {
      if (!isTauri) {
        // 브라우저 미리보기용 접힌 칩 구성 — 실제 최소화 상태는 Tauri 창 스토어가 관리하고,
        // 여기서는 인라인 카운트·라이브 타이머 라벨이 보이는 칩 종류만 배치한다.
        // 칩에 표시되는 숫자 자체는 위 loadDisplayApiState가 불러온 실데이터에서만 나온다.
        setBarItems(
          (["timer", "todo", "schedule", "memo"] as const).map((bubbleType) => ({
            activeBubble: bubbleType,
            alwaysOnTop: true,
            clickThrough: false,
            dockOrbVisible: false,
            mode: "MINIMIZED",
            position: { x: 0, y: 0 },
            trayVisible: false,
            windowId: bubbleType,
            windowVisible: false,
          })),
        );
        return;
      }

      try {
        const items = await tauriCommands.getWidgetBarItems();
        if (cancelled) return;
        const next = items.filter((item) => isDesktopWidgetBubble(item.activeBubble));
        // 폴링이 같은 목록을 새 배열 참조로 내려보내도 리렌더(칩 깜빡임)하지 않는다.
        setBarItems((current) => keepIfDeepEqual(current, next));
      } catch {
        if (!cancelled) setBarItems((current) => (current.length === 0 ? current : []));
      }
    }

    void loadBarItems();
    if (isTauri) {
      void listenWidgetBarItemsChanged(() => {
        void loadBarItems();
        requestDisplayRefresh();
      }).then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
          return;
        }
        unlistenBarItemsChanged = nextUnlisten;
      });
    }
    // Rust 이벤트가 즉시 밀어주므로 폴링은 누락 이벤트 복구용 fallback으로만 느리게 둔다.
    const intervalId = window.setInterval(() => {
      void loadBarItems();
    }, isTauri ? 15000 : 4000);

    return () => {
      cancelled = true;
      unlistenBarItemsChanged?.();
      window.clearInterval(intervalId);
    };
  }, [isBubbleBar, isTauri, requestDisplayRefresh, widgetSessionReady]);

  const setWindowMode = useCallback(
    async (nextMode: WidgetWindowMode) => {
      const previousMode = mode;
      const previousClickThrough = clickThrough;
      const previousWindowVisible = windowVisible;

      setMode(nextMode);
      setClickThrough(false);
      setWindowVisible(nextMode !== "MINIMIZED");

      if (!isTauri) return;

      try {
        const state = await tauriCommands.setWidgetWindowMode({
          bubbleType: activeBubble,
          mode: nextMode,
          selectedRoomId: selectedWidgetRoomId,
          windowId,
        });
        const settingPatch = getSettingPatch(activeBubble, state.mode);
        if (settingPatch) {
          const size = getWidgetWindowSize(activeBubble, state.mode);
          void widgetApi
            .updateSettings({
              bubbles: [
                {
                  ...settingPatch,
                  height: size.height,
                  width: size.width,
                  x: widgetSettingCoordinate(state.position.x),
                  y: widgetSettingCoordinate(state.position.y),
                },
              ],
            })
            .catch(() => undefined);
        }
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: activeBubble,
            eventType: `mode:${state.mode}`,
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
        setActiveBubble(resolveWidgetBubble(state.activeBubble, activeBubble));
        setMode(state.mode);
        setAlwaysOnTop(state.alwaysOnTop);
        setClickThrough(state.clickThrough);
        setWindowVisible(state.windowVisible);
      } catch {
        setMode(previousMode);
        setClickThrough(previousClickThrough);
        setWindowVisible(previousWindowVisible);
      }
    },
    [
      activeBubble,
      clickThrough,
      isTauri,
      mode,
      selectedWidgetRoomId,
      setActiveBubble,
      setAlwaysOnTop,
      setClickThrough,
      setMode,
      setWindowVisible,
      windowId,
      windowVisible,
    ],
  );

  const toggleAlwaysOnTop = useCallback(async () => {
    const previous = alwaysOnTop;
    const enabled = !previous;
    setAlwaysOnTop(enabled);

    if (!isTauri) return;

    try {
      const state = await tauriCommands.setWidgetAlwaysOnTop({ bubbleType: activeBubble, enabled, windowId });
      setAlwaysOnTop(state.alwaysOnTop);
    } catch {
      setAlwaysOnTop(previous);
    }
  }, [activeBubble, alwaysOnTop, isTauri, setAlwaysOnTop, windowId]);

  const restoreCurrentWindow = useCallback(async () => {
    const previousMode = mode;
    const previousClickThrough = clickThrough;
    const previousWindowVisible = windowVisible;

    setMode("DEFAULT");
    setClickThrough(false);
    setWindowVisible(true);

    if (!isTauri) return;

    try {
      const state = await tauriCommands.openWidgetWindow({
        bubbleType: activeBubble,
        mode: "DEFAULT",
        selectedRoomId: selectedWidgetRoomId,
        windowId,
      });
      const settingPatch = getSettingPatch(activeBubble, state.mode);
      if (settingPatch) {
        const size = getWidgetWindowSize(activeBubble, state.mode);
        void widgetApi
          .updateSettings({
            bubbles: [
              {
                ...settingPatch,
                height: size.height,
                width: size.width,
                x: widgetSettingCoordinate(state.position.x),
                y: widgetSettingCoordinate(state.position.y),
              },
            ],
          })
          .catch(() => undefined);
      }
      void tauriCommands
        .recordWidgetUsageEvent({
          bubbleType: activeBubble,
          eventType: "open",
          occurredAt: new Date().toISOString(),
        })
        .catch(() => undefined);
      setActiveBubble(resolveWidgetBubble(state.activeBubble, activeBubble));
      setMode(state.mode);
      setAlwaysOnTop(state.alwaysOnTop);
      setClickThrough(state.clickThrough);
      setWindowVisible(state.windowVisible);
    } catch {
      setMode(previousMode);
      setClickThrough(previousClickThrough);
      setWindowVisible(previousWindowVisible);
    }
  }, [
    activeBubble,
    clickThrough,
    isTauri,
    mode,
    selectedWidgetRoomId,
    setActiveBubble,
    setAlwaysOnTop,
    setClickThrough,
    setMode,
    setWindowVisible,
    windowId,
    windowVisible,
  ]);

  // macOS에서는 닫기(X)가 웹뷰를 내려도 바 복원 항목에는 남는다.
  // Windows는 네이티브 닫기 의미를 유지한다.
  const closeWindow = useCallback(async () => {
    if (!isTauri) {
      setWindowVisible(false);
      return;
    }

    const previousWindowVisible = windowVisible;
    try {
      const state = await tauriCommands.closeWidgetWindow({
        bubbleType: activeBubble,
        windowId,
      });
      void tauriCommands
        .recordWidgetUsageEvent({
          bubbleType: activeBubble,
          eventType: "close",
          occurredAt: new Date().toISOString(),
        })
        .catch(() => undefined);
      setMode(state.mode);
      setAlwaysOnTop(state.alwaysOnTop);
      setClickThrough(state.clickThrough);
      setWindowVisible(state.windowVisible);
    } catch {
      setWindowVisible(previousWindowVisible);
    }
  }, [activeBubble, isTauri, setAlwaysOnTop, setClickThrough, setMode, setWindowVisible, windowId, windowVisible]);

  const restoreBubbleFromBar = useCallback(
    async (bubbleType: WidgetBubbleType, options?: { selectedRoomId?: string | null }) => {
      if (!isTauri) return;

      try {
        const selectedRoomId =
          options && "selectedRoomId" in options ? normalizeWidgetRoomId(options.selectedRoomId) : selectedWidgetRoomId;
        // windowId는 항상 버블 타입으로 고정한다. 바 칩이 들고 있던 저장 windowId를 그대로
        // 넘기면(레거시 "todo-…" 등) Rust 스토어 키가 갈라져 같은 버블 창이 두 개 열렸다.
        const state = await tauriCommands.openWidgetWindow({
          bubbleType,
          mode: "DEFAULT",
          selectedRoomId,
          windowId: bubbleType,
        });
        const settingPatch = getSettingPatch(bubbleType, state.mode);
        if (settingPatch) {
          const size = getWidgetWindowSize(bubbleType, state.mode);
          void widgetApi
            .updateSettings({
              bubbles: [
                {
                  ...settingPatch,
                  height: size.height,
                  width: size.width,
                  x: widgetSettingCoordinate(state.position.x),
                  y: widgetSettingCoordinate(state.position.y),
                },
              ],
            })
            .catch(() => undefined);
        }
        const items = await tauriCommands.getWidgetBarItems();
        const next = items.filter((item) => isDesktopWidgetBubble(item.activeBubble));
        setBarItems((current) => keepIfDeepEqual(current, next));
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri, selectedWidgetRoomId],
  );

  const openAgentFromMenuOrb = useCallback(async () => {
    let roomId = selectedWidgetRoomId;
    if (!roomId) {
      const context = await widgetApi.getContext().catch(() => null);
      roomId = normalizeWidgetRoomId(context?.selectedRoomId);
      if (context) setWidgetContext(widgetContextForRoomId(context.selectedRoomId));
    }

    setAgentReplyBadgeCount(0);
    if (roomId) {
      void readWidgetAgentReplyBadgeCount(roomId, { markRead: true }).catch(() => undefined);
    }
    await restoreBubbleFromBar("agent", { selectedRoomId: roomId });
  }, [restoreBubbleFromBar, selectedWidgetRoomId]);

  const handleItemStateChange = useCallback(
    async (item: WidgetPreviewItem, state: WidgetItemStateAction) => {
      const itemType: BackendWidgetItemType =
        item.kind === "message"
          ? "MESSAGE"
          : item.kind === "schedule"
            ? "SCHEDULE"
            : item.kind === "resource" || item.kind === "agent" || item.kind === "document"
              ? "NOTIFICATION"
              : "TASK";

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: activeBubble,
            eventType: `item:${state.toLowerCase()}`,
            itemId: item.id,
            itemType,
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      const itemStateId = item.stateId ?? (isUuid(item.id) ? item.id : null);
      const applyLocalState = () => {
        setDisplayBubbles((current) => ({
          ...current,
          [activeBubble]: applyItemStateActionToBubble(current[activeBubble], item.id, state),
        }));
        setItemStateOverrides((current) => {
          if (state !== "VISIBLE") return { ...current, [item.id]: state };
          const next = { ...current };
          delete next[item.id];
          return next;
        });
      };
      const backendBubbleType = apiItemBubbleTypeMap[activeBubble];

      const persistItemState = async () => {
        if (!backendBubbleType || !itemStateId) return;
        await widgetApi.updateItemState(itemStateId, {
          bubbleType: backendBubbleType,
          itemId: item.id,
          itemType,
          state,
        });
      };

      if (activeBubble === "alert" && state === "CONFIRMED") {
        await notificationApi.markRead(item.id);
        void persistItemState().catch(() => undefined);
        setNotificationRevision((current) => current + 1);
        publishWidgetDataChanged("notification");
        applyLocalState();
        return;
      }

      if (activeBubble === "alert" && state === "HIDDEN") {
        await notificationApi.archive(item.id);
        void persistItemState().catch(() => undefined);
        setNotificationRevision((current) => current + 1);
        publishWidgetDataChanged("notification");
        applyLocalState();
        return;
      }

      if (!backendBubbleType || !itemStateId) {
        applyLocalState();
        return;
      }

      await persistItemState();
      if (activeBubble === "todo" && item.kind === "task" && state === "CONFIRMED") {
        await todoApi.update(item.id, { status: item.checked ? "TODO" : "DONE" });
        setTodoRevision((current) => current + 1);
        publishWidgetDataChanged("todo");
      }
      if (activeBubble === "agent" && item.kind === "agent" && state === "CONFIRMED") {
        await agentApi.updateSuggestion(item.id, { action: "APPROVE" });
        setAgentRevision((current) => current + 1);
        publishWidgetDataChanged("agent");
      }
      applyLocalState();
    },
    [activeBubble, isTauri, publishWidgetDataChanged],
  );

  const reviewWidgetAgentSuggestion = useCallback(
    async (item: WidgetPreviewItem, action: WidgetAgentSuggestionReviewAction) => {
      if (!item.reviewable) return;

      await agentApi.updateSuggestion(item.id, { action });

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "agent",
            eventType: `agent:${action.toLowerCase()}`,
            itemId: item.id,
            itemType: "NOTIFICATION",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setDisplayBubbles((current) => ({
        ...current,
        agent: applyItemStateActionToBubble(current.agent, item.id, "CONFIRMED"),
      }));
      setAgentRevision((current) => current + 1);
      if (action === "APPROVE") {
        setTodoRevision((current) => current + 1);
        setScheduleRevision((current) => current + 1);
        publishWidgetDataChanged("todo");
        publishWidgetDataChanged("schedule");
      }
      publishWidgetDataChanged("agent");
    },
    [isTauri, publishWidgetDataChanged],
  );

  const markAllWidgetNotificationsRead = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      if (bubble.rows.length === 0) return;

      const emptySignal: WidgetNotificationSignal = {
        compactLabel: t("widget.signal.alertCount", { count: 0 }),
        metric: "0",
        notificationLabel: t("widget.signal.noNewAlert"),
        rows: [],
      };

      setNotificationSignal(emptySignal);
      setDisplayBubbles((current) => {
        const alertBubble = current.alert;
        if (!alertBubble) return current;
        return {
          ...current,
          alert: {
            ...alertBubble,
            compactLabel: emptySignal.compactLabel,
            metric: emptySignal.metric,
            notificationLabel: emptySignal.notificationLabel,
            panelBody: t("widget.alert.noneNow"),
            rows: [],
          },
        };
      });

      try {
        await notificationApi.markAllRead();
        publishWidgetDataChanged("notification");
      } finally {
        setNotificationRevision((current) => current + 1);
      }
    },
    [publishWidgetDataChanged, t],
  );

  const openWidgetHandoff = useCallback(
    async (item: WidgetPreviewItem) => {
      const route = item.handoffUrl?.trim();
      if (!route) return;

      const itemType: BackendWidgetItemType =
        item.kind === "message"
          ? "MESSAGE"
          : item.kind === "schedule"
            ? "SCHEDULE"
            : item.kind === "resource" || item.kind === "agent" || item.kind === "document"
              ? "NOTIFICATION"
              : "TASK";

      if (isTauri) {
        if (activeBubble === "chat" && (item.kind === "message" || route.includes("/chat"))) {
          await openTauriChatWidget({
            eventType: "handoff:message",
            roomId: selectedWidgetRoomId,
          });
          return;
        }

        await tauriCommands.openMainWindowRoute({ route });
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: activeBubble,
            eventType: "handoff:open",
            itemId: item.id,
            itemType,
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
        return;
      }

      window.open(route, "_blank", "noopener,noreferrer");
    },
    [activeBubble, isTauri, selectedWidgetRoomId],
  );

  const analyzeWidgetResource = useCallback(
    async (item: WidgetPreviewItem) => {
      const job = await widgetDisplayApi.analyzeResource(item.id);

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "resource",
            eventType: "resource:analyze",
            itemId: job.jobId,
            itemType: "NOTIFICATION",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setResourceRevision((current) => current + 1);
      setAgentRevision((current) => current + 1);
      publishWidgetDataChanged("resource");
      publishWidgetDataChanged("agent");
    },
    [isTauri, publishWidgetDataChanged],
  );

  const downloadWidgetResource = useCallback(
    async (item: WidgetPreviewItem) => {
      if (item.kind === "document") {
        const result = await agentApi.exportGeneratedDocument(item.id);
        const url = URL.createObjectURL(result.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.fileName;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);

        if (isTauri) {
          void tauriCommands
            .recordWidgetUsageEvent({
              bubbleType: "agent",
              eventType: "document:download",
              itemId: item.id,
              itemType: "NOTIFICATION",
              occurredAt: new Date().toISOString(),
            })
            .catch(() => undefined);
        }
        return;
      }

      const result = await widgetDisplayApi.getResourceDownloadUrl(item.id);
      const url = resolveResourceDownloadUrl(result);
      if (!url) {
        throw new Error("Download URL is empty");
      }
      // Tauri 웹뷰에서는 window.open(_blank)이 막히므로 OS 기본 브라우저로 연다(웹은 새 탭 유지).
      if (isTauri) {
        await tauriCommands.openExternalUrl(url).catch(() => undefined);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "resource",
            eventType: "resource:download",
            itemId: item.id,
            itemType: "NOTIFICATION",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }
    },
    [isTauri],
  );

  const sendWidgetChatMessage = useCallback(
    async (bubble: WidgetPreviewBubble, text: string) => {
      if (!bubble.chatRoomId) return;

      // "/bubli …"는 일반 텍스트가 아니라 프로젝트룸 에이전트 명령으로 라우팅한다
      // (웹 소통창과 같은 계약 — 자동완성으로 완성한 명령이 그대로 실행되게).
      const agentCommand = parseAgentCommandText(text);
      if (agentCommand && bubble.roomId) {
        const result = await widgetCommunicationApi.runRoomAgentCommand(bubble.roomId, {
          clientMessageId: `widget-chat-agent-${crypto.randomUUID()}`,
          message: agentCommand.message || t("chat.agentDefaultPrompt"),
          mode: agentCommand.mode,
        });

        if (isTauri) {
          void tauriCommands
            .recordWidgetUsageEvent({
              bubbleType: "agent",
              eventType: "agent:command",
              itemId: result.message.id,
              itemType: "MESSAGE",
              occurredAt: new Date().toISOString(),
            })
            .catch(() => undefined);
        }

        if (isWidgetAgentReplyMessage(result.message)) {
          void writeWidgetAgentReplyLastReadSequence(result.message.chatRoomId, result.message.roomSequence, bubble.roomId).catch(
            () => undefined,
          );
          setAgentReplyBadgeCount(0);
        }

        setCommunicationRevision((current) => current + 1);
        setAgentRevision((current) => current + 1);
        publishWidgetDataChanged("agent");
        publishWidgetDataChanged("chat");
        return;
      }

      const clientMessageId = crypto.randomUUID();
      const response = await widgetCommunicationApi.sendChatMessage(bubble.chatRoomId, {
        body: { text },
        clientMessageId,
        messageType: "TEXT",
      });
      const emojis = extractEmojiSplashEmojis(text);
      if (emojis) {
        dispatchEmojiSplash({
          chatRoomId: response.chatRoomId,
          emojis,
          messageId: response.id ?? clientMessageId,
          senderId: response.sender?.id ?? null,
        });
      }
      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "chat",
            eventType: "chat:send",
            itemId: bubble.chatRoomId,
            itemType: "MESSAGE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }
      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const sendWidgetAgentCommand = useCallback(
    async (bubble: WidgetPreviewBubble, text: string) => {
      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;

      if (!roomId) {
        const userCreatedAt = new Date().toISOString();
        const memory = await readPersonalAgentMemory();
        const result = await widgetCommunicationApi.runPersonalAgentCommand({
          memory,
          message: text,
          mode: inferAgentCommandMode(text),
          resourceIds: [],
        });
        const answer = personalAgentResponseText(result) ?? t("widget.agent.replyFallback");

        await storePersonalAgentLocalResult({
          agentText: answer,
          requestText: text,
          response: result,
          userCreatedAt,
        });

        if (isTauri) {
          void tauriCommands
            .recordWidgetUsageEvent({
              bubbleType: "agent",
              eventType: "agent:personal-command",
              itemType: "MESSAGE",
              occurredAt: new Date().toISOString(),
            })
            .catch(() => undefined);
        }

        setAgentReplyBadgeCount(0);
        setAgentRevision((current) => current + 1);
        publishWidgetDataChanged("agent");
        return answer;
      }

      // 위젯 에이전트 버블은 자연어 그대로 받는다(접두어는 버블 컴포저가 이미 제거).
      // mode는 웹 소통창과 같은 키워드 계약으로 추론한다(기본 ANSWER).
      const result = await widgetCommunicationApi.runRoomAgentCommand(roomId, {
        clientMessageId: `widget-agent-${crypto.randomUUID()}`,
        message: text,
        mode: inferAgentCommandMode(text),
      });

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "agent",
            eventType: "agent:command",
            itemId: result.message.id,
            itemType: "MESSAGE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      if (isWidgetAgentReplyMessage(result.message)) {
        void writeWidgetAgentReplyLastReadSequence(result.message.chatRoomId, result.message.roomSequence, roomId).catch(() => undefined);
        setAgentReplyBadgeCount(0);
      }

      setCommunicationRevision((current) => current + 1);
      setAgentRevision((current) => current + 1);
      publishWidgetDataChanged("agent");
      publishWidgetDataChanged("chat");

      // 에이전트 응답 본문을 돌려줘 버블 내 미니 대화에 응답 말풍선으로 붙인다.
      const responseBody = result.message.body as Record<string, unknown>;
      return typeof responseBody.text === "string" ? responseBody.text : undefined;
    },
    [isTauri, publishWidgetDataChanged, t, widgetContext?.selectedRoomId],
  );

  const markWidgetChatRead = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      if (!bubble.chatRoomId || !bubble.lastMessageSequence) return;

      await widgetCommunicationApi.markChatRead(bubble.chatRoomId, bubble.lastMessageSequence);
      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "chat",
            eventType: "chat:read",
            itemId: bubble.chatRoomId,
            itemType: "MESSAGE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }
      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
    },
    [isTauri, publishWidgetDataChanged],
  );

  const createWidgetDirectRoom = useCallback(
    async (friendUserId: string) => {
      const room = await widgetCommunicationApi.createDirectRoom(friendUserId);
      setChatScope("direct");
      setSelectedPeerChatRoomId(room.id);
      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
      return room;
    },
    [publishWidgetDataChanged, setChatScope, setSelectedPeerChatRoomId],
  );

  const createWidgetGroupRoom = useCallback(
    async (memberUserIds: string[], name: string) => {
      const room = await widgetCommunicationApi.createGroupRoom({ memberUserIds, name });
      setChatScope("direct");
      setSelectedPeerChatRoomId(room.id);
      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
      return room;
    },
    [publishWidgetDataChanged, setChatScope, setSelectedPeerChatRoomId],
  );

  const searchWidgetFriend = useCallback((bubliId: string) => widgetDisplayApi.searchFriend(bubliId), []);

  const sendWidgetFriendRequest = useCallback(async (bubliId: string) => {
    await widgetCommunicationApi.sendFriendRequest(bubliId);
    setCommunicationRevision((current) => current + 1);
  }, []);

  const respondWidgetFriendRequest = useCallback(
    async (requestId: string, action: "accept" | "reject") => {
      if (action === "accept") {
        await widgetCommunicationApi.acceptFriendRequest(requestId);
      } else {
        await widgetCommunicationApi.rejectFriendRequest(requestId);
      }
      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
    },
    [publishWidgetDataChanged],
  );

  const createWidgetMemo = useCallback(
    async (bubble: WidgetPreviewBubble, inlineBody?: string) => {
      // 버블 하단 인라인 컴포저가 본문을 넘겨주면 그대로 저장하고, 없을 때만 prompt로 받는다.
      const body = (inlineBody ?? window.prompt(t("widget.memo.prompt")) ?? "").trim();
      if (!body) return;

      const roomId = bubble.roomId ?? null;
      const memo = await widgetDisplayApi.createMemo(body, roomId);

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "memo",
            eventType: "memo:create",
            itemId: memo.id,
            itemType: "MEMO",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setMemoRevision((current) => current + 1);
      publishWidgetDataChanged("memo");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const editWidgetMemo = useCallback(
    async (item: WidgetPreviewItem, inlineBody?: string) => {
      const currentBody = item.memoBody ?? item.label;
      const body = (inlineBody ?? window.prompt(t("widget.memo.prompt"), currentBody) ?? "").trim();
      if (!body || body === currentBody) return;

      const memo = await widgetDisplayApi.updateMemo(item.id, body);

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "memo",
            eventType: "memo:update",
            itemId: memo.id,
            itemType: "MEMO",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setMemoRevision((current) => current + 1);
      publishWidgetDataChanged("memo");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const deleteWidgetMemo = useCallback(
    async (item: WidgetPreviewItem) => {
      if (!window.confirm(t("widget.memo.deleteConfirm", { label: item.label }))) return;

      await widgetDisplayApi.deleteMemo(item.id);

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "memo",
            eventType: "memo:delete",
            itemId: item.id,
            itemType: "MEMO",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setMemoRevision((current) => current + 1);
      publishWidgetDataChanged("memo");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const createWidgetTodo = useCallback(
    async (bubble: WidgetPreviewBubble, inlineTitle?: string, options?: { forcePersonal?: boolean }) => {
      const title = (inlineTitle ?? window.prompt(t(bubble.actionLabel as MessageKey)) ?? "").trim();
      if (!title) return;

      // "내 할 일" 탭은 forcePersonal=true로 항상 개인 투두에 저장한다(룸 컨텍스트 무시).
      // 그 외에는 PR 433 기준대로 버블의 룸을 따른다.
      const roomId = options?.forcePersonal ? null : (bubble.roomId ?? null);
      const task = roomId
        ? await todoApi.createRoomTask(roomId, { status: "TODO", title })
        : await todoApi.create({ status: "TODO", title });

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "todo",
            eventType: "todo:create",
            itemId: task.id,
            itemType: "TASK",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setTodoRevision((current) => current + 1);
      publishWidgetDataChanged("todo");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const editWidgetTodo = useCallback(
    async (item: WidgetPreviewItem, title: string) => {
      const next = title.trim();
      if (!next || next === item.label) return;

      const task = await todoApi.update(item.id, { title: next });

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "todo",
            eventType: "todo:update",
            itemId: task.id,
            itemType: "TASK",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setTodoRevision((current) => current + 1);
      publishWidgetDataChanged("todo");
    },
    [isTauri, publishWidgetDataChanged],
  );

  const deleteWidgetTodo = useCallback(
    async (item: WidgetPreviewItem) => {
      if (!window.confirm(t("widget.todo.deleteConfirm", { label: item.label }))) return;

      await todoApi.delete(item.id);

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "todo",
            eventType: "todo:delete",
            itemId: item.id,
            itemType: "TASK",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setTodoRevision((current) => current + 1);
      publishWidgetDataChanged("todo");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const createWidgetSchedule = useCallback(
    async (bubble: WidgetPreviewBubble, inlineTitle?: string, startsAt?: string | null) => {
      const title = (inlineTitle ?? window.prompt(t("widget.schedule.prompt")) ?? "").trim();
      if (!title) return;

      // 위젯 폼에서 고른 시작 시각(ISO)을 그대로 쓰고, 없으면 다음 30분으로 폴백한다.
      const chosenStart = startsAt && !Number.isNaN(new Date(startsAt).getTime()) ? startsAt : nextWidgetScheduleStart();
      const roomId = bubble.roomId ?? null;
      const schedule = await calendarApi.createEvent({
        allDay: false,
        endsAt: null,
        roomId,
        startsAt: chosenStart,
        title,
      });

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "schedule",
            eventType: "schedule:create",
            itemId: schedule.id,
            itemType: "SCHEDULE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setScheduleRevision((current) => current + 1);
      publishWidgetDataChanged("schedule");
    },
    [isTauri, publishWidgetDataChanged, t],
  );

  const recordTimerUsage = useCallback(
    (eventType: string, itemId?: string) => {
      if (!isTauri) return;

      void tauriCommands
        .recordWidgetUsageEvent({
          bubbleType: "timer",
          eventType,
          itemId,
          itemType: "TIME_LOG",
          occurredAt: new Date().toISOString(),
        })
        .catch(() => undefined);
    },
    [isTauri],
  );

  const recordLocalTimerState = useCallback(
    (timeLog: TimeLogResponse) => {
      if (!isTauri) return;

      void tauriCommands
        .recordTimerState({
          roomId: timeLog.roomId ?? null,
          serverTimeLogId: timeLog.id,
          startedAt: timeLog.startedAt,
          status: timeLog.status,
        })
        .catch(() => undefined);
    },
    [isTauri],
  );

  const applyTimerResult = useCallback(
    (timeLog: TimeLogResponse) => {
      setTimerSnapshot(timeLog.status === "ENDED" ? null : timeLog);
      setActiveTimerHeartbeatId(timeLog.status === "RUNNING" ? timeLog.id : null);
      recordLocalTimerState(timeLog);
      void writeWidgetWorkTimerSnapshot(timeLog.status === "ENDED" ? null : timeLog, null);
      setTimerRevision((current) => current + 1);
      // 액션이 성공했으면 직전 실패 안내는 지운다.
      setTimerActionNotice(null);
    },
    [recordLocalTimerState],
  );

  const refreshTimerFromServer = useCallback(
    async (roomId?: string | null) => {
      const selectedRoomId = roomId?.trim() || null;
      const [summaryResult, dashboardResult] = await Promise.allSettled([
        readWidgetDisplaySummary(selectedRoomId, { refreshServerOnCacheHit: true }),
        widgetDisplayApi.getDashboardWork(),
      ]);
      const summaryTimer =
        summaryResult.status === "fulfilled" ? (summaryResult.value?.runningTimer ?? null) : null;
      const dashboardTimer =
        dashboardResult.status === "fulfilled" ? (dashboardResult.value.runningTimer ?? null) : null;
      const runningTimer = summaryTimer ?? dashboardTimer;

      if (runningTimer && (!selectedRoomId || runningTimer.roomId === selectedRoomId)) {
        applyTimerResult(runningTimer);
      } else {
        setTimerRevision((current) => current + 1);
      }
      publishWidgetDataChanged("timer");
    },
    [applyTimerResult, publishWidgetDataChanged],
  );

  const handleWidgetTimerActionError = useCallback(
    async (error: unknown, roomId?: string | null) => {
      if (error instanceof ApiClientError) {
        // 이미 실행 중인 타이머(409): 조용히 넘기지 말고 안내한다. 실행 중 타이머는 스코프와
        // 무관하게 화면에 노출되므로(refresh 후), 사용자가 그 타이머를 바로 일시정지/재개할 수 있다.
        // 빠른 연타나 느린 배경 갱신으로 start가 한 번 더 나가는 경우에도 dev overlay가 뜨지 않게 한다.
        if (error.status === 409 && error.code === "PERSONAL_409_001") {
          setTimerActionNotice(t("widget.timer.alreadyRunning"));
          await refreshTimerFromServer(roomId);
          return;
        }

        // 룸 권한 없음(룸 멤버가 아니거나 권한이 끊긴 경우): 왜 안 되는지 명확히 안내한다.
        if (error.status === 403) {
          setTimerActionNotice(t("widget.timer.forbidden"));
          await refreshTimerFromServer(roomId);
          return;
        }

        if (error.code.startsWith("PERSONAL_")) {
          await refreshTimerFromServer(roomId);
          return;
        }
      }

      console.error("Widget timer action failed", error);
      await refreshTimerFromServer(roomId);
    },
    [refreshTimerFromServer, t],
  );

  // 타이머 실패 안내는 잠깐만 보여주고 자동으로 사라진다.
  useEffect(() => {
    if (!timerActionNotice) return;
    const timeoutId = window.setTimeout(() => setTimerActionNotice(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [timerActionNotice]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (!isTauri || isWidgetChrome) return;

    let cancelled = false;

    async function recoverTimerFromLocalState() {
      const recovery = await tauriCommands.recoverTimerState().catch(() => null);
      if (cancelled || !recovery?.recoveryRequired || !recovery.serverTimeLogId) return;

      const timeLog = await timerApi.heartbeat(recovery.serverTimeLogId).catch(() => null);
      if (cancelled || !timeLog) return;

      applyTimerResult(timeLog);
      recordTimerUsage("timer:recover", timeLog.id);
    }

    void recoverTimerFromLocalState();

    return () => {
      cancelled = true;
    };
  }, [applyTimerResult, isTauri, isWidgetChrome, recordTimerUsage, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (!activeTimerHeartbeatId) return;

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      void timerApi
        .heartbeat(activeTimerHeartbeatId)
        .then((timeLog) => {
          if (cancelled) return;
          applyTimerResult(timeLog);
          recordTimerUsage("timer:heartbeat", timeLog.id);
        })
        .catch(() => undefined);
    }, TIMER_HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTimerHeartbeatId, applyTimerResult, recordTimerUsage, widgetSessionReady]);

  const pauseWidgetTimer = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const timeLogId = bubble.rows[0]?.id;
      if (!timeLogId || bubble.rows[0]?.status !== "RUNNING") return;
      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;

      try {
        const timeLog = await timerApi.pause(timeLogId);
        applyTimerResult(timeLog);
        recordTimerUsage("timer:pause", timeLog.id);
        publishWidgetDataChanged("timer");
      } catch (error) {
        await handleWidgetTimerActionError(error, roomId);
      }
    },
    [applyTimerResult, handleWidgetTimerActionError, publishWidgetDataChanged, recordTimerUsage, widgetContext?.selectedRoomId],
  );

  const runPrimaryTimerAction = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const currentTimer = bubble.rows[0];
      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;

      try {
        if (currentTimer?.status === "RUNNING") {
          const timeLog = await timerApi.pause(currentTimer.id);
          applyTimerResult(timeLog);
          recordTimerUsage("timer:pause", timeLog.id);
          publishWidgetDataChanged("timer");
          return;
        }

        if (currentTimer?.status === "PAUSED") {
          const timeLog = await timerApi.resume(currentTimer.id);
          applyTimerResult(timeLog);
          recordTimerUsage("timer:resume", timeLog.id);
          publishWidgetDataChanged("timer");
          return;
        }

        const timeLog = await timerApi.start({
          idempotencyKey: `widget-timer-${crypto.randomUUID()}`,
          roomId,
          timerType: roomId ? "WORK" : "GENERAL",
        });
        applyTimerResult(timeLog);
        recordTimerUsage("timer:start", timeLog.id);
        publishWidgetDataChanged("timer");
      } catch (error) {
        await handleWidgetTimerActionError(error, roomId);
      }
    },
    [applyTimerResult, handleWidgetTimerActionError, publishWidgetDataChanged, recordTimerUsage, widgetContext?.selectedRoomId],
  );

  // 바 창(항상 떠 있는 표면)에서만 알림 실시간 채널을 구독한다 — 여러 위젯 창이 동시에
  // 열려 있어도 팝업/토스트가 중복으로 뜨지 않도록 하나의 표면으로 한정한다.
  useEffect(() => {
    if (!isBubbleBar || !widgetSessionReady) return;

    const client = getChatRealtimeClient();
    return client.subscribe(websocketTopics.notifications, (data) => {
      const notification = data as NotificationResponse | null;
      if (!notification || typeof notification.id !== "string") return;

      // 데스크탑 위젯에서도 새 알림 도착 시 소리로 알린다(웹앱과 동일).
      playNotificationSound();

      // 바가 직접 알림 목록 재조회를 트리거한다 — 메인 창이 닫혀 있어도
      // 알림 버블 숫자와 바 표시가 즉시 갱신된다(기존에는 메인 창 신호에만 의존).
      setNotificationRevision((current) => current + 1);
      void emitWidgetDataChanged("notification").catch(() => undefined);

      // 데스크탑 OS 알림 팝업 — 다른 앱을 보고 있어도 내용이 화면에 뜬다(맥/윈도우 공통).
      // 웹뷰에는 브라우저 Notification API가 없어서 네이티브 플러그인 경로를 쓴다.
      // 바 창 하나만 구독하므로 중복 팝업은 없다. 실패는 조용히 무시(팝업은 보조 신호).
      void sendTauriNotification({ body: notification.body ?? undefined, title: notification.title }).catch(
        () => undefined,
      );

      if (notification.sourceType === "VOICE_CALL" && notification.sourceId) {
        const call = {
          callerName: notification.title,
          chatRoomId: notification.sourceId,
          notificationId: notification.id,
        };
        setIncomingVoiceCall(call);
        void emitWidgetIncomingCallChanged(call).catch(() => undefined);
        // 수신 팝업은 소통 위젯(채팅 창)에 겹쳐 그린다 — 따로 뜬 창처럼 보이지 않도록 전화가
        // 오면 채팅 창을 바로 열어(이미 열려 있으면 그대로) 그 위에서 수락/거절하게 한다.
        if (isTauri) {
          void tauriCommands
            .openWidgetWindow({
              bubbleType: "chat",
              mode: "DEFAULT",
              selectedRoomId: notification.sourceId,
              windowId: "chat",
            })
            .catch(() => undefined);
          // 채팅 창이 이 시점에 아직 없었다면 지금 막 새로 빌드되는 중이라 브로드캐스트 구독이
          // 아직 안 붙어 있을 수 있다(Tauri 이벤트는 구독 이후 것만 받는다, 버퍼링 없음). 창이
          // 뜰 시간을 준 뒤 한 번 더 보내 놓친 경우를 보정한다.
          window.setTimeout(() => {
            if (incomingVoiceCallRef.current?.notificationId === call.notificationId) {
              void emitWidgetIncomingCallChanged(call).catch(() => undefined);
            }
          }, 700);
        }
      }

      // 상대가 내가 건 전화를 거절함 — 마이크가 켜진 채로 대기하는 발신자 화면을 자동으로 끊는다.
      // activeVoiceRoomRef로 판단하면 안 된다 — 통화는 채팅(chat) 창에서 시작되는데 이 알림 구독은
      // 바(bar) 창에서만 도는 별개의 웹뷰/React 인스턴스라, 바 창의 activeVoiceRoomRef는 항상
      // 비어 있다(서로 state를 공유하지 않는다). 그래서 매칭이 늘 실패해 발신자 쪽 방이 절대
      // 안 끊겼다. 알림에 실려온 chatRoomId로 서버에서 직접 방을 다시 조회해 판단한다 —
      // 어느 창에서 통화를 시작했든 항상 동작한다(이미 dismissIncomingVoiceCall/타임아웃 거절에서
      // 쓰던 것과 같은, 창 상태에 의존하지 않는 방식).
      if (notification.sourceType === "VOICE_CALL_DECLINED" && notification.sourceId) {
        const declinedChatRoomId = notification.sourceId;
        void widgetCommunicationApi
          .getOpenVoiceRoomByChatRoomId(declinedChatRoomId)
          .then((room) => {
            if (room.status !== "OPEN" || room.createdByUserId !== currentUserIdRef.current) return;
            void widgetCommunicationApi.endVoiceRoom(room.id).catch(() => undefined);
            if (liveKitRoomRef.current) {
              detachWidgetRemoteAudio(liveKitRoomRef.current);
              liveKitRoomRef.current.disconnect();
              liveKitRoomRef.current = null;
            }
            stopCallRingtone();
            setActiveVoiceRoomId(null);
            setActiveVoiceRoom(null);
            setSpeakingUserIds(new Set());
            void emitWidgetVoiceCallStateChanged(null).catch(() => undefined);
            setWidgetOutgoingCallNotice(t("layout.voiceCall.declinedNotice"));
            window.setTimeout(() => setWidgetOutgoingCallNotice(null), 3_000);
          })
          .catch(() => undefined);
        void notificationApi.markRead(notification.id).catch(() => undefined);
      }

      // 발신자가 내가 받기 전에 전화를 취소함 — 수신 전화 팝업을 계속 띄워둘 이유가 없다.
      if (notification.sourceType === "VOICE_CALL_CANCELED" && notification.sourceId) {
        setIncomingVoiceCall((current) => {
          if (current?.chatRoomId !== notification.sourceId) return current;
          void emitWidgetIncomingCallChanged(null).catch(() => undefined);
          return null;
        });
        void notificationApi.markRead(notification.id).catch(() => undefined);
      }

      const pushToast = (kind: NotificationToastKind, chatRoomId?: string) => {
        const toastId = notification.id;
        setMessageToasts((current) =>
          [
            ...current.filter((toast) => toast.id !== toastId),
            { chatRoomId, id: toastId, kind, senderName: notification.title, text: notification.body ?? "" },
          ].slice(-MAX_MESSAGE_TOASTS),
        );
        window.setTimeout(() => {
          setMessageToasts((current) => current.filter((toast) => toast.id !== toastId));
        }, 6_000);
      };

      if (notification.sourceType === "MESSAGE" && notification.sourceId) {
        pushToast("message", notification.sourceId);
      }
      if (notification.sourceType === "CHAT_INVITE" && notification.sourceId) {
        pushToast("chat-invite", notification.sourceId);
      }
      if (notification.sourceType === "ROOM_INVITE") {
        pushToast("room-invite");
      }
      if (notification.sourceType === "FRIEND_REQUEST") {
        pushToast("friend-request");
      }
      if (notification.sourceType === "FRIEND_ACCEPTED") {
        pushToast("friend-accepted");
      }
    });
  }, [isBubbleBar, isTauri, t, widgetSessionReady]);

  // 상대(발신자)에게 거절/타임아웃을 알려야 마이크가 켜진 채로 대기하는 발신자 화면을 자동으로 끊을 수 있다.
  // createVoiceRoom("있으면 join, 없으면 create")으로 방 id를 구하면, 타이밍 등으로 기존 방을
  // 못 찾을 때 새 방을 만들어버려(그리고 "통화를 시작했습니다" 알림까지 잘못 나가) 거절 신호
  // 자체가 새어나갔다. 부작용 없는 조회 전용 엔드포인트로 방 id만 가져온다.
  const notifyIncomingVoiceCallDeclined = useCallback((call: { chatRoomId: string }) => {
    void widgetCommunicationApi
      .getOpenVoiceRoomByChatRoomId(call.chatRoomId)
      .then((room) => widgetCommunicationApi.declineVoiceRoom(room.id))
      .catch(() => undefined);
  }, []);

  // 전화처럼 일정 시간 응답이 없으면 자동으로 닫는다. 팝업 UI는 채팅 창에도 그리지만, 안전망
  // 타이머는 바 창 하나에서만 돌린다 — 그러지 않으면 두 창이 각각 타임아웃을 돌리다 동시에
  // 거절을 시도하는 중복 요청이 생긴다(무해하긴 해도 낭비고, 통화음도 두 번 겹쳐 난다).
  // 타임아웃도 명시적 거절과 동일하게 발신자에게 알려야 한다 — 그냥 로컬 상태만 지우면 수신자
  // 화면에서는 팝업이 사라졌는데 발신자는 계속 "전화를 거는 중이에요"에 갇히는 버그가 생긴다.
  useEffect(() => {
    if (!isBubbleBar || !incomingVoiceCall) return;
    const call = incomingVoiceCall;
    const timeoutId = window.setTimeout(() => {
      notifyIncomingVoiceCallDeclined(call);
      void notificationApi.markRead(call.notificationId).catch(() => undefined);
      setIncomingVoiceCall(null);
      void emitWidgetIncomingCallChanged(null).catch(() => undefined);
    }, 30_000);
    return () => window.clearTimeout(timeoutId);
  }, [incomingVoiceCall, isBubbleBar, notifyIncomingVoiceCallDeclined]);

  // 수신 전화 UI가 떠 있는 동안 통화음을 반복 재생한다(응답/거절/타임아웃 시 정지).
  // 팝업은 채팅 창에도 뜨지만 소리는 바 창 하나만 낸다(두 창이 동시에 열려 있어도 안 겹치게).
  useEffect(() => {
    if (!isBubbleBar || !incomingVoiceCall) return;
    startCallRingtone();
    return () => stopCallRingtone();
  }, [incomingVoiceCall, isBubbleBar]);

  // 발신자(전화 건 사람) 링백 — 내가 만든 OPEN 통화방에 나 혼자만 참여 중이면 상대가 받을 때까지 울린다.
  // 수신자 쪽 통화음(incomingVoiceCall)과 대칭. 상대가 참여하거나 45초가 지나면 멈춘다.
  const isWidgetRingingBack =
    activeVoiceRoom?.status === "OPEN" &&
    Boolean(currentUserId) &&
    activeVoiceRoom?.createdByUserId === currentUserId &&
    (activeVoiceRoom?.participants.filter((participant) => participant.status === "JOINED").length ?? 0) <= 1;

  // 발신 팝업도 채팅 창에 그리지만, 이 소리 재생은 바 창 하나로 한정한다(위와 동일한 이유).
  useEffect(() => {
    if (!isBubbleBar || !isWidgetRingingBack) return;
    startCallRingtone();
    const timeoutId = window.setTimeout(() => stopCallRingtone(), 45_000);
    return () => {
      window.clearTimeout(timeoutId);
      stopCallRingtone();
    };
  }, [isBubbleBar, isWidgetRingingBack]);

  // 상대가 거절했다는 실시간 알림(websocket)이 유실되면 발신 팝업이 영영 안 닫힌다 — 거절 자체는
  // 서버에 이미 반영됐는데(알림함엔 남음) 화면만 못 따라가는 경우다. declineVoiceRoom은 방
  // 상태를 안 바꾸고 알림만 만든다(끊는 건 이 알림을 받은 발신자 쪽 클라이언트 책임) — 그래서
  // 방 상태를 폴링해선 거절을 절대 못 잡는다(방은 계속 OPEN으로 남는다). 대신 알림 목록에서
  // 이 통화방으로 온 거절 알림 자체를 직접 찾는다. activeVoiceRoomId는 이미 창 간에 동기화되어
  // 있으므로 바 창 하나만 폴링해도 다른 창에 전파된다.
  // 이펙트 의존성을 activeVoiceRoom "객체 전체"로 두면 안 된다 — 대량 데이터 로딩 effect가
  // 주기적으로 이 방을 다시 조회해서 매번 새 객체로 갱신하는데(같은 방이어도 참조가 바뀐다),
  // 그때마다 이 이펙트가 통째로 재시작되면서 setInterval이 한 주기(3초)도 못 채우고 계속
  // 리셋돼 안전망이 사실상 전혀 동작하지 않았다. 안정적인 값(chatRoomId)만 의존성으로 둔다.
  const outgoingChatRoomId = activeVoiceRoom?.chatRoomId;
  useEffect(() => {
    if (!isBubbleBar || !isWidgetRingingBack || !activeVoiceRoomId || !outgoingChatRoomId) return;
    const voiceRoomId = activeVoiceRoomId;
    const chatRoomId = outgoingChatRoomId;
    const callStartedAt = activeVoiceRoom?.createdAt ? new Date(activeVoiceRoom.createdAt).getTime() : 0;
    const interval = window.setInterval(() => {
      void widgetDisplayApi
        .listNotifications(10)
        .then((page) => {
          const declined = page.items.find(
            (item) =>
              item.sourceType === "VOICE_CALL_DECLINED" &&
              item.sourceId === chatRoomId &&
              new Date(item.createdAt).getTime() >= callStartedAt,
          );
          if (!declined) return;
          void widgetCommunicationApi.endVoiceRoom(voiceRoomId).catch(() => undefined);
          setActiveVoiceRoomId(null);
          setActiveVoiceRoom(null);
          setSpeakingUserIds(new Set());
          void emitWidgetVoiceCallStateChanged(null).catch(() => undefined);
          if (liveKitRoomRef.current) {
            detachWidgetRemoteAudio(liveKitRoomRef.current);
            liveKitRoomRef.current.disconnect();
            liveKitRoomRef.current = null;
          }
          stopCallRingtone();
          setWidgetOutgoingCallNotice(t("layout.voiceCall.declinedNotice"));
          window.setTimeout(() => setWidgetOutgoingCallNotice(null), 3_000);
          void notificationApi.markRead(declined.id).catch(() => undefined);
        })
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeVoiceRoom은 일부러 뺐다(위 주석): 참조가 자주 바뀌어 폴링 안전망 자체를 무력화한다. 안정적인 chatRoomId만으로 재시작을 제어한다.
  }, [activeVoiceRoomId, isBubbleBar, isWidgetRingingBack, outgoingChatRoomId, t]);

  const dismissIncomingVoiceCall = useCallback(() => {
    if (!incomingVoiceCall) return;
    const call = incomingVoiceCall;
    notifyIncomingVoiceCallDeclined(call);
    void notificationApi.markRead(call.notificationId).catch(() => undefined);
    setIncomingVoiceCall(null);
    void emitWidgetIncomingCallChanged(null).catch(() => undefined);
  }, [incomingVoiceCall, notifyIncomingVoiceCallDeclined]);

  const cancelOutgoingWidgetCall = useCallback(() => {
    if (!activeVoiceRoomId) return;
    void widgetCommunicationApi.endVoiceRoom(activeVoiceRoomId).catch(() => undefined);
    if (liveKitRoomRef.current) {
      detachWidgetRemoteAudio(liveKitRoomRef.current);
      liveKitRoomRef.current.disconnect();
      liveKitRoomRef.current = null;
    }
    stopCallRingtone();
    setActiveVoiceRoomId(null);
    setActiveVoiceRoom(null);
    setSpeakingUserIds(new Set());
    void emitWidgetVoiceCallStateChanged(null).catch(() => undefined);
  }, [activeVoiceRoomId]);

  const acceptIncomingVoiceCall = useCallback(async () => {
    if (!incomingVoiceCall || voiceCallResponding) return;
    const call = incomingVoiceCall;
    setVoiceCallResponding(true);
    try {
      const voiceRoom = await widgetCommunicationApi.createVoiceRoom({ chatRoomId: call.chatRoomId });
      setActiveVoiceRoomId(voiceRoom.id);
      void emitWidgetVoiceCallStateChanged(voiceRoom.id).catch(() => undefined);
      setVoiceConnectionLabel("Voice room opened");
      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");

      if (isTauri) {
        void tauriCommands
          .openWidgetWindow({
            bubbleType: "chat",
            mode: "DEFAULT",
            selectedRoomId: call.chatRoomId,
            windowId: "chat",
          })
          .catch(() => undefined);
      }

      // 오디오 연결(ICE/DTLS 협상)은 몇 초 걸릴 수 있어 기다리지 않고 먼저 위젯을 연다 —
      // 기다리게 하면 수락을 눌러도 오디오가 붙을 때까지 화면 전환이 몇 초씩 늦어 보였다.
      void widgetCommunicationApi
        .getVoiceToken(voiceRoom.id)
        .then(async (token) => {
          if (!token.serverUrl || !token.token) return;
          const liveKitRoom = new Room();
          liveKitRoom.on(RoomEvent.TrackSubscribed, (track) => attachWidgetRemoteAudioTrack(track));
          liveKitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach().forEach((element) => element.remove());
          });
          liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, handleWidgetActiveSpeakersChanged);
          if (liveKitRoomRef.current) {
            detachWidgetRemoteAudio(liveKitRoomRef.current);
            liveKitRoomRef.current.disconnect();
          }
          liveKitRoomRef.current = liveKitRoom;
          await liveKitRoom.connect(token.serverUrl, token.token);
          await liveKitRoom.localParticipant.setMicrophoneEnabled(true);
          setVoiceMicMuted(false);
          setVoiceConnectionLabel("LiveKit connected");
        })
        .catch(() => {
          setVoiceConnectionLabel("Voice room open; token failed");
        });
    } catch {
      // 룸 생성/조회 자체가 실패한 경우 — 조용히 무시하고 알림만 닫는다
    } finally {
      setVoiceCallResponding(false);
      void notificationApi.markRead(call.notificationId).catch(() => undefined);
      setIncomingVoiceCall(null);
      void emitWidgetIncomingCallChanged(null).catch(() => undefined);
    }
  }, [handleWidgetActiveSpeakersChanged, incomingVoiceCall, isTauri, publishWidgetDataChanged, voiceCallResponding]);

  const dismissMessageToast = useCallback((toastId: string) => {
    setMessageToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const openMessageToast = useCallback(
    async (toast: { chatRoomId?: string; id: string; kind: NotificationToastKind }) => {
      dismissMessageToast(toast.id);

      if (toast.kind === "friend-request" || toast.kind === "friend-accepted") {
        if (isTauri) {
          await tauriCommands.openMainWindowRoute({ route: "/app/chat?mode=direct&friends=1" }).catch(() => undefined);
        } else {
          window.open("/app/chat?mode=direct&friends=1", "_blank", "noopener,noreferrer");
        }
        return;
      }
      if (toast.kind === "room-invite") {
        if (isTauri) {
          await tauriCommands.openMainWindowRoute({ route: "/app/project-rooms" }).catch(() => undefined);
        } else {
          window.open("/app/project-rooms", "_blank", "noopener,noreferrer");
        }
        return;
      }
      if (!toast.chatRoomId) return;
      if (isTauri) {
        await tauriCommands
          .openWidgetWindow({
            bubbleType: "chat",
            mode: "DEFAULT",
            selectedRoomId: toast.chatRoomId,
            windowId: "chat",
          })
          .catch(() => undefined);
      } else {
        setActiveBubble("chat");
      }
    },
    [dismissMessageToast, isTauri, setActiveBubble],
  );

  const startWidgetVoice = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      // 프로젝트룸이면 roomId로, 1:1/그룹이면 chatRoomId로 통화방을 잡는다(웹 소통창과 동일한 분기).
      if (!bubble.roomId && !bubble.chatRoomId) {
        setVoiceConnectionLabel("Select a room first");
        return;
      }

      // 항상 createVoiceRoom을 호출한다(웹의 startVoice와 동일) — 서버가 이미 "OPEN 방 있으면
      // 합류, 없으면 생성"을 처리해준다. 로컬 activeVoiceRoomId로 재사용 여부를 판단하면, 상대가
      // 거절/취소해서 방이 이미 ENDED됐는데도 activeVoiceRoomId가 안 지워진 채 남아 있을 때
      // 죽은 방을 계속 GET만 하고 새 방을 절대 안 만들어(=상대에게 알림도 안 감) 벨소리만 울리고
      // 실제로는 전화가 안 가는 버그가 됐다.
      const voiceRoom = await widgetCommunicationApi.createVoiceRoom(
        bubble.roomId ? { roomId: bubble.roomId } : { chatRoomId: bubble.chatRoomId },
      );

      setActiveVoiceRoomId(voiceRoom.id);
      // 통화는 채팅(chat) 창에서 시작되지만 발신 팝업은 바(bar) 창에서 그린다 — 서로 다른 창이라
      // 이 브로드캐스트 없이는 바 창이 통화 시작 자체를 알 길이 없다.
      void emitWidgetVoiceCallStateChanged(voiceRoom.id).catch(() => undefined);
      // activeVoiceRoom(전체 응답)을 여기서 바로 채워야 한다 — 이 값은 원래 대량 폴링 effect가
      // 나중에 채워주는데, 그때까지는 isWidgetRingingBack이 false라 "전화 거는 중" 팝업이 안 뜨고,
      // activeVoiceRoomRef도 비어 있어서 그 사이에 상대가 바로 거절하면 발신자 쪽에서
      // VOICE_CALL_DECLINED를 받고도 매칭에 실패해 방을 못 끊는다.
      await widgetDisplayApi
        .getVoiceRoom(voiceRoom.id)
        .then(setActiveVoiceRoom)
        .catch(() => setActiveVoiceRoom(null));
      setVoiceConnectionLabel("Voice room opened");

      let token;
      try {
        token = await widgetCommunicationApi.getVoiceToken(voiceRoom.id);
        setVoiceConnectionLabel("Voice token issued");
      } catch (error) {
        setVoiceConnectionLabel("Voice room open; token failed");
        setCommunicationRevision((current) => current + 1);
        throw error;
      }

      if (token.serverUrl && token.token) {
        const liveKitRoom = new Room();
        liveKitRoom.on(RoomEvent.TrackSubscribed, (track) => attachWidgetRemoteAudioTrack(track));
        liveKitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((element) => element.remove());
        });
        liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, handleWidgetActiveSpeakersChanged);
        if (liveKitRoomRef.current) {
          detachWidgetRemoteAudio(liveKitRoomRef.current);
          liveKitRoomRef.current.disconnect();
        }
        liveKitRoomRef.current = liveKitRoom;

        try {
          await liveKitRoom.connect(token.serverUrl, token.token);
          await liveKitRoom.localParticipant.setMicrophoneEnabled(true);
          setVoiceMicMuted(false);
          setVoiceConnectionLabel("LiveKit connected");
        } catch {
          setVoiceConnectionLabel("Token issued; check microphone permission");
        }
      }

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "chat",
            eventType: "voice:start",
            itemId: voiceRoom.id,
            itemType: "MESSAGE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
    },
    [handleWidgetActiveSpeakersChanged, isTauri, publishWidgetDataChanged],
  );

  const toggleWidgetVoiceMic = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const voiceRoomId = bubble.voiceRoomId ?? activeVoiceRoomId;
      if (!voiceRoomId) return;

      const nextMuted = !voiceMicMuted;
      await widgetCommunicationApi.updateMicStatus(voiceRoomId, nextMuted ? "MUTED" : "UNMUTED");
      await liveKitRoomRef.current?.localParticipant.setMicrophoneEnabled(!nextMuted);
      setVoiceMicMuted(nextMuted);
      setVoiceConnectionLabel(nextMuted ? "Mic muted" : "Mic live");

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "chat",
            eventType: nextMuted ? "voice:mic-muted" : "voice:mic-live",
            itemId: voiceRoomId,
            itemType: "MESSAGE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
    },
    [activeVoiceRoomId, isTauri, publishWidgetDataChanged, voiceMicMuted],
  );

  const leaveWidgetVoice = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const voiceRoomId = bubble.voiceRoomId ?? activeVoiceRoomId;
      if (!voiceRoomId) return;

      if (liveKitRoomRef.current) {
        detachWidgetRemoteAudio(liveKitRoomRef.current);
        liveKitRoomRef.current.disconnect();
      }
      liveKitRoomRef.current = null;
      // 1:1 채팅은 "나가기, 상대는 계속 통화"라는 개념이 없다 — 웹(chat/page.tsx)과 동일하게
      // 1:1이면 무조건 종료(endVoiceRoom)한다. leaveVoiceRoom만 부르면 참가자만 빠지고 방은
      // OPEN인 채로 남아, 다음 통화 시도가 이 죽은 방을 계속 재사용하는 문제로 이어진다.
      if (bubble.isDirectChat) {
        await widgetCommunicationApi.endVoiceRoom(voiceRoomId);
      } else {
        await widgetCommunicationApi.leaveVoiceRoom(voiceRoomId);
      }
      setActiveVoiceRoomId(null);
      setActiveVoiceRoom(null);
      setSpeakingUserIds(new Set());
      void emitWidgetVoiceCallStateChanged(null).catch(() => undefined);
      setVoiceMicMuted(false);
      setVoiceConnectionLabel("Voice left");

      if (isTauri) {
        void tauriCommands
          .recordWidgetUsageEvent({
            bubbleType: "chat",
            eventType: "voice:leave",
            itemId: voiceRoomId,
            itemType: "MESSAGE",
            occurredAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }

      setCommunicationRevision((current) => current + 1);
      publishWidgetDataChanged("chat");
    },
    [activeVoiceRoomId, isTauri, publishWidgetDataChanged],
  );

  // 바/메뉴 화면에서 공통 서버 사용 롤업(usage-summaries/today)을 한 줄 요약으로 보여준다.
  // 한 번만 불러오면 세션 중 사용량이 늘어도 숫자가 고정돼 목업처럼 보인다 — 주기적으로
  // 다시 불러와 "오늘 열기/조작" 카운트가 실사용에 따라 갱신되게 한다(바는 이미 4초 주기로
  // 항목을 폴링하므로 45초 주기 롤업 재조회는 부담이 미미하다).
  useEffect(() => {
    if (!widgetSessionReady || !isWidgetChrome) return;

    let cancelled = false;

    const refreshUsageSummary = () => {
      const summaryPromise = isTauri
        ? waitForPendingWidgetUsageEventRecords()
            .then(() => tauriCommands.rollupWidgetUsage({ summaryDate: todayLocalDateKey() }))
            .then((rollups) => ({
              totalInteractionCount: rollups.reduce((total, rollup) => total + Math.max(0, rollup.interactionCount), 0),
              totalOpenCount: rollups.reduce((total, rollup) => total + Math.max(0, rollup.openCount), 0),
            }))
        : widgetApi.getTodayUsageRollups();

      void summaryPromise
        .then((summary) => {
          if (cancelled) return;
          if (!summary || (summary.totalOpenCount === 0 && summary.totalInteractionCount === 0)) {
            setMenuUsageSummary(null);
            return;
          }
          setMenuUsageSummary(
            t("widget.menu.todayUsage", { interaction: summary.totalInteractionCount, open: summary.totalOpenCount }),
          );
        })
        .catch(() => {
          if (!cancelled) setMenuUsageSummary(null);
        });
    };

    refreshUsageSummary();
    const intervalId = window.setInterval(refreshUsageSummary, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isTauri, isWidgetChrome, t, widgetSessionReady]);

  const openMainApp = useCallback(
    async (route?: "settings") => {
      if (!isTauri) return;

      try {
        await tauriCommands.showMainWindow(route ? { route } : undefined);
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri],
  );

  // 바/메뉴는 memo 컴포넌트라 JSX에 인라인 화살표 대신 참조-안정 콜백만 내려보낸다.
  const openMainAppSettings = useCallback(() => {
    void openMainApp("settings");
  }, [openMainApp]);

  const quitDesktopApp = useCallback(async () => {
    if (!isTauri) return;

    try {
      await tauriCommands.quitApp();
    } catch {
      // Browser preview fallback.
    }
  }, [isTauri]);

  // 열린 버블 창들을 선호 모니터 우상단 그리드(24px 간격, 한 열 2개)로 정렬한다.
  // 이동 좌표는 Rust가 기존 Moved 영속 경로로 저장하므로 여기서는 호출만 한다.
  const arrangeWidgetBubbles = useCallback(
    async (layout?: WidgetArrangeLayout) => {
      if (!isTauri) return;

      try {
        await tauriCommands.arrangeWidgetWindows(layout ? { layout } : undefined);
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri],
  );

  // 바 창에서만: Bubli 메뉴의 "모니터로 이동" 목록을 채운다. 모니터 연결/해제는 드물어
  // 30초 폴링이면 충분하고, 목록이 같으면 참조를 유지해 memo된 바가 리렌더되지 않게 한다.
  useEffect(() => {
    if (!isTauri || !isBubbleBar) return;

    let cancelled = false;

    const refreshMonitors = () => {
      void tauriCommands
        .listAppMonitors()
        .then((preference) => {
          if (cancelled) return;
          setAppMonitors((current) => {
            const next = preference.monitors;
            const unchanged =
              current.length === next.length &&
              current.every((monitor, index) => monitor.id === next[index]?.id && monitor.isPrimary === next[index]?.isPrimary);
            return unchanged ? current : next;
          });
        })
        .catch(() => {
          // Browser preview fallback — 목록이 비면 메뉴 섹션 자체가 숨는다.
        });
    };

    refreshMonitors();
    const intervalId = window.setInterval(refreshMonitors, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isBubbleBar, isTauri]);

  // Bubli 메뉴에서 모니터를 고르면 바 + 열린 버블 창을 통째로 그 모니터로 옮긴다.
  // 자동 정렬과 달리 상대 배치를 유지하고, 화면 밖으로 나가는 창만 Rust가 안으로 넣는다.
  const moveWidgetsToMonitor = useCallback(
    async (monitorId: string) => {
      if (!isTauri) return;

      try {
        await tauriCommands.moveWidgetWindowsToMonitor({ monitorId });
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri],
  );

  const selectWidgetRoomContext = useCallback(async (roomId: string | null) => {
    const selectedRoomId = normalizeWidgetRoomId(roomId);
    try {
      const selectedRoomLabel = selectedRoomId
        ? widgetRoomOptions.find((room) => room.id === selectedRoomId)?.name ?? null
        : null;

      if (selectedRoomId) {
        setWidgetContext(widgetContextForRoomId(selectedRoomId));
        syncActiveProjectRoomFromWidgetContext(selectedRoomId, selectedRoomLabel);
      } else {
        setWidgetContext(widgetContextForRoomId(null));
        void widgetApi.updateContext({ selectedRoomId: null }).catch(() => undefined);
      }

      if (isTauri) {
        await tauriCommands.setWidgetRoomContext({ selectedRoomId });
      }
      setAgentRevision((current) => current + 1);
      setCommunicationRevision((current) => current + 1);
      setMemoRevision((current) => current + 1);
      setNotificationRevision((current) => current + 1);
      setResourceRevision((current) => current + 1);
      setScheduleRevision((current) => current + 1);
      setTimerRevision((current) => current + 1);
      setTodoRevision((current) => current + 1);
      requestDisplayRefresh();
    } catch {
      // Browser preview fallback.
    }
  }, [isTauri, requestDisplayRefresh, widgetRoomOptions]);

  const toggleWidgetRoomContext = useCallback(async () => {
    try {
      if (selectedWidgetRoomId) {
        await selectWidgetRoomContext(null);
        return;
      }

      const roomId = await resolveWidgetRoomContextTarget();
      if (!roomId) return;
      await selectWidgetRoomContext(roomId);
    } catch {
      // Browser preview fallback.
    }
  }, [selectWidgetRoomContext, selectedWidgetRoomId]);

  if (!mounted || !widgetSessionReady) {
    return null;
  }

  if (isMenuOrb) {
    // 오브는 더 이상 메뉴가 아니다 — 누르면 챗봇 전용 에이전트 위젯을 연다.
    // (자동정렬/설정/종료 등 메뉴 기능은 바 pill에 그대로 있다.)
    return (
      <DesktopWidgetMenuOrb
        agentReplyCount={agentReplyBadgeCount}
        onOpenAgent={() => void openAgentFromMenuOrb()}
      />
    );
  }

  if (isBubbleBar) {
    // 바에는 접은 버블/알림/버튼만 둔다. 전화 수신/발신 팝업은 소통 위젯(채팅 창)에 겹쳐
    // 그린다 — 따로 뜬 창처럼 보이지 않도록. 이 창은 통화음 재생·30초 안전망만 조용히 담당한다.
    return (
      <>
        <DesktopWidgetBubbleBar
          bubbleDataByType={displayBubbles}
          hasRoomContext={Boolean(selectedWidgetRoomId)}
          minimizedItems={barItems}
          monitors={appMonitors}
          notificationSignal={notificationSignal}
          onArrangeBubbles={arrangeWidgetBubbles}
          onMoveToMonitor={moveWidgetsToMonitor}
          onOpenMainApp={openMainApp}
          onOpenSettings={openMainAppSettings}
          onQuit={quitDesktopApp}
          onRestoreBubble={restoreBubbleFromBar}
          onToggleRoomContext={toggleWidgetRoomContext}
          usageSummary={menuUsageSummary}
        />
        {messageToasts.length > 0 ? (
          <div className="message-toast-stack message-toast-stack--widget" aria-live="polite">
            {messageToasts.map((toast) => (
              <div className="message-toast" data-bubli-interactive="true" key={toast.id} role="status">
                <button className="message-toast__body" onClick={() => void openMessageToast(toast)} type="button">
                  <strong className="message-toast__sender">{toast.senderName}</strong>
                  <span className="message-toast__text">{toast.text}</span>
                  <span className="message-toast__view-detail">{t("layout.messageToast.viewDetail")}</span>
                </button>
                <button
                  aria-label={t("layout.messageToast.dismiss")}
                  className="message-toast__close"
                  onClick={() => dismissMessageToast(toast.id)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  // 전화 수신/발신 팝업은 소통 위젯(채팅 창)에만 겹쳐 그린다 — 별개 창처럼 안 보이게, 실제로
  // 통화가 시작·수신되는 화면 위에 바로 뜬다. 다른 버블 창(투두/메모 등)에는 안 뜬다.
  const showVoiceCallOverlay = windowId === "chat";
  if (!isTauri && !windowVisible) {
    return null;
  }

  const widgetViewportSize = !isTauri
    ? getWidgetWindowSize(activeBubble, windowVisible ? mode : "MINIMIZED")
    : undefined;

  return (
    <>
      <DesktopWidgetBubble
        activeBubble={activeBubble}
        alwaysOnTop={alwaysOnTop}
        bubble={displayBubbles[activeBubble]}
        clickThrough={clickThrough}
        mode={mode}
        chatScope={chatScope}
        onChatScopeChange={setChatScope}
        selectedPeerChatRoomId={selectedPeerChatRoomId}
        onSelectPeerChatRoom={setSelectedPeerChatRoomId}
        onCreateDirectRoom={createWidgetDirectRoom}
        onCreateGroupRoom={createWidgetGroupRoom}
        onSearchFriend={searchWidgetFriend}
        onSendFriendRequest={sendWidgetFriendRequest}
        onRespondFriendRequest={respondWidgetFriendRequest}
        onClose={closeWindow}
        onItemStateChange={handleItemStateChange}
        onLeaveVoice={leaveWidgetVoice}
        onMarkAllNotificationsRead={markAllWidgetNotificationsRead}
        onMarkChatRead={markWidgetChatRead}
        onModeChange={setWindowMode}
        onCreateMemo={createWidgetMemo}
        onCreateSchedule={createWidgetSchedule}
        onCreateTodo={createWidgetTodo}
        onEditTodo={editWidgetTodo}
        onDeleteTodo={deleteWidgetTodo}
        onDeleteMemo={deleteWidgetMemo}
        onAnalyzeResource={analyzeWidgetResource}
        onDownloadResource={downloadWidgetResource}
        onEditMemo={editWidgetMemo}
        onOpenHandoff={openWidgetHandoff}
        onPauseTimer={pauseWidgetTimer}
        onPrimaryTimerAction={runPrimaryTimerAction}
        onRestore={restoreCurrentWindow}
        onReviewAgentSuggestion={reviewWidgetAgentSuggestion}
        onSendAgentCommand={sendWidgetAgentCommand}
        onSendChatMessage={sendWidgetChatMessage}
        onStartVoice={startWidgetVoice}
        onToggleAlwaysOnTop={toggleAlwaysOnTop}
        onToggleVoiceMic={toggleWidgetVoiceMic}
        speakingUserIds={speakingUserIds}
        presentation="tauri"
        timerActionNotice={timerActionNotice}
        viewportSize={widgetViewportSize}
        windowId={windowId}
        windowVisible={windowVisible}
      />
      {showVoiceCallOverlay && incomingVoiceCall ? (
        <div className="voice-call-invite voice-call-invite--widget" role="dialog" aria-modal="true" aria-label={t("layout.voiceCall.aria")}>
          <div className="voice-call-invite__card" data-bubli-interactive="true">
            <div className="voice-call-invite__avatar" aria-hidden="true">
              <Phone size={26} strokeWidth={2} />
            </div>
            <strong className="voice-call-invite__caller">{incomingVoiceCall.callerName}</strong>
            <span className="voice-call-invite__hint">{t("layout.voiceCall.hint")}</span>
            <div className="voice-call-invite__actions">
              <button
                className="voice-call-invite__accept"
                disabled={voiceCallResponding}
                onClick={() => void acceptIncomingVoiceCall()}
                type="button"
              >
                {voiceCallResponding ? t("layout.voiceCall.connecting") : t("layout.voiceCall.accept")}
              </button>
              <button className="voice-call-invite__decline" disabled={voiceCallResponding} onClick={dismissIncomingVoiceCall} type="button">
                {t("layout.voiceCall.decline")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showVoiceCallOverlay && !incomingVoiceCall && (isWidgetRingingBack || widgetOutgoingCallNotice) ? (
        <div className="voice-call-invite voice-call-invite--widget" role="status" aria-label={t("layout.voiceCall.outgoingAria")}>
          <div className="voice-call-invite__card" data-bubli-interactive="true">
            <div className="voice-call-invite__avatar" aria-hidden="true">
              <Phone size={26} strokeWidth={2} />
            </div>
            <strong className="voice-call-invite__caller">{t("layout.voiceCall.outgoingHint")}</strong>
            <span className="voice-call-invite__hint">{widgetOutgoingCallNotice ?? t("layout.voiceCall.outgoingHint")}</span>
            {isWidgetRingingBack ? (
              <div className="voice-call-invite__actions">
                <button className="voice-call-invite__decline" onClick={cancelOutgoingWidgetCall} type="button">
                  {t("layout.voiceCall.cancel")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function DesktopWidgetSurfacePage() {
  return (
    <Suspense fallback={null}>
      <DesktopWidgetSurface />
    </Suspense>
  );
}
