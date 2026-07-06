import { apiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/types/api/common";
import type { DashboardActivityHeatmapResponse, DashboardWorkResponse, TaskResponse } from "@/types/api/work";

export const dashboardApi = {
  getWork() {
    return apiRequest<DashboardWorkResponse>("/api/dashboard/work");
  },

  getActivityHeatmap(input?: { days?: number }) {
    const days = input?.days && input.days > 0 ? Math.round(input.days) : 365;
    return apiRequest<DashboardActivityHeatmapResponse[]>(`/api/dashboard/activity-heatmap?days=${days}`);
  },

  getTasks() {
    return apiRequest<PageResponse<TaskResponse>>("/api/dashboard/tasks");
  },
} as const;
