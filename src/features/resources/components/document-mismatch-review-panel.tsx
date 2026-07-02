"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileDiff,
  FileText,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./document-mismatch-review-panel.module.css";

type MismatchSeverity = "HIGH" | "MEDIUM" | "LOW";
type MismatchStatus = "NEEDS_REVIEW" | "QUESTION_READY" | "RESOLVED";

type ComparedValue = {
  documentLabel: string;
  value: string;
};

type MismatchItem = {
  actionLabel: string;
  comparedValues: ComparedValue[];
  fieldLabel: string;
  id: string;
  reason: string;
  severity: MismatchSeverity;
  status: MismatchStatus;
};

type ReviewMetric = {
  label: string;
  tone: StatusTone;
  value: string;
};

export type DocumentMismatchReviewPanelProps = HTMLAttributes<HTMLElement> & {
  items: MismatchItem[];
  metrics: ReviewMetric[];
  title?: string;
};

const severityMeta: Record<MismatchSeverity, { labelKey: MessageKey; tone: StatusTone }> = {
  HIGH: { labelKey: "resources.mismatch.severity.HIGH", tone: "warning" },
  LOW: { labelKey: "resources.mismatch.severity.LOW", tone: "personal" },
  MEDIUM: { labelKey: "resources.mismatch.severity.MEDIUM", tone: "pending" },
};

const statusMeta: Record<MismatchStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  NEEDS_REVIEW: { labelKey: "resources.mismatch.status.NEEDS_REVIEW", tone: "warning" },
  QUESTION_READY: { labelKey: "resources.mismatch.status.QUESTION_READY", tone: "agent" },
  RESOLVED: { labelKey: "resources.mismatch.status.RESOLVED", tone: "approved" },
};

// NOTE: Storybook-only sample fixtures (imported by the .stories file). Real callers
// pass already-localized data; the panel renders whatever strings it receives.
export const defaultMismatchMetrics: ReviewMetric[] = [
  { label: "Compared documents", tone: "room", value: "3" },
  { label: "Needs review", tone: "warning", value: "4" },
  { label: "Question drafts", tone: "agent", value: "2" },
];

export const defaultMismatchItems: MismatchItem[] = [
  {
    actionLabel: "Draft a question about the delivery date",
    comparedValues: [
      { documentLabel: "Work document", value: "Jul 15" },
      { documentLabel: "Meeting notes", value: "2026.07.20" },
    ],
    fieldLabel: "Delivery date",
    id: "delivery-date",
    reason: "The dates differ across documents, so it's hard to apply directly to the WBS and schedule.",
    severity: "HIGH",
    status: "QUESTION_READY",
  },
  {
    actionLabel: "Check whether VAT is included",
    comparedValues: [
      { documentLabel: "Quote", value: "8,000,000 KRW" },
      { documentLabel: "Work document", value: "Amount only" },
    ],
    fieldLabel: "Reference amount",
    id: "amount-vat",
    reason: "It's unclear whether VAT is included, so it's kept only as a reference value.",
    severity: "MEDIUM",
    status: "NEEDS_REVIEW",
  },
  {
    actionLabel: "Draft a question about the review criteria",
    comparedValues: [
      { documentLabel: "Requirements document", value: "First review" },
      { documentLabel: "Work document", value: "One final review" },
    ],
    fieldLabel: "Review criteria",
    id: "inspection-rule",
    reason: "The review steps differ, so it's hard to set a TODO completion criterion.",
    severity: "HIGH",
    status: "QUESTION_READY",
  },
  {
    actionLabel: "Check the resource handling criteria",
    comparedValues: [
      { documentLabel: "Work document", value: "Has a confidentiality clause" },
      { documentLabel: "Requirements document", value: "Needs sharing of the sample source" },
    ],
    fieldLabel: "Privacy / copyright terms",
    id: "privacy-copyright",
    reason: "The resource sharing method and retention criteria need to align with the project room resource policy.",
    severity: "MEDIUM",
    status: "NEEDS_REVIEW",
  },
];

export function DocumentMismatchReviewPanel({
  className,
  items,
  metrics,
  title,
  ...props
}: DocumentMismatchReviewPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.mismatch.defaultTitle");
  const questionReadyCount = items.filter((item) => item.status === "QUESTION_READY").length;
  const needsReviewCount = items.filter((item) => item.status === "NEEDS_REVIEW").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileDiff size={16} strokeWidth={2.1} />}>{t("resources.mismatch.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.mismatch.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.mismatch.summaryLabel")}</span>
          <strong>{t("resources.mismatch.summaryCountUnit", { count: needsReviewCount + questionReadyCount })}</strong>
          <StatusBadge tone="warning">{t("resources.mismatch.summaryBadge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label={t("resources.mismatch.metricGridAria")}>
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <StatusBadge tone={metric.tone}>{t("resources.mismatch.metricStatus")}</StatusBadge>
          </article>
        ))}
      </section>

      <section className={styles.reviewList} aria-label={t("resources.mismatch.reviewListAria")}>
        {items.map((item) => {
          const severity = severityMeta[item.severity];
          const status = statusMeta[item.status];

          return (
            <article className={cn(styles.reviewItem, item.severity === "HIGH" && styles.highSeverity)} key={item.id}>
              <div className={styles.itemHeader}>
                <span className={styles.iconTile}>
                  {item.status === "RESOLVED" ? (
                    <CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />
                  ) : (
                    <AlertCircle size={17} strokeWidth={2.1} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.itemTitle}>
                  <strong>{item.fieldLabel}</strong>
                  <p>{item.reason}</p>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={severity.tone}>{t(severity.labelKey)}</StatusBadge>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                </div>
              </div>

              <div className={styles.valueGrid}>
                {item.comparedValues.map((value) => (
                  <div className={styles.valueCard} key={`${item.id}-${value.documentLabel}`}>
                    <span>
                      <FileText size={14} strokeWidth={2.1} aria-hidden="true" />
                      {value.documentLabel}
                    </span>
                    <b>{value.value}</b>
                  </div>
                ))}
              </div>

              <footer className={styles.itemFooter}>
                <span>
                  <ListChecks size={15} strokeWidth={2.1} aria-hidden="true" />
                  {item.actionLabel}
                </span>
                <Button icon={<ArrowRight size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                  {t("resources.mismatch.reviewAction")}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("resources.mismatch.footerNotice")}</span>
        </div>
        <Button icon={<MessageSquareText size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("resources.mismatch.footerAction")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
