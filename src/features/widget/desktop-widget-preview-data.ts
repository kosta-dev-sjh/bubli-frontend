import type { WidgetBubbleType } from "@/lib/tauri/commands";

export type WidgetBubbleAccent = "blue" | "lilac" | "pearl" | "rose";

export type WidgetPreviewItem = {
  checked?: boolean;
  /** 목록 라벨을 보조하는 본문 요약(바 hover 팝오버에서만 노출). */
  detail?: string;
  dismissOnOpen?: boolean;
  /** TODO 마감 칩 톤(지남/오늘/내일/이후) — status 문자열과 함께 계산돼 내려온다. */
  dueTone?: "later" | "overdue" | "today" | "tomorrow";
  handoffLabel?: string;
  handoffUrl?: string;
  id: string;
  kind?: "agent" | "friend" | "memo" | "message" | "resource" | "schedule" | "task" | "time" | "voice";
  label: string;
  memoBody?: string;
  pinned?: boolean;
  /** 개인 컨텍스트에서 룸 태스크 행에 붙는 룸 칩 라벨(룸 이름). */
  roomName?: string;
  /** TODO 그룹핑: 내 개인 TODO(personal) vs 나에게 할당된 룸 태스크(room). */
  sourceKind?: "personal" | "room";
  stateId?: string;
  status: string;
  timerDurationSeconds?: number | null;
  timerLastStartedAt?: string | null;
  timerStartedAt?: string | null;
};

export type WidgetPreviewBubble = {
  accent: WidgetBubbleAccent;
  actionLabel: string;
  chatRoomId?: string;
  compactLabel: string;
  id: WidgetBubbleType;
  inputPlaceholder?: string;
  label: string;
  lastMessageSequence?: number;
  metric: string;
  metricLabel: string;
  progressRatio?: number;
  notificationLabel: string;
  panelBody: string;
  panelLabel: string;
  participantLabels?: string[];
  roomId?: string | null;
  roomLabel: string;
  rows: WidgetPreviewItem[];
  voiceLabel?: string;
  voiceRoomId?: string;
  voiceParticipants?: string;
};

export type WidgetNotificationSignal = {
  compactLabel: string;
  metric: string;
  notificationLabel: string;
  rows: WidgetPreviewItem[];
};

// 표시 문자열은 MessageKey로 노출하고, 소비 컴포넌트에서 t()로 번역한다.
export const widgetModeSummaries = {
  DEFAULT: "widget.data.modeSummary.default",
  GHOST: "widget.data.modeSummary.ghost",
  MINIMIZED: "widget.data.modeSummary.minimized",
  TRANSLUCENT: "widget.data.modeSummary.translucent",
} as const;

const baseBubbles: Array<Pick<WidgetPreviewBubble, "accent" | "actionLabel" | "compactLabel" | "id" | "inputPlaceholder" | "label" | "metricLabel" | "panelLabel">> = [
  {
    accent: "blue",
    actionLabel: "widget.data.todo.action",
    compactLabel: "widget.data.todo.compact",
    id: "todo",
    inputPlaceholder: "widget.data.todo.inputPlaceholder",
    label: "widget.data.todo.label",
    metricLabel: "widget.data.todo.metricLabel",
    panelLabel: "widget.data.todo.panelLabel",
  },
  {
    accent: "blue",
    actionLabel: "widget.data.schedule.action",
    compactLabel: "widget.data.schedule.compact",
    id: "schedule",
    inputPlaceholder: "widget.schedule.prompt",
    label: "widget.data.schedule.label",
    metricLabel: "widget.data.schedule.metricLabel",
    panelLabel: "widget.data.schedule.panelLabel",
  },
  {
    accent: "pearl",
    actionLabel: "widget.data.timer.action",
    compactLabel: "widget.data.timer.compact",
    id: "timer",
    label: "widget.data.timer.label",
    metricLabel: "widget.data.timer.metricLabel",
    panelLabel: "widget.data.timer.panelLabel",
  },
  {
    accent: "lilac",
    actionLabel: "widget.data.resource.action",
    compactLabel: "widget.data.resource.compact",
    id: "resource",
    label: "widget.data.resource.label",
    metricLabel: "widget.data.resource.metricLabel",
    panelLabel: "widget.data.resource.panelLabel",
  },
  {
    accent: "pearl",
    actionLabel: "widget.data.memo.action",
    compactLabel: "widget.data.memo.compact",
    id: "memo",
    inputPlaceholder: "widget.data.memo.inputPlaceholder",
    label: "widget.data.memo.label",
    metricLabel: "widget.data.memo.metricLabel",
    panelLabel: "widget.data.memo.panelLabel",
  },
  {
    accent: "rose",
    actionLabel: "widget.data.chat.action",
    compactLabel: "widget.data.chat.compact",
    id: "chat",
    inputPlaceholder: "widget.data.chat.inputPlaceholder",
    label: "widget.data.chat.label",
    metricLabel: "widget.data.chat.metricLabel",
    panelLabel: "widget.data.chat.panelLabel",
  },
  {
    accent: "lilac",
    actionLabel: "widget.data.agent.action",
    compactLabel: "widget.data.agent.compact",
    id: "agent",
    inputPlaceholder: "widget.data.agent.inputPlaceholder",
    label: "widget.data.agent.label",
    metricLabel: "widget.data.agent.metricLabel",
    panelLabel: "widget.data.agent.panelLabel",
  },
  {
    accent: "blue",
    actionLabel: "widget.data.alert.action",
    compactLabel: "widget.data.alert.compact",
    id: "alert",
    label: "widget.data.alert.label",
    metricLabel: "widget.data.alert.metricLabel",
    panelLabel: "widget.data.alert.panelLabel",
  },
];

export const widgetPreviewBubbles: WidgetPreviewBubble[] = baseBubbles.map((bubble) => ({
  ...bubble,
  metric: "0",
  notificationLabel: "widget.data.emptyItems",
  panelBody: "widget.data.emptyBody",
  roomLabel: "widget.data.roomFallback",
  rows: [],
}));

export function getWidgetPreviewBubble(id: WidgetBubbleType): WidgetPreviewBubble {
  return widgetPreviewBubbles.find((bubble) => bubble.id === id) ?? widgetPreviewBubbles[0];
}

export const widgetNotificationSignal: WidgetNotificationSignal = {
  compactLabel: "widget.data.notification.compact",
  metric: "0",
  notificationLabel: "widget.data.notification.empty",
  rows: [],
};
