"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * `?bubble=menu` 창 경로(page.tsx isMenuOrb)와 Rust "menu" 창 상태에서 항상 사용되는 메뉴 오브입니다.
 * 창에서 바깥 클릭/ESC로 닫히고 오브 클릭 시 패널을 토글합니다.
 * 조건부 경로 전용이라 page.tsx가 next/dynamic으로만 로드한다(기본 번들에서 제외).
 */
export function DesktopWidgetMenuOrb({
  hasRoomContext = false,
  onArrangeBubbles,
  onOpenBubble,
  onOpenMainApp,
  onOpenSettings,
  onQuit,
  onToggleRoomContext,
  usageSummary,
}: WidgetMenuContentProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRootRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  // 48px 오브 바로 아래(8px 간격, 같은 왼쪽 라인)에 패널이 붙는다:
  // Bubli 그라디언트 워드마크 + 오늘 사용 요약 1줄 → accent 타일 바로가기 그리드 → hairline → 액션 rows.
  return (
    <div ref={menuRootRef} className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
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
