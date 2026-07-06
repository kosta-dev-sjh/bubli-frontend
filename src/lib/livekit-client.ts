import { Room, RoomEvent, Track } from "livekit-client";
import type { RemoteTrack } from "livekit-client";

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

// LiveKit은 원격 트랙을 구독해도 오디오를 자동 재생하지 않는다 —
// TrackSubscribed에서 직접 <audio> 엘리먼트를 만들어 DOM에 붙여야 실제로 들린다.
function attachRemoteAudioTrack(track: RemoteTrack) {
  if (track.kind !== Track.Kind.Audio) return;
  const element = track.attach();
  element.dataset.livekitAudioTrack = track.sid ?? "";
  element.autoplay = true;
  document.body.appendChild(element);
}

function detachAllRemoteAudio(room: Room) {
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => {
      publication.track?.detach().forEach((element) => element.remove());
    });
  });
}

export async function connectLiveKitRoom(voiceRoomId: string, token: VoiceTokenResponse): Promise<Room> {
  if (activeRoom && activeVoiceRoomId === voiceRoomId) {
    return activeRoom;
  }

  await disconnectLiveKitRoom();

  const room = new Room();
  room.on(RoomEvent.TrackSubscribed, (track) => attachRemoteAudioTrack(track));
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((element) => element.remove());
  });

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
    detachAllRemoteAudio(room);
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
    detachAllRemoteAudio(room);
    await room.disconnect();
  }
}
