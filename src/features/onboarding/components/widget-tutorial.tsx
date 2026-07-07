"use client";

// 위젯(데스크탑 버블) 전용 전체화면 튜토리얼 — 회원사이트 코치마크 투어와 완전히 분리된 별도 튜토리얼.
// 데스크탑 앱에서는 전체화면 Tauri 오버레이 창이 이 컴포넌트를 그대로 띄우고, 웹에서는 전체화면
// 모달로 띄운다(위젯을 설치하기 전에 미리 볼 수 있게). 시각 설명은 인라인 SVG로 그린다(이모지 금지).

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { type MessageKey, useI18n } from "@/lib/i18n";

import styles from "./widget-tutorial.module.css";

type WidgetTutorialStep = {
  scene: "welcome" | "bubble" | "bar" | "room" | "modes" | "ready";
  title: MessageKey;
  body: MessageKey;
};

const STEPS: WidgetTutorialStep[] = [
  { scene: "welcome", title: "widgetTutorial.welcome.title", body: "widgetTutorial.welcome.body" },
  { scene: "bubble", title: "widgetTutorial.bubble.title", body: "widgetTutorial.bubble.body" },
  { scene: "bar", title: "widgetTutorial.bar.title", body: "widgetTutorial.bar.body" },
  { scene: "room", title: "widgetTutorial.room.title", body: "widgetTutorial.room.body" },
  { scene: "modes", title: "widgetTutorial.modes.title", body: "widgetTutorial.modes.body" },
  { scene: "ready", title: "widgetTutorial.ready.title", body: "widgetTutorial.ready.body" },
];

export type WidgetTutorialProps = {
  onClose: () => void;
};

export function WidgetTutorial({ onClose }: WidgetTutorialProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index >= STEPS.length - 1;

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current >= STEPS.length - 1) {
        onClose();
        return current;
      }
      return current + 1;
    });
  }, [onClose]);

  const goPrev = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  const transition = useMemo(
    () => (reduceMotion ? { duration: 0 } : { damping: 26, stiffness: 240, type: "spring" as const }),
    [reduceMotion],
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t("widgetTutorial.aria")}>
      <div aria-hidden className={styles.orbA} />
      <div aria-hidden className={styles.orbB} />

      <div className={styles.frame}>
        <div className={styles.topbar}>
          <span className={styles.badge}>{t("widgetTutorial.badge")}</span>
          <button className={styles.skip} onClick={onClose} type="button">
            {t("widgetTutorial.skip")}
          </button>
        </div>

        <motion.div
          key={index}
          animate={{ opacity: 1, y: 0 }}
          className={styles.stage}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          transition={transition}
        >
          <div className={styles.scene}>
            <Scene scene={step.scene} />
          </div>
          <div className={styles.copy}>
            <h1 className={styles.title}>{t(step.title)}</h1>
            <p className={styles.body}>{t(step.body)}</p>
          </div>
        </motion.div>

        <div className={styles.controls}>
          <div className={styles.dots} aria-hidden>
            {STEPS.map((item, dotIndex) => (
              <span
                className={dotIndex === index ? [styles.dot, styles.dotActive].join(" ") : styles.dot}
                key={item.scene}
              />
            ))}
          </div>
          <div className={styles.buttons}>
            {index > 0 ? (
              <button className={styles.ghostBtn} onClick={goPrev} type="button">
                {t("widgetTutorial.prev")}
              </button>
            ) : null}
            <button className={styles.primaryBtn} onClick={goNext} type="button">
              {isLast ? t("widgetTutorial.done") : t("widgetTutorial.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 인라인 SVG 장면(브랜드 유리 톤, currentColor·stroke 기반) ----------

function Scene({ scene }: { scene: WidgetTutorialStep["scene"] }) {
  if (scene === "welcome") return <SceneWelcome />;
  if (scene === "bubble") return <SceneBubble />;
  if (scene === "bar") return <SceneBar />;
  if (scene === "room") return <SceneRoom />;
  if (scene === "modes") return <SceneModes />;
  return <SceneReady />;
}

// 화면 위에 떠 있는 유리 버블(방울)의 기본 모습.
function GlassBubble({ x, y, r, label }: { x: number; y: number; r: number; label?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className={styles.bubbleFill} />
      <circle cx={x} cy={y} r={r} className={styles.bubbleStroke} />
      <ellipse cx={x - r * 0.32} cy={y - r * 0.38} rx={r * 0.34} ry={r * 0.2} className={styles.bubbleHi} />
      {label ? (
        <text x={x} y={y + r * 0.14} textAnchor="middle" className={styles.svgGlyph}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

function SceneWelcome() {
  return (
    <svg viewBox="0 0 320 220" className={styles.svg} role="img" aria-hidden>
      <rect x="24" y="150" width="272" height="10" rx="5" className={styles.deskLine} />
      <GlassBubble x={160} y={98} r={52} label="B" />
      <GlassBubble x={82} y={140} r={20} />
      <GlassBubble x={244} y={132} r={26} />
    </svg>
  );
}

function SceneBubble() {
  return (
    <svg viewBox="0 0 320 220" className={styles.svg} role="img" aria-hidden>
      {/* 바탕(작업 화면) */}
      <rect x="18" y="24" width="284" height="172" rx="16" className={styles.canvas} />
      {/* 항상 떠 있는 방울 */}
      <GlassBubble x={236} y={72} r={34} />
      {/* 클릭하면 열리는 메뉴 오브 힌트(점선 링) */}
      <circle cx={236} cy={72} r={46} className={styles.dashRing} />
      <path d="M236 118 L236 150" className={styles.pointer} />
      <rect x="176" y="150" width="120" height="34" rx="12" className={styles.miniPanel} />
      <circle cx="196" cy="167" r="6" className={styles.miniDot} />
      <rect x="212" y="162" width="70" height="4" rx="2" className={styles.miniBar} />
      <rect x="212" y="171" width="46" height="4" rx="2" className={styles.miniBarSoft} />
    </svg>
  );
}

function SceneBar() {
  return (
    <svg viewBox="0 0 320 220" className={styles.svg} role="img" aria-hidden>
      <rect x="18" y="24" width="284" height="172" rx="16" className={styles.canvas} />
      {/* 접어둔 위젯이 모이는 바(pill) */}
      <rect x="52" y="150" width="216" height="40" rx="20" className={styles.barPill} />
      {["타이머", "메모", "할 일", "소통"].map((_, i) => (
        <g key={i}>
          <circle cx={82 + i * 52} cy={170} r={13} className={styles.barChip} />
          <circle cx={82 + i * 52} cy={170} r={5} className={styles.barChipDot} />
        </g>
      ))}
      {/* 올려두면 미리보기가 위로 뜨는 힌트 */}
      <rect x="118" y="70" width="84" height="52" rx="12" className={styles.previewCard} />
      <rect x="130" y="84" width="60" height="5" rx="2.5" className={styles.miniBar} />
      <rect x="130" y="96" width="40" height="5" rx="2.5" className={styles.miniBarSoft} />
      <path d="M160 122 L160 148" className={styles.pointer} />
    </svg>
  );
}

function SceneRoom() {
  const { t } = useI18n();
  return (
    <svg viewBox="0 0 320 220" className={styles.svg} role="img" aria-hidden>
      {/* 개인 / 프로젝트룸 두 컨텍스트 */}
      <rect x="24" y="40" width="128" height="140" rx="16" className={styles.canvas} />
      <rect x="168" y="40" width="128" height="140" rx="16" className={styles.canvasRoom} />
      <text x="88" y="66" textAnchor="middle" className={styles.svgCaption}>{t("widgetTutorial.scene.personal")}</text>
      <text x="232" y="66" textAnchor="middle" className={styles.svgCaptionRoom}>{t("widgetTutorial.scene.room")}</text>
      <GlassBubble x={88} y={112} r={26} />
      <GlassBubble x={232} y={112} r={26} />
      <rect x="52" y="150" width="72" height="6" rx="3" className={styles.miniBar} />
      <rect x="196" y="150" width="72" height="6" rx="3" className={styles.miniBarRoom} />
    </svg>
  );
}

function SceneModes() {
  const { t } = useI18n();
  const modes: { key: string; label: string; cls: string }[] = [
    { key: "default", label: t("widgetTutorial.scene.default"), cls: styles.modeDefault },
    { key: "translucent", label: t("widgetTutorial.scene.translucent"), cls: styles.modeTranslucent },
    { key: "ghost", label: t("widgetTutorial.scene.ghost"), cls: styles.modeGhost },
  ];
  return (
    <svg viewBox="0 0 320 220" className={styles.svg} role="img" aria-hidden>
      <rect x="18" y="24" width="284" height="172" rx="16" className={styles.canvas} />
      {modes.map((m, i) => (
        <g key={m.key}>
          <rect x={40 + i * 84} y="72" width="68" height="76" rx="16" className={m.cls} />
          <circle cx={74 + i * 84} cy={104} r={16} className={styles.modeBubble} />
          <text x={74 + i * 84} y={140} textAnchor="middle" className={styles.svgCaption}>{m.label}</text>
        </g>
      ))}
    </svg>
  );
}

function SceneReady() {
  return (
    <svg viewBox="0 0 320 220" className={styles.svg} role="img" aria-hidden>
      <circle cx="160" cy="104" r="56" className={styles.bubbleFill} />
      <circle cx="160" cy="104" r="56" className={styles.bubbleStroke} />
      <path d="M134 104 L154 124 L190 84" className={styles.check} />
      <rect x="96" y="176" width="128" height="8" rx="4" className={styles.miniBar} />
    </svg>
  );
}
