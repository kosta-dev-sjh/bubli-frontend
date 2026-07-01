import { apiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/types/api/common";
import type { TaskCreateRequest, TaskResponse, TaskUpdateRequest } from "@/types/api/work";

export const todoApi = {
  list() {
    return apiRequest<PageResponse<TaskResponse>>("/api/tasks");
  },

  listRoomTasks(roomId: string) {
    return apiRequest<PageResponse<TaskResponse>>(`/api/project-rooms/${roomId}/tasks`);
  },

  create(body: TaskCreateRequest) {
    return apiRequest<TaskResponse>("/api/tasks", {
      body,
      method: "POST",
    });
  },

  update(taskId: string, body: TaskUpdateRequest) {
    return apiRequest<TaskResponse>(`/api/tasks/${taskId}`, {
      body,
      method: "PATCH",
    });
  },

  delete(taskId: string) {
    return apiRequest<null>(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
  },
} as const;
