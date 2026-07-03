"use client";

import { CaseSensitive, Eye, Gauge, Moon, Type, WandSparkles } from "lucide-react";

import { Chip, GlassPanel, ProgressBar, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./font-strategy-panel.module.css";

const scaleOptions: Array<{ label: string; value: string; noteKey: MessageKey; selected?: boolean }> = [
  { label: "90%", value: "0.9", noteKey: "settings.font.scale.wide" },
  { label: "100%", value: "1.0", noteKey: "settings.font.scale.default", selected: true },
  { label: "115%", value: "1.15", noteKey: "settings.font.scale.present" },
  { label: "130%", value: "1.3", noteKey: "settings.font.scale.large" },
];

const strategyCards: Array<{ titleKey: MessageKey; bodyKey: MessageKey; value: string; valueKey?: MessageKey; icon: typeof Type }> = [
  {
    titleKey: "settings.font.card.fontTitle",
    bodyKey: "settings.font.card.fontBody",
    value: "LINE Seed Sans KR",
    icon: Type,
  },
  {
    titleKey: "settings.font.card.bodyTitle",
    bodyKey: "settings.font.card.bodyBody",
    value: "15px",
    icon: CaseSensitive,
  },
  {
    titleKey: "settings.font.card.widgetTitle",
    bodyKey: "settings.font.card.widgetBody",
    value: "",
    valueKey: "settings.font.card.widgetValue",
    icon: Eye,
  },
  {
    titleKey: "settings.font.card.saveTitle",
    bodyKey: "settings.font.card.saveBody",
    value: "",
    valueKey: "settings.font.card.saveValue",
    icon: Gauge,
  },
];

const ghostRuleKeys: MessageKey[] = [
  "settings.font.ghost.rule1",
  "settings.font.ghost.rule2",
  "settings.font.ghost.rule3",
  "settings.font.ghost.rule4",
];

export function FontStrategyPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <WandSparkles size={16} aria-hidden="true" />
          {t("settings.font.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("settings.font.title")}</h2>
            <p className={styles.summary}>{t("settings.font.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("settings.font.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("settings.font.chipsAria")}>
          <Chip selected icon={<Type size={14} aria-hidden="true" />}>
            LINE Seed
          </Chip>
          <Chip icon={<Gauge size={14} aria-hidden="true" />}>90 · 100 · 115 · 130</Chip>
          <Chip icon={<Moon size={14} aria-hidden="true" />}>{t("settings.font.chipGhost")}</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label={t("settings.font.layoutAria")}>
        <div className={styles.strategyGrid}>
          {strategyCards.map((card) => {
            const Icon = card.icon;

            return (
              <article className={styles.strategyCard} key={card.titleKey}>
                <span className={styles.iconBubble}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>{t(card.titleKey)}</h3>
                  <p>{t(card.bodyKey)}</p>
                  <Chip>{card.valueKey ? t(card.valueKey) : card.value}</Chip>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.previewCard} aria-label={t("settings.font.previewAria")}>
          <div className={styles.previewHeader}>
            <span>{t("settings.font.preview")}</span>
            <StatusBadge tone="approved">100%</StatusBadge>
          </div>
          <div className={styles.previewBubble}>
            <strong>{t("settings.font.preview.todo")}</strong>
            <p>{t("settings.font.preview.todoBody")}</p>
            <span>{t("settings.font.preview.todoMeta")}</span>
            <ProgressBar value={64} label={t("settings.font.preview.readability")} />
          </div>
          <div className={styles.scaleOptions}>
            {scaleOptions.map((option) => (
              <button className={option.selected ? styles.scaleSelected : ""} key={option.value} type="button">
                <strong>{option.label}</strong>
                <span>{t(option.noteKey)}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className={styles.bottomGrid} aria-label={t("settings.font.bottomAria")}>
        <div className={styles.ghostCard}>
          <div className={styles.ghostSample}>
            <span>{t("settings.font.ghostMode")}</span>
            <strong>{t("settings.font.ghostSample")}</strong>
            <p>{t("settings.font.ghostBody")}</p>
          </div>
        </div>

        <div className={styles.ruleCard}>
          <h3>{t("settings.font.ghostRuleTitle")}</h3>
          <ul className={styles.ruleList}>
            {ghostRuleKeys.map((ruleKey) => (
              <li className={styles.ruleItem} key={ruleKey}>
                <Eye size={16} aria-hidden="true" />
                <span>{t(ruleKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </GlassPanel>
  );
}
