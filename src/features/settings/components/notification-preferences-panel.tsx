"use client";

import {
  BellRing,
  Bot,
  CheckCircle2,
  DatabaseZap,
  FileClock,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./notification-preferences-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const preferences: Array<{
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  typeKey: MessageKey;
  channelKey: MessageKey;
  enabled: boolean;
  icon: typeof MessageCircle;
}> = [
  {
    titleKey: "settings.np.pref.msgTitle",
    descriptionKey: "settings.np.pref.msgDesc",
    typeKey: "settings.np.pref.msgType",
    channelKey: "settings.np.pref.msgChannel",
    enabled: true,
    icon: MessageCircle,
  },
  {
    titleKey: "settings.np.pref.commentTitle",
    descriptionKey: "settings.np.pref.commentDesc",
    typeKey: "settings.np.pref.commentType",
    channelKey: "settings.np.pref.commentChannel",
    enabled: true,
    icon: MessageSquareText,
  },
  {
    titleKey: "settings.np.pref.versionTitle",
    descriptionKey: "settings.np.pref.versionDesc",
    typeKey: "settings.np.pref.versionType",
    channelKey: "settings.np.pref.versionChannel",
    enabled: true,
    icon: FileClock,
  },
  {
    titleKey: "settings.np.pref.agentTitle",
    descriptionKey: "settings.np.pref.agentDesc",
    typeKey: "settings.np.pref.agentType",
    channelKey: "settings.np.pref.agentChannel",
    enabled: true,
    icon: Bot,
  },
  {
    titleKey: "settings.np.pref.capacityTitle",
    descriptionKey: "settings.np.pref.capacityDesc",
    typeKey: "settings.np.pref.capacityType",
    channelKey: "settings.np.pref.capacityChannel",
    enabled: false,
    icon: DatabaseZap,
  },
];

const ruleKeys: MessageKey[] = [
  "settings.np.rule1",
  "settings.np.rule2",
  "settings.np.rule3",
  "settings.np.rule4",
];

const deliveryFlow: Array<[MessageKey, MessageKey]> = [
  ["settings.np.flow.eventTitle", "settings.np.flow.eventBody"],
  ["settings.np.flow.checkTitle", "settings.np.flow.checkBody"],
  ["settings.np.flow.saveTitle", "settings.np.flow.saveBody"],
  ["settings.np.flow.showTitle", "settings.np.flow.showBody"],
];

const connectionRows: Array<[MessageKey, MessageKey]> = [
  ["settings.np.conn.myLabel", "settings.np.conn.myDetail"],
  ["settings.np.conn.listLabel", "settings.np.conn.listDetail"],
  ["settings.np.conn.readLabel", "settings.np.conn.readDetail"],
  ["settings.np.conn.archiveLabel", "settings.np.conn.archiveDetail"],
  ["settings.np.conn.bubbleLabel", "settings.np.conn.bubbleDetail"],
];

export function NotificationPreferencesPanel() {
  const { t }: { t: TranslateFn } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <BellRing size={16} aria-hidden="true" />
          {t("settings.np.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("settings.np.title")}</h2>
            <p className={styles.summary}>{t("settings.np.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("settings.np.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("settings.np.chipsAria")}>
          <Chip selected icon={<UserRound size={14} aria-hidden="true" />}>
            {t("settings.np.chipAccount")}
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>{t("settings.np.chipList")}</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>{t("settings.np.chipSeparate")}</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label={t("settings.np.layoutAria")}>
        <div className={styles.preferenceList}>
          {preferences.map((preference) => {
            const Icon = preference.icon;
            const stateLabel = preference.enabled ? t("settings.np.on") : t("settings.np.off");

            return (
              <article className={styles.preferenceCard} key={preference.typeKey}>
                <span className={styles.iconBubble}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div className={styles.preferenceText}>
                  <h3>{t(preference.titleKey)}</h3>
                  <p>{t(preference.descriptionKey)}</p>
                  <div className={styles.meta}>
                    <StatusBadge tone={preference.enabled ? "approved" : "neutral"}>{stateLabel}</StatusBadge>
                    <Chip>{t(preference.typeKey)}</Chip>
                    <Chip>{t(preference.channelKey)}</Chip>
                  </div>
                </div>
                <span
                  aria-label={t("settings.np.toggleAria", { title: t(preference.titleKey), state: stateLabel })}
                  className={`${styles.toggle} ${preference.enabled ? styles.toggleOn : ""}`}
                  role="switch"
                  aria-checked={preference.enabled}
                >
                  <span className={styles.toggleKnob} />
                </span>
              </article>
            );
          })}
        </div>

        <aside className={styles.side} aria-label={t("settings.np.sideAria")}>
          <section className={styles.sideCard}>
            <h3>{t("settings.np.createOrder")}</h3>
            <ol className={styles.flowList}>
              {deliveryFlow.map(([titleKey, bodyKey], index) => (
                <li className={styles.flowItem} key={titleKey}>
                  <span className={styles.flowIndex}>{index + 1}</span>
                  <span className={styles.flowCopy}>
                    <strong>{t(titleKey)}</strong>
                    <span>{t(bodyKey)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("settings.np.verifyTitle")}</h3>
            <ul className={styles.checks}>
              {ruleKeys.map((ruleKey) => (
                <li className={styles.checkItem} key={ruleKey}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{t(ruleKey)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("settings.np.connTitle")}</h3>
            <div className={styles.apiList}>
              {connectionRows.map(([labelKey, detailKey]) => (
                <div className={styles.apiRow} key={labelKey}>
                  <StatusBadge tone="success">{t(labelKey)}</StatusBadge>
                  <span className={styles.apiPath}>{t(detailKey)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
