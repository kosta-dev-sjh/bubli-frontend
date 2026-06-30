import type { WidgetBubbleType } from "@/lib/tauri/commands";

export type WidgetBubbleAccent = "blue" | "lilac" | "pearl" | "rose";

export type WidgetPreviewItem = {
  checked?: boolean;
  dismissOnOpen?: boolean;
  handoffLabel?: string;
  handoffUrl?: string;
  id: string;
  label: string;
  status: string;
};

export type WidgetPreviewBubble = {
  accent: WidgetBubbleAccent;
  actionLabel: string;
  compactLabel: string;
  id: WidgetBubbleType;
  inputPlaceholder?: string;
  label: string;
  metric: string;
  metricLabel: string;
  notificationLabel: string;
  panelBody: string;
  panelLabel: string;
  roomLabel: string;
  rows: WidgetPreviewItem[];
};

export const widgetModeSummaries = {
  DEFAULT: "정보가 또렷하게 보이는 기본 상태",
  GHOST: "핵심 신호만 남기고 클릭을 통과시키는 상태",
  MINIMIZED: "작은 오브로 접어 알림과 현재 버블만 남기는 상태",
  TRANSLUCENT: "작업 화면을 덜 가리도록 대비와 채움을 낮춘 상태",
} as const;

export const widgetPreviewBubbles: WidgetPreviewBubble[] = [
  {
    accent: "blue",
    actionLabel: "TODO 추가",
    compactLabel: "떠 있는 일 3",
    id: "todo",
    label: "오늘 할 일",
    metric: "5",
    metricLabel: "오늘 기준",
    notificationLabel: "마감 임박 1",
    panelBody: "오늘 안에 확인할 일과 승인 전 항목만 먼저 보여줍니다.",
    panelLabel: "오늘 우선순위",
    roomLabel: "토모에 번역 프로젝트",
    rows: [
      { checked: true, id: "todo-contract-reply", label: "계약서 수정 조항 회신", status: "오늘" },
      { id: "todo-review", label: "토모에 1차 검수 마무리", status: "D-2" },
      { id: "todo-candidate", label: "WBS 후보 3개 검토", status: "승인 전" },
    ],
  },
  {
    accent: "blue",
    actionLabel: "일정 열기",
    compactLabel: "일정 2",
    id: "schedule",
    label: "일정",
    metric: "2h",
    metricLabel: "다음 일정",
    notificationLabel: "14:00 리허설",
    panelBody: "오늘 일정과 다음 마감만 작게 남깁니다.",
    panelLabel: "다음 일정",
    roomLabel: "토모에 번역 프로젝트",
    rows: [
      { id: "schedule-standup", label: "중간보고 리허설", status: "14:00" },
      { id: "schedule-delivery", label: "1차 납품 범위 확인", status: "D-2" },
      { id: "schedule-sync", label: "구글 캘린더 동기화 항목", status: "연결" },
    ],
  },
  {
    accent: "pearl",
    actionLabel: "기록 저장",
    compactLabel: "타이머 42:18",
    id: "timer",
    label: "타이머",
    metric: "42:18",
    metricLabel: "진행 중",
    notificationLabel: "복구 대기",
    panelBody: "진행 중인 작업 시간과 복구 상태를 같이 보여줍니다.",
    panelLabel: "작업 중",
    roomLabel: "토모에 번역 프로젝트",
    rows: [
      { id: "timer-current", label: "1차 검수 집중", status: "작업" },
      { id: "timer-pause", label: "일시정지와 재개", status: "가능" },
      { id: "timer-recovery", label: "앱 재실행 후 복구 확인", status: "대기" },
    ],
  },
  {
    accent: "lilac",
    actionLabel: "자료 확인",
    compactLabel: "자료 후보 3",
    id: "resource",
    label: "자료 제안",
    metric: "3",
    metricLabel: "확인 후보",
    notificationLabel: "새 자료 1",
    panelBody: "지금 할 일과 이어지는 자료만 골라 보여줍니다.",
    panelLabel: "자료 후보",
    roomLabel: "토모에 번역 프로젝트",
    rows: [
      { id: "resource-contract", label: "계약서 7조 수정 범위", status: "관련" },
      { id: "resource-meeting", label: "회의록 검수 일정 언급", status: "근거" },
      { id: "resource-local", label: "개인 관리 폴더 새 파일", status: "로컬" },
    ],
  },
  {
    accent: "pearl",
    actionLabel: "메모 남기기",
    compactLabel: "메모 2",
    id: "memo",
    inputPlaceholder: "작업 중 메모",
    label: "메모",
    metric: "2",
    metricLabel: "작성 중",
    notificationLabel: "초안 저장",
    panelBody: "작업 중 떠오른 말을 짧게 붙잡아 둡니다.",
    panelLabel: "개인 메모",
    roomLabel: "개인 작업",
    rows: [
      { id: "memo-draft", label: "검수 기준 질문 임시 메모", status: "초안" },
      { id: "memo-summary", label: "하루정리에 쓸 근거", status: "확인" },
    ],
  },
  {
    accent: "rose",
    actionLabel: "답장 준비",
    compactLabel: "소통 4",
    id: "chat",
    inputPlaceholder: "메시지 초안",
    label: "소통 알림",
    metric: "4",
    metricLabel: "새 알림",
    notificationLabel: "댓글 1",
    panelBody: "새 댓글과 자료 변경처럼 놓치기 쉬운 소식만 모읍니다.",
    panelLabel: "소통",
    roomLabel: "토모에 번역 프로젝트",
    rows: [
      {
        dismissOnOpen: true,
        handoffLabel: "앱으로 열기",
        handoffUrl: "https://app.bubli.kr/app/project-rooms/tomoe-translation/chat?thread=contract-review",
        id: "chat-comment",
        label: "민지: 검수 기준 댓글",
        status: "열면 숨김",
      },
      { id: "chat-room", label: "프로젝트룸 채팅 읽음 상태", status: "동기화" },
      { id: "chat-version", label: "자료 새 버전 등록", status: "1개" },
    ],
  },
  {
    accent: "lilac",
    actionLabel: "후보 검토",
    compactLabel: "후보 3",
    id: "agent",
    inputPlaceholder: "백엔드에 보낼 질문 초안",
    label: "에이전트 결과",
    metric: "3",
    metricLabel: "승인 대기",
    notificationLabel: "정리 완료",
    panelBody: "검토할 정리 결과와 승인 전 후보만 보여줍니다.",
    panelLabel: "에이전트 결과",
    roomLabel: "토모에 번역 프로젝트",
    rows: [
      { id: "agent-summary", label: "회의록 정리 완료", status: "완료" },
      { id: "agent-wbs", label: "WBS 후보 3개", status: "검토" },
      { id: "agent-question", label: "확인 질문 후보 2개", status: "승인 전" },
    ],
  },
  {
    accent: "rose",
    actionLabel: "알림 정리",
    compactLabel: "알림 6",
    id: "alert",
    label: "알림",
    metric: "6",
    metricLabel: "읽지 않음",
    notificationLabel: "새 알림 6",
    panelBody: "작업을 방해하지 않게 필요한 알림만 남깁니다.",
    panelLabel: "알림 상태",
    roomLabel: "개인 작업",
    rows: [
      { id: "alert-resource", label: "새 자료 분석 완료", status: "완료" },
      { id: "alert-agent", label: "에이전트 후보 승인 대기", status: "3개" },
      { id: "alert-chat", label: "소통 알림 묶음", status: "2개" },
    ],
  },
];

export function getWidgetPreviewBubble(id: WidgetBubbleType): WidgetPreviewBubble {
  return widgetPreviewBubbles.find((bubble) => bubble.id === id) ?? widgetPreviewBubbles[0];
}
