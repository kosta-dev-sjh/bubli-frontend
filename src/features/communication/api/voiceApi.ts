import { apiRequest } from "@/lib/api/client";
import type { VoiceRoomCreateRequest, VoiceRoomResponse, VoiceTokenResponse } from "@/types/api/voice";

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

  getToken(voiceRoomId: string) {
    return apiRequest<VoiceTokenResponse>(`/api/voice/rooms/${voiceRoomId}/token`, {
      method: "POST",
    });
  },

  leave(voiceRoomId: string) {
    return apiRequest<null>(`/api/voice/rooms/${voiceRoomId}/leave`, {
      method: "PATCH",
    });
  },

  end(voiceRoomId: string) {
    return apiRequest<null>(`/api/voice/rooms/${voiceRoomId}/end`, {
      method: "PATCH",
    });
  },
} as const;
