import { apiRequest } from "@/lib/api/client";
import type {
  VoiceMicStatusUpdateRequest,
  VoiceParticipantResponse,
  VoiceRoomCreateRequest,
  VoiceRoomResponse,
  VoiceTokenResponse,
} from "@/types/api/voice";

export const voiceApi = {
  createRoom(body: VoiceRoomCreateRequest) {
    return apiRequest<VoiceRoomResponse>("/api/voice/rooms", {
      body,
      method: "POST",
    });
  },

  getRoom(voiceRoomId: string) {
    return apiRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}`);
  },

  getOpenRoomByChatRoomId(chatRoomId: string) {
    return apiRequest<VoiceRoomResponse>(`/api/voice/rooms?chatRoomId=${encodeURIComponent(chatRoomId)}`);
  },

  getToken(voiceRoomId: string) {
    return apiRequest<VoiceTokenResponse>(`/api/voice/rooms/${voiceRoomId}/token`, {
      method: "POST",
    });
  },

  updateMicStatus(voiceRoomId: string, body: VoiceMicStatusUpdateRequest) {
    return apiRequest<VoiceParticipantResponse>(`/api/voice/rooms/${voiceRoomId}/mic`, {
      body,
      method: "PATCH",
    });
  },

  leave(voiceRoomId: string) {
    return apiRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}/leave`, {
      method: "PATCH",
    });
  },

  decline(voiceRoomId: string) {
    return apiRequest<void>(`/api/voice/rooms/${voiceRoomId}/decline`, {
      method: "PATCH",
    });
  },

  end(voiceRoomId: string) {
    return apiRequest<VoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}/end`, {
      method: "PATCH",
    });
  },
} as const;
