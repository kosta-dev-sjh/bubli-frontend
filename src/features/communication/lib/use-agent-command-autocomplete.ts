"use client";

import { useCallback, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  completeAgentCommand,
  getAgentCommandSuggestions,
  type AgentCommandDefinition,
} from "./agent-commands";

// /bubli 자동완성 공용 훅 — 웹 소통창 textarea와 위젯 chat 버블 input이 함께 쓴다.
// 표면은 open일 때 AgentCommandAutocomplete를 그리고, 컴포저 onKeyDown 첫 줄에서
// handleKeyDown을 호출해 ↑/↓/Tab/Enter/Esc를 팝오버에 먼저 넘긴다(true면 소비됨).
export function useAgentCommandAutocomplete({
  draft,
  enabled,
  onApply,
}: {
  draft: string;
  enabled: boolean;
  onApply: (completedText: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastDraft, setLastDraft] = useState(draft);

  const items = useMemo(
    () => (enabled ? (getAgentCommandSuggestions(draft) ?? []) : []),
    [draft, enabled],
  );

  // 입력이 바뀌면 Esc 닫힘을 해제하고 첫 항목으로 되돌린다(렌더 중 상태 보정 패턴).
  if (lastDraft !== draft) {
    setLastDraft(draft);
    setDismissed(false);
    setActiveIndex(0);
  }

  const open = !dismissed && items.length > 0;

  const pick = useCallback(
    (item: AgentCommandDefinition) => {
      onApply(completeAgentCommand(item));
    },
    [onApply],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!open) return false;

      if (event.key === "ArrowDown") {
        setActiveIndex((current) => (current + 1) % items.length);
      } else if (event.key === "ArrowUp") {
        setActiveIndex((current) => (current - 1 + items.length) % items.length);
      } else if (event.key === "Tab" || event.key === "Enter") {
        pick(items[Math.min(activeIndex, items.length - 1)]);
      } else if (event.key === "Escape") {
        setDismissed(true);
      } else {
        return false;
      }

      event.preventDefault();
      event.stopPropagation();
      return true;
    },
    [activeIndex, items, open, pick],
  );

  return { activeIndex, handleKeyDown, items, open, pick, setActiveIndex };
}
