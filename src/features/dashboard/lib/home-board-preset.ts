"use client";

// 직군 온보딩 프리셋 → 홈 보드 반영 전용 모듈.
// 저장은 board-storage(이 기기 로컬 영속화 단독 소유)를 그대로 쓰고,
// 홈이 이미 마운트된 상태(온보딩 오버레이가 홈 위에 뜬 첫 로그인)에서도
// 보드가 즉시 갱신되도록 window 이벤트로 알린다.

import { useEffect } from "react";

import { HOME_ROLE_PRESETS } from "@/components/dashboard";
import type { HomeRolePresetId } from "@/components/dashboard";

import { writeStoredBoard } from "./board-storage";

export const HOME_BOARD_PRESET_EVENT = "bubli:home-board-preset";

// 프리셋 카드 조합을 보드 저장소에 쓰고, 마운트된 홈 보드에 즉시 반영을 알린다.
export function applyHomeBoardPreset(presetId: HomeRolePresetId): string[] {
  const widgetIds = [...HOME_ROLE_PRESETS[presetId].widgetIds];
  writeStoredBoard({ roomScope: {}, widgetIds });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HOME_BOARD_PRESET_EVENT, { detail: { widgetIds } }));
  }

  return widgetIds;
}

// workspace-dashboard가 구독한다 — 온보딩이 프리셋을 적용하면 리로드 없이 카드 구성을 바꾼다.
export function useHomeBoardPresetListener(onApply: (widgetIds: string[]) => void) {
  useEffect(() => {
    function handlePresetApplied(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as { widgetIds?: unknown } | null) : null;
      if (!detail || !Array.isArray(detail.widgetIds)) return;
      onApply(detail.widgetIds.filter((id): id is string => typeof id === "string"));
    }

    window.addEventListener(HOME_BOARD_PRESET_EVENT, handlePresetApplied);
    return () => window.removeEventListener(HOME_BOARD_PRESET_EVENT, handlePresetApplied);
  }, [onApply]);
}
