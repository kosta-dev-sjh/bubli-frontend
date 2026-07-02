"use client";

import { Room } from "livekit-client";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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
import { widgetApi, type BackendWidgetBubbleType, type WidgetBubbleSettingResponse, type WidgetContextResponse } from "@/features/widget/api/widgetApi";
import { widgetCommunicationApi } from "@/features/widget/api/widgetCommunicationApi";
import { DesktopWidgetBubble, DesktopWidgetBubbleBar, DesktopWidgetMenuOrb, desktopWidgetBubbleTypes } from "@/features/widget/components/desktop-widget-bubble";
import {
  getWidgetPreviewBubble,
  widgetNotificationSignal,
  type WidgetNotificationSignal,
  type WidgetPreviewBubble,
  type WidgetPreviewItem,
} from "@/features/widget/desktop-widget-preview-data";
import { timerApi } from "@/features/timer/api/timerApi";
import { getStoredAuthSession, restoreStoredAuthSessionFromTauri } from "@/lib/auth/auth-session";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";
import { listenWidgetRoomContextChanged } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { readWidgetSummary } from "@/lib/widget";
import type { TimeLogResponse } from "@/types/api/timer";
import type { WidgetBubbleType as ApiWidgetBubbleType } from "@/types/api/widget";

const apiBubbleTypeMap: Partial<Record<WidgetBubbleType, BackendWidgetBubbleType>> = {
  agent: "AGENT",
  chat: "CHAT",
  memo: "MEMO",
  schedule: "SCHEDULE",
  timer: "TIMER",
  todo: "TODO",
};

const apiItemBubbleTypeMap: Record<WidgetBubbleType, ApiWidgetBubbleType> = {
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

function getRequestedBubble(value: string | null): WidgetBubbleType {
  return desktopWidgetBubbleTypes.includes(value as WidgetBubbleType) ? (value as WidgetBubbleType) : "todo";
}

function isDesktopWidgetBubble(value: string): value is WidgetBubbleType {
  return desktopWidgetBubbleTypes.includes(value as WidgetBubbleType);
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

function getWidgetWindowSize(bubbleType: WidgetBubbleType, mode: WidgetWindowMode) {
  if (mode === "MINIMIZED") return { height: 62, width: 218 };
  if (bubbleType === "timer") return { height: 500, width: 344 };
  return { height: 500, width: 344 };
}

function formatShortTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", hour12: false, minute: "2-digit" }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDue(value?: string | null) {
  if (!value) return "";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "";
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diff = Math.round((target - start) / dayMs);
  if (diff === 0) return formatShortTime(value) || "오늘";
  if (diff === 1) return "내일";
  if (diff > 1) return `D-${diff}`;
  return "지난 일정";
}

function taskStatusLabel(status: WidgetTaskResponse["status"]) {
  const labels: Record<WidgetTaskResponse["status"], string> = {
    BLOCKED: "막힘",
    DONE: "완료",
    IN_PROGRESS: "진행",
    REVIEW: "검토",
    TODO: "대기",
  };
  return labels[status];
}

function resourceStatusLabel(status: WidgetResourceResponse["status"]) {
  const labels: Record<WidgetResourceResponse["status"], string> = {
    ANALYZED: "분석됨",
    ANALYZING: "분석 중",
    FAILED: "실패",
    READY: "준비됨",
    UPLOADING: "업로드",
  };
  return labels[status];
}

function memoTitle(memo: WidgetMemoResponse) {
  const firstLine = memo.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "빈 메모";
  return firstLine.length > 36 ? `${firstLine.slice(0, 36)}...` : firstLine;
}

function suggestionStatusLabel(status: WidgetAgentSuggestionResponse["status"]) {
  const labels: Record<WidgetAgentSuggestionResponse["status"], string> = {
    APPROVED: "승인됨",
    DRAFT: "대기",
    HELD: "보류",
    REJECTED: "제외",
  };
  return labels[status];
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

function timerStatusLabel(status: NonNullable<TimerDisplay>["status"]) {
  const labels: Record<NonNullable<TimerDisplay>["status"], string> = {
    ENDED: "종료",
    NEEDS_RECOVERY: "복구 필요",
    PAUSED: "일시정지",
    RUNNING: "실행 중",
  };
  return labels[status] ?? status;
}

function timerActionLabel(timer?: TimerDisplay) {
  if (!timer) return "시작";
  if (timer.status === "PAUSED") return "재개";
  if (timer.status === "RUNNING") return "종료";
  return "시작";
}

function roomLabel(room?: WidgetProjectRoomResponse | null, fallbackRoomId?: string | null) {
  if (room?.name) return room.name;
  return fallbackRoomId ? "선택한 프로젝트룸" : "개인 작업";
}

function withBubble(id: WidgetBubbleType, patch: Partial<WidgetPreviewBubble>): WidgetPreviewBubble {
  return {
    ...getWidgetPreviewBubble(id),
    ...patch,
    id,
    rows: patch.rows ?? [],
  };
}

function buildNotificationSignal(notifications: WidgetNotificationResponse[]): WidgetNotificationSignal {
  const unread = notifications.filter((item) => item.status === "UNREAD");
  return {
    compactLabel: `알림 ${unread.length}`,
    metric: String(unread.length),
    notificationLabel: unread.length > 0 ? `새 알림 ${unread.length}` : "새 알림 없음",
    rows: unread.slice(0, 3).map((item) => ({
      id: item.id,
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
}): Partial<Record<WidgetBubbleType, WidgetPreviewBubble>> {
  const label = roomLabel(input.room, input.roomId);
  const activeTimer = input.timer ?? input.dashboard?.runningTimer ?? null;
  const todoItems = (input.dashboard?.todayTasks.length ? input.dashboard.todayTasks : input.tasks).slice(0, 3);
  const scheduleItems = (input.dashboard?.todaySchedules.length ? input.dashboard.todaySchedules : input.schedules).slice(0, 3);
  const memoItems = input.memos.filter((item) => item.status === "ACTIVE").slice(0, 3);
  const fileItems = input.resources.filter((item) => item.kind !== "MEMO").slice(0, 3);
  const agentItems = input.suggestions.slice(0, 3);
  const unreadNotifications = input.notifications.filter((item) => item.status === "UNREAD").slice(0, 3);
  const unreadCount = input.notifications.filter((item) => item.status === "UNREAD").length;
  const voiceParticipants = input.voiceRoom?.participants.filter((item) => item.status === "JOINED") ?? [];

  return {
    agent: withBubble("agent", {
      compactLabel: `후보 ${agentItems.length}`,
      metric: String(agentItems.length),
      notificationLabel: agentItems.length > 0 ? "승인 대기 후보" : "대기 후보 없음",
      panelBody: agentItems.length > 0 ? "승인 전 후보만 표시합니다." : "대기 중인 후보가 없습니다.",
      roomLabel: label,
      rows: agentItems.map((item) => ({
        id: item.suggestionId,
        kind: "agent",
        label: suggestionTitle(item),
        status: suggestionStatusLabel(item.status),
      })),
    }),
    alert: withBubble("alert", {
      actionLabel: "알림 확인",
      compactLabel: `알림 ${unreadCount}`,
      metric: String(unreadCount),
      metricLabel: "읽지 않음",
      notificationLabel: unreadCount > 0 ? `새 알림 ${unreadCount}` : "새 알림 없음",
      panelBody: unreadCount > 0 ? "확인이 필요한 알림만 모읍니다." : "지금 확인할 알림이 없습니다.",
      panelLabel: "알림",
      roomLabel: label,
      rows: unreadNotifications.map((item) => ({
        id: item.id,
        kind: item.sourceType === "MESSAGE" ? "message" : item.sourceType === "RESOURCE" ? "resource" : "agent",
        label: item.title,
        status: item.sourceType,
      })),
    }),
    chat: withBubble("chat", {
      chatRoomId: input.chatRoom?.id,
      compactLabel: `소통 ${input.messages.length + voiceParticipants.length}`,
      lastMessageSequence: input.messages.reduce((max, item) => Math.max(max, item.roomSequence), 0),
      metric: String(input.messages.length),
      notificationLabel: unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}` : "새 소통 없음",
      panelBody: "친구, 메시지, 보이스 상태를 함께 표시합니다.",
      panelLabel: `소통 · ${label}`,
      participantLabels: input.friends.slice(0, 3).map((item) => item.name),
      roomId: input.roomId,
      roomLabel: label,
      voiceLabel: input.voiceConnectionLabel ?? (input.voiceRoom?.status === "OPEN" ? "보이스 진행 중" : "보이스 대기"),
      voiceParticipants: voiceParticipants.map((item) => item.userName).filter(Boolean).join(" · ") || "참여자 없음",
      voiceRoomId: input.voiceRoom?.id,
      rows: [
        ...input.friends.slice(0, 1).map((item) => ({
          id: item.userId ?? item.friendUserId ?? item.bubliId,
          kind: "friend" as const,
          label: item.name,
          status: "친구",
        })),
        ...(input.voiceRoom
          ? [
              {
                id: input.voiceRoom.id,
                kind: "voice" as const,
                label: input.voiceRoom.status === "OPEN" ? "보이스 진행 중" : "보이스 종료",
                status: `${voiceParticipants.length}명`,
              },
            ]
          : []),
        ...input.messages.slice(0, 3).map((item) => ({
          dismissOnOpen: false,
          id: item.id,
          kind: "message" as const,
          label: `${item.sender.name}: ${messageText(item)}`,
          status: formatShortTime(item.createdAt),
        })),
      ],
    }),
    memo: withBubble("memo", {
      compactLabel: `메모 ${memoItems.length}`,
      metric: String(memoItems.length),
      notificationLabel: memoItems.length > 0 ? "저장된 메모" : "저장된 메모 없음",
      panelBody: input.roomId ? "프로젝트룸 메모를 표시합니다." : "개인 메모를 표시합니다.",
      roomId: input.roomId,
      roomLabel: label,
      rows: memoItems.map((item) => ({
        id: item.id,
        kind: "memo",
        label: memoTitle(item),
        status: formatShortTime(item.updatedAt),
      })),
    }),
    resource: withBubble("resource", {
      compactLabel: `자료 ${fileItems.length}`,
      metric: String(fileItems.length),
      notificationLabel: fileItems.length > 0 ? "확인할 자료" : "확인할 자료 없음",
      panelBody: fileItems.length > 0 ? "프로젝트룸 자료를 표시합니다." : "표시할 자료가 없습니다.",
      roomLabel: label,
      rows: fileItems.map((item) => ({
        id: item.id,
        kind: "resource",
        label: item.title,
        status: resourceStatusLabel(item.status),
      })),
    }),
    schedule: withBubble("schedule", {
      compactLabel: `일정 ${scheduleItems.length}`,
      metric: scheduleItems[0] ? formatShortTime(scheduleItems[0].startsAt) : "0",
      notificationLabel: scheduleItems[0]?.title ?? "오늘 일정 없음",
      panelBody: "오늘 일정과 다가오는 일정을 표시합니다.",
      roomLabel: label,
      rows: scheduleItems.map((item) => ({
        id: item.id,
        kind: "schedule",
        label: item.title,
        status: formatShortTime(item.startsAt),
      })),
    }),
    timer: withBubble("timer", {
      actionLabel: timerActionLabel(activeTimer),
      compactLabel: `타이머 ${elapsedTimerLabel(activeTimer ?? undefined)}`,
      metric: elapsedTimerLabel(activeTimer ?? undefined),
      metricLabel: activeTimer ? timerStatusLabel(activeTimer.status) : "대기",
      notificationLabel: activeTimer ? "작업 시간 기록 중" : "진행 중인 타이머 없음",
      panelBody: "time_logs API의 타이머 상태를 표시합니다.",
      roomId: input.roomId,
      roomLabel: label,
      rows: activeTimer
        ? [
            {
              id: activeTimer.id,
              kind: "time",
              label: activeTimer.timerType === "WORK" ? "작업 타이머" : "일반 타이머",
              status: activeTimer.status,
            },
          ]
        : [],
    }),
    todo: withBubble("todo", {
      compactLabel: `TODO ${todoItems.length}`,
      metric: String(todoItems.length),
      notificationLabel: todoItems[0] ? todoItems[0].title : "오늘 할 일 없음",
      panelBody: "오늘 할 일과 다가오는 작업을 표시합니다.",
      roomLabel: label,
      rows: todoItems.map((item) => ({
        checked: item.status === "DONE",
        id: item.id,
        kind: "task",
        label: item.title,
        status: formatDue(item.dueAt) || taskStatusLabel(item.status),
      })),
    }),
  };
}

function DesktopWidgetSurface() {
  const isTauri = isTauriRuntime();
  const searchParams = useSearchParams();
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
  const [displayBubbles, setDisplayBubbles] = useState<Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>>({});
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(process.env.NEXT_PUBLIC_BUBLI_WIDGET_DEV_VOICE_ROOM_ID ?? null);
  const [communicationRevision, setCommunicationRevision] = useState(0);
  const [memoRevision, setMemoRevision] = useState(0);
  const [timerRevision, setTimerRevision] = useState(0);
  const [timerSnapshot, setTimerSnapshot] = useState<TimeLogResponse | null>(null);
  const [activeTimerHeartbeatId, setActiveTimerHeartbeatId] = useState<string | null>(null);
  const [voiceConnectionLabel, setVoiceConnectionLabel] = useState<string | null>(null);
  const [voiceMicMuted, setVoiceMicMuted] = useState(false);
  const [notificationSignal, setNotificationSignal] = useState<WidgetNotificationSignal>(widgetNotificationSignal);
  const liveKitRoomRef = useRef<Room | null>(null);
  const selectedWidgetRoomId = widgetContext?.selectedRoomId ?? requestedRoomId ?? null;
  const widgetSessionReady = !isTauri || (authReady && hasAuthSession);

  useEffect(() => {
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previous = {
      bodyBackground: bodyStyle.background,
      bodyMargin: bodyStyle.margin,
      bodyMinHeight: bodyStyle.minHeight,
      bodyOverflow: bodyStyle.overflow,
      bodyWidth: bodyStyle.width,
      htmlBackground: htmlStyle.background,
      htmlMargin: htmlStyle.margin,
      htmlMinHeight: htmlStyle.minHeight,
      htmlOverflow: htmlStyle.overflow,
      htmlWidth: htmlStyle.width,
    };

    document.documentElement.dataset.bubliSurface = "desktop-widget";
    document.body.dataset.bubliSurface = "desktop-widget";
    htmlStyle.background = "transparent";
    htmlStyle.margin = "0";
    htmlStyle.minHeight = "0";
    htmlStyle.overflow = "hidden";
    htmlStyle.width = "fit-content";
    bodyStyle.background = "transparent";
    bodyStyle.margin = "0";
    bodyStyle.minHeight = "0";
    bodyStyle.overflow = "hidden";
    bodyStyle.width = "fit-content";

    return () => {
      delete document.documentElement.dataset.bubliSurface;
      delete document.body.dataset.bubliSurface;
      htmlStyle.background = previous.htmlBackground;
      htmlStyle.margin = previous.htmlMargin;
      htmlStyle.minHeight = previous.htmlMinHeight;
      htmlStyle.overflow = previous.htmlOverflow;
      htmlStyle.width = previous.htmlWidth;
      bodyStyle.background = previous.bodyBackground;
      bodyStyle.margin = previous.bodyMargin;
      bodyStyle.minHeight = previous.bodyMinHeight;
      bodyStyle.overflow = previous.bodyOverflow;
      bodyStyle.width = previous.bodyWidth;
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    async function restoreWidgetAuthSession() {
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      if (cancelled) return;
      setHasAuthSession(Boolean(session));
      setAuthReady(true);
    }

    void restoreWidgetAuthSession();

    return () => {
      cancelled = true;
    };
  }, [isTauri]);

  useEffect(() => {
    if (!isTauri || !authReady || hasAuthSession) return;

    void tauriCommands.closeWidgetWindow({ bubbleType: currentWindowBubble, windowId }).catch(() => undefined);
  }, [authReady, currentWindowBubble, hasAuthSession, isTauri, windowId]);

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
        const summaryResult = await readWidgetSummary();
        const summary = summaryResult.status === "ready" ? summaryResult.data : null;
        if (cancelled) return;
        if (!summary) return;

        const settings = summary.bubbles ?? [];
        setWidgetContext((current) => {
          if (summary.context.selectedRoomId || !requestedRoomId) return summary.context;
          return current ?? { mode: "ROOM", selectedRoomId: requestedRoomId };
        });
        setServerSettings(settings);

        const backendBubbleType = apiBubbleTypeMap[requestedBubble];
        const activeSetting = backendBubbleType ? settings.find((item) => item.bubbleType === backendBubbleType) : undefined;
        const serverMode = getModeFromSetting(activeSetting);
        if (serverMode && requestedMode === "DEFAULT") {
          setMode(serverMode);
          setClickThrough(serverMode === "GHOST");
          setWindowVisible(serverMode !== "MINIMIZED");
        }

        if (activeSetting?.id) {
          const now = new Date();
          const summaryDate = now.toISOString().slice(0, 10);
          void widgetApi.saveUsageSummary({
            bubbleSettingId: activeSetting.id,
            deviceId: windowId ?? "tauri-local",
            interactionCount: 0,
            openCount: 1,
            rollupKey: `${windowId ?? "tauri-local"}:${activeSetting.id}:${summaryDate}`,
            summaryDate,
            syncedAt: now.toISOString(),
            visibleSeconds: 1,
          }).catch(() => undefined);
        }
      } catch {
        // 인증 전이거나 서버가 없으면 기본 버블 데이터로 유지한다.
      }
    }

    void loadWidgetApiState();

    return () => {
      cancelled = true;
    };
  }, [isWidgetChrome, requestedBubble, requestedMode, requestedRoomId, widgetSessionReady, windowId]);

  useEffect(() => {
    if (!isTauri || isWidgetChrome) return;

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
  }, [isTauri, isWidgetChrome]);

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
      const summaryResult = await readWidgetSummary().catch(() => null);
      const summary = summaryResult?.status === "ready" ? summaryResult.data : null;
      if (cancelled || !summary?.context) return;

      setWidgetContext((current) => {
        if (
          current?.mode === summary.context.mode &&
          current?.selectedRoomId === summary.context.selectedRoomId
        ) {
          return current;
        }
        if (summary.context.selectedRoomId || !requestedRoomId) return summary.context;
        return current ?? { mode: "ROOM", selectedRoomId: requestedRoomId };
      });
      setServerSettings(summary.bubbles ?? []);
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
      if (!selectedRoomId) {
        const summaryResult = await readWidgetSummary().catch(() => null);
        const summary = summaryResult?.status === "ready" ? summaryResult.data : null;
        if (summary?.context) {
          selectedRoomId = summary.context.selectedRoomId ?? requestedRoomId ?? null;
          if (!cancelled) {
            setWidgetContext((current) => {
              if (summary.context.selectedRoomId || !requestedRoomId) return summary.context;
              return current ?? { mode: "ROOM", selectedRoomId: requestedRoomId };
            });
            setServerSettings(summary.bubbles ?? []);
          }
        }
      }

      const voiceRoomId = activeVoiceRoomId;
      const [dashboardResult, tasksResult, schedulesResult, resourcesResult, memosResult, suggestionsResult, notificationsResult, chatRoomsResult, friendsResult, roomResult, voiceResult] =
        await Promise.allSettled([
          widgetDisplayApi.getDashboardWork(),
          widgetDisplayApi.listDashboardTasks(6),
          widgetDisplayApi.listSchedules(selectedRoomId, 6),
          widgetDisplayApi.listResources(selectedRoomId, 6),
          widgetDisplayApi.listMemos(selectedRoomId, 6),
          widgetDisplayApi.listAgentSuggestions(selectedRoomId),
          widgetDisplayApi.listNotifications(6),
          widgetDisplayApi.listChatRooms(6),
          widgetDisplayApi.listFriends(),
          selectedRoomId ? widgetDisplayApi.getProjectRoom(selectedRoomId) : Promise.resolve(null),
          voiceRoomId ? widgetDisplayApi.getVoiceRoom(voiceRoomId) : Promise.resolve(null),
        ]);

      if (cancelled) return;

      const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value.items : [];
      const rooms = chatRoomsResult.status === "fulfilled" ? chatRoomsResult.value.items : [];
      const activeRoom = rooms.find((item) => (selectedRoomId ? item.roomId === selectedRoomId : true));
      const messages = activeRoom ? await widgetDisplayApi.listChatMessages(activeRoom.id, 6).catch(() => null) : null;
      const cachedMessages =
        isTauri && activeRoom && !messages
          ? await tauriCommands
              .readRoomMessages({ limit: 6, roomId: activeRoom.id })
              .then((result) => parseCachedWidgetChatMessages(result.items))
              .catch(() => [])
          : [];

      if (cancelled) return;

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

      setNotificationSignal(buildNotificationSignal(notifications));
      const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
      const activeTimer = timerSnapshot?.status === "PAUSED" ? timerSnapshot : (dashboard?.runningTimer ?? timerSnapshot);
      const messageItems = messages?.items ?? cachedMessages;
      setActiveTimerHeartbeatId(activeTimer?.status === "RUNNING" ? activeTimer.id : null);

      setDisplayBubbles(
        buildDisplayBubbles({
          chatRoom: activeRoom ?? null,
          dashboard,
          friends: friendsResult.status === "fulfilled" ? friendsResult.value : [],
          memos: memosResult.status === "fulfilled" ? memosResult.value.items : [],
          messages: messageItems,
          notifications,
          resources: resourcesResult.status === "fulfilled" ? resourcesResult.value.items : [],
          room: roomResult.status === "fulfilled" ? roomResult.value : null,
          roomId: selectedRoomId,
          schedules: schedulesResult.status === "fulfilled" ? schedulesResult.value.items : [],
          suggestions: suggestionsResult.status === "fulfilled" ? suggestionsResult.value : [],
          tasks: tasksResult.status === "fulfilled" ? tasksResult.value.items : [],
          timer: activeTimer,
          voiceConnectionLabel,
          voiceRoom: voiceResult.status === "fulfilled" ? voiceResult.value : null,
        }),
      );
    }

    void loadDisplayApiState().catch(() => {
      if (!cancelled) {
        setDisplayBubbles({});
        setNotificationSignal(widgetNotificationSignal);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeVoiceRoomId, communicationRevision, isMenuOrb, isTauri, memoRevision, requestedRoomId, timerRevision, timerSnapshot, voiceConnectionLabel, widgetContext?.selectedRoomId, widgetSessionReady]);

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
        if (!cancelled) setBarItems(items.filter((item) => isDesktopWidgetBubble(item.activeBubble)));
      } catch {
        if (!cancelled) setBarItems([]);
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
                  x: state.position.x,
                  y: state.position.y,
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
                x: state.position.x,
                y: state.position.y,
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
                x: state.position.x,
                y: state.position.y,
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
    async (bubbleType: WidgetBubbleType, restoredWindowId?: string) => {
      if (!isTauri) return;

      try {
        await tauriCommands.openWidgetWindow({
          bubbleType,
          mode: "DEFAULT",
          selectedRoomId: selectedWidgetRoomId,
          windowId: restoredWindowId ?? bubbleType,
        });
        const items = await tauriCommands.getWidgetBarItems();
        setBarItems(items.filter((item) => isDesktopWidgetBubble(item.activeBubble)));
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri, selectedWidgetRoomId],
  );

  const handleItemStateChange = useCallback(
    async (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => {
      const itemType =
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

      if (item.stateId) {
        void widgetApi
          .updateItemState(item.stateId, {
            bubbleType: apiItemBubbleTypeMap[activeBubble],
            itemId: item.id,
            itemType,
            state,
          })
          .catch(() => undefined);
      }
    },
    [activeBubble, isTauri],
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
    async (bubble: WidgetPreviewBubble) => {
      const body = window.prompt("메모 내용을 입력하세요.")?.trim();
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
    [isTauri, widgetContext?.selectedRoomId],
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

  const openBubbleBar = useCallback(async () => {
    if (!isTauri) return;

    try {
      await tauriCommands.openWidgetWindow({
        bubbleType: "bar",
        mode: "DEFAULT",
        selectedRoomId: selectedWidgetRoomId,
        windowId: "bar",
      });
    } catch {
      // Browser preview fallback.
    }
  }, [isTauri, selectedWidgetRoomId]);

  if (!widgetSessionReady) {
    return null;
  }

  if (isMenuOrb) {
    return <DesktopWidgetMenuOrb onOpenMenu={() => void openBubbleBar()} />;
  }

  if (isBubbleBar) {
    return (
      <DesktopWidgetBubbleBar
        bubbleDataByType={displayBubbles}
        minimizedItems={barItems}
        notificationSignal={notificationSignal}
        onRestoreBubble={(bubbleType, restoredWindowId) => void restoreBubbleFromBar(bubbleType, restoredWindowId)}
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
      onPauseTimer={pauseWidgetTimer}
      onPrimaryTimerAction={runPrimaryTimerAction}
      onRestore={() => void restoreCurrentWindow()}
      onSendChatMessage={sendWidgetChatMessage}
      onStartVoice={startWidgetVoice}
      onToggleAlwaysOnTop={() => void toggleAlwaysOnTop()}
      onToggleVoiceMic={toggleWidgetVoiceMic}
      presentation="tauri"
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
