"use client";

// 첫 사용 경험 오케스트레이터 — AppShell이 인증 완료(state ready) 후에 렌더한다.
// 회원사이트 튜토리얼과 위젯 튜토리얼을 완전히 분리해 각각 독립적으로 한 번 자동 노출하고,
// 설정 > 표시에서 각각 따로 다시 볼 수 있다.
//   1) 직군 온보딩(1회) → 2) 회원사이트 튜토리얼(코치 마크) → 3) 위젯 튜토리얼(전체화면)
// 위젯 튜토리얼은 데스크탑(mac-Tauri)에서는 전용 전체화면 창, 웹에서는 전체화면 모달로 뜬다.
// /desktop-widget 표면은 AppShell을 쓰지 않으므로 여기서 자동으로 제외된다.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import {
  completeOnboarding,
  completeTutorial,
  completeWidgetTutorial,
  hasCompletedOnboarding,
  readStoredOnboarding,
} from "@/features/onboarding/lib/onboarding-storage";
import { tauriCommands } from "@/lib/tauri/commands";
import { isMacTauriRuntime } from "@/lib/tauri/platform";
import type { AuthUser } from "@/types/api/auth";

import type { RoleOnboardingResult } from "./role-onboarding-overlay";

// 온보딩/튜토리얼 오버레이는 첫 페인트에 필요 없으므로 지연 로드한다(셸 초기 번들 절감).
const RoleOnboardingOverlay = dynamic(
  () => import("./role-onboarding-overlay").then((mod) => mod.RoleOnboardingOverlay),
  { ssr: false },
);
const WorkspaceTour = dynamic(() => import("./workspace-tour").then((mod) => mod.WorkspaceTour), { ssr: false });
const WidgetTutorial = dynamic(() => import("./widget-tutorial").then((mod) => mod.WidgetTutorial), { ssr: false });

export const OPEN_TUTORIAL_EVENT = "bubli:open-tutorial";
export const OPEN_WIDGET_TUTORIAL_EVENT = "bubli:open-widget-tutorial";

type FirstRunPhase = "idle" | "onboarding" | "member" | "widget";

type FirstRunControllerProps = {
  user: AuthUser;
};

export function FirstRunController({ user }: FirstRunControllerProps) {
  const [phase, setPhase] = useState<FirstRunPhase>("idle");

  // 위젯 튜토리얼 열기 — 데스크탑(mac-Tauri)은 전용 전체화면 창, 웹은 모달.
  const openWidgetTutorial = useCallback(() => {
    if (isMacTauriRuntime()) {
      void tauriCommands.openOnboardingOverlay();
      setPhase("idle");
      return;
    }
    setPhase("widget");
  }, []);

  // 저장소 확인은 마운트 뒤에만 — SSR 하이드레이션 불일치를 피한다.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!hasCompletedOnboarding(user.id)) {
        setPhase("onboarding");
        return;
      }
      const stored = readStoredOnboarding();
      if (stored?.userId !== user.id) return;
      // 자동 노출은 각 튜토리얼당 사용자·기기당 1회 — 노출 시점에 바로 완료로 기록해
      // 창 닫기/새로고침 등 어떤 이탈 경로로도 다시 자동으로 뜨지 않게 한다.
      if (!stored.tutorialCompletedAt) {
        completeTutorial(user.id);
        setPhase("member");
        return;
      }
      if (!stored.widgetTutorialCompletedAt) {
        completeWidgetTutorial(user.id);
        openWidgetTutorial();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [openWidgetTutorial, user.id]);

  // 설정 > 표시의 "다시 보기" — AppShell에 상주하므로 어느 화면에서든 받는다.
  useEffect(() => {
    const openMember = () => setPhase((current) => (current === "onboarding" ? current : "member"));
    const openWidget = () => {
      setPhase((current) => (current === "onboarding" ? current : current));
      openWidgetTutorial();
    };
    window.addEventListener(OPEN_TUTORIAL_EVENT, openMember);
    window.addEventListener(OPEN_WIDGET_TUTORIAL_EVENT, openWidget);
    return () => {
      window.removeEventListener(OPEN_TUTORIAL_EVENT, openMember);
      window.removeEventListener(OPEN_WIDGET_TUTORIAL_EVENT, openWidget);
    };
  }, [openWidgetTutorial]);

  const handleOnboardingFinish = (result: RoleOnboardingResult) => {
    // 적용/건너뛰기 공통으로 완료 기록(오버레이의 skip도 이 경로). 이어서 회원사이트 튜토리얼.
    completeOnboarding(user.id, result.role);
    completeTutorial(user.id);
    setPhase("member");
  };

  const handleMemberTourClose = () => {
    completeTutorial(user.id);
    // 회원사이트 튜토리얼을 처음 본 흐름이면 이어서 위젯 튜토리얼(아직 안 봤을 때만).
    const stored = readStoredOnboarding();
    if (stored?.userId === user.id && !stored.widgetTutorialCompletedAt) {
      completeWidgetTutorial(user.id);
      openWidgetTutorial();
      return;
    }
    setPhase("idle");
  };

  const handleWidgetTutorialClose = () => {
    completeWidgetTutorial(user.id);
    setPhase("idle");
  };

  if (phase === "onboarding") {
    return <RoleOnboardingOverlay onFinish={handleOnboardingFinish} user={user} />;
  }

  if (phase === "member") {
    return <WorkspaceTour onClose={handleMemberTourClose} />;
  }

  if (phase === "widget") {
    // 데스크탑은 전용 창으로 뜨므로 이 분기는 웹 모달 전용이다.
    return <WidgetTutorial onClose={handleWidgetTutorialClose} />;
  }

  return null;
}
