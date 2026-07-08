"use client";

import { useCallback, useEffect, useRef, type MouseEvent } from "react";

// 웹앱과 같은 브랜드 버블 마크(읽기 전용 import) — 오브가 바 Bubli 칩과 마크를 공유한다.
import { BubbleMark } from "@/components/bubbles";
import { handleWidgetDragMouseDownDeferred } from "@/features/widget/components/desktop-widget-bubble";
import { useI18n } from "@/lib/i18n";

import styles from "./desktop-widget-bubble.module.css";

/**
 * `?bubble=menu` 창 경로(page.tsx isMenuOrb)와 Rust "menu" 창 상태에서 쓰는 떠다니는 오브.
 *
 * 메뉴(자동정렬/설정/종료 등)는 바(pill)에 이미 있으므로, 이 오브는 더 이상 메뉴를 열지 않는다.
 * 대신 누르면 곧장 챗봇 전용 AI 에이전트 위젯으로 이동한다.
 */
export function DesktopWidgetMenuOrb({
  agentReplyCount = 0,
  onOpenAgent,
}: {
  agentReplyCount?: number;
  onOpenAgent?: () => void;
}) {
  const { t } = useI18n();
  const suppressNextClickRef = useRef(false);
  const suppressResetTimeoutRef = useRef<number | null>(null);
  const badgeLabel = agentReplyCount > 9 ? "9+" : String(agentReplyCount);
  const ariaLabel =
    agentReplyCount > 0 ? t("widget.agent.orbUnreadAria", { count: agentReplyCount }) : t("widget.agent.orbOpenAria");

  const clearSuppressClick = useCallback(() => {
    suppressNextClickRef.current = false;
    if (suppressResetTimeoutRef.current !== null) {
      window.clearTimeout(suppressResetTimeoutRef.current);
      suppressResetTimeoutRef.current = null;
    }
  }, []);

  const markDragStarted = useCallback(() => {
    suppressNextClickRef.current = true;
    if (suppressResetTimeoutRef.current !== null) {
      window.clearTimeout(suppressResetTimeoutRef.current);
    }
    suppressResetTimeoutRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressResetTimeoutRef.current = null;
    }, 700);
  }, []);

  useEffect(() => clearSuppressClick, [clearSuppressClick]);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      handleWidgetDragMouseDownDeferred(event, { onDragStart: markDragStarted });
    },
    [markDragStarted],
  );

  const openAgent = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (suppressNextClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      clearSuppressClick();
      return;
    }
    onOpenAgent?.();
  }, [clearSuppressClick, onOpenAgent]);

  return (
    <div className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
      <button
        className={styles.menuOrb}
        data-bubli-interactive="true"
        aria-label={ariaLabel}
        onClick={openAgent}
        onMouseDown={handleMouseDown}
        title={ariaLabel}
        type="button"
      >
        <BubbleMark aria-hidden="true" className={styles.menuOrbMark} />
        {agentReplyCount > 0 ? (
          <i className={styles.orbBadge} aria-hidden="true">
            {badgeLabel}
          </i>
        ) : null}
      </button>
    </div>
  );
}
