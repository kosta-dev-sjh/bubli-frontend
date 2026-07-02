"use client";

import { Check, FileSearch, MessageSquareText, PenLine, Send, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./clarification-question-compose-panel.module.css";

type ReviewPriority = "HIGH" | "MEDIUM" | "LOW";
type QuestionStatus = "SELECTED" | "EDITING" | "WAITING";

type ReviewItem = {
  evidenceLabel: string;
  id: string;
  priority: ReviewPriority;
  title: string;
};

type QuestionDraft = {
  id: string;
  linkedReviewItemId: string;
  message: string;
  status: QuestionStatus;
};

type ComposeRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ClarificationQuestionComposePanelProps = HTMLAttributes<HTMLElement> & {
  drafts: QuestionDraft[];
  reviewItems: ReviewItem[];
  rules: ComposeRule[];
  title?: string;
};

const priorityMeta: Record<ReviewPriority, { labelKey: MessageKey; tone: StatusTone }> = {
  HIGH: { labelKey: "agent.compose.priorityHigh", tone: "warning" },
  LOW: { labelKey: "agent.compose.priorityLow", tone: "personal" },
  MEDIUM: { labelKey: "agent.compose.priorityMedium", tone: "pending" },
};

const questionStatusMeta: Record<QuestionStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  EDITING: { labelKey: "agent.compose.qStatusEditing", tone: "pending" },
  SELECTED: { labelKey: "agent.compose.qStatusSelected", tone: "approved" },
  WAITING: { labelKey: "agent.compose.qStatusWaiting", tone: "personal" },
};

// title/evidenceLabel/message/label/description は t() キーを保持し、レンダー時に翻訳する。
export const defaultReviewItems: ReviewItem[] = [
  {
    evidenceLabel: "agent.compose.review1Evidence",
    id: "delivery-date",
    priority: "HIGH",
    title: "agent.compose.review1Title",
  },
  {
    evidenceLabel: "agent.compose.review2Evidence",
    id: "vat-condition",
    priority: "MEDIUM",
    title: "agent.compose.review2Title",
  },
  {
    evidenceLabel: "agent.compose.review3Evidence",
    id: "revision-count",
    priority: "MEDIUM",
    title: "agent.compose.review3Title",
  },
];

export const defaultQuestionDrafts: QuestionDraft[] = [
  {
    id: "question-delivery-date",
    linkedReviewItemId: "delivery-date",
    message: "agent.compose.draft1Message",
    status: "SELECTED",
  },
  {
    id: "question-vat",
    linkedReviewItemId: "vat-condition",
    message: "agent.compose.draft2Message",
    status: "EDITING",
  },
  {
    id: "question-revision",
    linkedReviewItemId: "revision-count",
    message: "agent.compose.draft3Message",
    status: "WAITING",
  },
];

export const defaultComposeRules: ComposeRule[] = [
  {
    description: "agent.compose.rule1Desc",
    label: "agent.compose.rule1Label",
    tone: "approved",
  },
  {
    description: "agent.compose.rule2Desc",
    label: "agent.compose.rule2Label",
    tone: "room",
  },
  {
    description: "agent.compose.rule3Desc",
    label: "agent.compose.rule3Label",
    tone: "warning",
  },
];

export function ClarificationQuestionComposePanel({
  className,
  drafts,
  reviewItems,
  rules,
  title,
  ...props
}: ClarificationQuestionComposePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("agent.compose.defaultTitle");
  const selectedCount = drafts.filter((draft) => draft.status === "SELECTED").length;
  const reviewItemById = new Map(reviewItems.map((item) => [item.id, item]));

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<MessageSquareText size={16} strokeWidth={2.1} />}>{t("agent.compose.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("agent.compose.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("agent.compose.toSend")}</span>
          <strong>{t("agent.compose.countItems", { count: selectedCount })}</strong>
          <StatusBadge tone="approved">{t("agent.compose.selected")}</StatusBadge>
        </div>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.reviewColumn} aria-label={t("agent.compose.reviewAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("agent.compose.reviewTitle")}</strong>
            <StatusBadge tone="warning">{t("agent.compose.countItems", { count: reviewItems.length })}</StatusBadge>
          </div>
          <div className={styles.reviewStack}>
            {reviewItems.map((item) => {
              const priority = priorityMeta[item.priority];

              return (
                <article className={styles.reviewRow} key={item.id}>
                  <span className={styles.iconTile}>
                    <TriangleAlert size={16} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div className={styles.reviewCopy}>
                    <b>{t(item.title as MessageKey)}</b>
                    <span>{t(item.evidenceLabel as MessageKey)}</span>
                  </div>
                  <StatusBadge tone={priority.tone}>{t(priority.labelKey)}</StatusBadge>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.draftColumn} aria-label={t("agent.compose.draftAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("agent.compose.draftTitle")}</strong>
            <span className={styles.sectionMeta}>{t("agent.compose.beforeSend")}</span>
          </div>
          <div className={styles.draftStack}>
            {drafts.map((draft) => {
              const reviewItem = reviewItemById.get(draft.linkedReviewItemId);
              const status = questionStatusMeta[draft.status];

              return (
                <article className={cn(styles.draftRow, draft.status === "SELECTED" && styles.selectedDraft)} key={draft.id}>
                  <div className={styles.draftTop}>
                    <span className={styles.iconTile}>
                      <Sparkles size={16} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <div className={styles.draftCopy}>
                      <b>{reviewItem ? t(reviewItem.title as MessageKey) : t("agent.compose.checkItemFallback")}</b>
                      <p>{t(draft.message as MessageKey)}</p>
                      <small>{reviewItem ? t(reviewItem.evidenceLabel as MessageKey) : t("agent.compose.evidenceFallback")}</small>
                    </div>
                    <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                  </div>
                  <div className={styles.draftActions}>
                    <Button icon={<PenLine size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                      {t("agent.compose.editSentence")}
                    </Button>
                    <Button icon={<Check size={14} strokeWidth={2.1} />} size="sm" variant="ghost">
                      {t("agent.compose.toggleSelect")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.ruleGrid} aria-label={t("agent.compose.ruleAria")}>
        {rules.map((rule) => (
          <article key={rule.label}>
            {rule.label === "agent.compose.rule2Label" ? (
              <FileSearch size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : rule.label === "agent.compose.rule3Label" ? (
              <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : (
              <Check size={17} strokeWidth={2.1} aria-hidden="true" />
            )}
            <div>
              <strong>{t(rule.label as MessageKey)}</strong>
              <p>{t(rule.description as MessageKey)}</p>
              <StatusBadge tone={rule.tone}>{t("agent.compose.criterion")}</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("agent.compose.footerNotice")}</span>
        </div>
        <Button icon={<Send size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("agent.compose.passSelected")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
