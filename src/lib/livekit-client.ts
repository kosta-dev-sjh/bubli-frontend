import { Room } from "livekit-client";

import type { VoiceTokenResponse } from "@/types/api/voice";

// 웹 앱 전역 LiveKit 오디오 연결 싱글턴.
// chat-realtime.ts의 STOMP 싱글턴과 동일한 이유로 모듈 레벨에 둔다 —
// /app/chat 컴포넌트가 언마운트(페이지 이동)되어도 통화가 끊기면 안 되므로,
// 특정 컴포넌트의 생명주기에 묶지 않는다.

let activeRoom: Room | null = null;
let activeVoiceRoomId: string | null = null;

export function getActiveLiveKitRoom(): Room | null {
  return activeRoom;
}

export function getActiveLiveKitVoiceRoomId(): string | null {
  return activeVoiceRoomId;
}

export async function connectLiveKitRoom(voiceRoomId: string, token: VoiceTokenResponse): Promise<Room> {
  if (activeRoom && activeVoiceRoomId === voiceRoomId) {
    return activeRoom;
  }

  await disconnectLiveKitRoom();

  const room = new Room();
  activeRoom = room;
  activeVoiceRoomId = voiceRoomId;

  try {
    await room.connect(token.serverUrl, token.token);
    await room.localParticipant.setMicrophoneEnabled(true);
  } catch (error) {
    if (activeRoom === room) {
      activeRoom = null;
      activeVoiceRoomId = null;
    }
    room.disconnect();
    throw error;
  }

  return room;
}

export async function setLiveKitMicEnabled(enabled: boolean): Promise<void> {
  await activeRoom?.localParticipant.setMicrophoneEnabled(enabled);
}

export async function disconnectLiveKitRoom(): Promise<void> {
  const room = activeRoom;
  activeRoom = null;
  activeVoiceRoomId = null;
  if (room) {
    await room.disconnect();
  }
}
