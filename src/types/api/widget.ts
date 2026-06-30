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

export type WidgetSummaryItem = {
  bubbleType: WidgetBubbleType;
  count?: number;
  items: Array<Record<string, unknown>>;
  updatedAt?: string;
};

export type WidgetSummaryResponse = {
  context: WidgetContextResponse;
  summaries: WidgetSummaryItem[];
};

export type WidgetItemState = "VISIBLE" | "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED" | "UNREAD";

export type WidgetItemStateUpdateRequest = {
  bubbleType: WidgetBubbleType;
  itemId: string;
  itemType: string;
  state: WidgetItemState;
};

export type WidgetUsageRollupRequest = {
  bubbleType: WidgetBubbleType;
  confirmedItemCount?: number;
  deviceId: string;
  interactionCount: number;
  openCount: number;
  rollupKey: string;
  sourceEventCount: number;
  summaryDate: string;
  visibleSeconds: number;
};

export type WidgetUsageRollupResponse = WidgetUsageRollupRequest & {
  id: string;
  syncedAt: string;
};
