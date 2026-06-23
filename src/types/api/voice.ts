export type VoiceTokenResponse = {
  serverUrl: string;
  token: string;
  voiceRoomId: string;
  participantId: string;
  expiresAt: string;
};

export type VoiceRoomStatus = "OPEN" | "ENDED";

export type VoiceParticipantStatus = "JOINED" | "LEFT" | "DISCONNECTED";
