import { apiRequest } from "@/lib/api/client";
import type { CreateMemoRequest, MemoPageResponse, MemoResponse, UpdateMemoRequest } from "@/types/api/memo";

type MemoListParams = {
  page?: number;
  size?: number;
};

function memoPageQuery(params: MemoListParams = {}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 20));
  return search.toString();
}

export const memoApi = {
  listPersonal(params?: MemoListParams) {
    return apiRequest<MemoPageResponse>(`/api/memos?${memoPageQuery(params)}`);
  },

  createPersonal(body: CreateMemoRequest) {
    return apiRequest<MemoResponse>("/api/memos", {
      body,
      method: "POST",
    });
  },

  listRoom(roomId: string, params?: MemoListParams) {
    return apiRequest<MemoPageResponse>(`/api/project-rooms/${roomId}/memos?${memoPageQuery(params)}`);
  },

  createRoom(roomId: string, body: CreateMemoRequest) {
    return apiRequest<MemoResponse>(`/api/project-rooms/${roomId}/memos`, {
      body,
      method: "POST",
    });
  },

  update(memoId: string, body: UpdateMemoRequest) {
    return apiRequest<MemoResponse>(`/api/memos/${memoId}`, {
      body,
      method: "PATCH",
    });
  },

  delete(memoId: string) {
    return apiRequest<null>(`/api/memos/${memoId}`, {
      method: "DELETE",
    });
  },
} as const;
