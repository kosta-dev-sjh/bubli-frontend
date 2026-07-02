export type WidgetMode = "PERSONAL" | "ROOM";

export type WidgetBubbleType =
  | "TODO"
  | "SCHEDULE"
  | "TIMER"
  | "MEMO"
  | "CHAT"
  | "AGENT"
  | "RESOURCE"
  | "ALERT";

export type WidgetContextResponse = {
  mode: WidgetMode;
  selectedRoomId?: string | null;
};

export type WidgetContextUpdateRequest = {
  selectedRoomId?: string | null;
};

export type WidgetBubbleSettingResponse = {
  alertEnabled: boolean;
  bubbleType: WidgetBubbleType;
  enabled: boolean;
  ghostMode: boolean;
  height?: number | null;
  id: string;
  minimized: boolean;
  opacity?: number | null;
  width?: number | null;
  x: number;
  y: number;
};

export type WidgetBubbleSettingUpdate = Partial<
  Pick<
    WidgetBubbleSettingResponse,
    "alertEnabled" | "enabled" | "ghostMode" | "height" | "minimized" | "opacity" | "width" | "x" | "y"
  >
> & {
  bubbleType: WidgetBubbleType;
  id?: string;
};

export type WidgetBubbleSettingsUpdateRequest = {
  bubbles: WidgetBubbleSettingUpdate[];
};

export type WidgetSettingsResponse = {
  bubbles: WidgetBubbleSettingResponse[];
};

export type WidgetSummaryResponse = {
  bubbles: WidgetBubbleSettingResponse[];
  context: WidgetContextResponse;
};

export type WidgetItemState = "VISIBLE" | "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED" | "UNREAD";

export type WidgetItemStateUpdateRequest = {
  bubbleType: WidgetBubbleType;
  itemId: string;
  itemType: string;
  state: WidgetItemState;
};

export type WidgetUsageSummarySaveRequest = {
  bubbleSettingId: string;
  deviceId: string;
  interactionCount: number;
  openCount: number;
  rollupKey: string;
  summaryDate: string;
  syncedAt: string;
  visibleSeconds: number;
};

export type WidgetUsageSummarySyncCandidate = WidgetUsageSummarySaveRequest & {
  bubbleType: WidgetBubbleType;
  sourceEventCount: number;
};

export type WidgetDailySummaryResponse = {
  bubbleSettingId: string;
  deviceId: string;
  id: string;
  interactionCount: number;
  openCount: number;
  summaryDate: string;
  syncedAt: string;
  visibleSeconds: number;
};

export type WidgetUsageRollupResponse = WidgetDailySummaryResponse;

export type WidgetTodayUsageSummaryResponse = {
  byDevice: WidgetDailySummaryResponse[];
  date: string;
  totalInteractionCount: number;
  totalOpenCount: number;
  totalVisibleSeconds: number;
};
