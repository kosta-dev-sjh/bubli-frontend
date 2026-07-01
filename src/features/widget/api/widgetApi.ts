import { apiRequest } from "@/lib/api/client";
import type {
  WidgetBubbleSettingResponse,
  WidgetBubbleSettingsUpdateRequest,
  WidgetContextResponse,
  WidgetContextUpdateRequest,
  WidgetItemStateUpdateRequest,
  WidgetSummaryResponse,
  WidgetUsageRollupRequest,
  WidgetUsageRollupResponse,
} from "@/types/api/widget";

export const widgetApi = {
  getContext() {
    return apiRequest<WidgetContextResponse>("/api/widget/context");
  },

  updateContext(body: WidgetContextUpdateRequest) {
    return apiRequest<WidgetContextResponse>("/api/widget/context", {
      body,
      method: "PATCH",
    });
  },

  // 10_API-Design 14.4: bubble on/off, layout, scope live under /api/widget/settings.
  getBubbles() {
    return apiRequest<WidgetBubbleSettingResponse[]>("/api/widget/settings");
  },

  updateBubbles(body: WidgetBubbleSettingsUpdateRequest) {
    return apiRequest<WidgetBubbleSettingResponse[]>("/api/widget/settings", {
      body,
      method: "PATCH",
    });
  },

  getSummary() {
    return apiRequest<WidgetSummaryResponse>("/api/widget/summary");
  },

  updateItemState(itemStateId: string, body: WidgetItemStateUpdateRequest) {
    return apiRequest<null>(`/api/widget/items/${itemStateId}/state`, {
      body,
      method: "PATCH",
    });
  },

  // 10_API-Design 14.4: server reflects per-date/per-device rollups at
  // /api/widget/usage-summaries; rollupKey dedupes repeated requests.
  syncUsageRollups(body: WidgetUsageRollupRequest[]) {
    return apiRequest<WidgetUsageRollupResponse[]>("/api/widget/usage-summaries", {
      body: { rollups: body },
      method: "POST",
    });
  },

  getTodayUsageRollups() {
    return apiRequest<WidgetUsageRollupResponse[]>("/api/widget/usage-summaries/today");
  },
} as const;
