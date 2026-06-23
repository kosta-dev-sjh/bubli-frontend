import { apiRequest } from "@/lib/api/client";
import type { VoiceTokenResponse } from "@/types/api/voice";

export const voiceApi = {
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
