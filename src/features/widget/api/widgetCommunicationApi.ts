import { apiRequest } from "@/lib/api/client";
import type { ChatMessageListResponse, ChatMessageResponse, ChatRoomResponse } from "@/types/api/chat";
import type { FriendResponse } from "@/types/api/friend";
import type { VoiceRoomResponse, VoiceTokenResponse } from "@/types/api/voice";
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

  createVoiceRoom(roomId: string) {
    return widgetCommunicationRequest<VoiceRoomResponse>("/api/voice/rooms", {
      body: { roomId },
      method: "POST",
    });
  },

  getVoiceRoom(voiceRoomId: string) {
    return widgetCommunicationRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}`);
  },

  getVoiceToken(voiceRoomId: string) {
    return widgetCommunicationRequest<VoiceTokenResponse>(`/api/voice/rooms/${voiceRoomId}/token`, {
      method: "POST",
    });
  },

  updateMicStatus(voiceRoomId: string, micStatus: "MUTED" | "UNMUTED") {
    return widgetCommunicationRequest<null>(`/api/voice/rooms/${voiceRoomId}/mic`, {
      body: { micStatus },
      method: "PATCH",
    });
  },

  leaveVoiceRoom(voiceRoomId: string) {
    return widgetCommunicationRequest<null>(`/api/voice/rooms/${voiceRoomId}/leave`, {
      method: "PATCH",
    });
  },
} as const;
