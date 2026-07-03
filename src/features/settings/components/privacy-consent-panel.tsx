"use client";

import { EyeOff, FolderLock, History, MonitorCog, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./privacy-consent-panel.module.css";

const consentRows: Array<{
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  consentType: string;
  state: "ON" | "OFF";
  sourceKey: MessageKey;
  icon: typeof MonitorCog;
}> = [
  {
    titleKey: "settings.pc.row.activityTitle",
    descriptionKey: "settings.pc.row.activityDesc",
    consentType: "ACTIVITY_CONTEXT",
    state: "ON",
    sourceKey: "settings.pc.row.activitySource",
    icon: MonitorCog,
  },
  {
    titleKey: "settings.pc.row.folderTitle",
    descriptionKey: "settings.pc.row.folderDesc",
    consentType: "MANAGED_FOLDER_ACCESS",
    state: "ON",
    sourceKey: "settings.pc.row.folderSource",
    icon: FolderLock,
  },
  {
    titleKey: "settings.pc.row.memoryTitle",
    descriptionKey: "settings.pc.row.memoryDesc",
    consentType: "LOCAL_AGENT_MEMORY",
    state: "OFF",
    sourceKey: "settings.pc.row.memorySource",
    icon: History,
  },
];

const neverCollectKeys: MessageKey[] = [
  "settings.pc.never.capture",
  "settings.pc.never.keyboard",
  "settings.pc.never.password",
  "settings.pc.never.outside",
];

const auditRows: Array<[MessageKey, MessageKey]> = [
  ["settings.pc.audit.storeLabel", "settings.pc.audit.storeValue"],
  ["settings.pc.audit.editLabel", "settings.pc.audit.editValue"],
  ["settings.pc.audit.deleteLabel", "settings.pc.audit.deleteValue"],
  ["settings.pc.audit.roomLabel", "settings.pc.audit.roomValue"],
];

const apiRows: Array<{ methodKey: MessageKey; pathKey: MessageKey; tone: StatusTone }> = [
  { methodKey: "settings.pc.api.readConsentMethod", pathKey: "settings.pc.api.readConsentPath", tone: "success" },
  { methodKey: "settings.pc.api.updateMethod", pathKey: "settings.pc.api.updatePath", tone: "pending" },
  { methodKey: "settings.pc.api.readActivityMethod", pathKey: "settings.pc.api.readActivityPath", tone: "success" },
  { methodKey: "settings.pc.api.deleteMethod", pathKey: "settings.pc.api.deletePath", tone: "warning" },
];

export function PrivacyConsentPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={16} aria-hidden="true" />
          {t("settings.pc.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("settings.pc.title")}</h2>
            <p className={styles.summary}>{t("settings.pc.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("settings.pc.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("settings.pc.chipsAria")}>
          <Chip selected icon={<ShieldCheck size={14} aria-hidden="true" />}>
            {t("settings.pc.chipConsent")}
          </Chip>
          <Chip icon={<EyeOff size={14} aria-hidden="true" />}>{t("settings.pc.chipNoCollect")}</Chip>
          <Chip icon={<RotateCcw size={14} aria-hidden="true" />}>{t("settings.pc.chipAnytime")}</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label={t("settings.pc.layoutAria")}>
        <div className={styles.consentList}>
          {consentRows.map((row) => {
            const Icon = row.icon;
            const enabled = row.state === "ON";
            const stateLabel = enabled ? t("settings.pc.on") : t("settings.pc.off");

            return (
              <article className={styles.consentCard} key={row.consentType}>
                <span className={styles.iconBubble}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div className={styles.consentCopy}>
                  <h3>{t(row.titleKey)}</h3>
                  <p>{t(row.descriptionKey)}</p>
                  <div className={styles.meta}>
                    <StatusBadge tone={enabled ? "approved" : "neutral"}>{row.state}</StatusBadge>
                    <Chip>{row.consentType}</Chip>
                    <Chip>{t(row.sourceKey)}</Chip>
                  </div>
                </div>
                <span
                  aria-label={t("settings.pc.toggleAria", { title: t(row.titleKey), state: stateLabel })}
                  aria-checked={enabled}
                  className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`}
                  role="switch"
                >
                  <span className={styles.toggleKnob} />
                </span>
              </article>
            );
          })}
        </div>

        <aside className={styles.safetyPanel} aria-label={t("settings.pc.neverAria")}>
          <div className={styles.safetyIcon}>
            <EyeOff size={28} aria-hidden="true" />
          </div>
          <h3>{t("settings.pc.neverTitle")}</h3>
          <p>{t("settings.pc.neverBody")}</p>
          <div className={styles.neverGrid}>
            {neverCollectKeys.map((itemKey) => (
              <span className={styles.neverItem} key={itemKey}>
                {t(itemKey)}
              </span>
            ))}
          </div>
          <Button icon={<Trash2 size={16} />} variant="quiet">
            {t("settings.pc.deleteActivity")}
          </Button>
        </aside>
      </section>

      <section className={styles.bottomGrid} aria-label={t("settings.pc.bottomAria")}>
        <div className={styles.noteCard}>
          <h3>{t("settings.pc.auditTitle")}</h3>
          <dl className={styles.auditList}>
            {auditRows.map(([labelKey, valueKey]) => (
              <div className={styles.auditRow} key={labelKey}>
                <dt>{t(labelKey)}</dt>
                <dd>{t(valueKey)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.noteCard}>
          <h3>{t("settings.pc.connTitle")}</h3>
          <div className={styles.apiList}>
            {apiRows.map((row) => (
              <div className={styles.apiRow} key={row.pathKey}>
                <StatusBadge tone={row.tone}>{t(row.methodKey)}</StatusBadge>
                <strong>{t(row.pathKey)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
