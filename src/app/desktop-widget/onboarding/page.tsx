"use client";

import { CircleDashed } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  WidgetTutorialScene,
  WidgetTutorialSceneDefs,
  type WidgetTutorialSceneKind,
} from "@/features/onboarding/components/widget-tutorial";
import {
  completeWidgetTutorial,
  readStoredOnboarding,
  saveDesktopWidgetStartupPreference,
  type DesktopWidgetStartupMode,
} from "@/features/onboarding/lib/onboarding-storage";
import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { type MessageKey, useI18n } from "@/lib/i18n";

import styles from "./page.module.css";

type OverlayStep = {
  body: MessageKey;
  kind?: "choice";
  scene: WidgetTutorialSceneKind | null;
  title: MessageKey;
};

const ONBOARDING_STEPS: OverlayStep[] = [
  {
    scene: "welcome",
    title: "onboarding.desktopOverlay.welcome.title",
    body: "onboarding.desktopOverlay.welcome.body",
  },
  {
    scene: "bubble",
    title: "onboarding.desktopOverlay.bubble.title",
    body: "onboarding.desktopOverlay.bubble.body",
  },
  {
    scene: "bar",
    title: "onboarding.desktopOverlay.bar.title",
    body: "onboarding.desktopOverlay.bar.body",
  },
  {
    scene: "room",
    title: "onboarding.desktopOverlay.room.title",
    body: "onboarding.desktopOverlay.room.body",
  },
  {
    scene: "modes",
    title: "onboarding.desktopOverlay.modes.title",
    body: "onboarding.desktopOverlay.modes.body",
  },
  {
    scene: null,
    title: "onboarding.desktopOverlay.environment.title",
    body: "onboarding.desktopOverlay.environment.body",
    kind: "choice",
  },
  {
    scene: "ready",
    title: "onboarding.desktopOverlay.ready.title",
    body: "onboarding.desktopOverlay.ready.body",
  },
];

// 단계별 라이브 쇼케이스 — 스크림이 반투명이므로 실제 위젯 창을 열어 오버레이 뒤로 비쳐 보이게 한다.
// SVG 그림만으로 설명하지 않고 "진짜 위젯"을 한 개씩 데려와 소개하는 게 목적이다.
// bar 단계는 위젯 바가 이미 떠 있으므로 따로 열지 않는다(no-op).
const DEMO_WINDOWS_BY_SCENE: Partial<Record<WidgetTutorialSceneKind, WidgetWindowOpenInput>> = {
  bubble: { bubbleType: "menu", windowId: "menu" },
  modes: { bubbleType: "timer", windowId: "timer" },
};

const STARTUP_WINDOWS_BY_MODE: Record<Exclude<DesktopWidgetStartupMode, "bar">, WidgetWindowOpenInput[]> = {
  board: [
    { bubbleType: "todo", windowId: "todo" },
    { bubbleType: "agent", windowId: "agent" },
    { bubbleType: "schedule", windowId: "schedule" },
    { bubbleType: "timer", windowId: "timer" },
  ],
  cascade: [
    { bubbleType: "todo", windowId: "todo" },
    { bubbleType: "agent", windowId: "agent" },
    { bubbleType: "timer", windowId: "timer" },
  ],
};

const STARTUP_CHOICES: Array<{
  body: MessageKey;
  mode: DesktopWidgetStartupMode;
  title: MessageKey;
}> = [
  {
    mode: "bar",
    title: "onboarding.desktopOverlay.environment.bar.title",
    body: "onboarding.desktopOverlay.environment.bar.body",
  },
  {
    mode: "board",
    title: "onboarding.desktopOverlay.environment.board.title",
    body: "onboarding.desktopOverlay.environment.board.body",
  },
  {
    mode: "cascade",
    title: "onboarding.desktopOverlay.environment.cascade.title",
    body: "onboarding.desktopOverlay.environment.cascade.body",
  },
];

export default function DesktopWidgetOnboardingPage() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [startupMode, setStartupMode] = useState<DesktopWidgetStartupMode>("bar");
  // 튜토리얼이 "직접 연" 데모 창만 기억한다. 원래 떠 있던 사용자 창은 건드리지 않기 위해서다.
  const openedDemoWindowIdsRef = useRef<Set<string>>(new Set());

  // 튜토리얼이 연 데모 창 정리 — 시작 환경 적용 전에 닫아야 데모 잔상이 남지 않는다.
  // (board/cascade가 다시 여는 창은 applyStartupMode에서 새로 열리므로 먼저 닫아도 안전하다.)
  const closeDemoWindows = useCallback(async () => {
    if (!isTauriRuntime()) return;
    const windowIds = Array.from(openedDemoWindowIdsRef.current);
    openedDemoWindowIdsRef.current.clear();
    await Promise.all(
      windowIds.map((windowId) => tauriCommands.closeWidgetWindow({ windowId }).catch(() => undefined)),
    );
  }, []);

  // 단계 진입 시 해당 단계의 실제 위젯 창을 연다. 모든 Tauri 호출은 실패해도
  // 튜토리얼 진행을 막지 않도록 조용히 삼킨다(웹/스토리북 등 비-Tauri 환경 방어 포함).
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const scene = ONBOARDING_STEPS[stepIndex]?.scene;
    const demo = scene ? DEMO_WINDOWS_BY_SCENE[scene] : undefined;
    if (!demo?.windowId) return;
    const demoWindowId = demo.windowId;
    let cancelled = false;

    void (async () => {
      // 이미 우리가 연 창이면 다시 열지 않는다(뒤로 갔다가 다시 온 경우).
      if (openedDemoWindowIdsRef.current.has(demoWindowId)) return;
      // 사용자가 원래 열어둔 창이면 열지도, 나중에 닫지도 않는다(최선 노력 판별).
      const existing = await tauriCommands.getWidgetWindowState({ windowId: demoWindowId }).catch(() => null);
      if (cancelled || existing?.windowVisible) return;

      const activeRoom = await tauriCommands.readActiveProjectRoom().catch(() => null);
      if (cancelled) return;
      await tauriCommands
        .openWidgetWindows({
          windows: [{ ...demo, mode: "DEFAULT", selectedRoomId: activeRoom?.roomId ?? null }],
        })
        .catch(() => undefined);
      openedDemoWindowIdsRef.current.add(demoWindowId);
    })();

    return () => {
      cancelled = true;
    };
  }, [stepIndex]);

  const applyStartupMode = useCallback(async (mode: DesktopWidgetStartupMode) => {
    const activeRoom = await tauriCommands.readActiveProjectRoom().catch(() => null);
    const selectedRoomId = activeRoom?.roomId ?? null;
    await tauriCommands.seedWidgetBarItems({ selectedRoomId }).catch(() => undefined);
    if (mode === "bar") return;

    const windows = STARTUP_WINDOWS_BY_MODE[mode].map((window) => ({
      ...window,
      mode: "DEFAULT" as const,
      selectedRoomId,
    }));
    await tauriCommands.openWidgetWindows({ windows }).catch(() => undefined);
    await tauriCommands
      .arrangeWidgetWindows({ layout: mode === "board" ? "board" : "cascade" })
      .catch(() => undefined);
  }, []);

  const closeOverlay = useCallback((mode: DesktopWidgetStartupMode = startupMode) => {
    const stored = readStoredOnboarding();
    if (stored?.userId) {
      saveDesktopWidgetStartupPreference(stored.userId, mode);
      completeWidgetTutorial(stored.userId);
    }

    // 데모 창을 먼저 닫고 나서 사용자가 고른 시작 환경을 적용한다.
    // 순서가 반대면 board/cascade로 연 창을 데모 정리가 도로 닫아버릴 수 있다.
    void closeDemoWindows().then(() => applyStartupMode(mode));
    void tauriCommands.closeOnboardingOverlay();
  }, [applyStartupMode, closeDemoWindows, startupMode]);

  const nextStep = useCallback(() => {
    setStepIndex((current) => {
      if (current >= ONBOARDING_STEPS.length - 1) {
        closeOverlay();
        return current;
      }
      return current + 1;
    });
  }, [closeOverlay]);

  const prevStep = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const step = useMemo(() => ONBOARDING_STEPS[stepIndex], [stepIndex]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlay();
      }
    };

    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [closeOverlay]);

  return (
    <div className={styles.overlay} role="dialog" aria-label={t("onboarding.desktopOverlay.aria")}>
      <WidgetTutorialSceneDefs />
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={styles.card}
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        transition={reduceMotion ? { duration: 0 } : { damping: 28, stiffness: 250, type: "spring" }}
      >
        <div className={styles.gemRow}>
          <CircleDashed aria-hidden className={styles.gem} size={54} />
          <p className={styles.progress}>
            {t("onboarding.desktopOverlay.progress", { current: stepIndex + 1, total: ONBOARDING_STEPS.length })}
          </p>
          <button className={styles.skip} onClick={() => closeOverlay("bar")} type="button">
            {t("onboarding.desktopOverlay.skip")}
          </button>
        </div>

        {step.scene ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.scene}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            key={step.scene}
            transition={reduceMotion ? { duration: 0 } : { damping: 26, stiffness: 240, type: "spring" }}
          >
            <WidgetTutorialScene scene={step.scene} />
          </motion.div>
        ) : null}
        <h1 className={styles.title}>{t(step.title)}</h1>
        <p className={styles.body}>{t(step.body)}</p>
        {step.kind === "choice" ? (
          <div className={styles.choiceGrid} role="radiogroup" aria-label={t("onboarding.desktopOverlay.environment.aria")}>
            {STARTUP_CHOICES.map((choice) => {
              const selected = startupMode === choice.mode;
              return (
                <button
                  aria-checked={selected}
                  className={styles.choiceCard}
                  data-selected={selected ? "true" : "false"}
                  key={choice.mode}
                  onClick={() => setStartupMode(choice.mode)}
                  role="radio"
                  type="button"
                >
                  <span className={styles.choicePreview} data-mode={choice.mode} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{t(choice.title)}</strong>
                  <span>{t(choice.body)}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={styles.footer}>
          {stepIndex > 0 ? (
            <Button onClick={prevStep} size="lg" type="button" variant="secondary">
              {t("onboarding.back")}
            </Button>
          ) : null}
          <Button onClick={nextStep} size="lg" variant="primary">
            {stepIndex >= ONBOARDING_STEPS.length - 1 ? t("onboarding.desktopOverlay.done") : t("onboarding.desktopOverlay.next")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
