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

  getBubbles() {
    return apiRequest<WidgetBubbleSettingResponse[]>("/api/widget/bubbles");
  },

  updateBubbles(body: WidgetBubbleSettingsUpdateRequest) {
    return apiRequest<WidgetBubbleSettingResponse[]>("/api/widget/bubbles", {
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

  syncUsageRollups(body: WidgetUsageRollupRequest[]) {
    return apiRequest<WidgetUsageRollupResponse[]>("/api/widget/usage-rollups", {
      body: { rollups: body },
      method: "POST",
    });
  },

  getTodayUsageRollups() {
    return apiRequest<WidgetUsageRollupResponse[]>("/api/widget/usage-rollups/today");
  },
} as const;
