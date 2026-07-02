import type { PageResponse } from "./common";

export type MemoStatus = "ACTIVE" | "DELETED";

export type MemoResponse = {
  authorUserId: string;
  body: string;
  createdAt: string;
  id: string;
  roomId: string | null;
  status: MemoStatus;
  updatedAt: string;
};

export type MemoPageResponse = PageResponse<MemoResponse>;

export type CreateMemoRequest = {
  body: string;
};

export type UpdateMemoRequest = {
  body: string;
};
