"use client";

// 첫 사용 경험(직군 온보딩/워크스페이스 튜토리얼) 완료 상태의 로컬 영속화 전용 모듈.
// 서버 user_preferences에도 job_role / onboarding_completed_at 필드가 생겨(backend PR 195)
// 온보딩 종료 시 role-onboarding-overlay가 best-effort로 함께 저장하지만,
// "이 기기에서 다시 보여줄지"의 1차 게이트는 여전히 이 로컬 기록이다(board-storage와 같은 방식).
// userId를 함께 저장해 "사용자당 1회"를 보장한다(같은 기기에서 다른 계정 로그인 시 다시 보여준다).
// scripts/check-tauri-boundaries.mjs 의 ALLOWED_LOCALSTORAGE_FILES 에 등록되어 있다.

import type { HomeRolePresetId } from "@/components/dashboard";

const ONBOARDING_STORAGE_KEY = "bubli.onboarding.v1";

export type OnboardingRole = HomeRolePresetId;

export const ONBOARDING_ROLES: OnboardingRole[] = ["developer", "designer", "pm", "marketer", "writer", "etc"];

export type StoredOnboarding = {
  /** 직군 온보딩을 끝낸 시각(건너뛰기 포함). */
  completedAt: string;
  /** 선택한 직군. 건너뛰었으면 null. */
  role: OnboardingRole | null;
  /** 회원사이트 튜토리얼(코치 마크)을 끝낸 시각. 아직이면 null. */
  tutorialCompletedAt: string | null;
  /** 위젯 전용 튜토리얼(전체화면)을 끝낸 시각. 아직이면 null. 회원사이트 튜토리얼과 독립적으로 추적한다. */
  widgetTutorialCompletedAt: string | null;
  userId: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isOnboardingRole(value: unknown): value is OnboardingRole {
  return typeof value === "string" && (ONBOARDING_ROLES as string[]).includes(value);
}

export function readStoredOnboarding(): StoredOnboarding | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOnboarding> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.userId !== "string" || !parsed.userId) return null;
    if (typeof parsed.completedAt !== "string" || !parsed.completedAt) return null;

    return {
      completedAt: parsed.completedAt,
      role: isOnboardingRole(parsed.role) ? parsed.role : null,
      tutorialCompletedAt: typeof parsed.tutorialCompletedAt === "string" ? parsed.tutorialCompletedAt : null,
      widgetTutorialCompletedAt:
        typeof parsed.widgetTutorialCompletedAt === "string" ? parsed.widgetTutorialCompletedAt : null,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
}

function writeStoredOnboarding(record: StoredOnboarding) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 저장 실패(사파리 프라이빗 모드 등)는 조용히 무시한다.
  }
}

export function hasCompletedOnboarding(userId: string) {
  const stored = readStoredOnboarding();
  return stored !== null && stored.userId === userId;
}

// 직군 온보딩 완료(적용/건너뛰기 공통). 같은 사용자의 튜토리얼 기록은 유지한다.
export function completeOnboarding(userId: string, role: OnboardingRole | null) {
  const stored = readStoredOnboarding();
  const same = stored?.userId === userId;
  writeStoredOnboarding({
    completedAt: new Date().toISOString(),
    role,
    tutorialCompletedAt: same ? stored.tutorialCompletedAt : null,
    widgetTutorialCompletedAt: same ? stored.widgetTutorialCompletedAt : null,
    userId,
  });
}

// 회원사이트 튜토리얼(코치 마크) 완료. 위젯 튜토리얼 기록은 유지한다.
export function completeTutorial(userId: string) {
  const stored = readStoredOnboarding();
  const same = stored?.userId === userId;
  writeStoredOnboarding({
    completedAt: same ? stored.completedAt : new Date().toISOString(),
    role: same ? stored.role : null,
    tutorialCompletedAt: new Date().toISOString(),
    widgetTutorialCompletedAt: same ? stored.widgetTutorialCompletedAt : null,
    userId,
  });
}

// 위젯 전용 튜토리얼 완료. 회원사이트 튜토리얼 기록은 유지한다.
export function completeWidgetTutorial(userId: string) {
  const stored = readStoredOnboarding();
  const same = stored?.userId === userId;
  writeStoredOnboarding({
    completedAt: same ? stored.completedAt : new Date().toISOString(),
    role: same ? stored.role : null,
    tutorialCompletedAt: same ? stored.tutorialCompletedAt : null,
    widgetTutorialCompletedAt: new Date().toISOString(),
    userId,
  });
}
