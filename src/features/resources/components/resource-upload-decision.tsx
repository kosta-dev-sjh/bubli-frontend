"use client";

import type { ReactNode } from "react";

import {
  ArrowRight,
  Bot,
  Database,
  FileText,
  FolderInput,
  HardDrive,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

import styles from "./resource-upload-decision.module.css";

type DecisionStep = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
};

type DecisionCard = {
  descriptionKey: MessageKey;
  icon: ReactNode;
  metaKey: MessageKey;
  steps: DecisionStep[];
  titleKey: MessageKey;
};

const decisionCards: DecisionCard[] = [
  {
    descriptionKey: "resources.upload.overview.cardStoreDesc",
    icon: <Database size={18} strokeWidth={2.1} />,
    metaKey: "resources.upload.overview.cardStoreMeta",
    steps: [
      { labelKey: "resources.upload.overview.cardStoreStep1Label", descriptionKey: "resources.upload.overview.cardStoreStep1Desc" },
      { labelKey: "resources.upload.overview.cardStoreStep2Label", descriptionKey: "resources.upload.overview.cardStoreStep2Desc" },
      { labelKey: "resources.upload.overview.cardStoreStep3Label", descriptionKey: "resources.upload.overview.cardStoreStep3Desc" },
    ],
    titleKey: "resources.upload.overview.cardStoreTitle",
  },
  {
    descriptionKey: "resources.upload.overview.cardTempDesc",
    icon: <MessageSquareText size={18} strokeWidth={2.1} />,
    metaKey: "resources.upload.overview.cardTempMeta",
    steps: [
      { labelKey: "resources.upload.overview.cardTempStep1Label", descriptionKey: "resources.upload.overview.cardTempStep1Desc" },
      { labelKey: "resources.upload.overview.cardTempStep2Label", descriptionKey: "resources.upload.overview.cardTempStep2Desc" },
      { labelKey: "resources.upload.overview.cardTempStep3Label", descriptionKey: "resources.upload.overview.cardTempStep3Desc" },
    ],
    titleKey: "resources.upload.overview.cardTempTitle",
  },
];

const boundaries: Array<{ icon: ReactNode; labelKey: MessageKey; textKey: MessageKey }> = [
  {
    icon: <HardDrive size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.overview.boundaryDeviceLabel",
    textKey: "resources.upload.overview.boundaryDeviceText",
  },
  {
    icon: <FolderInput size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.overview.boundaryPersonalLabel",
    textKey: "resources.upload.overview.boundaryPersonalText",
  },
  {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.overview.boundaryRoomLabel",
    textKey: "resources.upload.overview.boundaryRoomText",
  },
  {
    icon: <Bot size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.overview.boundaryAgentLabel",
    textKey: "resources.upload.overview.boundaryAgentText",
  },
];

function DecisionCardView({ card, t }: { card: DecisionCard; t: (key: MessageKey) => string }) {
  return (
    <article className={styles.decisionCard}>
      <div className={styles.cardHeader}>
        <span className="bubli-icon-tile" aria-hidden="true">
          {card.icon}
        </span>
        <div>
          <h3>{t(card.titleKey)}</h3>
          <p>{t(card.descriptionKey)}</p>
        </div>
      </div>
          <p className={styles.metaText}>{t(card.metaKey)}</p>
      <ol className={styles.stepList}>
        {card.steps.map((step) => (
          <li key={step.labelKey}>
            <strong>{t(step.labelKey)}</strong>
            <span>{t(step.descriptionKey)}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function ResourceUploadDecision() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("resources.upload.overview.aria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<UploadCloud size={14} />} selected>
            {t("resources.upload.overview.chip")}
          </Chip>
          <h2>{t("resources.upload.overview.title")}</h2>
          <p>{t("resources.upload.overview.desc")}</p>
        </div>

        <div className={styles.filePreview} aria-label={t("resources.upload.overview.filePreviewAria")}>
          <div className={styles.fileTop}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <FileText size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>번역계약서_v2.pdf</h3>
              <p>{t("resources.upload.overview.fileMeta")}</p>
            </div>
          </div>
          <div className={styles.fileMeta}>
            <StatusBadge tone="personal">{t("resources.upload.overview.badgeCandidate")}</StatusBadge>
            <StatusBadge tone="neutral">{t("resources.upload.overview.badgePending")}</StatusBadge>
          </div>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label={t("resources.upload.overview.flowAria")}>
        <span>{t("resources.upload.overview.flowSelectFile")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("resources.upload.overview.flowSelectMode")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("resources.upload.overview.flowStoreOrTemp")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("resources.upload.overview.flowAgentCandidate")}</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.decisions}>
          {decisionCards.map((card) => (
            <DecisionCardView card={card} key={card.titleKey} t={t} />
          ))}
        </div>

        <GlassPanel className={styles.boundaryPanel}>
          <h3>{t("resources.upload.overview.boundaryTitle")}</h3>
          <p>{t("resources.upload.overview.boundaryDesc")}</p>
          <div className={styles.boundaryList}>
            {boundaries.map((item) => (
              <article className={styles.boundaryItem} key={item.labelKey}>
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <strong>{t(item.labelKey)}</strong>
                  <p>{t(item.textKey)}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.notice}>
            <strong>{t("resources.upload.overview.noticeLabel")}</strong>
            <span>{t("resources.upload.overview.noticeText")}</span>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
