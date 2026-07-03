// 대시보드 카드 선택 목록. 홈 보드 배치는 localStorage에 저장한다(전용 layout API 없음).
import type { MessageKey } from "@/lib/i18n";

export type WidgetSize = "S" | "M" | "L";
export type WidgetCategory = "work" | "time" | "agent" | "info";

export type DashboardWidgetDef = {
  category: WidgetCategory;
  descriptionKey: MessageKey;
  /** true면 위젯 헤더에 프로젝트룸 선택 드롭다운이 붙는다(위젯별 데이터 범위). */
  roomScope?: boolean;
  size: WidgetSize;
  titleKey: MessageKey;
  widgetId: string;
};

export const WIDGET_CATALOG: DashboardWidgetDef[] = [
  { category: "info", descriptionKey: "dashboard.catalog.todaySummary.desc", size: "L", titleKey: "dashboard.catalog.todaySummary.title", widgetId: "today-summary" },
  { category: "work", descriptionKey: "dashboard.catalog.todayTodos.desc", roomScope: true, size: "M", titleKey: "dashboard.catalog.todayTodos.title", widgetId: "today-todos" },
  { category: "time", descriptionKey: "dashboard.catalog.schedule.desc", roomScope: true, size: "M", titleKey: "dashboard.catalog.schedule.title", widgetId: "schedule" },
  { category: "work", descriptionKey: "dashboard.catalog.roomProgress.desc", roomScope: true, size: "M", titleKey: "dashboard.catalog.roomProgress.title", widgetId: "room-progress" },
  { category: "time", descriptionKey: "dashboard.catalog.focusStats.desc", roomScope: true, size: "M", titleKey: "dashboard.catalog.focusStats.title", widgetId: "focus-stats" },
  { category: "agent", descriptionKey: "dashboard.catalog.agentQueue.desc", size: "S", titleKey: "dashboard.catalog.agentQueue.title", widgetId: "agent-queue" },
  { category: "info", descriptionKey: "dashboard.catalog.recentResources.desc", roomScope: true, size: "M", titleKey: "dashboard.catalog.recentResources.title", widgetId: "recent-resources" },
  { category: "work", descriptionKey: "dashboard.catalog.quickMemo.desc", size: "M", titleKey: "dashboard.catalog.quickMemo.title", widgetId: "quick-memo" },
  // 아래 항목은 스토리북/보관함 데모용 정의로 남겨둔다(홈 보드 연결 대상 아님).
  { category: "work", descriptionKey: "dashboard.catalog.nextFocus.desc", size: "M", titleKey: "dashboard.catalog.nextFocus.title", widgetId: "next-focus" },
  { category: "time", descriptionKey: "dashboard.catalog.timer.desc", size: "S", titleKey: "dashboard.catalog.timer.title", widgetId: "timer" },
  { category: "agent", descriptionKey: "dashboard.catalog.pendingApproval.desc", size: "S", titleKey: "dashboard.catalog.pendingApproval.title", widgetId: "pending-approval" },
  { category: "work", descriptionKey: "dashboard.catalog.projectRooms.desc", size: "M", titleKey: "dashboard.catalog.projectRooms.title", widgetId: "project-rooms" },
  { category: "time", descriptionKey: "dashboard.catalog.projectTimeRing.desc", size: "M", titleKey: "dashboard.catalog.projectTimeRing.title", widgetId: "project-time-ring" },
  { category: "time", descriptionKey: "dashboard.catalog.activityTimeline.desc", size: "L", titleKey: "dashboard.catalog.activityTimeline.title", widgetId: "activity-timeline" },
  { category: "info", descriptionKey: "dashboard.catalog.notifications.desc", size: "S", titleKey: "dashboard.catalog.notifications.title", widgetId: "notifications" },
  { category: "work", descriptionKey: "dashboard.catalog.quickUpload.desc", size: "S", titleKey: "dashboard.catalog.quickUpload.title", widgetId: "quick-upload" },
];

export const sizeToClass: Record<WidgetSize, string> = {
  S: "bubli-dash-tile--s",
  M: "bubli-dash-tile--m",
  L: "bubli-dash-tile--l",
};
