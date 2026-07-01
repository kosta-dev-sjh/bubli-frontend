import { apiRequest } from "@/lib/api/client";
import type {
  WidgetBubbleSettingResponse as ApiWidgetBubbleSettingResponse,
  WidgetBubbleSettingsUpdateRequest as ApiWidgetBubbleSettingsUpdateRequest,
  WidgetBubbleType as ApiWidgetBubbleType,
  WidgetContextResponse as ApiWidgetContextResponse,
  WidgetContextUpdateRequest as ApiWidgetContextUpdateRequest,
  WidgetItemStateUpdateRequest as ApiWidgetItemStateUpdateRequest,
  WidgetSettingsResponse as ApiWidgetSettingsResponse,
  WidgetSummaryResponse as ApiWidgetSummaryResponse,
  WidgetTodayUsageSummaryResponse as ApiWidgetTodayUsageSummaryResponse,
  WidgetUsageRollupRequest as ApiWidgetUsageRollupRequest,
  WidgetUsageRollupResponse as ApiWidgetUsageRollupResponse,
  WidgetUsageSummarySaveRequest as ApiWidgetUsageSummarySaveRequest,
} from "@/types/api/widget";

export type BackendWidgetBubbleType = Exclude<ApiWidgetBubbleType, "ALERT" | "RESOURCE">;
export type WidgetBubbleSettingResponse = ApiWidgetBubbleSettingResponse;
export type WidgetContextResponse = ApiWidgetContextResponse;

function toUsageSummarySaveRequest(body: ApiWidgetUsageRollupRequest): ApiWidgetUsageSummarySaveRequest {
  return {
    bubbleSettingId: body.bubbleSettingId,
    deviceId: body.deviceId,
    interactionCount: body.interactionCount,
    openCount: body.openCount,
    rollupKey: body.rollupKey,
    summaryDate: body.summaryDate,
    syncedAt: body.syncedAt,
    visibleSeconds: body.visibleSeconds,
  };
}

export const widgetApi = {
  getContext() {
    return apiRequest<ApiWidgetContextResponse>("/api/widget/context");
  },

  updateContext(body: ApiWidgetContextUpdateRequest) {
    return apiRequest<ApiWidgetContextResponse>("/api/widget/context", {
      body,
      method: "PATCH",
    });
  },

  getSettings() {
    return apiRequest<ApiWidgetSettingsResponse>("/api/widget/settings");
  },

  updateSettings(body: ApiWidgetBubbleSettingsUpdateRequest) {
    return apiRequest<ApiWidgetSettingsResponse>("/api/widget/settings", {
      body,
      method: "PATCH",
    });
  },

  // 10_API-Design 14.4: bubble on/off, layout, scope live under /api/widget/settings.
  async getBubbles() {
    const response = await widgetApi.getSettings();
    return response.bubbles;
  },

  async updateBubbles(body: ApiWidgetBubbleSettingsUpdateRequest) {
    const response = await widgetApi.updateSettings(body);
    return response.bubbles;
  },

  getSummary() {
    return apiRequest<ApiWidgetSummaryResponse>("/api/widget/summary");
  },

  updateItemState(itemStateId: string, body: ApiWidgetItemStateUpdateRequest) {
    return apiRequest<null>(`/api/widget/items/${itemStateId}/state`, {
      body,
      method: "PATCH",
    });
  },

  saveUsageSummary(body: ApiWidgetUsageSummarySaveRequest) {
    return apiRequest<ApiWidgetUsageRollupResponse>("/api/widget/usage-summaries", {
      body,
      method: "POST",
    });
  },

  syncUsageRollups(body: ApiWidgetUsageRollupRequest[]) {
    return Promise.all(body.map((rollup) => widgetApi.saveUsageSummary(toUsageSummarySaveRequest(rollup))));
  },

  getTodayUsageRollups() {
    return apiRequest<ApiWidgetTodayUsageSummaryResponse>("/api/widget/usage-summaries/today");
  },

  getTodayUsageSummary() {
    return widgetApi.getTodayUsageRollups();
  },
} as const;
