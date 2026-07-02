"use client";

import { Clock3, FileText, Globe2, Languages, ShieldCheck } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./language-preferences-panel.module.css";

const localeOptions = [
  { label: "한국어", code: "ko-KR", selected: true },
  { label: "日本語", code: "ja-JP", selected: false },
  { label: "EN", code: "en-US", selected: false },
];

const preferenceRows: Array<{ titleKey: MessageKey; value: string; valueKey?: MessageKey; bodyKey: MessageKey; icon: typeof Languages }> = [
  {
    titleKey: "settings.lang.row.screenTitle",
    value: "",
    valueKey: "settings.lang.row.screenValue",
    bodyKey: "settings.lang.row.screenBody",
    icon: Languages,
  },
  {
    titleKey: "settings.lang.row.tzTitle",
    value: "Asia/Seoul",
    bodyKey: "settings.lang.row.tzBody",
    icon: Clock3,
  },
  {
    titleKey: "settings.lang.row.docTitle",
    value: "",
    valueKey: "settings.lang.row.docValue",
    bodyKey: "settings.lang.row.docBody",
    icon: FileText,
  },
];

const languageRules: Array<[MessageKey, MessageKey]> = [
  ["settings.lang.rule.storeLabel", "settings.lang.rule.storeValue"],
  ["settings.lang.rule.scopeLabel", "settings.lang.rule.scopeValue"],
  ["settings.lang.rule.agentLabel", "settings.lang.rule.agentValue"],
  ["settings.lang.rule.permLabel", "settings.lang.rule.permValue"],
];

export function LanguagePreferencesPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Globe2 size={16} aria-hidden="true" />
          {t("settings.lang.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("settings.lang.title")}</h2>
            <p className={styles.summary}>{t("settings.lang.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("settings.lang.badge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.selectorSection} aria-label={t("settings.lang.selectorAria")}>
        <div>
          <h3>{t("settings.lang.displayTitle")}</h3>
          <p>{t("settings.lang.displayBody")}</p>
        </div>
        <div className={styles.segmented} role="group" aria-label={t("settings.lang.segmentAria")}>
          {localeOptions.map((option) => (
            <button className={option.selected ? styles.segmentActive : ""} type="button" key={option.code}>
              <span>{option.label}</span>
              <small>{option.code}</small>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.preferenceGrid} aria-label={t("settings.lang.prefAria")}>
        {preferenceRows.map((row) => {
          const Icon = row.icon;

          return (
            <article className={styles.preferenceCard} key={row.titleKey}>
              <span className={styles.cardIcon}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <div>
                <div className={styles.cardTop}>
                  <h3>{t(row.titleKey)}</h3>
                  <strong>{row.valueKey ? t(row.valueKey) : row.value}</strong>
                </div>
                <p>{t(row.bodyKey)}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.translationFlow} aria-label={t("settings.lang.flowAria")}>
        <div className={styles.flowIntro}>
          <StatusBadge tone="agent">{t("settings.lang.flowBadge")}</StatusBadge>
          <h3>{t("settings.lang.flowTitle")}</h3>
          <p>{t("settings.lang.flowBody")}</p>
        </div>
        <div className={styles.flowSteps}>
          <span>{t("settings.lang.flow.source")}</span>
          <i aria-hidden="true" />
          <span>{t("settings.lang.flow.ref")}</span>
          <i aria-hidden="true" />
          <span>{t("settings.lang.flow.confirm")}</span>
          <i aria-hidden="true" />
          <span>{t("settings.lang.flow.apply")}</span>
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label={t("settings.lang.ruleAria")}>
        {languageRules.map(([labelKey, valueKey]) => (
          <article className={styles.ruleCard} key={labelKey}>
            <span>{t(labelKey)}</span>
            <strong>{t(valueKey)}</strong>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Chip selected icon={<ShieldCheck size={14} aria-hidden="true" />}>
          {t("settings.lang.chipPreserve")}
        </Chip>
        <Chip icon={<Globe2 size={14} aria-hidden="true" />}>{t("settings.lang.chipApply")}</Chip>
        <Chip icon={<Clock3 size={14} aria-hidden="true" />}>{t("settings.lang.chipTz")}</Chip>
      </footer>
    </GlassPanel>
  );
}
