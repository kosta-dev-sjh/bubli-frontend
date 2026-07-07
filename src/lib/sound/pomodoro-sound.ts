"use client";

// 뽀모도로 마무리 알림음 중앙 재생 유틸.
// - 파일: public/sounds/bubli-pomodoro.mp3 (팀 제공 음원)
// - 재생 시점(UX 기준): 집중 페이즈 "남은 60초" 경계를 지나는 순간 1회.
//   퍼센트 기준(예: 5%)은 집중 길이에 따라 알림 시점이 널뛰어서(90분이면 4분 30초 전
//   5분이면 15초 전) 예측이 안 된다. 고정 60초는 어떤 길이에서도 "이제 마무리"라는
//   신호로 일관되고 타이머 UX 관례와도 맞는다. 25분 기본 기준으로는 약 4% 지점이다.
// - 알림음 무음 설정(notification-sound의 muted)을 그대로 존중한다.
// - 같은 페이즈에서 두 번 울리지 않도록 페이즈 마감시각 기준으로 1회만 재생한다.

import { isNotificationSoundMuted } from "@/lib/sound/notification-sound";

export const POMODORO_ENDING_SOUND_SECONDS = 60;

const SOUND_SRC = "/sounds/bubli-pomodoro.mp3";
const CUE_CHANNEL = "bubli:pomodoro-ending-sound";
const VOLUME = 0.7;

let baseAudio: HTMLAudioElement | null = null;
let cueChannel: BroadcastChannel | null = null;
let lastCueKey: string | null = null;
let pendingCueKey: string | null = null;
let playingCueKey: string | null = null;

function canPlay(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function ensureBaseAudio(): HTMLAudioElement | null {
  if (!canPlay()) return null;
  if (!baseAudio) {
    baseAudio = new Audio(SOUND_SRC);
    baseAudio.preload = "auto";
    baseAudio.volume = VOLUME;
    baseAudio.addEventListener("ended", () => {
      playingCueKey = null;
      if (baseAudio) baseAudio.currentTime = 0;
    });
  }
  return baseAudio;
}

function ensureCueChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!cueChannel) {
    cueChannel = new BroadcastChannel(CUE_CHANNEL);
    cueChannel.onmessage = (event: MessageEvent<{ cueKey?: string; type?: string }>) => {
      if (event.data?.type !== "played" || !event.data.cueKey) return;
      lastCueKey = event.data.cueKey;
    };
  }
  return cueChannel;
}

function broadcastCueKey(key: string): void {
  ensureCueChannel()?.postMessage({ cueKey: key, type: "played" });
}

export function stopPomodoroEndingSound(): void {
  const audio = baseAudio;
  pendingCueKey = null;
  playingCueKey = null;
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

/**
 * 집중 페이즈 틱마다 호출한다. 남은 초가 60초 경계 안으로 들어온 순간에만 1회 재생한다.
 * cueKey는 페이즈를 구분하는 값(phaseEndsAt 타임스탬프)이라 같은 페이즈 재진입 시 중복 재생을 막는다.
 */
export async function maybePlayPomodoroEndingSound(
  remainingSeconds: number,
  cueKey: number | null,
  options: { onPlayed?: () => void } = {},
): Promise<boolean> {
  if (!canPlay() || isNotificationSoundMuted()) return false;
  if (cueKey === null) return false;
  if (remainingSeconds > POMODORO_ENDING_SOUND_SECONDS || remainingSeconds <= 0) return false;

  ensureCueChannel();
  const key = String(cueKey);
  if (lastCueKey === key) return false;
  if (pendingCueKey === key) return false;

  const node = ensureBaseAudio();
  if (!node) return false;
  if (playingCueKey && playingCueKey !== key) stopPomodoroEndingSound();
  if (!node.paused && playingCueKey === key) return true;
  if (!node.paused) return false;
  pendingCueKey = key;
  playingCueKey = key;
  node.currentTime = 0;
  node.volume = VOLUME;
  try {
    await node.play();
    pendingCueKey = null;
    lastCueKey = key;
    broadcastCueKey(key);
    options.onPlayed?.();
    return true;
  } catch {
    pendingCueKey = null;
    playingCueKey = null;
    return false;
  }
}
