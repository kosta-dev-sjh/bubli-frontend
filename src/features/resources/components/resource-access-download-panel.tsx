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
import { useI18n, type MessageKey } from "@/lib/i18n";

import styles from "./resource-access-download-panel.module.css";

const accessCards: {
  title: MessageKey;
  caption: MessageKey;
  status: MessageKey;
  tone: "personal" | "room" | "warning";
  icon: typeof UserRound;
  rules: [MessageKey, MessageKey][];
}[] = [
  {
    title: "resources.accessDownload.cardPersonalTitle",
    caption: "resources.accessDownload.cardPersonalCaption",
    status: "resources.accessDownload.cardPersonalStatus",
    tone: "personal",
    icon: UserRound,
    rules: [
      ["resources.accessDownload.cardPersonalRule1Label", "resources.accessDownload.cardPersonalRule1Value"],
      ["resources.accessDownload.cardPersonalRule2Label", "resources.accessDownload.cardPersonalRule2Value"],
      ["resources.accessDownload.cardPersonalRule3Label", "resources.accessDownload.cardPersonalRule3Value"],
    ],
  },
  {
    title: "resources.accessDownload.cardRoomTitle",
    caption: "resources.accessDownload.cardRoomCaption",
    status: "resources.accessDownload.cardRoomStatus",
    tone: "room",
    icon: UsersRound,
    rules: [
      ["resources.accessDownload.cardRoomRule1Label", "resources.accessDownload.cardRoomRule1Value"],
      ["resources.accessDownload.cardRoomRule2Label", "resources.accessDownload.cardRoomRule2Value"],
      ["resources.accessDownload.cardRoomRule3Label", "resources.accessDownload.cardRoomRule3Value"],
    ],
  },
  {
    title: "resources.accessDownload.cardNonMemberTitle",
    caption: "resources.accessDownload.cardNonMemberCaption",
    status: "resources.accessDownload.cardNonMemberStatus",
    tone: "warning",
    icon: MessageCircle,
    rules: [
      ["resources.accessDownload.cardNonMemberRule1Label", "resources.accessDownload.cardNonMemberRule1Value"],
      ["resources.accessDownload.cardNonMemberRule2Label", "resources.accessDownload.cardNonMemberRule2Value"],
      ["resources.accessDownload.cardNonMemberRule3Label", "resources.accessDownload.cardNonMemberRule3Value"],
    ],
  },
];

const flowSteps: [MessageKey, MessageKey][] = [
  ["resources.accessDownload.flowStep1Title", "resources.accessDownload.flowStep1Body"],
  ["resources.accessDownload.flowStep2Title", "resources.accessDownload.flowStep2Body"],
  ["resources.accessDownload.flowStep3Title", "resources.accessDownload.flowStep3Body"],
  ["resources.accessDownload.flowStep4Title", "resources.accessDownload.flowStep4Body"],
  ["resources.accessDownload.flowStep5Title", "resources.accessDownload.flowStep5Body"],
];

const policyChecks: MessageKey[] = [
  "resources.accessDownload.policyCheck1",
  "resources.accessDownload.policyCheck2",
  "resources.accessDownload.policyCheck3",
  "resources.accessDownload.policyCheck4",
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
          {t("resources.accessDownload.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div>
            <h2 className={styles.title}>{t("resources.accessDownload.title")}</h2>
            <p className={styles.summary}>{t("resources.accessDownload.summary")}</p>
          </div>
          <StatusBadge tone="approved">{t("resources.accessDownload.headerBadge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("resources.accessDownload.chipsAria")}>
          <Chip selected icon={<LockKeyhole size={14} aria-hidden="true" />}>
            {t("resources.accessDownload.chipNoAutoShare")}
          </Chip>
          <Chip icon={<Download size={14} aria-hidden="true" />}>{t("resources.accessDownload.chipDownloadAfterCheck")}</Chip>
          <Chip icon={<Cloud size={14} aria-hidden="true" />}>{t("resources.accessDownload.chipStorageProtect")}</Chip>
        </div>
      </header>

      <section className={styles.grid} aria-label={t("resources.accessDownload.cardsAria")}>
        {accessCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={styles.card} key={card.title}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>
                  <span className={styles.iconBubble}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <StatusBadge tone={card.tone}>{t(card.status)}</StatusBadge>
                </div>
                <div className={styles.cardHeading}>
                  <h3>{t(card.title)}</h3>
                  <p>{t(card.caption)}</p>
                </div>
              </div>
              <ul className={styles.ruleList}>
                {card.rules.map(([label, value]) => (
                  <li className={styles.ruleItem} key={label}>
                    <span className={styles.ruleLabel}>{t(label)}</span>
                    <span>{t(value)}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className={styles.flowPanel} aria-label={t("resources.accessDownload.flowAria")}>
        <div className={styles.flowTitle}>
          <div>
            <h3>{t("resources.accessDownload.flowHeading")}</h3>
            <p>{t("resources.accessDownload.flowDesc")}</p>
          </div>
          <StatusBadge tone="pending">{t("resources.accessDownload.flowBadge")}</StatusBadge>
        </div>
        <div className={styles.flow}>
          {flowSteps.map(([title, body], index) => (
            <div className={styles.flowStep} key={title}>
              <span className={styles.flowIndex}>{index + 1}</span>
              <strong>{t(title)}</strong>
              <span>{t(body)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label={t("resources.accessDownload.policyAria")}>
        <div className={styles.policyCard}>
          <h3>{t("resources.accessDownload.policyHeading")}</h3>
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
          <h3>{t("resources.accessDownload.apiHeading")}</h3>
          <div className={styles.apiList}>
            {apiRows.map(([method, path]) => (
              <div className={styles.apiRow} key={path}>
                <StatusBadge tone={method === "GET" ? "success" : "pending"}>
                  {method === "GET" ? t("resources.accessDownload.apiGet") : t("resources.accessDownload.apiChange")}
                </StatusBadge>
                <span className={styles.apiPath}>{path}</span>
              </div>
            ))}
          </div>
          <div className={styles.checkItem}>
            <FileCheck2 size={16} aria-hidden="true" />
            <span>{t("resources.accessDownload.apiNote")}</span>
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
