"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePause,
  ClipboardCheck,
  Copy,
  FileQuestion,
  MessageSquareText,
  PencilLine,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./clarification-question-draft-panel.module.css";

export type QuestionDraftStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type QuestionDraftTone = "conflict" | "missing" | "unclear";

export type QuestionDraft = {
  confidence?: number;
  id: string;
  question: string;
  sourceLabel: string;
  status: QuestionDraftStatus;
  tone: QuestionDraftTone;
  triggerLabel: string;
};

export type ClarificationQuestionDraftPanelProps = {
  className?: string;
  drafts?: QuestionDraft[];
  onApproveDraft?: (draftId: string) => void;
  onCopyDraft?: (draftId: string) => void;
  onEditDraft?: (draftId: string) => void;
  onHoldDraft?: (draftId: string) => void;
  onRejectDraft?: (draftId: string) => void;
  onRunQuestionJob?: () => void;
  selectedDraftId?: string;
};

const statusCopyKeys: Record<QuestionDraftStatus, MessageKey> = {
  APPROVED: "agent.qdraft.statusApproved",
  DRAFT: "agent.qdraft.statusDraft",
  HELD: "agent.qdraft.statusHeld",
  REJECTED: "agent.qdraft.statusRejected",
};

const statusTone: Record<QuestionDraftStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

const toneCopyKeys: Record<QuestionDraftTone, MessageKey> = {
  conflict: "agent.qdraft.toneConflict",
  missing: "agent.qdraft.toneMissing",
  unclear: "agent.qdraft.toneUnclear",
};

// question/sourceLabel/triggerLabel は t() キーを保持し、レンダー時に翻訳する(sourceLabel のファイル名はそのまま通過)。
const defaultDrafts: QuestionDraft[] = [
  {
    confidence: 91,
    id: "question-due-date",
    question: "agent.qdraft.q1",
    sourceLabel: "agent.qdraft.q1Source",
    status: "DRAFT",
    tone: "conflict",
    triggerLabel: "agent.qdraft.q1Trigger",
  },
  {
    confidence: 86,
    id: "question-review-standard",
    question: "agent.qdraft.q2",
    sourceLabel: "요구사항정의서_v1.3.pdf",
    status: "APPROVED",
    tone: "missing",
    triggerLabel: "agent.qdraft.q2Trigger",
  },
  {
    confidence: 79,
    id: "question-copyright",
    question: "agent.qdraft.q3",
    sourceLabel: "agent.qdraft.q3Source",
    status: "HELD",
    tone: "unclear",
    triggerLabel: "agent.qdraft.q3Trigger",
  },
];

export function ClarificationQuestionDraftPanel({
  className,
  drafts = defaultDrafts,
  onApproveDraft,
  onCopyDraft,
  onEditDraft,
  onHoldDraft,
  onRejectDraft,
  onRunQuestionJob,
  selectedDraftId,
}: ClarificationQuestionDraftPanelProps) {
  const { t } = useI18n();
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0];
  const approvedCount = drafts.filter((draft) => draft.status === "APPROVED").length;
  const pendingCount = drafts.filter((draft) => draft.status === "DRAFT").length;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Bot size={14} />}>{t("agent.qdraft.chip")}</Chip>
          <h2>{t("agent.qdraft.heroTitle")}</h2>
          <p>{t("agent.qdraft.heroDesc")}</p>
        </div>
        <Button icon={<RefreshCw size={15} />} onClick={onRunQuestionJob} size="sm" variant="quiet">
          {t("agent.qdraft.regenerate")}
        </Button>
      </header>

      <section className={styles.summary} aria-label={t("agent.qdraft.summaryAria")}>
        <article>
          <strong>{drafts.length}</strong>
          <span>{t("agent.qdraft.questionCandidate")}</span>
        </article>
        <article>
          <strong>{approvedCount}</strong>
          <span>{t("agent.qdraft.approved")}</span>
        </article>
        <article>
          <strong>{pendingCount}</strong>
          <span>{t("agent.qdraft.beforeReview")}</span>
        </article>
      </section>

      <div className={styles.grid}>
        <section className={styles.list} aria-label={t("agent.qdraft.listAria")}>
          {drafts.map((draft) => (
            <article className={cn(styles.draftCard, draft.id === selectedDraft.id && styles.selected)} key={draft.id}>
              <span className={styles.draftIcon} aria-hidden="true">
                <FileQuestion size={17} strokeWidth={2.1} />
              </span>
              <div className={styles.draftBody}>
                <div className={styles.draftTop}>
                  <div>
                    <Chip>{t(toneCopyKeys[draft.tone])}</Chip>
                    <h3>{t(draft.triggerLabel as MessageKey)}</h3>
                  </div>
                  <StatusBadge tone={statusTone[draft.status]}>{t(statusCopyKeys[draft.status])}</StatusBadge>
                </div>
                <p>{t(draft.question as MessageKey)}</p>
                <span className={styles.source}>{t(draft.sourceLabel as MessageKey)}</span>
                {typeof draft.confidence === "number" ? (
                  <ProgressBar label={t("agent.qdraft.confidence")} value={draft.confidence} />
                ) : null}
                <footer className={styles.actions}>
                  <button onClick={() => onApproveDraft?.(draft.id)} type="button">
                    <CheckCircle2 size={14} />
                    {t("agent.qdraft.approve")}
                  </button>
                  <button onClick={() => onEditDraft?.(draft.id)} type="button">
                    <PencilLine size={14} />
                    {t("agent.qdraft.edit")}
                  </button>
                  <button onClick={() => onHoldDraft?.(draft.id)} type="button">
                    <CirclePause size={14} />
                    {t("agent.qdraft.hold")}
                  </button>
                  <button onClick={() => onRejectDraft?.(draft.id)} type="button">
                    <XCircle size={14} />
                    {t("agent.qdraft.reject")}
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </section>

        <aside className={styles.preview} aria-label={t("agent.qdraft.previewAria")}>
          <div className={styles.previewHeader}>
            <span className={styles.previewIcon} aria-hidden="true">
              <MessageSquareText size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("agent.qdraft.messageDraft")}</h3>
              <p>{t("agent.qdraft.messageDesc")}</p>
            </div>
          </div>

          <div className={styles.messageBox}>
            <span>{t("agent.qdraft.greeting")}</span>
            <strong>{t(selectedDraft.question as MessageKey)}</strong>
            <span>{t("agent.qdraft.closing")}</span>
          </div>

          <div className={styles.previewActions}>
            <Button icon={<Copy size={15} />} onClick={() => onCopyDraft?.(selectedDraft.id)} size="sm" variant="quiet">
              {t("agent.qdraft.copy")}
            </Button>
            <Button icon={<Send size={15} />} size="sm" variant="primary">
              {t("agent.qdraft.saveDraft")}
            </Button>
          </div>

          <div className={styles.policy}>
            <ClipboardCheck size={17} strokeWidth={2.1} />
            <p>{t("agent.qdraft.policyNote")}</p>
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>{t("agent.qdraft.flowReview")}</span>
        <ArrowRight size={16} />
        <span>{t("agent.qdraft.flowCandidate")}</span>
        <ArrowRight size={16} />
        <span>{t("agent.qdraft.flowUser")}</span>
        <ArrowRight size={16} />
        <span>{t("agent.qdraft.flowMessage")}</span>
      </footer>
    </GlassPanel>
  );
}
