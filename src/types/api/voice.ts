export type VoiceTokenResponse = {
  serverUrl: string;
  token: string;
  voiceRoomId: string;
  participantId: string;
  expiresAt: string;
};

export type VoiceRoomStatus = "OPEN" | "ENDED";

export type VoiceParticipantStatus = "JOINED" | "LEFT" | "DISCONNECTED";

export type VoiceRoomCreateRequest = {
  roomId: string;
};

export type VoiceParticipantResponse = {
  joinedAt: string;
  leftAt?: string | null;
  name: string;
  status: VoiceParticipantStatus;
  userId: string;
};

export type VoiceRoomResponse = {
  id: string;
  livekitRoomName: string;
  participants: VoiceParticipantResponse[];
  roomId: string;
  status: VoiceRoomStatus;
};
