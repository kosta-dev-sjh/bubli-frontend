"use client";

import { Bot, FileSearch, FolderOpen, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

import styles from "./resource-search-command.module.css";

export function ResourceSearchCommand() {
  const { t } = useI18n();

  const scopeFilters = [
    { label: t("resources.search.scopeAll"), count: "32", selected: true },
    { label: t("resources.search.scopeRoom"), count: "18", selected: false },
    { label: t("resources.search.scopePersonal"), count: "9", selected: false },
    { label: t("resources.search.scopeReview"), count: "3", selected: false },
  ];

  const resultItems = [
    {
      title: t("resources.search.result1Title"),
      meta: t("resources.search.result1Meta"),
      detail: t("resources.search.result1Detail"),
      tone: "room" as const,
    },
    {
      title: t("resources.search.result2Title"),
      meta: t("resources.search.result2Meta"),
      detail: t("resources.search.result2Detail"),
      tone: "warning" as const,
    },
    {
      title: t("resources.search.result3Title"),
      meta: t("resources.search.result3Meta"),
      detail: t("resources.search.result3Detail"),
      tone: "personal" as const,
    },
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
            <p className={styles.summary}>
              {t("resources.search.summary")}
            </p>
          </div>
          <StatusBadge tone="agent">{t("resources.search.agentBadge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.commandBox} aria-label={t("resources.search.commandAria")}>
        <div className={styles.commandInput}>
          <Search size={18} aria-hidden="true" />
          <span>{t("resources.search.commandPlaceholder")}</span>
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

      <section className={styles.contentGrid} aria-label={t("resources.search.resultAria")}>
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
                <StatusBadge tone={item.tone}>{item.tone === "personal" ? t("resources.search.badgePersonal") : item.tone === "warning" ? t("resources.search.badgeReview") : t("resources.search.badgeRoom")}</StatusBadge>
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
