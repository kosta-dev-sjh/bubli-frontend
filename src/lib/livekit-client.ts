import { Room, RoomEvent, Track } from "livekit-client";
import type { Participant, RemoteTrack } from "livekit-client";

import type { VoiceTokenResponse } from "@/types/api/voice";

// 웹 앱 전역 LiveKit 오디오 연결 싱글턴.
// chat-realtime.ts의 STOMP 싱글턴과 동일한 이유로 모듈 레벨에 둔다 —
// /app/chat 컴포넌트가 언마운트(페이지 이동)되어도 통화가 끊기면 안 되므로,
// 특정 컴포넌트의 생명주기에 묶지 않는다.

let activeRoom: Room | null = null;
let activeVoiceRoomId: string | null = null;

export type LiveKitVoiceConnectionEvent = {
  kind: "connected" | "disconnected" | "reconnecting" | "reconnected";
  voiceRoomId: string;
};

type ConnectionListener = (event: LiveKitVoiceConnectionEvent) => void;
const connectionListeners = new Set<ConnectionListener>();

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

// "말하는 중" 표시 — LiveKit 토큰 발급 시 identity를 userId로 설정하므로(백엔드 JWT subject=userId),
// participant.identity를 그대로 우리 쪽 userId로 사용할 수 있다. 로컬/원격 참여자 모두 이 한 곳에서 처리된다.
type SpeakingListener = (speakingUserIds: ReadonlySet<string>) => void;
const speakingListeners = new Set<SpeakingListener>();
let currentSpeakingUserIds = new Set<string>();

function notifySpeakingListeners() {
  speakingListeners.forEach((listener) => listener(currentSpeakingUserIds));
}

function notifyConnectionListeners(event: LiveKitVoiceConnectionEvent) {
  connectionListeners.forEach((listener) => listener(event));
}

function handleActiveSpeakersChanged(speakers: Participant[]) {
  currentSpeakingUserIds = new Set(speakers.map((participant) => participant.identity));
  notifySpeakingListeners();
}

export function onActiveSpeakersChanged(listener: SpeakingListener): () => void {
  speakingListeners.add(listener);
  listener(currentSpeakingUserIds);
  return () => {
    speakingListeners.delete(listener);
  };
}

export function onLiveKitVoiceConnectionChanged(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
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
  room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
  room.on(RoomEvent.Reconnecting, () => {
    notifyConnectionListeners({ kind: "reconnecting", voiceRoomId });
  });
  room.on(RoomEvent.Reconnected, () => {
    notifyConnectionListeners({ kind: "reconnected", voiceRoomId });
  });
  room.on(RoomEvent.Disconnected, () => {
    if (activeRoom !== room) return;
    activeRoom = null;
    activeVoiceRoomId = null;
    detachAllRemoteAudio(room);
    currentSpeakingUserIds = new Set();
    notifySpeakingListeners();
    notifyConnectionListeners({ kind: "disconnected", voiceRoomId });
  });

  activeRoom = room;
  activeVoiceRoomId = voiceRoomId;

  try {
    await room.connect(token.serverUrl, token.token);
    await room.localParticipant.setMicrophoneEnabled(true);
    notifyConnectionListeners({ kind: "connected", voiceRoomId });
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
  currentSpeakingUserIds = new Set();
  notifySpeakingListeners();
}
