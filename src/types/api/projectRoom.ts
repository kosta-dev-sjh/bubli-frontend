import type { PageResponse } from "@/types/api/common";

export type ProjectRoomPaymentStatus = "NOT_RECORDED" | "PENDING" | "PAID" | "OVERDUE";

export type ProjectRoomStatus = "ACTIVE" | "CLOSED";

export type ProjectRoomRole = "PROJECT_LEADER" | "MEMBER";

export type ProjectRoomInvitationStatus = "PENDING" | "ACCEPTED" | "CANCELED" | "EXPIRED";

export type ContractDocumentType = "CONTRACT" | "REQUIREMENT";

export type ProjectRoomUpsertRequest = {
  clientName?: string | null;
  contractAmount?: number | null;
  name: string;
  paidAt?: string | null;
  paymentDueDate?: string | null;
  paymentStatus?: ProjectRoomPaymentStatus;
  // 백엔드 UpdateProjectRoomRequest.status — 닫힌 룸 다시 열기(ACTIVE 전환) 등에 사용한다.
  status?: ProjectRoomStatus;
};

export type ProjectRoomResponse = ProjectRoomUpsertRequest & {
  closedAt?: string | null;
  createdAt: string;
  createdByUserId: string;
  id: string;
  status: ProjectRoomStatus;
  updatedAt: string;
};

export type ProjectRoomMemberResponse = {
  avatarUrl?: string | null;
  bubliId?: string | null;
  createdAt: string;
  id: string;
  name: string;
  role: ProjectRoomRole;
  roomId: string;
  status: "ACTIVE" | "LEFT" | "REMOVED";
  updatedAt: string;
  userId: string;
};

export type ProjectRoomInvitationCreateRequest = {
  inviteeUserId: string;
  role?: "MEMBER";
};

export type ProjectRoomInvitationResponse = {
  createdAt: string;
  expiresAt?: string | null;
  id: string;
  inviteeAvatarUrl?: string | null;
  inviteeBubliId?: string | null;
  inviteeName?: string | null;
  inviteeUserId: string;
  inviterAvatarUrl?: string | null;
  inviterBubliId?: string | null;
  inviterName?: string | null;
  inviterUserId: string;
  role: "MEMBER";
  roomId: string;
  roomName?: string | null;
  status: ProjectRoomInvitationStatus;
};

export type ProjectRoomMemberRoleUpdateRequest = {
  role: ProjectRoomRole;
};

export type ContractDocumentUploadResponse = {
  jobId: string;
  resourceId: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
};

export type ProjectRoomPageResponse = PageResponse<ProjectRoomResponse>;
export type ProjectRoomInvitationPageResponse = PageResponse<ProjectRoomInvitationResponse>;
export type ProjectRoomMemberPageResponse = PageResponse<ProjectRoomMemberResponse>;
