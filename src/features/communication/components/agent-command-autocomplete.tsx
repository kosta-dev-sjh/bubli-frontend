"use client";

import { useEffect, useRef } from "react";

import { useI18n } from "@/lib/i18n";

import type { LocalizedAgentCommandDefinition } from "../lib/agent-commands";
import styles from "./agent-command-autocomplete.module.css";

// /bubli 명령어 자동완성 팝오버(컴포저 위 부착).
// - 부모가 position: relative 컨테이너여야 한다(컴포저 폼/래퍼).
// - tone="glass": 웹 소통창(Paper Glass 팝오버), tone="bubble": 위젯 버블 컴팩트 톤.
// - 키보드 이동/완성은 useAgentCommandAutocomplete 훅이 담당하고, 여기서는
//   마우스 hover/클릭과 활성 항목 표시만 처리한다.
export function AgentCommandAutocomplete({
  activeIndex,
  items,
  onHoverItem,
  onPick,
  tone,
}: {
  activeIndex: number;
  items: LocalizedAgentCommandDefinition[];
  onHoverItem: (index: number) => void;
  onPick: (item: LocalizedAgentCommandDefinition) => void;
  tone: "bubble" | "glass";
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 키보드 이동 시 활성 항목이 스크롤 밖으로 나가지 않게 따라간다.
  useEffect(() => {
    const active = rootRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      aria-label={t("chat.agentCommands.popoverAria")}
      className={[styles.popover, tone === "bubble" ? styles.toneBubble : styles.toneGlass].join(" ")}
      data-bubli-interactive
      ref={rootRef}
      role="listbox"
    >
      <div className={styles.list}>
        {items.map((item, index) => (
          <button
            aria-selected={index === activeIndex}
            className={styles.option}
            data-active={index === activeIndex ? "true" : undefined}
            key={item.id}
            onClick={() => onPick(item)}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHoverItem(index)}
            role="option"
            type="button"
          >
            <strong>{item.command}</strong>
            <span>{t(item.descriptionKey)}</span>
          </button>
        ))}
      </div>
      <small className={styles.hintRow}>{t("chat.agentCommands.hint")}</small>
    </div>
  );
}
