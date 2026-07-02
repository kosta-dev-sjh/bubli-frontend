"use client";

import {
  ArrowRight,
  BadgeHelp,
  ClipboardList,
  FileCheck2,
  FileText,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./document-classification-panel.module.css";

type DocumentKind = "contract" | "quote" | "requirements" | "meetingNote" | "reference";
type ClassificationStatus = "ready" | "analyzing" | "analyzed" | "failed" | "needsReview";

type ClassificationItem = {
  confidenceLabel: string;
  description: string;
  detectedKind: DocumentKind;
  fileName: string;
  nextUse: string;
  status: ClassificationStatus;
};

type ClassificationRule = {
  description: string;
  label: string;
  value: string;
};

export type DocumentClassificationPanelProps = HTMLAttributes<HTMLElement> & {
  items: ClassificationItem[];
  rules: ClassificationRule[];
  title?: string;
};

const kindMeta: Record<DocumentKind, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  contract: {
    icon: <FileCheck2 size={18} strokeWidth={2.1} />,
    labelKey: "resources.classification.kind.contract",
    tone: "success",
  },
  quote: {
    icon: <FileText size={18} strokeWidth={2.1} />,
    labelKey: "resources.classification.kind.quote",
    tone: "pending",
  },
  requirements: {
    icon: <ClipboardList size={18} strokeWidth={2.1} />,
    labelKey: "resources.classification.kind.requirements",
    tone: "room",
  },
  meetingNote: {
    icon: <MessageSquareText size={18} strokeWidth={2.1} />,
    labelKey: "resources.classification.kind.meetingNote",
    tone: "room",
  },
  reference: {
    icon: <BadgeHelp size={18} strokeWidth={2.1} />,
    labelKey: "resources.classification.kind.reference",
    tone: "pending",
  },
};

const statusMeta: Record<ClassificationStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  ready: { labelKey: "resources.classification.status.ready", tone: "pending" },
  analyzing: { labelKey: "resources.classification.status.analyzing", tone: "agent" },
  analyzed: { labelKey: "resources.classification.status.analyzed", tone: "success" },
  failed: { labelKey: "resources.classification.status.failed", tone: "warning" },
  needsReview: { labelKey: "resources.classification.status.needsReview", tone: "warning" },
};

const flowStepKeys: MessageKey[] = [
  "resources.classification.flowUpload",
  "resources.classification.flowKindCandidate",
  "resources.classification.flowUserConfirm",
  "resources.classification.flowExtract",
];

export function DocumentClassificationPanel({
  className,
  items,
  rules,
  title,
  ...props
}: DocumentClassificationPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.classification.defaultTitle");
  const reviewCount = items.filter((item) => item.status === "needsReview" || item.status === "failed").length;
  const analyzedCount = items.filter((item) => item.status === "analyzed").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<SearchCheck size={14} strokeWidth={2.1} />}>contract_documents.doc_type</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.classification.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.classification.summaryLabel")}</span>
          <strong>
            {reviewCount > 0
              ? t("resources.classification.summaryCount", { count: reviewCount })
              : t("resources.classification.summaryNone")}
          </strong>
          <small>{t("resources.classification.summaryAnalyzed", { count: analyzedCount })}</small>
        </div>
      </header>

      <section className={styles.flow} aria-label={t("resources.classification.flowAria")}>
        {flowStepKeys.map((stepKey, index) => (
          <article className={styles.flowStep} key={stepKey}>
            <span>{t(stepKey)}</span>
            {index < flowStepKeys.length - 1 ? (
              <ArrowRight className={styles.flowArrow} size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : null}
          </article>
        ))}
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.itemList} aria-label={t("resources.classification.itemListAria")}>
          {items.map((item) => {
            const kind = kindMeta[item.detectedKind];
            const status = statusMeta[item.status];

            return (
              <article className={styles.itemCard} key={item.fileName}>
                <div className={styles.itemMain}>
                  <span className={styles.kindIcon} aria-hidden="true">
                    {kind.icon}
                  </span>
                  <div>
                    <div className={styles.itemTitleRow}>
                      <h3>{item.fileName}</h3>
                      <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                    </div>
                    <p>{item.description}</p>
                    <div className={styles.itemMeta}>
                      <StatusBadge tone={kind.tone}>{t(kind.labelKey)}</StatusBadge>
                      <span>{item.confidenceLabel}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.nextUse}>
                  <span>{t("resources.classification.nextUse")}</span>
                  <strong>{item.nextUse}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.rulePanel} aria-label={t("resources.classification.ruleAria")}>
          <div className={styles.ruleHeader}>
            <span aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.classification.ruleTitle")}</h3>
              <p>{t("resources.classification.ruleDesc")}</p>
            </div>
          </div>
          <div className={styles.ruleList}>
            {rules.map((rule) => (
              <article className={styles.ruleCard} key={rule.label}>
                <span>{rule.label}</span>
                <strong>{rule.value}</strong>
                <p>{rule.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </GlassPanel>
  );
}
