"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./emoji-splash-layer.module.css";

// ---------------------------------------------------------------------------
// 이모지 퐁퐁(셋로그 스타일) — 열려 있는 대화방에서 "이모지만"으로 된 메시지가
// 도착하면(내 것/남의 것 모두) 스레드 우하단 위로 이모지가 퐁퐁 떠오른다.
//
// 이벤트 계약(위젯 미러링 훅):
// - window에 CustomEvent("bubli:emoji-splash", { detail: EmojiSplashDetail })를 발행한다.
// - 웹/하이브리드 앱에서는 <EmojiSplashLayer>가 이 이벤트를 구독해 오버레이를 그린다.
// - [TAURI WIDGET HOOK] 데스크톱 위젯 레이어가 나중에 같은 이벤트를 구독해
//   데스크톱 오버레이 창(항상 위 투명 창)으로 미러링할 수 있다.
//   지금은 웹 오버레이만 구현하고, 데스크톱 오버레이 창은 만들지 않는다.
//   미러링 시에는 detail을 그대로 Tauri 이벤트(emit)로 릴레이하면 된다.
// ---------------------------------------------------------------------------

export const EMOJI_SPLASH_EVENT = "bubli:emoji-splash";

export type EmojiSplashDetail = {
  /** 이벤트가 발생한 채팅방 — 열려 있는 방과 다르면 레이어가 무시한다. */
  chatRoomId: string;
  /** 감지된 이모지(그래핌 클러스터) 목록, 1~5개. */
  emojis: string[];
  /** 중복 발행 방지용 메시지 ID. */
  messageId: string;
  /** 발신자 ID(없으면 null) — 여러 발신자의 스플래시가 겹겹이 쌓일 수 있다. */
  senderId: string | null;
};

/** 이모지 퐁퐁 이벤트 발행 — 채팅 실시간 수신/전송 경로에서 호출한다. */
export function dispatchEmojiSplash(detail: EmojiSplashDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EmojiSplashDetail>(EMOJI_SPLASH_EVENT, { detail }));
}

// 그래핌 단위 분해 — ZWJ 시퀀스(👩‍💻)나 VS16(✌️) 조합이 한 덩어리로 유지되게 한다.
function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(
      (segment) => segment.segment,
    );
  }
  return Array.from(text);
}

// 한 클러스터가 이모지인지 — 픽토그램으로 시작하고, 나머지는 이모지 구성 문자
// (VS16/스킨톤 등 Emoji_Component)나 ZWJ+픽토그램 연결만 허용한다.
const EMOJI_CLUSTER_PATTERN = /^\p{Extended_Pictographic}(?:\p{Emoji_Component}|\u200D\p{Extended_Pictographic})*$/u;

export const EMOJI_SPLASH_MAX_EMOJIS = 5;

/**
 * 메시지 텍스트가 "이모지만"(공백 제외 1~5개의 이모지 클러스터)이면 이모지 배열을,
 * 아니면 null을 반환한다. 자체 이모지 피커 세트를 포함한 일반 유니코드 이모지를 감지한다.
 */
export function extractEmojiSplashEmojis(text: string): string[] | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return null;

  const clusters = splitGraphemes(compact);
  if (clusters.length === 0 || clusters.length > EMOJI_SPLASH_MAX_EMOJIS) return null;
  if (!clusters.every((cluster) => EMOJI_CLUSTER_PATTERN.test(cluster))) return null;
  return clusters;
}

type SplashParticle = {
  delayMs: number;
  driftPx: number;
  durationMs: number;
  emoji: string;
  id: number;
  risePx: number;
  xPercent: number;
};

// 동시에 떠 있는 파티클 상한 — 여러 명이 연달아 보내도 화면을 덮지 않게 한다.
const MAX_CONCURRENT_PARTICLES = 12;
// 한 이벤트 안에서 이모지끼리 시차를 둔다(퐁, 퐁, 퐁).
const STAGGER_MS = 130;
const BASE_DURATION_MS = 2400;

let particleSerial = 0;

/**
 * 채팅 스레드 우하단에 떠오르는 이모지 퐁퐁 오버레이.
 * 스레드 패널 안(메시지 뷰포트 바로 아래)에 렌더하면 레이아웃 영향 없이
 * 컴포저 위쪽 220×380px 영역에서 이모지가 떠오른다.
 * 순수 장식 레이어라 스크린리더에는 숨긴다.
 */
export function EmojiSplashLayer({ chatRoomId }: { chatRoomId: string | null }) {
  const [particles, setParticles] = useState<SplashParticle[]>([]);

  const removeParticle = useCallback((id: number) => {
    setParticles((current) => (current.some((item) => item.id === id) ? current.filter((item) => item.id !== id) : current));
  }, []);

  // 방이 바뀌면 구독을 새로 걸어 해당 방 이벤트만 받는다(이전 방 파티클은 수명이 짧아 자연 소멸).
  useEffect(() => {
    if (!chatRoomId) return;

    function handleSplash(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as EmojiSplashDetail | null) : null;
      if (!detail || !Array.isArray(detail.emojis) || detail.emojis.length === 0) return;
      if (detail.chatRoomId !== chatRoomId) return;

      setParticles((current) => {
        const room = MAX_CONCURRENT_PARTICLES - current.length;
        if (room <= 0) return current;

        const created = detail.emojis.slice(0, room).map((emoji, index): SplashParticle => ({
          delayMs: index * STAGGER_MS + Math.round(Math.random() * 60),
          driftPx: Math.round((Math.random() * 2 - 1) * 26), // 좌우 살랑임 폭
          durationMs: BASE_DURATION_MS + Math.round(Math.random() * 320),
          emoji,
          id: particleSerial++,
          risePx: 240 + Math.round(Math.random() * 80), // 240~320px 상승
          xPercent: 12 + Math.round(Math.random() * 70), // 필드 안 무작위 x
        }));
        return [...current, ...created];
      });
    }

    window.addEventListener(EMOJI_SPLASH_EVENT, handleSplash);
    return () => window.removeEventListener(EMOJI_SPLASH_EVENT, handleSplash);
  }, [chatRoomId]);

  // 애니메이션 종료 이벤트가 유실돼도(탭 백그라운드 등) 파티클이 남지 않게 타임아웃으로도 정리한다.
  useEffect(() => {
    if (particles.length === 0) return;
    const maxLifetime = Math.max(...particles.map((item) => item.delayMs + item.durationMs));
    const timer = window.setTimeout(() => {
      const now = particleSerial;
      setParticles((current) => current.filter((item) => item.id >= now));
    }, maxLifetime + 400);
    return () => window.clearTimeout(timer);
  }, [particles]);

  if (particles.length === 0) return null;

  return (
    <div aria-hidden="true" className={styles.anchor}>
      <div className={styles.field}>
        {particles.map((particle) => (
          <span
            className={styles.particle}
            key={particle.id}
            onAnimationEnd={() => removeParticle(particle.id)}
            style={
              {
                "--splash-delay": `${particle.delayMs}ms`,
                "--splash-drift": `${particle.driftPx}px`,
                "--splash-duration": `${particle.durationMs}ms`,
                "--splash-rise": `${particle.risePx}px`,
                "--splash-x": `${particle.xPercent}%`,
              } as React.CSSProperties
            }
          >
            {particle.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
