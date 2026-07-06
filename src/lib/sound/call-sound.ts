"use client";

// 통화 수신음(링톤) 재생 유틸. 수신 전화 UI가 뜨는 동안 반복 재생하고, 응답/거절/타임아웃 시 멈춘다.
// - 파일: public/sounds/bubli-calling.mp3 (사용자 업로드 원본).
// - 브라우저 자동재생 정책상 사용자 제스처 전에는 play()가 거부될 수 있어 조용히 무시한다.
// - 브라우저 영속 저장소는 쓰지 않는다(무음 플래그는 모듈 메모리) → tauri-boundaries 가드 프리.

const SOUND_SRC = "/sounds/bubli-calling.mp3";
const DEFAULT_VOLUME = 0.9;

let audio: HTMLAudioElement | null = null;
let muted = false;

function canPlay(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function ensureAudio(): HTMLAudioElement | null {
  if (!canPlay()) return null;
  if (!audio) {
    audio = new Audio(SOUND_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = DEFAULT_VOLUME;
  }
  return audio;
}

/** 수신음 반복 재생 시작. 이미 재생 중이면 처음부터 다시 울린다. */
export function startCallRingtone(): void {
  if (!canPlay() || muted) return;
  const node = ensureAudio();
  if (!node) return;
  try {
    node.currentTime = 0;
  } catch {
    // currentTime 설정 실패는 무시한다.
  }
  const result = node.play();
  if (result && typeof result.catch === "function") {
    // 자동재생 정책(사용자 제스처 이전) 등으로 거부되면 무시한다.
    result.catch(() => undefined);
  }
}

/** 수신음 정지(응답/거절/타임아웃 시 호출). */
export function stopCallRingtone(): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // 정지 실패는 무시한다.
  }
}

/** 무음 설정(설정 패널 등에서 연결 가능). 무음이면 즉시 정지한다. */
export function setCallRingtoneMuted(next: boolean): void {
  muted = next;
  if (next) stopCallRingtone();
}
