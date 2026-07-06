"use client";

// 알림음(버블 "뽑!" 팝) 중앙 재생 유틸.
// - 파일: public/sounds/bubble-pop-soft.mp3 (코드로 합성한 오리지널 사운드, 라이선스 자유)
// - 알림센터 새 알림 도착(app-shell)·채팅 메시지 수신(chat) 등 프론트 알림 지점에서 공통 호출한다.
// - 브라우저 자동재생 정책상 사용자 상호작용 전에는 play()가 거부될 수 있어 조용히 무시한다.
// - 연속 알림이 겹쳐 시끄럽지 않도록 최소 간격(스로틀)을 둔다.
// - 브라우저 영속 저장소는 쓰지 않는다(무음 설정은 모듈 메모리 플래그) → tauri-boundaries 가드 프리.

const SOUND_SRC = "/sounds/bubble-pop-soft.mp3";
const MIN_INTERVAL_MS = 700;
const DEFAULT_VOLUME = 0.5;

let baseAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;
let muted = false;
let volume = DEFAULT_VOLUME;

function canPlay(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function ensureBaseAudio(): HTMLAudioElement | null {
  if (!canPlay()) return null;
  if (!baseAudio) {
    baseAudio = new Audio(SOUND_SRC);
    baseAudio.preload = "auto";
    baseAudio.volume = volume;
  }
  return baseAudio;
}

/** 알림음 사전 로드(선택). 사용자 상호작용 직후 호출하면 첫 알림의 지연을 줄인다. */
export function primeNotificationSound(): void {
  ensureBaseAudio();
}

/** 무음 여부 설정(설정 패널 등에서 연결 가능). */
export function setNotificationSoundMuted(next: boolean): void {
  muted = next;
}

export function isNotificationSoundMuted(): boolean {
  return muted;
}

/** 재생 볼륨(0~1) 설정. */
export function setNotificationSoundVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next));
  if (baseAudio) baseAudio.volume = volume;
}

/**
 * 알림음 1회 재생. 무음/스로틀/자동재생 거부는 조용히 무시한다.
 * 겹치는 알림도 끊기지 않도록 노드를 복제해 재생한다.
 */
export function playNotificationSound(): void {
  if (!canPlay() || muted) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  const base = ensureBaseAudio();
  if (!base) return;

  const node = base.cloneNode(true) as HTMLAudioElement;
  node.volume = volume;
  const result = node.play();
  if (result && typeof result.catch === "function") {
    // 자동재생 정책(사용자 제스처 이전) 등으로 거부되면 무시한다.
    result.catch(() => undefined);
  }
}
