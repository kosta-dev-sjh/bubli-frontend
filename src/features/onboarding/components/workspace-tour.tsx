"use client";

// 워크스페이스 튜토리얼(코치 마크) — 딤 배경 + 대상 스포트라이트 컷아웃 + 툴팁 카드.
// 대상은 app-shell/대시보드에 붙인 data-tour 속성으로 찾고, 없는 단계는 자동으로 건너뛴다.
// (예: 홈 밖에서는 카드 편집 버튼이 없으므로 해당 단계를 넘긴다.)

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./workspace-tour.module.css";

type WorkspaceTourProps = {
  /** completed=true면 마지막 단계까지 봤다는 뜻(건너뛰기와 구분은 호출부 선택). */
  onClose: (completed: boolean) => void;
};

type TourStepDef = {
  bodyKey: MessageKey;
  /** null이면 화면 중앙 카드(스포트라이트 없음). */
  selector: string | null;
  titleKey: MessageKey;
};

// 회원사이트 전용 코치 마크 — 위젯 설명은 별도의 위젯 튜토리얼(전체화면)로 분리했다.
// 사이드바를 한 번에 가리키지 않고, 주요 탭을 위에서 아래로 하나씩 짚어가며 설명한다.
// (대상이 없는 단계는 자동으로 건너뛴다 — 예: 홈 밖에서는 카드 편집 버튼 단계를 넘긴다.)
const TOUR_STEPS: TourStepDef[] = [
  // 첫 단계는 대상 없이 중앙 카드로 "우리 사이트는 이런 서비스예요"를 먼저 소개한다(팀 아이디어).
  { bodyKey: "tour.welcome.body", selector: null, titleKey: "tour.welcome.title" },
  { bodyKey: "tour.sidebar.body", selector: '[data-tour="sidebar"]', titleKey: "tour.sidebar.title" },
  { bodyKey: "tour.calendar.body", selector: '[data-tour="nav-calendar"]', titleKey: "tour.calendar.title" },
  { bodyKey: "tour.projectRooms.body", selector: '[data-tour="nav-project-rooms"]', titleKey: "tour.projectRooms.title" },
  { bodyKey: "tour.resources.body", selector: '[data-tour="nav-resources"]', titleKey: "tour.resources.title" },
  { bodyKey: "tour.chat.body", selector: '[data-tour="nav-chat"]', titleKey: "tour.chat.title" },
  { bodyKey: "tour.agent.body", selector: '[data-tour="nav-agent"]', titleKey: "tour.agent.title" },
  { bodyKey: "tour.roomSwitcher.body", selector: '[data-tour="room-switcher"]', titleKey: "tour.roomSwitcher.title" },
  { bodyKey: "tour.cardEdit.body", selector: '[data-tour="card-edit"]', titleKey: "tour.cardEdit.title" },
];

// 홈 이동 직후(설정 > 다시 보기) 카드 편집 버튼처럼 늦게 나타나는 대상을 기다린다.
const TARGET_RETRY_LIMIT = 12;
const TARGET_RETRY_INTERVAL_MS = 150;
const SPOT_PADDING = 8;
const TOOLTIP_WIDTH = 330;
const TOOLTIP_HEIGHT = 200;
const TOOLTIP_GAP = 16;
const VIEWPORT_PAD = 16;

type SpotRect = { height: number; left: number; top: number; width: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function measure(element: HTMLElement): SpotRect {
  const rect = element.getBoundingClientRect();
  return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
}

// 대상 오른쪽 → 아래 → 위 순서로 여유 있는 자리에 툴팁을 놓는다.
function tooltipPosition(rect: SpotRect, viewportWidth: number, viewportHeight: number) {
  if (rect.left + rect.width + TOOLTIP_GAP + TOOLTIP_WIDTH + VIEWPORT_PAD <= viewportWidth) {
    return {
      left: rect.left + rect.width + TOOLTIP_GAP,
      top: clamp(rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2, VIEWPORT_PAD, viewportHeight - TOOLTIP_HEIGHT - VIEWPORT_PAD),
    };
  }

  const centeredLeft = clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, VIEWPORT_PAD, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PAD);
  if (rect.top + rect.height + TOOLTIP_GAP + TOOLTIP_HEIGHT + VIEWPORT_PAD <= viewportHeight) {
    return { left: centeredLeft, top: rect.top + rect.height + TOOLTIP_GAP };
  }

  return { left: centeredLeft, top: Math.max(VIEWPORT_PAD, rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT) };
}

export function WorkspaceTour({ onClose }: WorkspaceTourProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  // 현재 단계의 대상 확인이 끝났는지 — 단계 인덱스로 기록해 이전 단계의 잔상 렌더를 막는다.
  const [resolvedStep, setResolvedStep] = useState<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const step = TOUR_STEPS[stepIndex];

  const finish = useCallback(
    (completed: boolean) => {
      onClose(completed);
    },
    [onClose],
  );

  const goNext = useCallback(() => {
    directionRef.current = 1;
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finish(true);
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [finish, stepIndex]);

  const goPrev = useCallback(() => {
    if (stepIndex === 0) return;
    directionRef.current = -1;
    setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  // 단계 대상 찾기 — 잠깐 기다려도 없으면 진행 방향으로 자동 건너뛴다.
  // setState는 setTimeout 콜백에서만 호출한다(effect 본문 동기 setState 금지 규칙).
  useEffect(() => {
    let cancelled = false;
    let timerId: number | null = null;
    targetRef.current = null;

    const currentStep = TOUR_STEPS[stepIndex];
    const selector = currentStep.selector;
    let attempts = 0;

    const tryResolve = () => {
      if (cancelled) return;

      if (!selector) {
        setSpotRect(null);
        setResolvedStep(stepIndex);
        return;
      }

      const element = document.querySelector(selector);
      if (element instanceof HTMLElement && element.getClientRects().length > 0) {
        targetRef.current = element;
        element.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "nearest" });
        setSpotRect(measure(element));
        setResolvedStep(stepIndex);
        return;
      }

      attempts += 1;
      if (attempts < TARGET_RETRY_LIMIT) {
        timerId = window.setTimeout(tryResolve, TARGET_RETRY_INTERVAL_MS);
        return;
      }

      // 대상 없음 → 자동 건너뛰기. 양 끝을 넘어가면 종료한다.
      const nextIndex = stepIndex + directionRef.current;
      if (nextIndex < 0 || nextIndex >= TOUR_STEPS.length) {
        finish(nextIndex >= TOUR_STEPS.length);
        return;
      }
      setStepIndex(nextIndex);
    };

    timerId = window.setTimeout(tryResolve, 0);

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [finish, stepIndex]);

  const resolved = resolvedStep === stepIndex;

  // 리사이즈/스크롤 시 스포트라이트 위치를 다시 잰다.
  useEffect(() => {
    if (!resolved || !targetRef.current) return;

    const remeasure = () => {
      if (targetRef.current) setSpotRect(measure(targetRef.current));
    };

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [resolved]);

  // 단계가 준비되면 툴팁 카드로 포커스를 옮긴다(키보드 흐름).
  useEffect(() => {
    if (resolved) tooltipRef.current?.focus();
  }, [resolved, stepIndex]);

  if (!resolved) {
    // 대상 탐색 중 — 딤만 유지해 화면이 번쩍이지 않게 한다.
    return <div aria-hidden className={styles.searchingDim} />;
  }

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const tooltipPos = spotRect
    ? tooltipPosition(spotRect, viewportWidth, viewportHeight)
    : { left: viewportWidth / 2 - TOOLTIP_WIDTH / 2, top: viewportHeight / 2 - TOOLTIP_HEIGHT / 2 };
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      aria-label={t("tour.aria")}
      aria-modal="true"
      className={styles.overlay}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          finish(false);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goNext();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          goPrev();
        }
      }}
      role="dialog"
    >
      {/* 클릭 차단 레이어 — 투어 중 배경 조작을 막는다. */}
      <div aria-hidden className={styles.blocker} />

      {spotRect ? (
        <div
          aria-hidden
          className={styles.spotlight}
          style={{
            height: spotRect.height + SPOT_PADDING * 2,
            left: spotRect.left - SPOT_PADDING,
            top: spotRect.top - SPOT_PADDING,
            width: spotRect.width + SPOT_PADDING * 2,
          }}
        />
      ) : (
        <div aria-hidden className={styles.centerDim} />
      )}

      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={styles.tooltip}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 14 }}
        key={stepIndex}
        ref={tooltipRef}
        style={{ left: tooltipPos.left, top: tooltipPos.top, width: TOOLTIP_WIDTH }}
        tabIndex={-1}
        transition={reduceMotion ? { duration: 0 } : { damping: 24, stiffness: 340, type: "spring" }}
      >
        <div className={styles.tooltipHead}>
          <span className={styles.progress}>{t("tour.progress", { current: stepIndex + 1, total: TOUR_STEPS.length })}</span>
          <button className={styles.skip} onClick={() => finish(false)} type="button">
            {t("tour.skip")}
          </button>
        </div>
        <h2 className={styles.tooltipTitle}>{t(step.titleKey)}</h2>
        <p className={styles.tooltipBody}>{t(step.bodyKey)}</p>
        <div className={styles.tooltipFoot}>
          <div aria-hidden className={styles.dots}>
            {TOUR_STEPS.map((tourStep, index) => (
              <i className={index === stepIndex ? styles.dotActive : styles.dot} key={tourStep.titleKey} />
            ))}
          </div>
          <div className={styles.tooltipActions}>
            <Button disabled={stepIndex === 0} onClick={goPrev} size="sm" variant="quiet">
              {t("tour.prev")}
            </Button>
            <Button onClick={goNext} size="sm" variant="primary">
              {isLastStep ? t("tour.done") : t("tour.next")}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
