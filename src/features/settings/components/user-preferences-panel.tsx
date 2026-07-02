"use client";

import { Clock3, FolderKanban, Gauge, Languages, Paintbrush, Save, ShieldCheck, UserRound } from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./user-preferences-panel.module.css";

const profileFields: Array<{ labelKey: MessageKey; value: string; valueKey?: MessageKey }> = [
  { labelKey: "settings.up.field.name", value: "", valueKey: "settings.up.field.nameValue" },
  { labelKey: "settings.up.field.email", value: "junghyun@bubli.kr" },
];

const preferenceRows: Array<{
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  value: string;
  valueKey?: MessageKey;
  dbFieldKey: MessageKey;
  icon: typeof Languages;
}> = [
  {
    titleKey: "settings.up.row.langTitle",
    descriptionKey: "settings.up.row.langDesc",
    value: "",
    valueKey: "settings.up.row.langValue",
    dbFieldKey: "settings.up.row.langField",
    icon: Languages,
  },
  {
    titleKey: "settings.up.row.tzTitle",
    descriptionKey: "settings.up.row.tzDesc",
    value: "Asia/Seoul",
    dbFieldKey: "settings.up.row.tzField",
    icon: Clock3,
  },
  {
    titleKey: "settings.up.row.themeTitle",
    descriptionKey: "settings.up.row.themeDesc",
    value: "",
    valueKey: "settings.up.row.themeValue",
    dbFieldKey: "settings.up.row.themeField",
    icon: Paintbrush,
  },
  {
    titleKey: "settings.up.row.densityTitle",
    descriptionKey: "settings.up.row.densityDesc",
    value: "",
    valueKey: "settings.up.row.densityValue",
    dbFieldKey: "settings.up.row.densityField",
    icon: Gauge,
  },
  {
    titleKey: "settings.up.row.roomTitle",
    descriptionKey: "settings.up.row.roomDesc",
    value: "",
    valueKey: "settings.up.row.roomValue",
    dbFieldKey: "settings.up.row.roomField",
    icon: FolderKanban,
  },
];

const boundaryKeys: MessageKey[] = [
  "settings.up.boundary1",
  "settings.up.boundary2",
  "settings.up.boundary3",
  "settings.up.boundary4",
];

const savedSettingRows: Array<{ labelKey: MessageKey; descriptionKey: MessageKey }> = [
  { labelKey: "settings.up.saved.profileLabel", descriptionKey: "settings.up.saved.profileDesc" },
  { labelKey: "settings.up.saved.displayLabel", descriptionKey: "settings.up.saved.displayDesc" },
  { labelKey: "settings.up.saved.personalLabel", descriptionKey: "settings.up.saved.personalDesc" },
];

export function UserPreferencesPanel() {
  const { t }: { t: (key: MessageKey, vars?: TranslateVars) => string } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <UserRound size={16} aria-hidden="true" />
          {t("settings.up.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("settings.up.title")}</h2>
            <p className={styles.summary}>{t("settings.up.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("settings.up.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("settings.up.chipsAria")}>
          <Chip selected icon={<UserRound size={14} aria-hidden="true" />}>
            {t("settings.up.chipAccount")}
          </Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>{t("settings.up.chipSeparate")}</Chip>
          <Chip icon={<FolderKanban size={14} aria-hidden="true" />}>{t("settings.up.chipRoom")}</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label={t("settings.up.layoutAria")}>
        <div className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            JH
          </div>
          <div className={styles.profileCopy}>
            <h3>{t("settings.up.myProfile")}</h3>
            <p>{t("settings.up.profileDesc")}</p>
          </div>
          <div className={styles.profileFields}>
            <label className={styles.field}>
              <span>{t("settings.up.field.name")}</span>
              <input defaultValue={t("settings.up.field.nameValue")} readOnly />
            </label>
            <label className={styles.field}>
              <span>Bubli ID</span>
              <input defaultValue="junghyun.k" readOnly />
            </label>
            {profileFields
              .filter((field) => field.labelKey !== "settings.up.field.name")
              .map((field) => (
                <label className={styles.field} key={field.labelKey}>
                  <span>{t(field.labelKey)}</span>
                  <input defaultValue={field.valueKey ? t(field.valueKey) : field.value} readOnly />
                </label>
              ))}
          </div>
          <Button icon={<Save size={16} />} variant="primary">
            {t("settings.up.saveProfile")}
          </Button>
        </div>

        <div className={styles.preferenceGrid}>
          {preferenceRows.map((row) => {
            const Icon = row.icon;

            return (
              <article className={styles.preferenceCard} key={row.dbFieldKey}>
                <span className={styles.iconBubble}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className={styles.preferenceCopy}>
                  <h3>{t(row.titleKey)}</h3>
                  <p>{t(row.descriptionKey)}</p>
                  <div className={styles.meta}>
                    <StatusBadge tone="neutral">{t(row.dbFieldKey)}</StatusBadge>
                    <Chip>{row.valueKey ? t(row.valueKey) : row.value}</Chip>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.bottomGrid} aria-label={t("settings.up.bottomAria")}>
        <div className={styles.noteCard}>
          <h3>{t("settings.up.storeBoundary")}</h3>
          <ul className={styles.checks}>
            {boundaryKeys.map((boundaryKey) => (
              <li className={styles.checkItem} key={boundaryKey}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>{t(boundaryKey)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.noteCard}>
          <h3>{t("settings.up.savedTitle")}</h3>
          <div className={styles.apiList}>
            {savedSettingRows.map((row) => {
              const label = t(row.labelKey);

              return (
                <div className={styles.apiRow} key={row.labelKey}>
                  <StatusBadge tone="personal">{label}</StatusBadge>
                  <div>
                    <strong>{t("settings.up.savedSuffix", { label })}</strong>
                    <span>{t(row.descriptionKey)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
