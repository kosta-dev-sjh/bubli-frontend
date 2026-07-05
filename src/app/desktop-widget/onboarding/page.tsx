"use client";

import { CircleDashed } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { completeTutorial, readStoredOnboarding } from "@/features/onboarding/lib/onboarding-storage";
import { tauriCommands } from "@/lib/tauri/commands";
import { type MessageKey, useI18n } from "@/lib/i18n";

import styles from "./page.module.css";

type OverlayStep = {
  body: MessageKey;
  title: MessageKey;
};

const ONBOARDING_STEPS: OverlayStep[] = [
  {
    title: "onboarding.desktopOverlay.welcome.title",
    body: "onboarding.desktopOverlay.welcome.body",
  },
  {
    title: "onboarding.desktopOverlay.bubble.title",
    body: "onboarding.desktopOverlay.bubble.body",
  },
  {
    title: "onboarding.desktopOverlay.bar.title",
    body: "onboarding.desktopOverlay.bar.body",
  },
  {
    title: "onboarding.desktopOverlay.room.title",
    body: "onboarding.desktopOverlay.room.body",
  },
  {
    title: "onboarding.desktopOverlay.ready.title",
    body: "onboarding.desktopOverlay.ready.body",
  },
];

export default function DesktopWidgetOnboardingPage() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  const closeOverlay = useCallback(() => {
    const stored = readStoredOnboarding();
    if (stored?.userId) {
      completeTutorial(stored.userId);
    }

    void tauriCommands.closeOnboardingOverlay();
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((current) => {
      if (current >= ONBOARDING_STEPS.length - 1) {
        closeOverlay();
        return current;
      }
      return current + 1;
    });
  }, [closeOverlay]);

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
          <button className={styles.skip} onClick={closeOverlay} type="button">
            {t("onboarding.desktopOverlay.skip")}
          </button>
        </div>

        <h1 className={styles.title}>{t(step.title)}</h1>
        <p className={styles.body}>{t(step.body)}</p>

        <div className={styles.footer}>
          <Button onClick={nextStep} size="lg" variant="primary">
            {stepIndex >= ONBOARDING_STEPS.length - 1 ? t("onboarding.desktopOverlay.done") : t("onboarding.desktopOverlay.next")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
