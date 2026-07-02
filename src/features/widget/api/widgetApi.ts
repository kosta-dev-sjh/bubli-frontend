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
  WidgetUsageRollupResponse as ApiWidgetUsageRollupResponse,
  WidgetUsageSummarySaveRequest as ApiWidgetUsageSummarySaveRequest,
} from "@/types/api/widget";
import { withWidgetDevAuthHeaders } from "./widgetAuthHeaders";

export type BackendWidgetBubbleType = Exclude<ApiWidgetBubbleType, "ALERT" | "RESOURCE">;
export type WidgetBubbleSettingResponse = ApiWidgetBubbleSettingResponse;
export type WidgetContextResponse = ApiWidgetContextResponse;

function widgetRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  return apiRequest<T>(path, {
    ...options,
    headers: withWidgetDevAuthHeaders(options.headers),
  });
}

export const widgetApi = {
  getContext() {
    return widgetRequest<ApiWidgetContextResponse>("/api/widget/context");
  },

  updateContext(body: ApiWidgetContextUpdateRequest) {
    return widgetRequest<ApiWidgetContextResponse>("/api/widget/context", {
      body,
      method: "PATCH",
    });
  },

  getSettings() {
    return widgetRequest<ApiWidgetSettingsResponse>("/api/widget/settings");
  },

  updateSettings(body: ApiWidgetBubbleSettingsUpdateRequest) {
    return widgetRequest<ApiWidgetSettingsResponse>("/api/widget/settings", {
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
    return widgetRequest<ApiWidgetSummaryResponse>("/api/widget/summary");
  },

  updateItemState(itemStateId: string, body: ApiWidgetItemStateUpdateRequest) {
    return widgetRequest<null>(`/api/widget/items/${itemStateId}/state`, {
      body,
      method: "PATCH",
    });
  },

  saveUsageSummary(body: ApiWidgetUsageSummarySaveRequest) {
    return widgetRequest<ApiWidgetUsageRollupResponse>("/api/widget/usage-summaries", {
      body,
      method: "POST",
    });
  },

  saveUsageSummariesSequentially(body: ApiWidgetUsageSummarySaveRequest[]) {
    return Promise.all(body.map((summary) => widgetApi.saveUsageSummary(summary)));
  },

  getTodayUsageRollups() {
    return widgetRequest<ApiWidgetTodayUsageSummaryResponse>("/api/widget/usage-summaries/today");
  },

  getTodayUsageSummary() {
    return widgetApi.getTodayUsageRollups();
  },
} as const;
