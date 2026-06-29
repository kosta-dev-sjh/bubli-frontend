import { CaseSensitive, Eye, Gauge, Moon, Type, WandSparkles } from "lucide-react";

import { Chip, GlassPanel, ProgressBar, StatusBadge } from "@/components/ui";

import styles from "./font-strategy-panel.module.css";

const scaleOptions = [
  { label: "90%", value: "0.9", note: "넓게 보기" },
  { label: "100%", value: "1.0", note: "기본값", selected: true },
  { label: "115%", value: "1.15", note: "발표 화면" },
  { label: "130%", value: "1.3", note: "큰 글자" },
];

const strategyCards = [
  {
    title: "사용 폰트",
    body: "비회원 랜딩과 로그인에서 확정한 LINE Seed Sans KR 기준으로 한국어 화면, 숫자, 버튼, 위젯을 맞춥니다.",
    value: "LINE Seed Sans KR",
    icon: Type,
  },
  {
    title: "본문 기준",
    body: "작은 글자 피드백을 반영해 일반 본문은 15px 기준으로 잡습니다.",
    value: "15px",
    icon: CaseSensitive,
  },
  {
    title: "위젯 최소 본문",
    body: "버블이 작아져도 업무 내용은 먼저 읽혀야 하므로 본문을 12.5px 아래로 내리지 않습니다.",
    value: "12.5px 이상",
    icon: Eye,
  },
  {
    title: "표시 설정 저장",
    body: "글자 크기와 표시 밀도는 사용자별 설정으로 저장합니다.",
    value: "내 글자 크기",
    icon: Gauge,
  },
];

const ghostRules = [
  "밝은 배경에서는 어두운 글자와 흰 halo를 쓴다.",
  "어두운 배경에서는 흰 글자와 어두운 그림자를 쓴다.",
  "고스트 모드에서는 글자 굵기를 한 단계 올린다.",
  "캡션과 시간처럼 작은 정보는 고스트 모드에서 한 단계 키운다.",
];

export function FontStrategyPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <WandSparkles size={16} aria-hidden="true" />
          글자 표시 설정
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>작은 글자보다 읽히는 업무 정보를 우선합니다</h2>
            <p className={styles.summary}>
              Bubli는 회원 웹 앱과 데스크탑 버블을 같은 글꼴로 맞추고, 글자 크기 설정을 사용자별로 저장합니다. 고스트 모드에서도
              오늘 할 일과 알림이 먼저 읽혀야 합니다.
            </p>
          </div>
          <StatusBadge tone="personal">글자 크기</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="글자 표시 핵심 기준">
          <Chip selected icon={<Type size={14} aria-hidden="true" />}>
            LINE Seed
          </Chip>
          <Chip icon={<Gauge size={14} aria-hidden="true" />}>90 · 100 · 115 · 130</Chip>
          <Chip icon={<Moon size={14} aria-hidden="true" />}>고스트 모드 가독성</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label="글자 표시와 글자 크기 설정">
        <div className={styles.strategyGrid}>
          {strategyCards.map((card) => {
            const Icon = card.icon;

            return (
              <article className={styles.strategyCard} key={card.title}>
                <span className={styles.iconBubble}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <Chip>{card.value}</Chip>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.previewCard} aria-label="글자 크기 미리보기">
          <div className={styles.previewHeader}>
            <span>미리보기</span>
            <StatusBadge tone="approved">100%</StatusBadge>
          </div>
          <div className={styles.previewBubble}>
            <strong>오늘 할 일</strong>
            <p>회의록 확인 항목 3개 검토</p>
            <span>프로젝트룸 · 승인 전 후보</span>
            <ProgressBar value={64} label="가독성 기준" />
          </div>
          <div className={styles.scaleOptions}>
            {scaleOptions.map((option) => (
              <button className={option.selected ? styles.scaleSelected : ""} key={option.value} type="button">
                <strong>{option.label}</strong>
                <span>{option.note}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className={styles.bottomGrid} aria-label="고스트 모드 글자 기준">
        <div className={styles.ghostCard}>
          <div className={styles.ghostSample}>
            <span>고스트 모드</span>
            <strong>마감 임박 2건</strong>
            <p>투명도가 높아도 글자는 경계가 남아야 합니다.</p>
          </div>
        </div>

        <div className={styles.ruleCard}>
          <h3>고스트 모드 기준</h3>
          <ul className={styles.ruleList}>
            {ghostRules.map((rule) => (
              <li className={styles.ruleItem} key={rule}>
                <Eye size={16} aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </GlassPanel>
  );
}
