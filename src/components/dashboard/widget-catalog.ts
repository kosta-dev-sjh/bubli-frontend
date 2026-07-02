// 대시보드 카드 선택 목록. 실제 저장은 dashboard layout API가 붙은 뒤 연결한다.
import type { MessageKey } from "@/lib/i18n";

export type WidgetSize = "S" | "M" | "L";
export type WidgetCategory = "work" | "time" | "agent" | "info";

export type DashboardWidgetDef = {
  category: WidgetCategory;
  descriptionKey: MessageKey;
  size: WidgetSize;
  titleKey: MessageKey;
  widgetId: string;
};

export const WIDGET_CATALOG: DashboardWidgetDef[] = [
  { category: "work", descriptionKey: "dashboard.catalog.nextFocus.desc", size: "M", titleKey: "dashboard.catalog.nextFocus.title", widgetId: "next-focus" },
  { category: "work", descriptionKey: "dashboard.catalog.todayTodos.desc", size: "M", titleKey: "dashboard.catalog.todayTodos.title", widgetId: "today-todos" },
  { category: "time", descriptionKey: "dashboard.catalog.schedule.desc", size: "M", titleKey: "dashboard.catalog.schedule.title", widgetId: "schedule" },
  { category: "time", descriptionKey: "dashboard.catalog.timer.desc", size: "S", titleKey: "dashboard.catalog.timer.title", widgetId: "timer" },
  { category: "agent", descriptionKey: "dashboard.catalog.pendingApproval.desc", size: "S", titleKey: "dashboard.catalog.pendingApproval.title", widgetId: "pending-approval" },
  { category: "work", descriptionKey: "dashboard.catalog.projectRooms.desc", size: "M", titleKey: "dashboard.catalog.projectRooms.title", widgetId: "project-rooms" },
  { category: "time", descriptionKey: "dashboard.catalog.projectTimeRing.desc", size: "M", titleKey: "dashboard.catalog.projectTimeRing.title", widgetId: "project-time-ring" },
  { category: "time", descriptionKey: "dashboard.catalog.activityTimeline.desc", size: "L", titleKey: "dashboard.catalog.activityTimeline.title", widgetId: "activity-timeline" },
  { category: "info", descriptionKey: "dashboard.catalog.todaySummary.desc", size: "M", titleKey: "dashboard.catalog.todaySummary.title", widgetId: "today-summary" },
  { category: "info", descriptionKey: "dashboard.catalog.notifications.desc", size: "S", titleKey: "dashboard.catalog.notifications.title", widgetId: "notifications" },
  { category: "info", descriptionKey: "dashboard.catalog.recentResources.desc", size: "M", titleKey: "dashboard.catalog.recentResources.title", widgetId: "recent-resources" },
  { category: "work", descriptionKey: "dashboard.catalog.quickMemo.desc", size: "S", titleKey: "dashboard.catalog.quickMemo.title", widgetId: "quick-memo" },
  { category: "work", descriptionKey: "dashboard.catalog.quickUpload.desc", size: "S", titleKey: "dashboard.catalog.quickUpload.title", widgetId: "quick-upload" },
];

export const sizeToClass: Record<WidgetSize, string> = {
  S: "bubli-dash-tile--s",
  M: "bubli-dash-tile--m",
  L: "bubli-dash-tile--l",
};
