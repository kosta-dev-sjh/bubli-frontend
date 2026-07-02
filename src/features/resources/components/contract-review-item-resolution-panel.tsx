"use client";

import { AlertTriangle, CheckCircle2, FileWarning, MessageSquareQuote, PencilLine, PauseCircle, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./contract-review-item-resolution-panel.module.css";

type ReviewItemType = "valueMismatch" | "missingCondition" | "questionDraft";
type ReviewSeverity = "high" | "medium" | "low";
type ReviewStatus = "draft" | "approved" | "held" | "rejected";

type ComparedDocument = {
  documentName: string;
  value: string;
};

type ContractReviewItem = {
  comparedDocuments: ComparedDocument[];
  description: string;
  fieldLabel: string;
  id: string;
  severity: ReviewSeverity;
  sourceHint: string;
  status: ReviewStatus;
  title: string;
  type: ReviewItemType;
};

export type ContractReviewItemResolutionPanelProps = HTMLAttributes<HTMLElement> & {
  items: ContractReviewItem[];
  title?: string;
};

const typeMeta: Record<ReviewItemType, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  valueMismatch: {
    icon: <AlertTriangle size={18} strokeWidth={2.1} />,
    labelKey: "resources.contract.type.valueMismatch",
    tone: "warning",
  },
  missingCondition: {
    icon: <FileWarning size={18} strokeWidth={2.1} />,
    labelKey: "resources.contract.type.missingCondition",
    tone: "pending",
  },
  questionDraft: {
    icon: <MessageSquareQuote size={18} strokeWidth={2.1} />,
    labelKey: "resources.contract.type.questionDraft",
    tone: "agent",
  },
};

const severityMeta: Record<ReviewSeverity, { labelKey: MessageKey; tone: StatusTone }> = {
  high: { labelKey: "resources.contract.severity.high", tone: "warning" },
  medium: { labelKey: "resources.contract.severity.medium", tone: "pending" },
  low: { labelKey: "resources.contract.severity.low", tone: "neutral" },
};

const statusMeta: Record<ReviewStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  draft: { labelKey: "resources.contract.status.draft", tone: "pending" },
  approved: { labelKey: "resources.contract.status.approved", tone: "approved" },
  held: { labelKey: "resources.contract.status.held", tone: "warning" },
  rejected: { labelKey: "resources.contract.status.rejected", tone: "neutral" },
};

export function ContractReviewItemResolutionPanel({
  className,
  items,
  title,
  ...props
}: ContractReviewItemResolutionPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.contract.defaultTitle");
  const draftCount = items.filter((item) => item.status === "draft").length;
  const highSeverityCount = items.filter((item) => item.severity === "high").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileWarning size={14} strokeWidth={2.1} />}>contract_review_items</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.contract.description")}</p>
          </div>
        </div>
        <div className={styles.summaryGrid} aria-label={t("resources.contract.summaryAria")}>
          <div>
            <span>{t("resources.contract.summaryDraft")}</span>
            <strong>{t("resources.contract.summaryCount", { count: draftCount })}</strong>
          </div>
          <div>
            <span>{t("resources.contract.summaryHigh")}</span>
            <strong>{t("resources.contract.summaryCount", { count: highSeverityCount })}</strong>
          </div>
        </div>
      </header>

      <section className={styles.notice} aria-label={t("resources.contract.noticeAria")}>
        <span aria-hidden="true">
          <CheckCircle2 size={18} strokeWidth={2.1} />
        </span>
        <p>{t("resources.contract.notice")}</p>
      </section>

      <section className={styles.itemList} aria-label={t("resources.contract.itemListAria")}>
        {items.map((item) => {
          const itemType = typeMeta[item.type];
          const severity = severityMeta[item.severity];
          const status = statusMeta[item.status];

          return (
            <article className={styles.itemCard} key={item.id}>
              <div className={styles.itemHeader}>
                <div className={styles.itemTitle}>
                  <span className={styles.typeIcon} aria-hidden="true">
                    {itemType.icon}
                  </span>
                  <div>
                    <div className={styles.titleLine}>
                      <h3>{item.title}</h3>
                      <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                    </div>
                    <p>{item.description}</p>
                  </div>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={itemType.tone}>{t(itemType.labelKey)}</StatusBadge>
                  <StatusBadge tone={severity.tone}>{t("resources.contract.severityPrefix", { label: t(severity.labelKey) })}</StatusBadge>
                </div>
              </div>

              <div className={styles.fieldBlock}>
                <span>{t("resources.contract.compareField")}</span>
                <strong>{item.fieldLabel}</strong>
                <small>{item.sourceHint}</small>
              </div>

              <div className={styles.documentGrid} aria-label={t("resources.contract.documentGridAria", { title: item.title })}>
                {item.comparedDocuments.map((document) => (
                  <div className={styles.documentValue} key={`${item.id}-${document.documentName}`}>
                    <span>{document.documentName}</span>
                    <strong>{document.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.actions} aria-label={t("resources.contract.actionsAria", { title: item.title })}>
                <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
                  {t("resources.contract.actionApprove")}
                </Button>
                <Button icon={<PencilLine size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
                  {t("resources.contract.actionEdit")}
                </Button>
                <Button icon={<PauseCircle size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
                  {t("resources.contract.actionHold")}
                </Button>
                <Button icon={<XCircle size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
                  {t("resources.contract.actionReject")}
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
