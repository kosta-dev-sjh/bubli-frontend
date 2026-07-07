"use client";

import { useCallback } from "react";

// 웹앱과 같은 브랜드 버블 마크(읽기 전용 import) — 오브가 바 Bubli 칩과 마크를 공유한다.
import { BubbleMark } from "@/components/bubbles";
import { handleWidgetDragMouseDownDeferred } from "@/features/widget/components/desktop-widget-bubble";
import { useI18n } from "@/lib/i18n";

import styles from "./desktop-widget-bubble.module.css";

/**
 * `?bubble=menu` 창 경로(page.tsx isMenuOrb)와 Rust "menu" 창 상태에서 쓰는 떠다니는 오브.
 *
 * 메뉴(자동정렬/설정/종료 등)는 바(pill)에 이미 있으므로, 이 오브는 더 이상 메뉴를 열지 않는다.
 * 대신 누르면 곧장 AI 에이전트 위젯으로 이동하고, 에이전트가 새 후보(제안)를 올리면 Codex 봇처럼
 * 말풍선으로 요약 한 줄을 잠깐 띄운다(클릭하면 에이전트로 이동).
 *
 * 새 제안 감지는 데이터 소유자(page.tsx)가 하고 `suggestionNonce`를 올려 알린다. 말풍선의 등장·
 * 자동 사라짐은 순수 CSS 애니메이션이 담당한다(자바스크립트 타이머/이펙트 없이 nonce로 remount).
 */
export function DesktopWidgetMenuOrb({
  agentSuggestionCount = 0,
  agentSuggestionLatest = null,
  suggestionNonce = 0,
  onOpenAgent,
}: {
  agentSuggestionCount?: number;
  agentSuggestionLatest?: string | null;
  suggestionNonce?: number;
  onOpenAgent?: () => void;
}) {
  const { t } = useI18n();

  const openAgent = useCallback(() => {
    onOpenAgent?.();
  }, [onOpenAgent]);

  return (
    <div className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
      <button
        className={styles.menuOrb}
        data-bubli-interactive="true"
        aria-label={t("widget.agent.orbOpenAria")}
        onClick={openAgent}
        onMouseDown={handleWidgetDragMouseDownDeferred}
        title={t("widget.agent.orbOpenAria")}
        type="button"
      >
        <BubbleMark aria-hidden="true" className={styles.menuOrbMark} />
        {agentSuggestionCount > 0 ? (
          <i className={styles.orbBadge} aria-hidden="true">
            {agentSuggestionCount > 9 ? "9+" : agentSuggestionCount}
          </i>
        ) : null}
      </button>
      {/* nonce가 오를 때마다 remount되어 CSS 애니메이션(등장→유지→자동 사라짐)이 다시 재생된다. */}
      {suggestionNonce > 0 && agentSuggestionLatest ? (
        <button
          aria-label={t("widget.agent.orbSuggestionAria")}
          className={styles.orbSuggestionPop}
          data-bubli-interactive="true"
          key={suggestionNonce}
          onClick={openAgent}
          type="button"
        >
          <span className={styles.orbSuggestionPopLabel}>{t("widget.agent.waitingCandidates")}</span>
          <span className={styles.orbSuggestionPopText}>{agentSuggestionLatest}</span>
        </button>
      ) : null}
    </div>
  );
}
