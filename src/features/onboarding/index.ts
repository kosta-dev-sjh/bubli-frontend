export { FirstRunController, OPEN_TUTORIAL_EVENT } from "./components/first-run-controller";
// RoleOnboardingOverlay/WorkspaceTour는 FirstRunController가 next/dynamic으로 지연 로드한다.
// 배럴에서 정적으로 재수출하면 셸 초기 번들에 다시 묶이므로 여기서는 타입만 내보낸다.
export type { RoleOnboardingResult } from "./components/role-onboarding-overlay";
export { completeOnboarding, completeTutorial, hasCompletedOnboarding, readStoredOnboarding, ONBOARDING_ROLES } from "./lib/onboarding-storage";
export type { OnboardingRole, StoredOnboarding } from "./lib/onboarding-storage";
