import { Eye, EyeOff, Moon, Palette, PanelTop, SunMedium } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./theme-contrast-panel.module.css";

const themeCards = [
  {
    title: "기본 워터블루",
    description: "회원 웹 앱과 데스크탑 앱 기본 화면은 밝은 배경, 밀크 글래스, 워터블루 강조를 우선합니다.",
    storage: "내 화면 테마",
    tone: "light",
    icon: SunMedium,
  },
  {
    title: "블랙화이트 다크",
    description: "어두운 화면은 넓은 남색 면을 줄이고 거의 검정에 가까운 표면과 흰 글자, 하늘색 강조만 남깁니다.",
    storage: "내 화면 테마",
    tone: "dark",
    icon: Moon,
  },
  {
    title: "고스트 모드 글자",
    description: "버블 배경을 거의 지워도 업무 내용이 읽히도록 배경별 글자 색과 halo를 바꿉니다.",
    storage: "버블 표시 옵션",
    tone: "ghost",
    icon: EyeOff,
  },
];

const contrastRules = [
  ["밝은 배경", "어두운 글자와 흰 halo를 사용"],
  ["어두운 배경", "흰 글자와 어두운 그림자를 사용"],
  ["복잡한 배경", "투명도보다 글자 그림자와 굵기로 위계를 유지"],
  ["저장 경계", "앱 테마는 사용자 설정, 버블 고스트는 버블 설정으로 분리"],
];

export function ThemeContrastPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Palette size={16} aria-hidden="true" />
          테마와 대비 기준
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>밝은 화면은 맑게, 어두운 화면은 또렷하게 둡니다</h2>
            <p className={styles.summary}>
              테마는 사용자별 화면 설정이고, 고스트 모드는 버블별 표시 옵션입니다. 둘을 섞지 않고 저장 위치를 나눠야 웹 화면과
              데스크톱 버블이 같은 기준으로 보입니다.
            </p>
          </div>
          <StatusBadge tone="personal">테마 · 고스트 모드</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="테마 설정 핵심 기준">
          <Chip selected icon={<SunMedium size={14} aria-hidden="true" />}>
            워터블루 라이트
          </Chip>
          <Chip icon={<Moon size={14} aria-hidden="true" />}>블랙화이트 다크</Chip>
          <Chip icon={<EyeOff size={14} aria-hidden="true" />}>고스트 대비</Chip>
        </div>
      </header>

      <section className={styles.themeGrid} aria-label="테마와 저장 기준">
        {themeCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={`${styles.themeCard} ${styles[card.tone]}`} key={card.title}>
              <div className={styles.cardHeader}>
                <span className={styles.iconBubble}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <StatusBadge tone={card.tone === "ghost" ? "timer" : "personal"}>{card.storage}</StatusBadge>
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className={styles.sampleLines} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.bottomGrid} aria-label="테마 대비와 고스트 모드 검증">
        <div className={styles.desktopPreview}>
          <div className={styles.wallpaper}>
            <div className={styles.ghostWidget}>
              <div className={styles.widgetTop}>
                <span>TODO 버블</span>
                <Eye size={15} aria-hidden="true" />
              </div>
              <strong>업무 기준 문서 확인</strong>
              <p>마감 D-2 · 확인 필요 2건</p>
            </div>
          </div>
        </div>

        <div className={styles.ruleCard}>
          <div className={styles.ruleHeader}>
            <PanelTop size={18} aria-hidden="true" />
            <h3>검증 기준</h3>
          </div>
          <dl className={styles.ruleList}>
            {contrastRules.map(([label, body]) => (
              <div className={styles.ruleRow} key={label}>
                <dt>{label}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </GlassPanel>
  );
}
