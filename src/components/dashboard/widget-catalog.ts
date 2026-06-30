// 대시보드 카드 선택 목록. 실제 저장은 dashboard layout API가 붙은 뒤 연결한다.
export type WidgetSize = "S" | "M" | "L";
export type WidgetCategory = "work" | "time" | "agent" | "info";

export type DashboardWidgetDef = {
  category: WidgetCategory;
  description: string;
  size: WidgetSize;
  title: string;
  widgetId: string;
};

export const WIDGET_CATALOG: DashboardWidgetDef[] = [
  { category: "work", description: "오늘 할 일", size: "M", title: "오늘 할 일", widgetId: "today-todos" },
  { category: "time", description: "오늘 일정", size: "M", title: "일정", widgetId: "schedule" },
  { category: "time", description: "집중 타이머와 기록", size: "S", title: "타이머", widgetId: "timer" },
  { category: "agent", description: "에이전트가 만든 후보 제안", size: "M", title: "에이전트 제안", widgetId: "agent-suggestions" },
  { category: "agent", description: "확인할 항목", size: "S", title: "확인 필요", widgetId: "pending-approval" },
  { category: "work", description: "진행 중인 프로젝트룸", size: "M", title: "진행 중 프로젝트룸", widgetId: "project-rooms" },
  { category: "time", description: "프로젝트별 시간 귀속 링", size: "M", title: "프로젝트별 시간", widgetId: "project-time-ring" },
  { category: "time", description: "오늘의 활동 흐름(프로젝트 귀속)", size: "L", title: "활동 타임라인", widgetId: "activity-timeline" },
  { category: "info", description: "할 일과 일정", size: "M", title: "오늘 요약", widgetId: "today-summary" },
  { category: "info", description: "새 알림과 멘션", size: "S", title: "알림", widgetId: "notifications" },
  { category: "info", description: "최근 업로드된 자료", size: "M", title: "최근 자료", widgetId: "recent-resources" },
  { category: "work", description: "즉석 메모 입력", size: "S", title: "빠른 메모", widgetId: "quick-memo" },
  { category: "work", description: "자료 빠른 업로드 드롭존", size: "S", title: "빠른 업로드", widgetId: "quick-upload" },
];

export const sizeToClass: Record<WidgetSize, string> = {
  S: "bubli-dash-tile--s",
  M: "bubli-dash-tile--m",
  L: "bubli-dash-tile--l",
};
