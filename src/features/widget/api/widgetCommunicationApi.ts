import { apiRequest } from "@/lib/api/client";
import type { ChatMessageListResponse, ChatMessageResponse, ChatRoomResponse, GroupChatRoomRequest, RoomAgentCommandRequest, RoomAgentCommandResponse } from "@/types/api/chat";
import type { FriendRequestApiResponse, FriendResponse } from "@/types/api/friend";
import type { VoiceParticipantResponse, VoiceRoomResponse, VoiceTokenResponse } from "@/types/api/voice";
import { withWidgetDevAuthHeaders } from "./widgetAuthHeaders";

export type WidgetChatRoomPageResponse = {
  hasNext: boolean;
  items: ChatRoomResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

function widgetCommunicationRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  return apiRequest<T>(path, {
    ...options,
    headers: withWidgetDevAuthHeaders(options.headers),
  });
}

export const widgetCommunicationApi = {
  listFriends() {
    return widgetCommunicationRequest<FriendResponse[]>("/api/friends");
  },

  listChatRooms() {
    return widgetCommunicationRequest<WidgetChatRoomPageResponse>("/api/chat/rooms?page=0&size=20");
  },

  getChatMessages(chatRoomId: string) {
    return widgetCommunicationRequest<ChatMessageListResponse>(`/api/chat/rooms/${chatRoomId}/messages?page=0&size=20`);
  },

  sendChatMessage(chatRoomId: string, request: { body: Record<string, unknown>; clientMessageId: string; messageType?: "TEXT" | "FILE" | "AGENT_COMMAND" }) {
    return widgetCommunicationRequest<ChatMessageResponse>(`/api/chat/rooms/${chatRoomId}/messages`, {
      body: {
        body: request.body,
        clientMessageId: request.clientMessageId,
        messageType: request.messageType ?? "TEXT",
      },
      method: "POST",
    });
  },

  runRoomAgentCommand(roomId: string, { clientMessageId, ...body }: RoomAgentCommandRequest) {
    return widgetCommunicationRequest<RoomAgentCommandResponse>(`/api/project-rooms/${roomId}/agent/commands`, {
      body,
      headers: {
        "Idempotency-Key": clientMessageId,
      },
      method: "POST",
    });
  },

  markChatRead(chatRoomId: string, lastReadSequence: number) {
    return widgetCommunicationRequest<null>(`/api/chat/rooms/${chatRoomId}/read`, {
      body: { lastReadSequence },
      method: "PATCH",
    });
  },

  createDirectRoom(friendUserId: string) {
    return widgetCommunicationRequest<ChatRoomResponse>("/api/chat/direct-rooms", {
      body: { targetUserId: friendUserId },
      method: "POST",
    });
  },

  createGroupRoom(body: GroupChatRoomRequest) {
    return widgetCommunicationRequest<ChatRoomResponse>("/api/chat/group-rooms", {
      body,
      method: "POST",
    });
  },

  sendFriendRequest(bubliId: string) {
    return widgetCommunicationRequest<FriendRequestApiResponse>("/api/friend-requests", {
      body: { bubliId },
      method: "POST",
    });
  },

  acceptFriendRequest(requestId: string) {
    return widgetCommunicationRequest<FriendRequestApiResponse>(`/api/friend-requests/${requestId}/accept`, {
      method: "PATCH",
    });
  },

  rejectFriendRequest(requestId: string) {
    return widgetCommunicationRequest<FriendRequestApiResponse>(`/api/friend-requests/${requestId}/reject`, {
      method: "PATCH",
    });
  },

  createVoiceRoom(params: { chatRoomId?: string; roomId?: string }) {
    return widgetCommunicationRequest<VoiceRoomResponse>("/api/voice/rooms", {
      body: params,
      method: "POST",
    });
  },

  getVoiceRoom(voiceRoomId: string) {
    return widgetCommunicationRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}`);
  },

  getOpenVoiceRoomByChatRoomId(chatRoomId: string) {
    return widgetCommunicationRequest<VoiceRoomResponse>(`/api/voice/rooms?chatRoomId=${encodeURIComponent(chatRoomId)}`);
  },

  getVoiceToken(voiceRoomId: string) {
    return widgetCommunicationRequest<VoiceTokenResponse>(`/api/voice/rooms/${voiceRoomId}/token`, {
      method: "POST",
    });
  },

  updateMicStatus(voiceRoomId: string, micStatus: "MUTED" | "UNMUTED") {
    return widgetCommunicationRequest<VoiceParticipantResponse>(`/api/voice/rooms/${voiceRoomId}/mic`, {
      body: { micStatus },
      method: "PATCH",
    });
  },

  leaveVoiceRoom(voiceRoomId: string) {
    return widgetCommunicationRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}/leave`, {
      method: "PATCH",
    });
  },

  declineVoiceRoom(voiceRoomId: string) {
    return widgetCommunicationRequest<void>(`/api/voice/rooms/${voiceRoomId}/decline`, {
      method: "PATCH",
    });
  },

  endVoiceRoom(voiceRoomId: string) {
    return widgetCommunicationRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}/end`, {
      method: "PATCH",
    });
  },
} as const;
