import { apiRequest } from "@/lib/api/client";
import type {
  ProjectRoomInvitationCreateRequest,
  ProjectRoomInvitationPageResponse,
  ProjectRoomInvitationResponse,
  ProjectRoomMemberPageResponse,
  ProjectRoomMemberResponse,
  ProjectRoomMemberRoleUpdateRequest,
  ProjectRoomPageResponse,
  ProjectRoomResponse,
  ProjectRoomUpsertRequest,
} from "@/types/api/projectRoom";

export const projectRoomApi = {
  list() {
    return apiRequest<ProjectRoomPageResponse>("/api/project-rooms");
  },

  create(body: ProjectRoomUpsertRequest) {
    return apiRequest<ProjectRoomResponse>("/api/project-rooms", {
      body,
      method: "POST",
    });
  },

  get(roomId: string) {
    return apiRequest<ProjectRoomResponse>(`/api/project-rooms/${roomId}`);
  },

  update(roomId: string, body: Partial<ProjectRoomUpsertRequest>) {
    return apiRequest<ProjectRoomResponse>(`/api/project-rooms/${roomId}`, {
      body,
      method: "PATCH",
    });
  },

  close(roomId: string) {
    return apiRequest<ProjectRoomResponse>(`/api/project-rooms/${roomId}/close`, {
      method: "PATCH",
    });
  },

  getMembers(roomId: string) {
    return apiRequest<ProjectRoomMemberPageResponse>(`/api/project-rooms/${roomId}/members`);
  },

  createInvitation(roomId: string, body: ProjectRoomInvitationCreateRequest) {
    return apiRequest<ProjectRoomInvitationResponse>(`/api/project-rooms/${roomId}/invitations`, {
      body,
      method: "POST",
    });
  },

  getInvitations(roomId: string) {
    return apiRequest<ProjectRoomInvitationPageResponse>(`/api/project-rooms/${roomId}/invitations`);
  },

  acceptInvitation(invitationId: string) {
    return apiRequest<ProjectRoomInvitationResponse>(`/api/invitations/${invitationId}/accept`, {
      method: "PATCH",
    });
  },

  cancelInvitation(invitationId: string) {
    return apiRequest<ProjectRoomInvitationResponse>(`/api/invitations/${invitationId}/cancel`, {
      method: "PATCH",
    });
  },

  updateMemberRole(roomId: string, userId: string, body: ProjectRoomMemberRoleUpdateRequest) {
    return apiRequest<ProjectRoomMemberResponse>(`/api/project-rooms/${roomId}/members/${userId}`, {
      body,
      method: "PATCH",
    });
  },

  removeMember(roomId: string, userId: string) {
    return apiRequest<null>(`/api/project-rooms/${roomId}/members/${userId}`, {
      method: "DELETE",
    });
  },
} as const;
