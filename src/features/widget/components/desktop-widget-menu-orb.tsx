"use client";

import { useState } from "react";

// 웹앱과 같은 브랜드 버블 마크(읽기 전용 import) — 메뉴 오브(48px)가 바 Bubli 칩과 공유한다.
import { BubbleMark } from "@/components/bubbles";
import {
  handleWidgetDragMouseDown,
  handleWidgetDragMouseDownDeferred,
  WidgetMenuPanelContent,
  type WidgetMenuContentProps,
} from "@/features/widget/components/desktop-widget-bubble";
import { useI18n } from "@/lib/i18n";

import styles from "./desktop-widget-bubble.module.css";

/**
 * @deprecated 별도 메뉴(오브) 창 UI. Bubli 메뉴가 바 창 인라인 morph 패널로 통합되면서
 * 로그인 자동 실행 목록(src/lib/tauri/authenticated-surfaces.ts)에서 빠졌다.
 * `?bubble=menu` 창 경로(page.tsx isMenuOrb)와 Rust "menu" 창 상태는 그대로 동작하므로
 * 수동으로 열면 여전히 쓸 수 있다 — 다음 정리 사이클에서 제거 후보.
 * 조건부(수동) 경로 전용이라 page.tsx가 next/dynamic으로만 로드한다(기본 번들에서 제외).
 */
export function DesktopWidgetMenuOrb({
  hasRoomContext = false,
  onArrangeBubbles,
  onOpenBubble,
  onOpenMainApp,
  onOpenSettings,
  onQuit,
  onToggleRoomContext,
  panelOpenSignal = 0,
  usageSummary,
}: WidgetMenuContentProps & {
  panelOpenSignal?: number;
}) {
  const { t } = useI18n();
  // 오브 클릭 또는 바 Bubli 버튼(panelOpenSignal, 레거시 이벤트)으로 패널을 연다.
  const [open, setOpen] = useState(false);
  // 바 Bubli 버튼의 열기 요청은 렌더 중 상태 보정 패턴으로 반영한다(effect 내 setState 금지 규칙).
  const [seenPanelSignal, setSeenPanelSignal] = useState(panelOpenSignal);
  if (panelOpenSignal !== seenPanelSignal) {
    setSeenPanelSignal(panelOpenSignal);
    if (panelOpenSignal > 0 && !open) setOpen(true);
  }

  // 48px 오브 바로 아래(8px 간격, 같은 왼쪽 라인)에 패널이 붙는다:
  // Bubli 그라디언트 워드마크 + 오늘 사용 요약 1줄 → accent 타일 바로가기 그리드 → hairline → 액션 rows.
  return (
    <div className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
      <button
        className={styles.menuOrb}
        aria-expanded={open}
        data-bubli-interactive="true"
        aria-haspopup="menu"
        aria-label={t("widget.menu.openAria")}
        onClick={() => setOpen((current) => !current)}
        onMouseDown={handleWidgetDragMouseDownDeferred}
        title={t("widget.menu.openAria")}
        type="button"
      >
        {/* 미니 앱 아이콘 오브(44px, radius 14): 유리 버블 단독은 '사탕'처럼 읽혀서,
            하이브리드 앱 브랜드 톤(sky→lilac 그라디언트 타일) 위에 버블 마크를 얹은
            앱 아이콘 구성으로 바꿨다 — 잔잔한 bob 부유 + hover 워블(reduced-motion 존중). */}
        <span aria-hidden="true" className={styles.menuOrbTile}>
          <BubbleMark className={styles.menuOrbMark} />
        </span>
      </button>
      {open ? (
        <div
          aria-label={t("widget.menu.title")}
          className={styles.menuPanel}
          data-bubli-interactive="true"
          onMouseDown={handleWidgetDragMouseDown}
          role="menu"
        >
          <WidgetMenuPanelContent
            hasRoomContext={hasRoomContext}
            onArrangeBubbles={onArrangeBubbles}
            onOpenBubble={onOpenBubble}
            onOpenMainApp={onOpenMainApp}
            onOpenSettings={onOpenSettings}
            onQuit={onQuit}
            onToggleRoomContext={onToggleRoomContext}
            usageSummary={usageSummary}
          />
        </div>
      ) : null}
    </div>
  );
}
