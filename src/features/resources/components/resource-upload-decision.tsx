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
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./resource-upload-decision.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

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
    descriptionKey: "resources.upload.cardStoreDesc",
    icon: <Database size={18} strokeWidth={2.1} />,
    metaKey: "resources.upload.cardStoreMeta",
    steps: [
      { labelKey: "resources.upload.cardStoreStep1Label", descriptionKey: "resources.upload.cardStoreStep1Desc" },
      { labelKey: "resources.upload.cardStoreStep2Label", descriptionKey: "resources.upload.cardStoreStep2Desc" },
      { labelKey: "resources.upload.cardStoreStep3Label", descriptionKey: "resources.upload.cardStoreStep3Desc" },
    ],
    titleKey: "resources.upload.cardStoreTitle",
  },
  {
    descriptionKey: "resources.upload.cardTempDesc",
    icon: <MessageSquareText size={18} strokeWidth={2.1} />,
    metaKey: "resources.upload.cardTempMeta",
    steps: [
      { labelKey: "resources.upload.cardTempStep1Label", descriptionKey: "resources.upload.cardTempStep1Desc" },
      { labelKey: "resources.upload.cardTempStep2Label", descriptionKey: "resources.upload.cardTempStep2Desc" },
      { labelKey: "resources.upload.cardTempStep3Label", descriptionKey: "resources.upload.cardTempStep3Desc" },
    ],
    titleKey: "resources.upload.cardTempTitle",
  },
];

const boundaries: Array<{ icon: ReactNode; labelKey: MessageKey; textKey: MessageKey }> = [
  {
    icon: <HardDrive size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.boundaryDeviceLabel",
    textKey: "resources.upload.boundaryDeviceText",
  },
  {
    icon: <FolderInput size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.boundaryLibraryLabel",
    textKey: "resources.upload.boundaryLibraryText",
  },
  {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.boundaryShareLabel",
    textKey: "resources.upload.boundaryShareText",
  },
  {
    icon: <Bot size={16} strokeWidth={2.1} />,
    labelKey: "resources.upload.boundaryAgentLabel",
    textKey: "resources.upload.boundaryAgentText",
  },
];

function DecisionCardView({ card, t }: { card: DecisionCard; t: TranslateFn }) {
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
    <section className={styles.panel} aria-label={t("resources.upload.decisionAria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<UploadCloud size={14} />} selected>
            {t("resources.upload.decisionChip")}
          </Chip>
          <h2>{t("resources.upload.decisionTitle")}</h2>
          <p>
            {t("resources.upload.decisionDesc")}
          </p>
        </div>

        <div className={styles.filePreview} aria-label={t("resources.upload.previewAria")}>
          <div className={styles.fileTop}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <FileText size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.upload.previewName")}</h3>
              <p>{t("resources.upload.previewMeta")}</p>
            </div>
          </div>
          <div className={styles.fileMeta}>
            <StatusBadge tone="personal">{t("resources.upload.previewBadgeCandidate")}</StatusBadge>
            <StatusBadge tone="neutral">{t("resources.upload.previewBadgeWaiting")}</StatusBadge>
          </div>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label={t("resources.upload.flowAria")}>
        <span>{t("resources.upload.flowSelect2")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("resources.upload.flowMethod")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("resources.upload.flowStoreOrTemp")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("resources.upload.flowAgentConfirm")}</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.decisions}>
          {decisionCards.map((card) => (
            <DecisionCardView card={card} key={card.titleKey} t={t} />
          ))}
        </div>

        <GlassPanel className={styles.boundaryPanel}>
          <h3>{t("resources.upload.boundaryTitle")}</h3>
          <p>
            {t("resources.upload.boundaryDesc")}
          </p>
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
            <strong>{t("resources.upload.planTitle")}</strong>
            <span>
              {t("resources.upload.planText")}
            </span>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
