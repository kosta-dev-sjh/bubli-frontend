import type { WidgetChatRoomResponse, WidgetFriendResponse } from "@/features/widget/api/widgetDisplayApi";
import type { WidgetBubbleType } from "@/lib/tauri/commands";
import type { FriendRequestApiResponse } from "@/types/api/friend";

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
  kind?: "agent" | "document" | "friend" | "memo" | "message" | "resource" | "schedule" | "task" | "time" | "voice";
  label: string;
  memoBody?: string;
  pinned?: boolean;
  reviewable?: boolean;
  /** 개인 컨텍스트에서 룸 태스크 행에 붙는 룸 칩 라벨(룸 이름). */
  roomName?: string;
  /** TODO 그룹핑: 내 개인 TODO(personal) vs 나에게 할당된 룸 태스크(room). */
  sourceKind?: "personal" | "room";
  /** 일정 원본 시각(ISO) — 위젯 캘린더(월/주/WBS 뷰)가 날짜 배치를 계산하는 단일 출처. */
  startsAt?: string;
  /** 일정 종료 시각(ISO). 없으면 시작과 동일(하루 이벤트)로 간주한다. */
  endsAt?: string | null;
  /** 종일 일정 여부 — 캘린더 셀/바에서 시간 대신 "종일"로 표기한다. */
  allDay?: boolean;
  /** 프로젝트룸 탭 칸반 상태칩(할 일/진행 중/검토/완료/보류). 내 할 일 탭에서는 미사용. */
  kanbanTone?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
  kanbanLabel?: string;
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
  /** 소통 버블 전용: 1:1/그룹 ↔ 프로젝트룸 모드, 1:1/그룹 목록·선택 상태·친구 요청. */
  chatScope?: "direct" | "room";
  currentUserId?: string | null;
  myBubliId?: string | null;
  peerRooms?: WidgetChatRoomResponse[];
  selectedPeerChatRoomId?: string | null;
  friendRequests?: FriendRequestApiResponse[];
  friends?: WidgetFriendResponse[];
  /** 현재 채팅방이 1:1(DIRECT)인지 — 보이스 종료 시 "나가기"가 아니라 항상 "종료"해야 하는지 판단용. */
  isDirectChat?: boolean;
  /** 현재 활성 프로젝트룸이 있는지 — 프로젝트룸 모드 빈 상태 판단용. */
  hasProjectRoomScope?: boolean;
  compactLabel: string;
  id: WidgetBubbleType;
  inputPlaceholder?: string;
  label: string;
  lastMessageSequence?: number;
  metric: string;
  metricLabel: string;
  progressRatio?: number;
  notificationLabel: string;
  /** TODO 버블 2탭 데이터: 내 할 일 / 프로젝트룸(선택 룸 보드). rows는 고스트·바 표시용(내 할 일)과 동일. */
  todoView?: {
    hasRoom: boolean;
    mine: WidgetPreviewItem[];
    room: WidgetPreviewItem[];
    roomName?: string;
  };
  panelBody: string;
  panelLabel: string;
  participantLabels?: string[];
  /** 룸 컨텍스트에서도 누락되지 않게 분리해서 보여주는 개인 승인 전 후보. */
  personalCandidateRows?: WidgetPreviewItem[];
  /** 룸 컨텍스트에서도 위젯 내부 토글로 볼 수 있는 개인 범위 행. */
  personalRows?: WidgetPreviewItem[];
  /** 룸 컨텍스트에서 위젯 내부 토글로 볼 수 있는 프로젝트룸 범위 행. */
  roomRows?: WidgetPreviewItem[];
  roomId?: string | null;
  roomLabel: string;
  /** AI 에이전트 탭 안에 흡수된 초안 생성 목록. resource 버블은 별도 노출하지 않는다. */
  resourceRows?: WidgetPreviewItem[];
  /** AI 에이전트 초안 생성 탭의 개인 범위 초안. */
  personalResourceRows?: WidgetPreviewItem[];
  rows: WidgetPreviewItem[];
  voiceLabel?: string;
  voiceRoomId?: string;
  voiceParticipants?: string;
  /** 말하는 중 애니메이션(웹과 동일)을 그리기 위한 참여자별 원본 데이터. */
  voiceParticipantList?: { userId: string; userName: string }[];
  /** 스레드 화면의 전체 대화 스크롤용(rows의 최근 3개짜리 미리보기와 별개). */
  messageThread?: { createdAt: string; id: string; mine: boolean; senderName: string; text: string }[];
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
