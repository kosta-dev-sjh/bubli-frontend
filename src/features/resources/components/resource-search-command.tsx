"use client";

import { Bot, FileSearch, FolderOpen, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

import styles from "./resource-search-command.module.css";

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

export function ResourceSearchCommand() {
  const { t } = useI18n();
  const scopeFilters = [
    { label: t("resources.search.scopeAll"), count: "32", selected: true },
    { label: t("resources.search.scopeRoom"), count: "18", selected: false },
    { label: t("resources.search.scopePersonal"), count: "9", selected: false },
    { label: t("resources.search.scopeReview"), count: "3", selected: false },
  ];
  const evidenceRows = [
    [t("resources.search.evidenceScopeLabel"), t("resources.search.evidenceScopeValue")],
    [t("resources.search.evidencePermissionLabel"), t("resources.search.evidencePermissionValue")],
    [t("resources.search.evidenceMethodLabel"), t("resources.search.evidenceMethodValue")],
    [t("resources.search.evidenceAgentLabel"), t("resources.search.evidenceAgentValue")],
  ];

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <FileSearch size={16} aria-hidden="true" />
          {t("resources.search.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("resources.search.title")}</h2>
            <p className={styles.summary}>{t("resources.search.summary")}</p>
          </div>
          <StatusBadge tone="agent">{t("resources.search.badge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.commandBox} aria-label={t("resources.search.commandAria")}>
        <div className={styles.commandInput}>
          <Search size={18} aria-hidden="true" />
          <span>{t("resources.search.commandQuery")}</span>
          <kbd>Ctrl K</kbd>
        </div>
        <div className={styles.commandMeta}>
          <Chip selected icon={<ShieldCheck size={14} aria-hidden="true" />}>
            {t("resources.search.chipPermission")}
          </Chip>
          <Chip icon={<Bot size={14} aria-hidden="true" />}>{t("resources.search.chipRelated")}</Chip>
          <Chip icon={<Sparkles size={14} aria-hidden="true" />}>{t("resources.search.chipCandidate")}</Chip>
        </div>
      </section>

      <nav className={styles.scopeTabs} aria-label={t("resources.search.scopeAria")}>
        {scopeFilters.map((filter) => (
          <button className={filter.selected ? styles.scopeActive : ""} type="button" key={filter.label}>
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </nav>

      <section className={styles.contentGrid} aria-label={t("resources.search.contentAria")}>
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
                <StatusBadge tone={item.tone}>{item.tone === "personal" ? t("resources.search.resultPersonal") : item.tone === "warning" ? t("resources.search.resultReview") : t("resources.search.resultRoom")}</StatusBadge>
              </div>
              <p className={styles.resultDetail}>{item.detail}</p>
            </article>
          ))}
        </div>

        <aside className={styles.judgementPanel} aria-label={t("resources.search.evidenceAria")}>
          <div className={styles.panelTitle}>
            <LockKeyhole size={18} aria-hidden="true" />
            <h3>{t("resources.search.evidenceTitle")}</h3>
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
            <p>{t("resources.search.notice")}</p>
          </div>
        </aside>
      </section>
    </GlassPanel>
  );
}
