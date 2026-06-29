import { Bot, FileSearch, FolderOpen, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./resource-search-command.module.css";

const scopeFilters = [
  { label: "전체", count: "32", selected: true },
  { label: "프로젝트룸 자료", count: "18", selected: false },
  { label: "개인 자료", count: "9", selected: false },
  { label: "확인할 항목", count: "3", selected: false },
];

const resultItems = [
  {
    title: "회의록_0618.md",
    meta: "프로젝트룸 자료 · 댓글 4 · 관련도 92%",
    detail: "검수 기준, 중간보고 일정, 보이스 대기방 범위가 계약서와 함께 언급됐습니다.",
    tone: "room" as const,
  },
  {
    title: "번역계약서_v2.pdf",
    meta: "프로젝트룸 자료 · 확인할 항목 2 · 관련도 88%",
    detail: "납품일, 수정 범위, 2차 사용권 범위를 견적서와 함께 확인해야 합니다.",
    tone: "warning" as const,
  },
  {
    title: "개인_검토메모.txt",
    meta: "개인 자료 · 공유 전 · 관련도 71%",
    detail: "내가 남긴 검토 메모입니다. 프로젝트룸에는 공유 전까지 보이지 않습니다.",
    tone: "personal" as const,
  },
];

const evidenceRows = [
  ["검색 범위", "내 개인 자료와 접근 권한이 있는 프로젝트룸 자료"],
  ["권한 필터", "올린 사람, 프로젝트룸, 자료 범위 기준"],
  ["검색 방식", "키워드 검색과 의미 검색 결과를 함께 표시"],
  ["에이전트 사용", "검색된 문서를 근거로 요약과 확인 질문 후보 생성"],
];

export function ResourceSearchCommand() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <FileSearch size={16} aria-hidden="true" />
          자료보드 검색
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>흩어진 자료를 권한 범위 안에서 찾아봅니다</h2>
            <p className={styles.summary}>
              자료보드 검색은 파일명만 찾는 기능이 아닙니다. 계약서, 회의록, 요구사항 문서의 내용을 함께 보고, 같은 권한 범위
              안에서 관련 문서와 확인할 항목을 이어서 보여줍니다.
            </p>
          </div>
          <StatusBadge tone="agent">에이전트 검색</StatusBadge>
        </div>
      </header>

      <section className={styles.commandBox} aria-label="자료 검색 명령">
        <div className={styles.commandInput}>
          <Search size={18} aria-hidden="true" />
          <span>계약서 관련 회의록 찾아줘</span>
          <kbd>Ctrl K</kbd>
        </div>
        <div className={styles.commandMeta}>
          <Chip selected icon={<ShieldCheck size={14} aria-hidden="true" />}>
            권한 필터 적용
          </Chip>
          <Chip icon={<Bot size={14} aria-hidden="true" />}>관련 문서 추천</Chip>
          <Chip icon={<Sparkles size={14} aria-hidden="true" />}>확인 질문 후보</Chip>
        </div>
      </section>

      <nav className={styles.scopeTabs} aria-label="자료 검색 범위">
        {scopeFilters.map((filter) => (
          <button className={filter.selected ? styles.scopeActive : ""} type="button" key={filter.label}>
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </nav>

      <section className={styles.contentGrid} aria-label="검색 결과와 판단 패널">
        <div className={styles.resultList}>
          {resultItems.map((item) => (
            <article className={styles.resultCard} key={item.title}>
              <div className={styles.resultTop}>
                <span className={styles.fileIcon}>
                  <FolderOpen size={17} aria-hidden="true" />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
                <StatusBadge tone={item.tone}>{item.tone === "personal" ? "개인" : item.tone === "warning" ? "확인" : "룸"}</StatusBadge>
              </div>
              <p className={styles.resultDetail}>{item.detail}</p>
            </article>
          ))}
        </div>

        <aside className={styles.judgementPanel} aria-label="검색 근거와 권한 기준">
          <div className={styles.panelTitle}>
            <LockKeyhole size={18} aria-hidden="true" />
            <h3>검색 근거</h3>
          </div>
          <div className={styles.evidenceList}>
            {evidenceRows.map(([label, value]) => (
              <div className={styles.evidenceRow} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className={styles.notice}>
            <ShieldCheck size={17} aria-hidden="true" />
            <p>개인 자료는 직접 공유하기 전까지 프로젝트룸 멤버와 프로젝트룸 에이전트에게 보이지 않습니다.</p>
          </div>
        </aside>
      </section>
    </GlassPanel>
  );
}
