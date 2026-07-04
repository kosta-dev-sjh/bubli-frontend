"use client";

import { Room } from "livekit-client";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

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
import { ApiClientError } from "@/lib/api/errors";
import {
  widgetApi,
  type BackendWidgetBubbleType,
  type BackendWidgetItemType,
  type WidgetBubbleSettingResponse,
  type WidgetContextResponse,
} from "@/features/widget/api/widgetApi";
import { widgetCommunicationApi } from "@/features/widget/api/widgetCommunicationApi";
import { DesktopWidgetBubble, DesktopWidgetBubbleBar, DesktopWidgetMenuOrb, desktopWidgetBubbleTypes, widgetInteractiveRectSelector } from "@/features/widget/components/desktop-widget-bubble";
import {
  getWidgetPreviewBubble,
  type WidgetNotificationSignal,
  type WidgetPreviewBubble,
  type WidgetPreviewItem,
} from "@/features/widget/desktop-widget-preview-data";
import { notificationApi } from "@/features/notification/api/notificationApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { timerApi } from "@/features/timer/api/timerApi";
import { todoApi } from "@/features/todo/api/todoApi";
import { AUTH_SESSION_CHANGE_EVENT, clearStoredAuthSession, getStoredAuthSession, restoreStoredAuthSessionFromTauri } from "@/lib/auth/auth-session";
import { tauriCommands, type WidgetBubbleType, type WidgetInteractiveRect, type WidgetWindowBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";
import { listenWidgetMenuPanelRequested, listenWidgetRoomContextChanged } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { readWidgetSummary } from "@/lib/widget";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { TimeLogResponse } from "@/types/api/timer";
import type { WidgetSummaryResponse } from "@/types/api/widget";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

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

const TIMER_HEARTBEAT_INTERVAL_MS = 60_000;
type WidgetItemStateAction = "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED";

function roomQuery(roomId?: string | null) {
  return roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
}

function roomWorkRoute(roomId?: string | null) {
  return roomId ? `/app/project-rooms/${encodeURIComponent(roomId)}/work` : "/app";
}

function roomResourceRoute(roomId?: string | null) {
  return roomId ? `/app/project-rooms/${encodeURIComponent(roomId)}/resources` : "/app/resources";
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
  if (mode === "GHOST") return { height: 212, width: 212 };
  if (bubbleType === "chat") return { height: 420 + WIDGET_WINDOW_GUTTER, width: 336 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "agent") return { height: 430 + WIDGET_WINDOW_GUTTER, width: 332 + WIDGET_WINDOW_GUTTER };
  if (bubbleType === "timer") return { height: 352 + WIDGET_WINDOW_GUTTER, width: 324 + WIDGET_WINDOW_GUTTER };
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
  const activeRooms = rooms.filter((room) => room.status === "ACTIVE");
  if (selectedRoomId) {
    return activeRooms.find((room) => room.chatType === "ROOM" && room.roomId === selectedRoomId) ?? null;
  }

  return activeRooms.find((room) => room.chatType === "DIRECT" || room.roomId === null) ?? null;
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
  if (timer.status === "RUNNING") return t("widget.timerAction.stop");
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

function applyItemStateActionToBubble(
  bubble: WidgetPreviewBubble | undefined,
  itemId: string,
  state: WidgetItemStateAction,
): WidgetPreviewBubble | undefined {
  if (!bubble) return bubble;
  if (state === "CONFIRMED" || state === "HIDDEN" || state === "SNOOZED") {
    return { ...bubble, rows: bubble.rows.filter((row) => row.id !== itemId) };
  }

  const target = bubble.rows.find((row) => row.id === itemId);
  if (!target) return bubble;
  return {
    ...bubble,
    rows: [target, ...bubble.rows.filter((row) => row.id !== itemId)],
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
        .flatMap((bubble) => bubble?.rows ?? [])
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
        itemState.state === "SNOOZED"
      ) {
        return [[itemState.itemId, itemState.state]];
      }
      return [];
    }),
  );
}

function buildNotificationSignal(t: TranslateFn, notifications: WidgetNotificationResponse[]): WidgetNotificationSignal {
  const unread = notifications.filter((item) => item.status === "UNREAD");
  return {
    compactLabel: t("widget.signal.alertCount", { count: unread.length }),
    metric: String(unread.length),
    notificationLabel: unread.length > 0 ? t("widget.signal.newAlertCount", { count: unread.length }) : t("widget.signal.noNewAlert"),
    rows: unread.slice(0, 3).map((item) => ({
      id: item.id,
      detail: item.body ?? undefined,
      kind: item.sourceType === "MESSAGE" ? "message" : item.sourceType === "RESOURCE" ? "resource" : "agent",
      label: item.title,
      status: item.sourceType,
    })),
  };
}

function buildDisplayBubbles(input: {
  dashboard?: WidgetDashboardWorkResponse | null;
  friends: WidgetFriendResponse[];
  memos: WidgetMemoResponse[];
  messages: WidgetChatMessageResponse[];
  notifications: WidgetNotificationResponse[];
  resources: WidgetResourceResponse[];
  room?: WidgetProjectRoomResponse | null;
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
  const chatRoute = input.roomId ? `/app/chat?mode=room&roomId=${encodeURIComponent(input.roomId)}` : "/app/chat";
  const resourceRoute = roomResourceRoute(input.roomId);
  const scheduleRoute = roomScopedRoute("/app/calendar", input.roomId);
  const todoRoute = roomWorkRoute(input.roomId);
  const activeTimer = input.timer ?? (!isRoomScoped ? input.dashboard?.runningTimer ?? null : null);
  const todoSource = isRoomScoped ? input.tasks : (input.dashboard?.todayTasks.length ? input.dashboard.todayTasks : input.tasks);
  const scheduleSource = isRoomScoped ? input.schedules : (input.dashboard?.todaySchedules.length ? input.dashboard.todaySchedules : input.schedules);
  // /api/dashboard/work upcomingDeadlines(개인 범위)로 오늘 작업이 모자랄 때 다가오는 마감을 채운다.
  const deadlineFill = isRoomScoped
    ? []
    : (input.dashboard?.upcomingDeadlines ?? []).filter((deadline) => !todoSource.some((task) => task.id === deadline.id));
  const todoItems = [...todoSource, ...deadlineFill].slice(0, 3);
  const scheduleItems = scheduleSource.slice(0, 3);
  const scheduleTimeLabel = (item: WidgetScheduleResponse) => (item.allDay ? t("widget.schedule.allDay") : formatShortTime(item.startsAt));
  const memoItems = input.memos.filter((item) => item.status === "ACTIVE").slice(0, 3);
  const fileItems = input.resources.filter((item) => item.kind !== "MEMO").slice(0, 3);
  const agentRows =
    input.suggestions.length > 0
      ? input.suggestions.slice(0, 3).map((item) => ({
          id: item.suggestionId,
          kind: "agent" as const,
          handoffLabel: suggestionStatusLabel(t, item.status),
          handoffUrl: agentRoute,
          label: suggestionTitle(item),
          status: suggestionStatusLabel(t, item.status),
        }))
      : (input.dashboard?.agentSuggestionSummary ?? []).slice(0, 3).map((line, index) => ({
          id: `agent-summary-${index}`,
          kind: "agent" as const,
          handoffLabel: t("widget.suggestion.draft"),
          handoffUrl: agentRoute,
          label: line,
          status: t("widget.suggestion.draft"),
        }));
  const unreadNotifications = input.notifications.filter((item) => item.status === "UNREAD").slice(0, 3);
  const unreadCount = Math.max(
    input.notifications.filter((item) => item.status === "UNREAD").length,
    input.dashboard?.unreadNotificationCount ?? 0,
  );
  const voiceParticipants = input.voiceRoom?.participants.filter((item) => item.status === "JOINED") ?? [];

  return {
    agent: withBubble("agent", {
      compactLabel: t("widget.agent.candidateCount", { count: agentRows.length }),
      metric: String(agentRows.length),
      notificationLabel: agentRows.length > 0 ? t("widget.agent.waitingCandidates") : t("widget.agent.noWaitingCandidates"),
      panelBody: agentRows.length > 0 ? t("widget.agent.onlyBeforeApproval") : t("widget.agent.noWaiting"),
      roomId: input.roomId,
      roomLabel: label,
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
      roomId: input.roomId,
      roomLabel: label,
      rows: unreadNotifications.map((item) => ({
        id: item.id,
        detail: item.body ?? undefined,
        handoffLabel: item.sourceType,
        handoffUrl: item.sourceType === "MESSAGE" ? chatRoute : item.sourceType === "RESOURCE" ? resourceRoute : agentRoute,
        kind: item.sourceType === "MESSAGE" ? "message" : item.sourceType === "RESOURCE" ? "resource" : "agent",
        label: item.title,
        status: item.sourceType,
      })),
    }),
    chat: withBubble("chat", {
      chatRoomId: input.chatRoom?.id,
      compactLabel: t("widget.chat.count", { count: input.messages.length + voiceParticipants.length }),
      lastMessageSequence: input.messages.reduce((max, item) => Math.max(max, item.roomSequence), 0),
      metric: String(input.messages.length),
      notificationLabel: unreadCount > 0 ? t("widget.chat.unreadCount", { count: unreadCount }) : t("widget.chat.noNew"),
      panelBody: t("widget.chat.body"),
      // DIRECT 채팅방은 백엔드 chat room name을 쓰고, 룸 채팅은 프로젝트룸 라벨을 쓴다.
      panelLabel: t("widget.chat.panelLabel", { label: input.chatRoom?.name?.trim() || label }),
      participantLabels: input.friends.slice(0, 3).map((item) => item.name),
      roomId: input.roomId,
      roomLabel: label,
      voiceLabel: input.voiceConnectionLabel ?? (input.voiceRoom?.status === "OPEN" ? t("widget.chat.voiceOpen") : t("widget.chat.voiceWaiting")),
      voiceParticipants: voiceParticipants.map((item) => item.userName).filter(Boolean).join(" · ") || t("widget.chat.noParticipants"),
      voiceRoomId: input.voiceRoom?.id,
      rows: [
        ...input.friends.slice(0, 1).map((item) => ({
          id: item.userId ?? item.friendUserId ?? item.bubliId,
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
        ...input.messages.slice(0, 3).map((item) => ({
          dismissOnOpen: false,
          handoffLabel: formatShortTime(item.createdAt),
          handoffUrl: chatRoute,
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
      roomId: input.roomId,
      roomLabel: label,
      rows: memoItems.map((item) => ({
        id: item.id,
        handoffLabel: formatShortTime(item.updatedAt),
        handoffUrl: roomScopedRoute("/app", input.roomId),
        kind: "memo",
        label: memoTitle(t, item),
        memoBody: item.body,
        status: formatShortTime(item.updatedAt),
      })),
    }),
    resource: withBubble("resource", {
      compactLabel: t("widget.resource.count", { count: fileItems.length }),
      metric: String(fileItems.length),
      notificationLabel: fileItems.length > 0 ? t("widget.resource.toCheck") : t("widget.resource.noneToCheck"),
      panelBody: fileItems.length > 0 ? t("widget.resource.roomBody") : t("widget.resource.noneBody"),
      roomId: input.roomId,
      roomLabel: label,
      rows: fileItems.map((item) => ({
        id: item.id,
        handoffLabel: resourceStatusLabel(t, item.status),
        handoffUrl: resourceRoute,
        kind: "resource",
        label: item.title,
        status: resourceStatusLabel(t, item.status),
      })),
    }),
    schedule: withBubble("schedule", {
      compactLabel: t("widget.schedule.count", { count: scheduleItems.length }),
      metric: scheduleItems[0] ? scheduleTimeLabel(scheduleItems[0]) || "0" : "0",
      notificationLabel: scheduleItems[0]?.title ?? t("widget.schedule.none"),
      panelBody: t("widget.schedule.body"),
      roomId: input.roomId,
      roomLabel: label,
      rows: scheduleItems.map((item) => ({
        id: item.id,
        handoffLabel: scheduleTimeLabel(item),
        handoffUrl: scheduleRoute,
        kind: "schedule",
        label: item.title,
        status: scheduleTimeLabel(item),
      })),
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
              status: activeTimer.status,
            },
          ]
        : [],
    }),
    todo: withBubble("todo", {
      compactLabel: t("widget.todo.count", { count: todoItems.length }),
      metric: String(todoItems.length),
      notificationLabel: todoItems[0] ? todoItems[0].title : t("widget.todo.none"),
      panelBody: t("widget.todo.body"),
      roomId: input.roomId,
      roomLabel: label,
      rows: todoItems.map((item) => ({
        checked: item.status === "DONE",
        handoffLabel: formatDue(t, item.dueAt) || taskStatusLabel(t, item.status),
        handoffUrl: todoRoute,
        id: item.id,
        kind: "task",
        label: item.title,
        status: formatDue(t, item.dueAt) || taskStatusLabel(t, item.status),
      })),
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

  if (summary.context.selectedRoomId || !requested) return summary.context;
  return current ?? { mode: "ROOM", selectedRoomId: requested };
}

async function readWidgetDisplaySummary(requestedRoomId?: string | null): Promise<WidgetSummaryResponse | null> {
  if (isTauriRuntime()) {
    const cacheResult = await readWidgetSummary({
      fetchServerSummary: () => Promise.reject(new Error("local widget summary cache empty")),
      selectedRoomId: requestedRoomId,
    }).catch(() => null);

    if (cacheResult?.status === "ready") {
      void readWidgetSummary({ preferLocalCache: false, selectedRoomId: requestedRoomId }).catch(() => null);
      if (widgetSummaryMatchesRequestedRoom(cacheResult.data, requestedRoomId)) {
        return cacheResult.data;
      }
    }
  }

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
  const requestedBubble = getRequestedBubble(requestedSurface);
  const currentWindowBubble: WidgetWindowBubbleType = isBubbleBar ? "bar" : isMenuOrb ? "menu" : requestedBubble;
  const requestedMode = getRequestedMode(searchParams.get("mode"));
  const requestedRoomId = searchParams.get("roomId") ?? null;
  const windowId = searchParams.get("windowId") ?? undefined;
  const [authReady, setAuthReady] = useState(!isTauri);
  const [hasAuthSession, setHasAuthSession] = useState(!isTauri);
  const [activeBubble, setActiveBubble] = useState<WidgetBubbleType>(requestedBubble);
  const [mode, setMode] = useState<WidgetWindowMode>(requestedMode);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);
  const [windowVisible, setWindowVisible] = useState(true);
  const [widgetContext, setWidgetContext] = useState<WidgetContextResponse | null>(
    requestedRoomId ? { mode: "ROOM", selectedRoomId: requestedRoomId } : null,
  );
  const [serverSettings, setServerSettings] = useState<WidgetBubbleSettingResponse[]>([]);
  const [barItems, setBarItems] = useState<WidgetWindowState[]>([]);
  const [displayBubbles, setDisplayBubbles] = useState<Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>>(() =>
    withWidgetDisplayLoadState(buildEmptyDisplayBubbles(t, requestedRoomId), "loading"),
  );
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(process.env.NEXT_PUBLIC_BUBLI_WIDGET_DEV_VOICE_ROOM_ID ?? null);
  const [agentRevision, setAgentRevision] = useState(0);
  const [communicationRevision, setCommunicationRevision] = useState(0);
  const [itemStateOverrides, setItemStateOverrides] = useState<Record<string, WidgetItemStateAction>>({});
  const [memoRevision, setMemoRevision] = useState(0);
  const [notificationRevision, setNotificationRevision] = useState(0);
  const [resourceRevision, setResourceRevision] = useState(0);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [todoRevision, setTodoRevision] = useState(0);
  const [timerRevision, setTimerRevision] = useState(0);
  const [timerSnapshot, setTimerSnapshot] = useState<TimeLogResponse | null>(null);
  const [activeTimerHeartbeatId, setActiveTimerHeartbeatId] = useState<string | null>(null);
  const [voiceConnectionLabel, setVoiceConnectionLabel] = useState<string | null>(null);
  const [voiceMicMuted, setVoiceMicMuted] = useState(false);
  const [notificationSignal, setNotificationSignal] = useState<WidgetNotificationSignal>(() => widgetDisplayLoadSignal("loading"));
  const [menuUsageSummary, setMenuUsageSummary] = useState<string | null>(null);
  // 바 창의 Bubli 버튼이 보낸 "패널 열기" 요청 수신 카운터(메뉴 창 전용).
  const [menuPanelSignal, setMenuPanelSignal] = useState(0);
  const liveKitRoomRef = useRef<Room | null>(null);
  const appReadySentRef = useRef(false);
  // 첫 로드 성공 후의 배경 재조회 실패는 조용히 이전 데이터를 유지한다(에러 스켈레톤 스왑 금지).
  const displayLoadedOnceRef = useRef(false);
  const selectedWidgetRoomId = widgetContext?.selectedRoomId ?? requestedRoomId ?? null;
  const widgetSessionReady = !isTauri || (authReady && hasAuthSession);

  // 창별 상호작용 rect 보고(투명 영역 클릭 통과). 브라우저 미리보기에서는 동작하지 않는다.
  useWidgetInteractiveRectReporting(isTauri && mounted);

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
    const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
    if (!session) {
      return false;
    }

    try {
      await authApi.getMe();
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuthSession();
      }

      return false;
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

        setActiveBubble(resolveWidgetBubble(nextState.activeBubble, requestedBubble));
        setMode(nextState.mode);
        setAlwaysOnTop(nextState.alwaysOnTop);
        setClickThrough(nextState.clickThrough);
        setWindowVisible(nextState.windowVisible);
      })
      .catch(() => {
        // Browser previews and incomplete Tauri permissions should not break the widget surface.
      });
  }, [isTauri, isWidgetChrome, requestedBubble, requestedMode, selectedWidgetRoomId, widgetSessionReady, windowId]);

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
        setServerSettings((current) => keepIfDeepEqual(current, settings));

        const backendBubbleType = apiBubbleTypeMap[requestedBubble];
        const activeSetting = backendBubbleType ? settings.find((item) => item.bubbleType === backendBubbleType) : undefined;
        const serverMode = getModeFromSetting(activeSetting);
        if (serverMode && requestedMode === "DEFAULT") {
          setMode(serverMode);
          setClickThrough(serverMode === "GHOST");
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
  }, [isWidgetChrome, requestedBubble, requestedMode, requestedRoomId, widgetSessionReady]);

  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void listenWidgetRoomContextChanged((payload) => {
      setWidgetContext(payload.selectedRoomId ? { mode: "ROOM", selectedRoomId: payload.selectedRoomId } : null);
      setCommunicationRevision((current) => current + 1);
      setMemoRevision((current) => current + 1);
      setTimerRevision((current) => current + 1);
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
  }, [isTauri]);

  useEffect(() => {
    return () => {
      liveKitRoomRef.current?.disconnect();
      liveKitRoomRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isWidgetChrome) return;

    let cancelled = false;

    async function refreshWidgetContext() {
      const summary = await readWidgetDisplaySummary(requestedRoomId).catch(() => null);
      if (cancelled || !summary?.context) return;

      setWidgetContext((current) => {
        const nextContext = resolveWidgetContextFromSummary(summary, requestedRoomId, current);
        if (
          current?.mode === nextContext.mode &&
          current?.selectedRoomId === nextContext.selectedRoomId
        ) {
          return current;
        }
        return nextContext;
      });
      // 5초 배경 갱신은 내용이 같으면 이전 참조를 유지해 리렌더/깜빡임을 만들지 않는다.
      setServerSettings((current) => keepIfDeepEqual(current, summary.bubbles ?? []));
    }

    const intervalId = window.setInterval(() => {
      void refreshWidgetContext();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isWidgetChrome, requestedRoomId, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (isMenuOrb) return;

    let cancelled = false;

    async function loadDisplayApiState() {
      let selectedRoomId = widgetContext?.selectedRoomId ?? requestedRoomId ?? null;
      const summary = await readWidgetDisplaySummary(selectedRoomId);
      if (summary?.context) {
        selectedRoomId = selectedRoomId ?? normalizeWidgetRoomId(summary.context.selectedRoomId) ?? requestedRoomId ?? null;
        if (!cancelled) {
          setWidgetContext((current) => resolveWidgetContextFromSummary(summary, selectedRoomId, current));
          setServerSettings((current) => keepIfDeepEqual(current, summary.bubbles ?? []));
        }
      }

      const voiceRoomId = activeVoiceRoomId;
      const [dashboardResult, tasksResult, schedulesResult, resourcesResult, memosResult, suggestionsResult, notificationsResult, chatRoomsResult, friendsResult, roomResult, voiceResult] =
        await Promise.allSettled([
          widgetDisplayApi.getDashboardWork(),
          widgetDisplayApi.listTasks(selectedRoomId, 6),
          widgetDisplayApi.listSchedules(selectedRoomId, 6),
          widgetDisplayApi.listResources(selectedRoomId, 6),
          widgetDisplayApi.listMemos(selectedRoomId, 6),
          widgetDisplayApi.listAgentSuggestions(selectedRoomId),
          widgetDisplayApi.listNotifications(6),
          widgetDisplayApi.listChatRooms(20),
          widgetDisplayApi.listFriends(),
          selectedRoomId ? widgetDisplayApi.getProjectRoom(selectedRoomId) : Promise.resolve(null),
          voiceRoomId ? widgetDisplayApi.getVoiceRoom(voiceRoomId) : Promise.resolve(null),
        ]);

      if (cancelled) return;

      const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value.items : [];
      const rooms = chatRoomsResult.status === "fulfilled" ? chatRoomsResult.value.items : [];
      let activeRoom = resolveActiveWidgetChatRoom(rooms, selectedRoomId);
      if (selectedRoomId && !activeRoom) {
        activeRoom = await widgetDisplayApi.createProjectRoomChatRoom(selectedRoomId).catch(() => null);
      }
      if (cancelled) return;
      const messages = activeRoom ? await widgetDisplayApi.listChatMessages(activeRoom.id, 6).catch(() => null) : null;
      const cachedMessages =
        isTauri && activeRoom && !messages
          ? await tauriCommands
              .readRoomMessages({ limit: 6, roomId: activeRoom.id })
              .then((result) => parseCachedWidgetChatMessages(result.items))
              .catch(() => [])
          : [];

      if (cancelled) return;

      const failedBubbles = new Set<WidgetBubbleType>();
      if (dashboardResult.status === "rejected") failedBubbles.add("timer");
      if (tasksResult.status === "rejected") failedBubbles.add("todo");
      if (schedulesResult.status === "rejected") failedBubbles.add("schedule");
      if (resourcesResult.status === "rejected") failedBubbles.add("resource");
      if (memosResult.status === "rejected") failedBubbles.add("memo");
      if (suggestionsResult.status === "rejected") failedBubbles.add("agent");
      if (notificationsResult.status === "rejected") failedBubbles.add("alert");
      if (
        chatRoomsResult.status === "rejected" ||
        friendsResult.status === "rejected" ||
        (activeRoom && !messages) ||
        (voiceRoomId && voiceResult.status === "rejected")
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

      const summaryDashboard = dashboardFromWidgetSummary(summary);
      const dashboard = selectedRoomId ? null : dashboardResult.status === "fulfilled" ? dashboardResult.value : summaryDashboard;
      const activeTimerCandidate = timerSnapshot?.status === "PAUSED" ? timerSnapshot : (dashboard?.runningTimer ?? timerSnapshot);
      const activeTimer = selectedRoomId && activeTimerCandidate?.roomId !== selectedRoomId ? null : activeTimerCandidate;
      const messageItems = messages?.items ?? cachedMessages;
      const schedules = schedulesResult.status === "fulfilled" ? schedulesResult.value.items : selectedRoomId ? [] : (summaryDashboard?.todaySchedules ?? []);
      const tasks = tasksResult.status === "fulfilled" ? tasksResult.value.items : selectedRoomId ? [] : (summaryDashboard?.todayTasks ?? []);
      const nextNotificationSignal =
        notificationsResult.status === "rejected"
          ? widgetDisplayLoadSignal("error")
          : buildNotificationSignal(t, notifications);
      setNotificationSignal((current) => keepIfDeepEqual(current, nextNotificationSignal));
      setActiveTimerHeartbeatId(activeTimer?.status === "RUNNING" ? activeTimer.id : null);

      const nextDisplayBubbles = buildDisplayBubbles({
          chatRoom: activeRoom ?? null,
          dashboard,
          friends: friendsResult.status === "fulfilled" ? friendsResult.value : [],
          memos: memosResult.status === "fulfilled" ? memosResult.value.items : [],
          messages: messageItems,
          notifications,
          resources: resourcesResult.status === "fulfilled" ? resourcesResult.value.items : [],
          room: roomResult.status === "fulfilled" ? roomResult.value : null,
          roomId: selectedRoomId,
          schedules,
          suggestions: suggestionsResult.status === "fulfilled" ? suggestionsResult.value : [],
          tasks,
          timer: activeTimer,
          voiceConnectionLabel,
          voiceRoom: voiceResult.status === "fulfilled" ? voiceResult.value : null,
        }, t);
      const persistedItemStates = await widgetApi
        .listItemStates(collectWidgetItemIds(nextDisplayBubbles))
        .catch(() => []);
      const persistedOverrides = itemStateResponseToOverrides(persistedItemStates);
      const nextBubbles = withFailedWidgetDisplayBubbles(
        applyItemStateOverrides(nextDisplayBubbles, { ...persistedOverrides, ...itemStateOverrides }),
        failedBubbles,
      );
      // 배경 재조회 결과가 기존과 같으면 이전 데이터를 그대로 유지한다(로딩 스켈레톤 재노출 없음).
      setDisplayBubbles((current) => keepIfDeepEqual(current, nextBubbles));
      displayLoadedOnceRef.current = true;
    }

    void loadDisplayApiState().catch(() => {
      // 첫 로드 전 실패만 에러 상태로 바꾸고, 배경 재조회 실패는 이전 데이터를 유지한다.
      if (!cancelled && !displayLoadedOnceRef.current) {
        setDisplayBubbles(withWidgetDisplayLoadState(buildEmptyDisplayBubbles(t, widgetContext?.selectedRoomId ?? requestedRoomId), "error"));
        setNotificationSignal(widgetDisplayLoadSignal("error"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeVoiceRoomId, agentRevision, communicationRevision, isMenuOrb, isTauri, itemStateOverrides, memoRevision, notificationRevision, requestedRoomId, resourceRevision, scheduleRevision, timerRevision, timerSnapshot, todoRevision, voiceConnectionLabel, widgetContext?.selectedRoomId, widgetSessionReady]);

  useEffect(() => {
    if (!widgetSessionReady) return;
    if (!isBubbleBar) return;

    let cancelled = false;

    async function loadBarItems() {
      if (!isTauri) {
        setBarItems([
          {
            activeBubble: "timer",
            alwaysOnTop: true,
            clickThrough: false,
            dockOrbVisible: false,
            mode: "MINIMIZED",
            position: { x: 0, y: 0 },
            trayVisible: false,
            windowId: "timer",
            windowVisible: false,
          },
        ]);
        return;
      }

      try {
        const items = await tauriCommands.getWidgetBarItems();
        if (cancelled) return;
        const next = items.filter((item) => isDesktopWidgetBubble(item.activeBubble));
        // 2초 폴링이 같은 목록을 새 배열 참조로 내려보내도 리렌더(칩 깜빡임)하지 않는다.
        setBarItems((current) => keepIfDeepEqual(current, next));
      } catch {
        if (!cancelled) setBarItems((current) => (current.length === 0 ? current : []));
      }
    }

    void loadBarItems();
    const intervalId = window.setInterval(() => void loadBarItems(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isBubbleBar, isTauri, widgetSessionReady]);

  const setWindowMode = useCallback(
    async (nextMode: WidgetWindowMode) => {
      setMode(nextMode);
      setClickThrough(nextMode === "GHOST");
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
        // Browser preview fallback.
      }
    },
    [activeBubble, isTauri, selectedWidgetRoomId, windowId],
  );

  const toggleAlwaysOnTop = useCallback(async () => {
    const enabled = !alwaysOnTop;
    setAlwaysOnTop(enabled);

    if (!isTauri) return;

    try {
      const backendBubbleType = apiBubbleTypeMap[activeBubble];
      const existing = backendBubbleType ? serverSettings.find((item) => item.bubbleType === backendBubbleType) : undefined;
      const settingPatch = getSettingPatch(activeBubble, mode);
      if (settingPatch) {
        void widgetApi
          .updateSettings({
            bubbles: [
              {
                ...settingPatch,
                x: existing?.x ?? undefined,
                y: existing?.y ?? undefined,
              },
            ],
          })
          .catch(() => undefined);
      }
      const state = await tauriCommands.setWidgetAlwaysOnTop({ bubbleType: activeBubble, enabled, windowId });
      setAlwaysOnTop(state.alwaysOnTop);
    } catch {
      // Browser preview fallback.
    }
  }, [activeBubble, alwaysOnTop, isTauri, mode, serverSettings, windowId]);

  const restoreCurrentWindow = useCallback(async () => {
    setMode("DEFAULT");
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
      // Browser preview fallback.
    }
  }, [activeBubble, isTauri, selectedWidgetRoomId, windowId]);

  const closeWindow = useCallback(async () => {
    setMode("MINIMIZED");
    setWindowVisible(false);

    if (!isTauri) return;

    try {
      const state = await tauriCommands.closeWidgetWindow({ bubbleType: activeBubble, windowId });
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
          eventType: "close:minimize",
          occurredAt: new Date().toISOString(),
        })
        .catch(() => undefined);
      setMode(state.mode);
      setAlwaysOnTop(state.alwaysOnTop);
      setClickThrough(state.clickThrough);
      setWindowVisible(state.windowVisible);
    } catch {
      // Browser preview fallback.
    }
  }, [activeBubble, isTauri, windowId]);

  const restoreBubbleFromBar = useCallback(
    async (bubbleType: WidgetBubbleType) => {
      if (!isTauri) return;

      try {
        // windowId는 항상 버블 타입으로 고정한다. 바 칩이 들고 있던 저장 windowId를 그대로
        // 넘기면(레거시 "todo-…" 등) Rust 스토어 키가 갈라져 같은 버블 창이 두 개 열렸다.
        await tauriCommands.openWidgetWindow({
          bubbleType,
          mode: "DEFAULT",
          selectedRoomId: selectedWidgetRoomId,
          windowId: bubbleType,
        });
        const items = await tauriCommands.getWidgetBarItems();
        const next = items.filter((item) => isDesktopWidgetBubble(item.activeBubble));
        setBarItems((current) => keepIfDeepEqual(current, next));
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri, selectedWidgetRoomId],
  );

  const handleItemStateChange = useCallback(
    async (item: WidgetPreviewItem, state: WidgetItemStateAction) => {
      const itemType: BackendWidgetItemType =
        item.kind === "message"
          ? "MESSAGE"
          : item.kind === "schedule"
            ? "SCHEDULE"
            : item.kind === "resource" || item.kind === "agent"
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
        setItemStateOverrides((current) => ({ ...current, [item.id]: state }));
      };
      const backendBubbleType = apiItemBubbleTypeMap[activeBubble];

      if (!backendBubbleType) {
        applyLocalState();
        return;
      }

      if (itemStateId) {
        await widgetApi.updateItemState(itemStateId, {
          bubbleType: backendBubbleType,
          itemId: item.id,
          itemType,
          state,
        });
        if (activeBubble === "todo" && item.kind === "task" && state === "CONFIRMED") {
          await todoApi.update(item.id, { status: "DONE" });
          setTodoRevision((current) => current + 1);
        }
        if (activeBubble === "alert" && state === "CONFIRMED") {
          await notificationApi.markRead(item.id);
          setNotificationRevision((current) => current + 1);
        }
        if (activeBubble === "alert" && state === "HIDDEN") {
          await notificationApi.archive(item.id);
          setNotificationRevision((current) => current + 1);
        }
        if (activeBubble === "agent" && item.kind === "agent" && state === "CONFIRMED") {
          await agentApi.updateSuggestion(item.id, { action: "APPROVE" });
          setAgentRevision((current) => current + 1);
        }
        applyLocalState();
      }
    },
    [activeBubble, isTauri],
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
            : item.kind === "resource" || item.kind === "agent"
              ? "NOTIFICATION"
              : "TASK";

      if (isTauri) {
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
    [activeBubble, isTauri],
  );

  const downloadWidgetResource = useCallback(
    async (item: WidgetPreviewItem) => {
      const result = await widgetDisplayApi.getResourceDownloadUrl(item.id);
      window.open(result.url, "_blank", "noopener,noreferrer");

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
    },
    [isTauri],
  );

  const sendWidgetChatMessage = useCallback(
    async (bubble: WidgetPreviewBubble, text: string) => {
      if (!bubble.chatRoomId) return;

      await widgetCommunicationApi.sendChatMessage(bubble.chatRoomId, {
        body: { text },
        clientMessageId: crypto.randomUUID(),
        messageType: "TEXT",
      });
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
    },
    [isTauri],
  );

  const sendWidgetAgentCommand = useCallback(
    async (bubble: WidgetPreviewBubble, text: string) => {
      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;
      if (!roomId) throw new Error("Project room is required for widget agent commands.");

      const result = await widgetCommunicationApi.runRoomAgentCommand(roomId, {
        clientMessageId: `widget-agent-${crypto.randomUUID()}`,
        message: text,
        mode: "SUGGEST",
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

      setAgentRevision((current) => current + 1);
      setCommunicationRevision((current) => current + 1);
    },
    [isTauri, widgetContext?.selectedRoomId],
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
    },
    [isTauri],
  );

  const createWidgetMemo = useCallback(
    async (bubble: WidgetPreviewBubble, inlineBody?: string) => {
      // 버블 하단 인라인 컴포저가 본문을 넘겨주면 그대로 저장하고, 없을 때만 prompt로 받는다.
      const body = (inlineBody ?? window.prompt(t("widget.memo.prompt")) ?? "").trim();
      if (!body) return;

      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;
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
    },
    [isTauri, t, widgetContext?.selectedRoomId],
  );

  const editWidgetMemo = useCallback(
    async (item: WidgetPreviewItem) => {
      const currentBody = item.memoBody ?? item.label;
      const body = window.prompt(t("widget.memo.prompt"), currentBody)?.trim();
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
    },
    [isTauri, t],
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
    },
    [isTauri, t],
  );

  const createWidgetTodo = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const title = window.prompt(t(bubble.actionLabel as MessageKey))?.trim();
      if (!title) return;

      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;
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
    },
    [isTauri, t, widgetContext?.selectedRoomId],
  );

  const createWidgetSchedule = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const title = window.prompt(t("widget.schedule.prompt"))?.trim();
      if (!title) return;

      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;
      const schedule = await calendarApi.createEvent({
        allDay: false,
        endsAt: null,
        roomId,
        startsAt: nextWidgetScheduleStart(),
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
    },
    [isTauri, t, widgetContext?.selectedRoomId],
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
      setTimerRevision((current) => current + 1);
    },
    [recordLocalTimerState],
  );

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

      const timeLog = await timerApi.pause(timeLogId);
      applyTimerResult(timeLog);
      recordTimerUsage("timer:pause", timeLog.id);
    },
    [applyTimerResult, recordTimerUsage],
  );

  const runPrimaryTimerAction = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const currentTimer = bubble.rows[0];

      if (currentTimer?.status === "RUNNING") {
        const timeLog = await timerApi.stop(currentTimer.id);
        applyTimerResult(timeLog);
        recordTimerUsage("timer:stop", timeLog.id);
        return;
      }

      if (currentTimer?.status === "PAUSED") {
        const timeLog = await timerApi.resume(currentTimer.id);
        applyTimerResult(timeLog);
        recordTimerUsage("timer:resume", timeLog.id);
        return;
      }

      const roomId = bubble.roomId ?? widgetContext?.selectedRoomId ?? null;
      const timeLog = await timerApi.start({
        idempotencyKey: `widget-timer-${crypto.randomUUID()}`,
        roomId,
        timerType: roomId ? "WORK" : "GENERAL",
      });
      applyTimerResult(timeLog);
      recordTimerUsage("timer:start", timeLog.id);
    },
    [applyTimerResult, recordTimerUsage, widgetContext?.selectedRoomId],
  );

  const startWidgetVoice = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      if (!bubble.roomId) {
        setVoiceConnectionLabel("Select a room first");
        return;
      }

      const voiceRoom = activeVoiceRoomId
        ? await widgetCommunicationApi.getVoiceRoom(activeVoiceRoomId)
        : await widgetCommunicationApi.createVoiceRoom(bubble.roomId);

      setActiveVoiceRoomId(voiceRoom.id);
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
        liveKitRoomRef.current?.disconnect();
        liveKitRoomRef.current = liveKitRoom;

        try {
          await liveKitRoom.connect(token.serverUrl, token.token);
          await liveKitRoom.localParticipant.setMicrophoneEnabled(true);
          setVoiceMicMuted(false);
          setVoiceConnectionLabel("LiveKit connected");
        } catch {
          setVoiceConnectionLabel("Token issued; media connect failed");
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
    },
    [activeVoiceRoomId, isTauri],
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
    },
    [activeVoiceRoomId, isTauri, voiceMicMuted],
  );

  const leaveWidgetVoice = useCallback(
    async (bubble: WidgetPreviewBubble) => {
      const voiceRoomId = bubble.voiceRoomId ?? activeVoiceRoomId;
      if (!voiceRoomId) return;

      liveKitRoomRef.current?.disconnect();
      liveKitRoomRef.current = null;
      await widgetCommunicationApi.leaveVoiceRoom(voiceRoomId);
      setActiveVoiceRoomId(null);
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
    },
    [activeVoiceRoomId, isTauri],
  );

  // 바(인라인 Bubli 메뉴)와 (deprecated) 메뉴 창에서 서버 사용 롤업(usage-summaries/today)을
  // 읽어 한 줄 요약으로 보여준다.
  useEffect(() => {
    if (!widgetSessionReady || !isWidgetChrome) return;

    let cancelled = false;

    void widgetApi
      .getTodayUsageRollups()
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

    return () => {
      cancelled = true;
    };
  }, [isWidgetChrome, t, widgetSessionReady]);

  // (deprecated) 메뉴 창: 과거 바 Bubli 버튼이 보내던 패널 열기 요청을 계속 수신한다.
  // Bubli 메뉴는 이제 바 창 인라인 morph 패널이라 이 이벤트를 emit하는 곳은 없지만,
  // ?bubble=menu 창을 수동으로 열면 기존 경로가 그대로 동작한다.
  useEffect(() => {
    if (!isTauri || !isMenuOrb) return;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void listenWidgetMenuPanelRequested(() => {
      setMenuPanelSignal((current) => current + 1);
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
  }, [isMenuOrb, isTauri]);

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
  const arrangeWidgetBubbles = useCallback(async () => {
    if (!isTauri) return;

    try {
      await tauriCommands.arrangeWidgetWindows();
    } catch {
      // Browser preview fallback.
    }
  }, [isTauri]);

  const toggleWidgetRoomContext = useCallback(async () => {
    if (!isTauri) return;

    try {
      if (selectedWidgetRoomId) {
        await tauriCommands.setWidgetRoomContext({ selectedRoomId: null });
        return;
      }

      const activeRoom = await tauriCommands.readActiveProjectRoom();
      if (!activeRoom?.roomId) return;
      await tauriCommands.setWidgetRoomContext({ selectedRoomId: activeRoom.roomId });
    } catch {
      // Browser preview fallback.
    }
  }, [isTauri, selectedWidgetRoomId]);

  if (!mounted || !widgetSessionReady) {
    return null;
  }

  if (isMenuOrb) {
    return (
      <DesktopWidgetMenuOrb
        hasRoomContext={Boolean(selectedWidgetRoomId)}
        onArrangeBubbles={() => void arrangeWidgetBubbles()}
        onOpenBubble={(bubbleType) => void restoreBubbleFromBar(bubbleType)}
        onOpenMainApp={() => void openMainApp()}
        onOpenSettings={() => void openMainApp("settings")}
        onQuit={() => void quitDesktopApp()}
        onToggleRoomContext={() => void toggleWidgetRoomContext()}
        panelOpenSignal={menuPanelSignal}
        usageSummary={menuUsageSummary}
      />
    );
  }

  if (isBubbleBar) {
    // Bubli 메뉴는 바 창 안 인라인 morph 패널이다(별도 메뉴 창 자동 실행 없음).
    return (
      <DesktopWidgetBubbleBar
        bubbleDataByType={displayBubbles}
        hasRoomContext={Boolean(selectedWidgetRoomId)}
        minimizedItems={barItems}
        notificationSignal={notificationSignal}
        onArrangeBubbles={() => void arrangeWidgetBubbles()}
        onOpenBubble={(bubbleType) => void restoreBubbleFromBar(bubbleType)}
        onOpenMainApp={() => void openMainApp()}
        onOpenSettings={() => void openMainApp("settings")}
        onQuit={() => void quitDesktopApp()}
        onRestoreBubble={(bubbleType) => void restoreBubbleFromBar(bubbleType)}
        onToggleRoomContext={() => void toggleWidgetRoomContext()}
        usageSummary={menuUsageSummary}
      />
    );
  }

  return (
    <DesktopWidgetBubble
      activeBubble={activeBubble}
      alwaysOnTop={alwaysOnTop}
      bubble={displayBubbles[activeBubble]}
      clickThrough={clickThrough}
      mode={mode}
      onClose={closeWindow}
      onItemStateChange={(item, state) => void handleItemStateChange(item, state)}
      onLeaveVoice={leaveWidgetVoice}
      onMarkChatRead={markWidgetChatRead}
      onModeChange={(nextMode) => void setWindowMode(nextMode)}
      onCreateMemo={createWidgetMemo}
      onCreateSchedule={createWidgetSchedule}
      onCreateTodo={createWidgetTodo}
      onDeleteMemo={deleteWidgetMemo}
      onEditMemo={editWidgetMemo}
      onOpenHandoff={openWidgetHandoff}
      onPauseTimer={pauseWidgetTimer}
      onPrimaryTimerAction={runPrimaryTimerAction}
      onRestore={() => void restoreCurrentWindow()}
      onAnalyzeResource={analyzeWidgetResource}
      onDownloadResource={downloadWidgetResource}
      onSendAgentCommand={sendWidgetAgentCommand}
      onSendChatMessage={sendWidgetChatMessage}
      onStartVoice={startWidgetVoice}
      onToggleAlwaysOnTop={() => void toggleAlwaysOnTop()}
      onToggleVoiceMic={toggleWidgetVoiceMic}
      presentation="tauri"
      windowId={windowId}
      windowVisible={windowVisible}
    />
  );
}

export default function DesktopWidgetSurfacePage() {
  return (
    <Suspense fallback={null}>
      <DesktopWidgetSurface />
    </Suspense>
  );
}
