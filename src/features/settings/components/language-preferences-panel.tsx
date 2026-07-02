import { Clock3, FileText, Globe2, Languages, ShieldCheck } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./language-preferences-panel.module.css";

const localeOptions = [
  { label: "한국어", code: "ko-KR", selected: true },
  { label: "日本語", code: "ja-JP", selected: false },
  { label: "EN", code: "en-US", selected: false },
];

const preferenceRows = [
  {
    title: "화면 언어",
    value: "한국어",
    body: "핵심 화면부터 한국어, 일본어, 영어 번역 파일을 분리해 적용합니다.",
    icon: Languages,
  },
  {
    title: "시간대",
    value: "Asia/Seoul",
    body: "마감일, 일정, 타이머 기록은 사용자 시간대 기준으로 보여줍니다.",
    icon: Clock3,
  },
  {
    title: "자료 원문",
    value: "원문 유지",
    body: "업무 문서와 요구사항 문서는 원문을 보존하고, 필요한 경우 번역 참고만 함께 봅니다.",
    icon: FileText,
  },
];

const languageRules = [
  ["저장 위치", "내 계정의 언어와 시간대 설정"],
  ["적용 범위", "공개 사이트, 회원 웹 앱, 데스크탑 앱의 핵심 화면"],
  ["에이전트 후보", "번역 결과도 후보로 표시하고 사용자가 확인한 내용만 반영"],
  ["권한 기준", "언어 설정은 사용자 개인 설정이며 프로젝트룸 멤버에게 공유하지 않음"],
];

export function LanguagePreferencesPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Globe2 size={16} aria-hidden="true" />
          사용자 설정
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>언어와 시간대는 사용자별로 저장합니다</h2>
            <p className={styles.summary}>
              프리랜서는 국내 자료와 해외 자료를 같이 다룰 수 있습니다. Bubli는 화면 언어와 시간대를 개인 설정으로 저장하고,
              문서 원문은 유지한 채 필요한 번역 참고만 함께 보여줍니다.
            </p>
          </div>
          <StatusBadge tone="personal">개인 설정</StatusBadge>
        </div>
      </header>

      <section className={styles.selectorSection} aria-label="언어 선택">
        <div>
          <h3>표시 언어</h3>
          <p>설정은 내 계정에 저장되고, 프로젝트룸 자료 자체를 바꾸지는 않습니다.</p>
        </div>
        <div className={styles.segmented} role="group" aria-label="표시 언어 선택">
          {localeOptions.map((option) => (
            <button className={option.selected ? styles.segmentActive : ""} type="button" key={option.code}>
              <span>{option.label}</span>
              <small>{option.code}</small>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.preferenceGrid} aria-label="언어와 시간대 설정 항목">
        {preferenceRows.map((row) => {
          const Icon = row.icon;

          return (
            <article className={styles.preferenceCard} key={row.title}>
              <span className={styles.cardIcon}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <div>
                <div className={styles.cardTop}>
                  <h3>{row.title}</h3>
                  <strong>{row.value}</strong>
                </div>
                <p>{row.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.translationFlow} aria-label="번역 자료 처리 흐름">
        <div className={styles.flowIntro}>
          <StatusBadge tone="agent">에이전트 후보</StatusBadge>
          <h3>번역 결과는 사용자가 확인한 뒤 업무에 반영합니다</h3>
          <p>
            일본어 업무 문서나 영어 요구사항을 분석하더라도, 에이전트는 요약과 확인 질문을 제안합니다. 사용자가 확인한 값만
            WBS/TODO와 일정에 반영됩니다.
          </p>
        </div>
        <div className={styles.flowSteps}>
          <span>자료 원문</span>
          <i aria-hidden="true" />
          <span>번역 참고</span>
          <i aria-hidden="true" />
          <span>사용자 확인</span>
          <i aria-hidden="true" />
          <span>업무 반영</span>
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label="저장과 적용 기준">
        {languageRules.map(([label, value]) => (
          <article className={styles.ruleCard} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Chip selected icon={<ShieldCheck size={14} aria-hidden="true" />}>
          프로젝트룸 자료 원문 보존
        </Chip>
        <Chip icon={<Globe2 size={14} aria-hidden="true" />}>사용자별 언어 적용</Chip>
        <Chip icon={<Clock3 size={14} aria-hidden="true" />}>마감과 기록은 시간대 기준</Chip>
      </footer>
    </GlassPanel>
  );
}
