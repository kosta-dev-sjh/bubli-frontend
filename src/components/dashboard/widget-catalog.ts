// 대시보드 카드 선택 목록. 홈 보드 배치는 features/dashboard/lib/board-storage가 이 기기에 저장한다(전용 layout API 없음).
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
  { category: "work", descriptionKey: "dashboard.catalog.quickMemo.desc", roomScope: true, size: "M", titleKey: "dashboard.catalog.quickMemo.title", widgetId: "quick-memo" },
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

// ── 직군 온보딩 프리셋 ──────────────────────────────────────────
// 첫 로그인 직군 선택에 따라 홈 보드 카드 조합 + 기본 시작 화면을 추천한다.
// widgetIds는 홈 보드에 실제 데이터가 연결된 카탈로그 id만 쓴다
// (workspace-dashboard의 connectedWidgetIds 집합과 동일 — 데모 항목 금지).
// defaultHomeType은 백엔드 user_preference.default_home_type 계약 값(PERSONAL/PROJECT_ROOM)이다.
export type HomeRolePresetId = "developer" | "designer" | "pm" | "marketer" | "writer" | "etc";

export type HomeRolePreset = {
  defaultHomeType: "PERSONAL" | "PROJECT_ROOM";
  widgetIds: string[];
};

export const HOME_ROLE_PRESETS: Record<HomeRolePresetId, HomeRolePreset> = {
  developer: { defaultHomeType: "PERSONAL", widgetIds: ["today-todos", "room-progress", "schedule", "focus-stats"] },
  designer: { defaultHomeType: "PERSONAL", widgetIds: ["today-todos", "recent-resources", "schedule", "quick-memo"] },
  pm: { defaultHomeType: "PROJECT_ROOM", widgetIds: ["room-progress", "schedule", "agent-queue", "today-todos"] },
  marketer: { defaultHomeType: "PERSONAL", widgetIds: ["quick-memo", "today-todos", "schedule", "recent-resources"] },
  writer: { defaultHomeType: "PERSONAL", widgetIds: ["quick-memo", "today-todos", "schedule", "recent-resources"] },
  // 기타 — 기본 보드 구성(연결된 카드 전체)을 그대로 쓴다.
  etc: {
    defaultHomeType: "PERSONAL",
    widgetIds: ["today-summary", "today-todos", "schedule", "room-progress", "focus-stats", "agent-queue", "recent-resources", "quick-memo"],
  },
};
