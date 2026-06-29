import { apiRequest } from "@/lib/api/client";
import type {
  WbsBoardResponse,
  WbsItemCreateRequest,
  WbsItemReorderRequest,
  WbsItemResponse,
  WbsItemUpdateRequest,
} from "@/types/api/work";

export const wbsApi = {
  getBoard(roomId: string) {
    return apiRequest<WbsBoardResponse>(`/api/project-rooms/${roomId}/wbs-board`);
  },

  listItems(roomId: string) {
    return apiRequest<WbsItemResponse[]>(`/api/project-rooms/${roomId}/wbs-items`);
  },

  createItem(roomId: string, body: WbsItemCreateRequest) {
    return apiRequest<WbsItemResponse>(`/api/project-rooms/${roomId}/wbs-items`, {
      body,
      method: "POST",
    });
  },

  reorderItems(roomId: string, body: WbsItemReorderRequest) {
    return apiRequest<WbsItemResponse[]>(`/api/project-rooms/${roomId}/wbs-items/reorder`, {
      body,
      method: "PATCH",
    });
  },

  updateItem(wbsItemId: string, body: WbsItemUpdateRequest) {
    return apiRequest<WbsItemResponse>(`/api/wbs-items/${wbsItemId}`, {
      body,
      method: "PATCH",
    });
  },

  deleteItem(wbsItemId: string) {
    return apiRequest<null>(`/api/wbs-items/${wbsItemId}`, {
      method: "DELETE",
    });
  },
} as const;
