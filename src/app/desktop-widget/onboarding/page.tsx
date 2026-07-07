"use client";

// 데스크탑 앱에서 위젯 튜토리얼을 띄우는 전체화면 Tauri 오버레이 창의 콘텐츠.
// 실제 튜토리얼 UI는 회원사이트 웹 모달과 공용인 WidgetTutorial 컴포넌트다(전체화면 유리 톤).

import { useCallback } from "react";

import { WidgetTutorial } from "@/features/onboarding/components/widget-tutorial";
import { completeWidgetTutorial, readStoredOnboarding } from "@/features/onboarding/lib/onboarding-storage";
import { tauriCommands } from "@/lib/tauri/commands";

export default function DesktopWidgetOnboardingPage() {
  const closeOverlay = useCallback(() => {
    const stored = readStoredOnboarding();
    if (stored?.userId) {
      completeWidgetTutorial(stored.userId);
    }

    void tauriCommands.closeOnboardingOverlay();
  }, []);

  return <WidgetTutorial onClose={closeOverlay} />;
}
