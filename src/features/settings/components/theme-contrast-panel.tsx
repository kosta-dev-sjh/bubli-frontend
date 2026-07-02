"use client";

import { Eye, EyeOff, Moon, Palette, PanelTop, SunMedium } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./theme-contrast-panel.module.css";

const themeCards: Array<{
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  storageKey: MessageKey;
  tone: "light" | "dark" | "ghost";
  icon: typeof SunMedium;
}> = [
  {
    titleKey: "settings.tc.card.lightTitle",
    descriptionKey: "settings.tc.card.lightDesc",
    storageKey: "settings.tc.storageTheme",
    tone: "light",
    icon: SunMedium,
  },
  {
    titleKey: "settings.tc.card.darkTitle",
    descriptionKey: "settings.tc.card.darkDesc",
    storageKey: "settings.tc.storageTheme",
    tone: "dark",
    icon: Moon,
  },
  {
    titleKey: "settings.tc.card.ghostTitle",
    descriptionKey: "settings.tc.card.ghostDesc",
    storageKey: "settings.tc.storageWidget",
    tone: "ghost",
    icon: EyeOff,
  },
];

const contrastRules: Array<[MessageKey, MessageKey]> = [
  ["settings.tc.rule.lightLabel", "settings.tc.rule.lightValue"],
  ["settings.tc.rule.darkLabel", "settings.tc.rule.darkValue"],
  ["settings.tc.rule.complexLabel", "settings.tc.rule.complexValue"],
  ["settings.tc.rule.storeLabel", "settings.tc.rule.storeValue"],
];

export function ThemeContrastPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Palette size={16} aria-hidden="true" />
          {t("settings.tc.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("settings.tc.title")}</h2>
            <p className={styles.summary}>{t("settings.tc.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("settings.tc.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("settings.tc.chipsAria")}>
          <Chip selected icon={<SunMedium size={14} aria-hidden="true" />}>
            {t("settings.tc.chipLight")}
          </Chip>
          <Chip icon={<Moon size={14} aria-hidden="true" />}>{t("settings.tc.chipDark")}</Chip>
          <Chip icon={<EyeOff size={14} aria-hidden="true" />}>{t("settings.tc.chipGhost")}</Chip>
        </div>
      </header>

      <section className={styles.themeGrid} aria-label={t("settings.tc.themeAria")}>
        {themeCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={`${styles.themeCard} ${styles[card.tone]}`} key={card.titleKey}>
              <div className={styles.cardHeader}>
                <span className={styles.iconBubble}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <StatusBadge tone={card.tone === "ghost" ? "timer" : "personal"}>{t(card.storageKey)}</StatusBadge>
              </div>
              <h3>{t(card.titleKey)}</h3>
              <p>{t(card.descriptionKey)}</p>
              <div className={styles.sampleLines} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.bottomGrid} aria-label={t("settings.tc.bottomAria")}>
        <div className={styles.desktopPreview}>
          <div className={styles.wallpaper}>
            <div className={styles.ghostWidget}>
              <div className={styles.widgetTop}>
                <span>{t("settings.tc.todoBubble")}</span>
                <Eye size={15} aria-hidden="true" />
              </div>
              <strong>{t("settings.tc.todoStrong")}</strong>
              <p>{t("settings.tc.todoMeta")}</p>
            </div>
          </div>
        </div>

        <div className={styles.ruleCard}>
          <div className={styles.ruleHeader}>
            <PanelTop size={18} aria-hidden="true" />
            <h3>{t("settings.tc.verifyTitle")}</h3>
          </div>
          <dl className={styles.ruleList}>
            {contrastRules.map(([labelKey, bodyKey]) => (
              <div className={styles.ruleRow} key={labelKey}>
                <dt>{t(labelKey)}</dt>
                <dd>{t(bodyKey)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </GlassPanel>
  );
}
