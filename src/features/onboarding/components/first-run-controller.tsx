"use client";

// 첫 사용 경험 오케스트레이터 — AppShell이 인증 완료(state ready) 후에 렌더한다.
// 1) 직군 온보딩: 이 기기에서 해당 사용자가 아직 안 봤으면 한 번 보여준다(건너뛰기 포함 1회).
// 2) 튜토리얼(코치 마크): 온보딩 직후 이어서 보여주고, 설정 > 표시의 "튜토리얼 다시 보기"
//    이벤트(OPEN_TUTORIAL_EVENT)로 언제든 다시 열 수 있다.
// /desktop-widget 표면은 AppShell을 쓰지 않으므로 여기서 자동으로 제외된다.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { completeOnboarding, completeTutorial, hasCompletedOnboarding, readStoredOnboarding } from "@/features/onboarding/lib/onboarding-storage";
import type { AuthUser } from "@/types/api/auth";

import type { RoleOnboardingResult } from "./role-onboarding-overlay";

// 온보딩/튜토리얼 오버레이는 첫 페인트에 필요 없으므로 지연 로드한다(셸 초기 번들 절감).
const RoleOnboardingOverlay = dynamic(
  () => import("./role-onboarding-overlay").then((mod) => mod.RoleOnboardingOverlay),
  { ssr: false },
);
const WorkspaceTour = dynamic(() => import("./workspace-tour").then((mod) => mod.WorkspaceTour), { ssr: false });

export const OPEN_TUTORIAL_EVENT = "bubli:open-tutorial";

type FirstRunPhase = "idle" | "onboarding" | "tour";

type FirstRunControllerProps = {
  user: AuthUser;
};

export function FirstRunController({ user }: FirstRunControllerProps) {
  const [phase, setPhase] = useState<FirstRunPhase>("idle");

  // 저장소 확인은 마운트 뒤에만 — SSR 하이드레이션 불일치를 피한다.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!hasCompletedOnboarding(user.id)) {
        setPhase("onboarding");
        return;
      }
      // 온보딩은 끝냈지만 튜토리얼을 아직 안 본 사용자(예: 이전 세션 중단)는 튜토리얼만 이어서 보여준다.
      const stored = readStoredOnboarding();
      if (stored?.userId === user.id && !stored.tutorialCompletedAt) {
        // 자동 노출은 사용자·기기당 정확히 1회 — 노출 시점에 바로 완료로 기록해
        // 창 닫기/강제 종료/새로고침 등 어떤 이탈 경로로도 다시 자동으로 뜨지 않게 한다.
        // (다시 보기는 설정 > 표시의 OPEN_TUTORIAL_EVENT 수동 경로만 사용한다.)
        completeTutorial(user.id);
        setPhase("tour");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [user.id]);

  // 설정 > 표시 "튜토리얼 다시 보기" — AppShell에 상주하므로 어느 화면에서든 받는다.
  useEffect(() => {
    function openTutorial() {
      setPhase((current) => (current === "onboarding" ? current : "tour"));
    }

    window.addEventListener(OPEN_TUTORIAL_EVENT, openTutorial);
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, openTutorial);
  }, []);

  const handleOnboardingFinish = (result: RoleOnboardingResult) => {
    // 적용/건너뛰기 공통으로 완료 기록(오버레이의 skip도 이 경로로 들어온다).
    completeOnboarding(user.id, result.role);
    // 적용/건너뛰기와 무관하게 튜토리얼로 이어간다(건너뛰기는 온보딩만 넘긴 것).
    // 튜토리얼도 노출 시점에 완료로 기록 — 진행 중 창을 닫아도 다음 실행에서 자동 재노출되지 않는다.
    completeTutorial(user.id);
    setPhase("tour");
  };

  const handleTourClose = () => {
    // 끝까지 봤든 건너뛰었든(ESC/건너뛰기 포함) 자동 재노출은 하지 않는다. 다시 보기는 설정에서 연다.
    // 노출 시점에 이미 기록했지만, 수동 다시 보기 후 종료 등 모든 경로에서 최신 시각으로 한 번 더 남긴다.
    completeTutorial(user.id);
    setPhase("idle");
  };

  if (phase === "onboarding") {
    return <RoleOnboardingOverlay onFinish={handleOnboardingFinish} user={user} />;
  }

  if (phase === "tour") {
    return <WorkspaceTour onClose={handleTourClose} />;
  }

  return null;
}
