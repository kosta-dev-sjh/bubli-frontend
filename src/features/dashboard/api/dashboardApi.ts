import { apiRequest } from "@/lib/api/client";
import type { DashboardWorkResponse, TaskResponse } from "@/types/api/work";

export const dashboardApi = {
  getWork() {
    return apiRequest<DashboardWorkResponse>("/api/dashboard/work");
  },

  getTasks() {
    return apiRequest<TaskResponse[]>("/api/dashboard/tasks");
  },
} as const;
