import type { WidgetBubbleType } from "@/lib/tauri/commands";

export type WidgetBubbleAccent = "blue" | "lilac" | "pearl" | "rose";

export type WidgetPreviewItem = {
  checked?: boolean;
  dismissOnOpen?: boolean;
  handoffLabel?: string;
  handoffUrl?: string;
  id: string;
  kind?: "agent" | "friend" | "message" | "resource" | "schedule" | "task" | "time" | "voice";
  label: string;
  stateId?: string;
  status: string;
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
  notificationLabel: string;
  panelBody: string;
  panelLabel: string;
  participantLabels?: string[];
  reactionLabels?: string[];
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

export const widgetModeSummaries = {
  DEFAULT: "정보가 또렷하게 보이는 기본 상태",
  GHOST: "내용은 유지하고 채움과 강조를 낮춰 클릭을 통과시키는 상태",
  MINIMIZED: "작은 오브로 접어 알림과 현재 버블만 남기는 상태",
  TRANSLUCENT: "작업 화면을 덜 가리도록 대비와 채움을 낮춘 상태",
} as const;

const baseBubbles: Array<Pick<WidgetPreviewBubble, "accent" | "actionLabel" | "compactLabel" | "id" | "inputPlaceholder" | "label" | "metricLabel" | "panelLabel">> = [
  {
    accent: "blue",
    actionLabel: "TODO 추가",
    compactLabel: "TODO",
    id: "todo",
    label: "오늘 할 일",
    metricLabel: "오늘 기준",
    panelLabel: "오늘 우선순위",
  },
  {
    accent: "blue",
    actionLabel: "일정 열기",
    compactLabel: "일정",
    id: "schedule",
    label: "일정",
    metricLabel: "다음 일정",
    panelLabel: "다음 일정",
  },
  {
    accent: "pearl",
    actionLabel: "기록 저장",
    compactLabel: "타이머",
    id: "timer",
    label: "타이머",
    metricLabel: "진행 중",
    panelLabel: "작업 중",
  },
  {
    accent: "lilac",
    actionLabel: "자료 확인",
    compactLabel: "자료",
    id: "resource",
    label: "자료 제안",
    metricLabel: "확인 후보",
    panelLabel: "자료 후보",
  },
  {
    accent: "pearl",
    actionLabel: "메모 남기기",
    compactLabel: "메모",
    id: "memo",
    inputPlaceholder: "작업 중 메모",
    label: "메모",
    metricLabel: "작성 중",
    panelLabel: "개인 메모",
  },
  {
    accent: "rose",
    actionLabel: "소통 열기",
    compactLabel: "소통",
    id: "chat",
    inputPlaceholder: "메시지 초안",
    label: "소통",
    metricLabel: "확인할 흐름",
    panelLabel: "소통",
  },
  {
    accent: "lilac",
    actionLabel: "후보 검토",
    compactLabel: "후보",
    id: "agent",
    inputPlaceholder: "확인 질문 초안",
    label: "후보 정리",
    metricLabel: "승인 대기",
    panelLabel: "승인 전 후보",
  },
  {
    accent: "blue",
    actionLabel: "알림 확인",
    compactLabel: "알림",
    id: "alert",
    label: "알림",
    metricLabel: "읽지 않음",
    panelLabel: "확인할 알림",
  },
];

export const widgetPreviewBubbles: WidgetPreviewBubble[] = baseBubbles.map((bubble) => ({
  ...bubble,
  metric: "0",
  notificationLabel: "새 항목 없음",
  panelBody: "연결된 항목이 있으면 여기에 표시됩니다.",
  reactionLabels: bubble.id === "chat" ? ["확인", "좋아요", "잠시 후"] : undefined,
  roomLabel: "프로젝트룸",
  rows: [],
}));

export function getWidgetPreviewBubble(id: WidgetBubbleType): WidgetPreviewBubble {
  return widgetPreviewBubbles.find((bubble) => bubble.id === id) ?? widgetPreviewBubbles[0];
}

export const widgetNotificationSignal: WidgetNotificationSignal = {
  compactLabel: "알림",
  metric: "0",
  notificationLabel: "새 알림 없음",
  rows: [],
};
