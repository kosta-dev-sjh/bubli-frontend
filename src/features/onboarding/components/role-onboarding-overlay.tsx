"use client";

// 직군 온보딩 — 첫 로그인 시 홈 위에 뜨는 풀스크린 글래스 오버레이.
// ① 환영+이름 확인 → ② 직군 선택 그리드 → ③ 직군별 프리셋 요약+적용 순서로 진행하고,
// 적용 시 홈 보드(board-storage)와 기본 시작 화면(user_preference.defaultHomeType)을 함께 세팅한다.

import { ClipboardList, Code2, Megaphone, MoreHorizontal, Palette, PenLine, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { HOME_ROLE_PRESETS, WIDGET_CATALOG } from "@/components/dashboard";
import type { HomeRolePresetId } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { authApi } from "@/features/auth/api/authApi";
import { applyHomeBoardPreset } from "@/features/dashboard/lib/home-board-preset";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { notifyUserUpdated } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import type { AuthUser } from "@/types/api/auth";

import styles from "./role-onboarding-overlay.module.css";

export type RoleOnboardingResult = {
  /** 프리셋을 적용했으면 true(건너뛰기/기본 유지면 false). */
  applied: boolean;
  role: HomeRolePresetId | null;
};

type RoleOnboardingOverlayProps = {
  onFinish: (result: RoleOnboardingResult) => void;
  user: AuthUser;
};

type RoleOption = { icon: LucideIcon; labelKey: MessageKey; role: HomeRolePresetId };

const ROLE_OPTIONS: RoleOption[] = [
  { icon: Code2, labelKey: "onboarding.role.developer", role: "developer" },
  { icon: Palette, labelKey: "onboarding.role.designer", role: "designer" },
  { icon: ClipboardList, labelKey: "onboarding.role.pm", role: "pm" },
  { icon: Megaphone, labelKey: "onboarding.role.marketer", role: "marketer" },
  { icon: PenLine, labelKey: "onboarding.role.writer", role: "writer" },
  { icon: MoreHorizontal, labelKey: "onboarding.role.etc", role: "etc" },
];

const TOTAL_STEPS = 3;

function widgetTitleKeys(role: HomeRolePresetId): MessageKey[] {
  return HOME_ROLE_PRESETS[role].widgetIds
    .map((widgetId) => WIDGET_CATALOG.find((def) => def.widgetId === widgetId)?.titleKey)
    .filter((key): key is MessageKey => Boolean(key));
}

export function RoleOnboardingOverlay({ onFinish, user }: RoleOnboardingOverlayProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [nameDraft, setNameDraft] = useState(user.name);
  const [selectedRole, setSelectedRole] = useState<HomeRolePresetId | null>(null);
  const [applying, setApplying] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 단계가 바뀔 때 카드에 포커스를 옮겨 키보드/스크린리더 흐름을 유지한다.
  useEffect(() => {
    cardRef.current?.focus();
  }, [step]);

  const skip = () => {
    if (applying) return;
    // 건너뛰기도 서버 user_preferences.onboarding_completed_at에 기록한다(backend PR 195).
    // 실패해도 로컬 기록(onboarding-storage)이 1차 게이트라 온보딩 UX에는 영향이 없다.
    void settingsApi.updatePreferences({ onboardingCompletedAt: new Date().toISOString() }).catch(() => undefined);
    onFinish({ applied: false, role: null });
  };

  // 이름이 바뀌었으면 저장을 시도하되(설정 페이지와 같은 계약), 실패해도 온보딩은 계속 진행한다.
  const submitWelcome = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== user.name) {
      void authApi
        .updateMe({ locale: user.locale ?? "ko", name: trimmed, timezone: user.timezone ?? "Asia/Seoul" })
        .then((saved) => {
          // 탑바(AppShell) 사용자 표시를 새로고침 없이 즉시 갱신한다.
          notifyUserUpdated(saved);
        })
        .catch(() => undefined);
    }
    setStep(1);
  };

  const chooseRole = (role: HomeRolePresetId) => {
    setSelectedRole(role);
    setStep(2);
  };

  const applyPreset = async () => {
    if (!selectedRole || applying) return;
    setApplying(true);

    try {
      // 홈 카드 구성 — 이 기기의 보드 저장소에 쓰고, 마운트된 홈에 즉시 반영을 알린다.
      applyHomeBoardPreset(selectedRole);
      // 기본 시작 화면 + 직군 + 온보딩 완료 시각 — 서버 user_preference 계약
      // (defaultHomeType / jobRole / onboardingCompletedAt, backend PR 195). 실패해도 온보딩은 끝낸다.
      await settingsApi
        .updatePreferences({
          defaultHomeType: HOME_ROLE_PRESETS[selectedRole].defaultHomeType,
          jobRole: selectedRole,
          onboardingCompletedAt: new Date().toISOString(),
        })
        .catch(() => undefined);
    } finally {
      setApplying(false);
    }

    onFinish({ applied: true, role: selectedRole });
  };

  const roleLabelKey = ROLE_OPTIONS.find((option) => option.role === selectedRole)?.labelKey ?? "onboarding.role.etc";
  const presetHomeKey: MessageKey =
    selectedRole && HOME_ROLE_PRESETS[selectedRole].defaultHomeType === "PROJECT_ROOM"
      ? "onboarding.preset.homeProjectRoom"
      : "onboarding.preset.homePersonal";

  return (
    <div aria-label={t("onboarding.aria")} aria-modal="true" className={styles.overlay} role="dialog">
      <div aria-hidden className={styles.bubbleA} />
      <div aria-hidden className={styles.bubbleB} />
      <div aria-hidden className={styles.bubbleC} />

      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={styles.card}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 22 }}
        key={step}
        onKeyDown={(event) => {
          if (event.key === "Escape") skip();
        }}
        ref={cardRef}
        tabIndex={-1}
        transition={reduceMotion ? { duration: 0 } : { damping: 22, stiffness: 300, type: "spring" }}
      >
        <header className={styles.head}>
          <span className={styles.stepLabel}>{t("onboarding.stepLabel", { current: step + 1, total: TOTAL_STEPS })}</span>
          <button className={styles.skip} disabled={applying} onClick={skip} type="button">
            {t("onboarding.skip")}
          </button>
        </header>

        <div aria-hidden className={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <i className={index === step ? styles.dotActive : styles.dot} key={index} />
          ))}
        </div>

        {step === 0 ? (
          <form className={styles.body} onSubmit={submitWelcome}>
            <span className={styles.kicker}>{t("onboarding.welcome.kicker")}</span>
            <h2 className={styles.title}>{t("onboarding.welcome.title", { name: nameDraft.trim() || user.name })}</h2>
            <p className={styles.desc}>{t("onboarding.welcome.body")}</p>
            <label className={styles.nameField}>
              <span>{t("onboarding.welcome.nameLabel")}</span>
              <input
                autoFocus
                maxLength={40}
                onChange={(event) => setNameDraft(event.target.value)}
                value={nameDraft}
              />
              <small>{t("onboarding.welcome.nameHint")}</small>
            </label>
            <footer className={styles.foot}>
              <Button type="submit" variant="primary">
                {t("onboarding.next")}
              </Button>
            </footer>
          </form>
        ) : null}

        {step === 1 ? (
          <div className={styles.body}>
            <h2 className={styles.title}>{t("onboarding.role.title")}</h2>
            <p className={styles.desc}>{t("onboarding.role.body")}</p>
            <div aria-label={t("onboarding.role.gridAria")} className={styles.roleGrid} role="group">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    className={styles.roleCard}
                    data-selected={selectedRole === option.role ? "true" : undefined}
                    key={option.role}
                    onClick={() => chooseRole(option.role)}
                    type="button"
                  >
                    <span aria-hidden className={styles.roleIcon}>
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className={styles.roleLabel}>{t(option.labelKey)}</span>
                  </button>
                );
              })}
            </div>
            <footer className={styles.foot}>
              <Button onClick={() => setStep(0)} variant="quiet">
                {t("onboarding.back")}
              </Button>
            </footer>
          </div>
        ) : null}

        {step === 2 && selectedRole ? (
          <div className={styles.body}>
            <h2 className={styles.title}>{t("onboarding.preset.title", { role: t(roleLabelKey) })}</h2>
            <p className={styles.desc}>{t("onboarding.preset.body")}</p>
            <div className={styles.presetBox}>
              <span className={styles.presetLabel}>{t("onboarding.preset.cardsLabel")}</span>
              <ul className={styles.presetCards}>
                {widgetTitleKeys(selectedRole).map((titleKey) => (
                  <li key={titleKey}>{t(titleKey)}</li>
                ))}
              </ul>
              <span className={styles.presetLabel}>{t("onboarding.preset.homeLabel")}</span>
              <p className={styles.presetHome}>{t(presetHomeKey)}</p>
            </div>
            <footer className={styles.foot}>
              <Button disabled={applying} onClick={() => setStep(1)} variant="quiet">
                {t("onboarding.back")}
              </Button>
              <Button loading={applying} onClick={() => void applyPreset()} variant="primary">
                {applying ? t("onboarding.preset.applying") : t("onboarding.preset.apply")}
              </Button>
            </footer>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
