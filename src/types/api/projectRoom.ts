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
  joinedAt: string;
  role: ProjectRoomRole;
  status: "ACTIVE" | "LEFT" | "REMOVED";
  user: {
    avatarUrl?: string | null;
    bubliId?: string | null;
    id: string;
    name: string;
  };
};

export type ProjectRoomInvitationCreateRequest = {
  inviteeUserId: string;
  role?: "MEMBER";
};

export type ProjectRoomInvitationResponse = {
  createdAt: string;
  id: string;
  inviteeUserId: string;
  inviterUserId: string;
  role: "MEMBER";
  roomId: string;
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
