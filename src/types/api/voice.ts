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
  id: string;
  joinedAt: string;
  leftAt?: string | null;
  status: VoiceParticipantStatus;
  userId: string;
  userName: string;
};

export type VoiceRoomResponse = {
  createdAt: string;
  id: string;
  livekitRoomName: string;
  participants: VoiceParticipantResponse[];
  roomId: string;
  status: VoiceRoomStatus;
};

export type VoiceMicStatusUpdateRequest = {
  micStatus: string;
};
