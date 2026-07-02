"use client";

import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  CirclePause,
  FileCheck2,
  FolderKanban,
  PackageCheck,
  PencilLine,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./contract-extracted-fields-review-panel.module.css";

export type ExtractedFieldStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type ExtractedFieldKind =
  | "PROJECT_NAME"
  | "CLIENT_NAME"
  | "PERIOD"
  | "DUE_DATE"
  | "AMOUNT_REFERENCE"
  | "DELIVERABLE"
  | "REVIEW_STANDARD";

export type ExtractedField = {
  confidence?: number;
  id: string;
  kind: ExtractedFieldKind;
  label: string;
  sourceLabel: string;
  status: ExtractedFieldStatus;
  value: string;
};

export type ReviewItem = {
  id: string;
  message: string;
  sourceLabel: string;
  tone: "missing" | "conflict" | "unclear";
};

export type ContractExtractedFieldsReviewPanelProps = {
  className?: string;
  fields?: ExtractedField[];
  onApproveAll?: () => void;
  onEditField?: (fieldId: string) => void;
  onHoldField?: (fieldId: string) => void;
  onOpenResource?: () => void;
  onRunAnalysis?: () => void;
  reviewItems?: ReviewItem[];
};

const kindIcon: Record<ExtractedFieldKind, ReactNode> = {
  AMOUNT_REFERENCE: <FileCheck2 size={16} strokeWidth={2.1} />,
  CLIENT_NAME: <FolderKanban size={16} strokeWidth={2.1} />,
  DELIVERABLE: <PackageCheck size={16} strokeWidth={2.1} />,
  DUE_DATE: <CalendarDays size={16} strokeWidth={2.1} />,
  PERIOD: <CalendarDays size={16} strokeWidth={2.1} />,
  PROJECT_NAME: <FolderKanban size={16} strokeWidth={2.1} />,
  REVIEW_STANDARD: <CheckCircle2 size={16} strokeWidth={2.1} />,
};

const statusCopyKey: Record<ExtractedFieldStatus, MessageKey> = {
  APPROVED: "room.contract.status.approved",
  DRAFT: "room.contract.status.draft",
  HELD: "room.contract.status.held",
  REJECTED: "room.contract.status.rejected",
};

const statusTone: Record<ExtractedFieldStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

const reviewToneCopyKey: Record<ReviewItem["tone"], MessageKey> = {
  conflict: "room.contract.reviewTone.conflict",
  missing: "room.contract.reviewTone.missing",
  unclear: "room.contract.reviewTone.unclear",
};

const defaultFields: ExtractedField[] = [
  {
    confidence: 94,
    id: "field-project-name",
    kind: "PROJECT_NAME",
    label: "프로젝트명",
    sourceLabel: "업무 문서 1쪽",
    status: "DRAFT",
    value: "신규 웹사이트 번역 프로젝트",
  },
  {
    confidence: 89,
    id: "field-client-name",
    kind: "CLIENT_NAME",
    label: "클라이언트명",
    sourceLabel: "견적서 상단",
    status: "DRAFT",
    value: "ABC 파트너스",
  },
  {
    confidence: 82,
    id: "field-period",
    kind: "PERIOD",
    label: "프로젝트 기간",
    sourceLabel: "업무 문서 2쪽",
    status: "HELD",
    value: "2026.06.24 - 7월 15일",
  },
  {
    confidence: 91,
    id: "field-deliverable",
    kind: "DELIVERABLE",
    label: "납품물",
    sourceLabel: "요구사항 문서",
    status: "DRAFT",
    value: "번역본, 용어집, 검수 질문 목록",
  },
];

const defaultReviewItems: ReviewItem[] = [
  {
    id: "review-due-date",
    message: "업무 문서 납품일은 7월 15일이고 회의록에는 7월 20일로 적혀 있습니다.",
    sourceLabel: "업무 문서 2쪽, 회의록_0618.md",
    tone: "conflict",
  },
  {
    id: "review-standard",
    message: "검수 기준은 요구사항 문서에만 있고 업무 문서에는 따로 적혀 있지 않습니다.",
    sourceLabel: "요구사항정의서_v1.3.pdf",
    tone: "missing",
  },
];

export function ContractExtractedFieldsReviewPanel({
  className,
  fields = defaultFields,
  onApproveAll,
  onEditField,
  onHoldField,
  onOpenResource,
  onRunAnalysis,
  reviewItems = defaultReviewItems,
}: ContractExtractedFieldsReviewPanelProps) {
  const { t } = useI18n();
  const approvedCount = fields.filter((field) => field.status === "APPROVED").length;
  const draftCount = fields.filter((field) => field.status === "DRAFT").length;
  const heldCount = fields.filter((field) => field.status === "HELD").length;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Bot size={14} />}>{t("room.contract.chip")}</Chip>
          <h2>{t("room.contract.heading")}</h2>
          <p>{t("room.contract.description")}</p>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<Sparkles size={15} />} onClick={onRunAnalysis} size="sm" variant="quiet">
            {t("room.contract.reanalyze")}
          </Button>
          <Button icon={<CheckCircle2 size={15} />} onClick={onApproveAll} size="sm" variant="primary">
            {t("room.contract.applyConfirmed")}
          </Button>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label={t("room.contract.summaryAria")}>
        <article>
          <strong>{fields.length}</strong>
          <span>{t("room.contract.summaryExtracted")}</span>
        </article>
        <article>
          <strong>{approvedCount}</strong>
          <span>{t("room.contract.summaryApproved")}</span>
        </article>
        <article>
          <strong>{draftCount}</strong>
          <span>{t("room.contract.summaryDraft")}</span>
        </article>
        <article>
          <strong>{heldCount}</strong>
          <span>{t("room.contract.summaryHeld")}</span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.fieldList} aria-label={t("room.contract.fieldListAria")}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>{t("room.contract.fieldListTitle")}</h3>
              <p>{t("room.contract.fieldListSub")}</p>
            </div>
            <Button icon={<FileCheck2 size={15} />} onClick={onOpenResource} size="sm" variant="ghost">
              {t("room.contract.viewSource")}
            </Button>
          </div>

          <div className={styles.fields}>
            {fields.map((field) => (
              <article className={styles.fieldCard} key={field.id}>
                <span className={styles.fieldIcon} aria-hidden="true">
                  {kindIcon[field.kind]}
                </span>
                <div className={styles.fieldBody}>
                  <div className={styles.fieldTop}>
                    <div>
                      <h4>{field.label}</h4>
                      <p>{field.value}</p>
                    </div>
                    <StatusBadge tone={statusTone[field.status]}>{t(statusCopyKey[field.status])}</StatusBadge>
                  </div>
                  <div className={styles.fieldMeta}>
                    <span>{field.sourceLabel}</span>
                    {typeof field.confidence === "number" ? (
                      <ProgressBar label={t("room.contract.confidence")} value={field.confidence} />
                    ) : null}
                  </div>
                  <footer className={styles.fieldActions}>
                    <button onClick={() => onEditField?.(field.id)} type="button">
                      <PencilLine size={14} />
                      {t("room.contract.edit")}
                    </button>
                    <button onClick={() => onHoldField?.(field.id)} type="button">
                      <CirclePause size={14} />
                      {t("room.contract.hold")}
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.reviewPanel} aria-label={t("room.contract.reviewAria")}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>{t("room.contract.reviewTitle")}</h3>
              <p>{t("room.contract.reviewSub")}</p>
            </div>
            <StatusBadge tone={reviewItems.length > 0 ? "warning" : "approved"}>{t("room.contract.reviewCount", { count: reviewItems.length })}</StatusBadge>
          </div>

          <div className={styles.reviewItems}>
            {reviewItems.map((item) => (
              <article className={cn(styles.reviewItem, styles[item.tone])} key={item.id}>
                <AlertCircle size={17} strokeWidth={2.1} />
                <div>
                  <StatusBadge tone={item.tone === "conflict" ? "warning" : "pending"}>
                    {t(reviewToneCopyKey[item.tone])}
                  </StatusBadge>
                  <p>{item.message}</p>
                  <span>{item.sourceLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <footer className={styles.flowFooter}>
        <span>{t("room.contract.flowConfirm")}</span>
        <ArrowRight size={18} />
        <span>{t("room.contract.flowSave")}</span>
        <ArrowRight size={18} />
        <span>{t("room.contract.flowGenerate")}</span>
      </footer>
    </GlassPanel>
  );
}
