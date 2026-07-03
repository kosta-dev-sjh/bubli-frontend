"use client";

import {
  CheckCircle2,
  Cloud,
  Download,
  FileCheck2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./resource-access-download-panel.module.css";

const accessCards = [
  {
    titleKey: "resources.access.personalTitle" as MessageKey,
    captionKey: "resources.access.personalCaption" as MessageKey,
    statusKey: "resources.access.personalStatus" as MessageKey,
    tone: "personal" as const,
    icon: UserRound,
    rules: [
      ["resources.access.personalRule1Label", "resources.access.personalRule1Value"],
      ["resources.access.personalRule2Label", "resources.access.personalRule2Value"],
      ["resources.access.personalRule3Label", "resources.access.personalRule3Value"],
    ] as [MessageKey, MessageKey][],
  },
  {
    titleKey: "resources.access.roomTitle" as MessageKey,
    captionKey: "resources.access.roomCaption" as MessageKey,
    statusKey: "resources.access.roomStatus" as MessageKey,
    tone: "room" as const,
    icon: UsersRound,
    rules: [
      ["resources.access.roomRule1Label", "resources.access.roomRule1Value"],
      ["resources.access.roomRule2Label", "resources.access.roomRule2Value"],
      ["resources.access.roomRule3Label", "resources.access.roomRule3Value"],
    ] as [MessageKey, MessageKey][],
  },
  {
    titleKey: "resources.access.nonMemberTitle" as MessageKey,
    captionKey: "resources.access.nonMemberCaption" as MessageKey,
    statusKey: "resources.access.nonMemberStatus" as MessageKey,
    tone: "warning" as const,
    icon: MessageCircle,
    rules: [
      ["resources.access.nonMemberRule1Label", "resources.access.nonMemberRule1Value"],
      ["resources.access.nonMemberRule2Label", "resources.access.nonMemberRule2Value"],
      ["resources.access.nonMemberRule3Label", "resources.access.nonMemberRule3Value"],
    ] as [MessageKey, MessageKey][],
  },
];

const flowSteps: [MessageKey, MessageKey][] = [
  ["resources.access.flowStep1Title", "resources.access.flowStep1Body"],
  ["resources.access.flowStep2Title", "resources.access.flowStep2Body"],
  ["resources.access.flowStep3Title", "resources.access.flowStep3Body"],
  ["resources.access.flowStep4Title", "resources.access.flowStep4Body"],
  ["resources.access.flowStep5Title", "resources.access.flowStep5Body"],
];

const policyChecks: MessageKey[] = [
  "resources.access.policyCheck1",
  "resources.access.policyCheck2",
  "resources.access.policyCheck3",
  "resources.access.policyCheck4",
];

const apiRows = [
  ["GET", "/api/resources?scope=personal"],
  ["POST", "/api/resources"],
  ["GET", "/api/resources/{id}/download-url"],
  ["GET", "/api/project-rooms/{roomId}/resources"],
];

export function ResourceAccessDownloadPanel() {
  const { t } = useI18n();
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={16} aria-hidden="true" />
          {t("resources.access.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div>
            <h2 className={styles.title}>{t("resources.access.title")}</h2>
            <p className={styles.summary}>{t("resources.access.summary")}</p>
          </div>
          <StatusBadge tone="approved">{t("resources.access.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("resources.access.chipsAria")}>
          <Chip selected icon={<LockKeyhole size={14} aria-hidden="true" />}>
            {t("resources.access.chipNoAutoShare")}
          </Chip>
          <Chip icon={<Download size={14} aria-hidden="true" />}>{t("resources.access.chipDownload")}</Chip>
          <Chip icon={<Cloud size={14} aria-hidden="true" />}>{t("resources.access.chipStorage")}</Chip>
        </div>
      </header>

      <section className={styles.grid} aria-label={t("resources.access.gridAria")}>
        {accessCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={styles.card} key={card.titleKey}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>
                  <span className={styles.iconBubble}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <StatusBadge tone={card.tone}>{t(card.statusKey)}</StatusBadge>
                </div>
                <div className={styles.cardHeading}>
                  <h3>{t(card.titleKey)}</h3>
                  <p>{t(card.captionKey)}</p>
                </div>
              </div>
              <ul className={styles.ruleList}>
                {card.rules.map(([labelKey, valueKey]) => (
                  <li className={styles.ruleItem} key={labelKey}>
                    <span className={styles.ruleLabel}>{t(labelKey)}</span>
                    <span>{t(valueKey)}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className={styles.flowPanel} aria-label={t("resources.access.flowAria")}>
        <div className={styles.flowTitle}>
          <div>
            <h3>{t("resources.access.flowTitle")}</h3>
            <p>{t("resources.access.flowDesc")}</p>
          </div>
          <StatusBadge tone="pending">{t("resources.access.flowBadge")}</StatusBadge>
        </div>
        <div className={styles.flow}>
          {flowSteps.map(([titleKey, bodyKey], index) => (
            <div className={styles.flowStep} key={titleKey}>
              <span className={styles.flowIndex}>{index + 1}</span>
              <strong>{t(titleKey)}</strong>
              <span>{t(bodyKey)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label={t("resources.access.policyGridAria")}>
        <div className={styles.policyCard}>
          <h3>{t("resources.access.policyImplTitle")}</h3>
          <ul className={styles.checks}>
            {policyChecks.map((item) => (
              <li className={styles.checkItem} key={item}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.policyCard}>
          <h3>{t("resources.access.apiTitle")}</h3>
          <div className={styles.apiList}>
            {apiRows.map(([method, path]) => (
              <div className={styles.apiRow} key={path}>
                <StatusBadge tone={method === "GET" ? "success" : "pending"}>{method === "GET" ? t("resources.access.apiGet") : t("resources.access.apiChange")}</StatusBadge>
                <span className={styles.apiPath}>{path}</span>
              </div>
            ))}
          </div>
          <div className={styles.checkItem}>
            <FileCheck2 size={16} aria-hidden="true" />
            <span>{t("resources.access.apiNote")}</span>
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
