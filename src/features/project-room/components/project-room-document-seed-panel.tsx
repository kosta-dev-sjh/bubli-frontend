import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileText,
  ListChecks,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./project-room-document-seed-panel.module.css";

type SourceDocumentType = "CONTRACT" | "ESTIMATE" | "REQUIREMENTS" | "MEETING_NOTE";
type CandidateStatus = "READY" | "NEEDS_REVIEW" | "APPROVED";

type SourceDocument = {
  filename: string;
  kind: SourceDocumentType;
  status: CandidateStatus;
};

type ExtractedField = {
  label: string;
  sourceLabel: string;
  status: CandidateStatus;
  value: string;
};

type SeedTarget = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ProjectRoomDocumentSeedPanelProps = HTMLAttributes<HTMLElement> & {
  documents: SourceDocument[];
  fields: ExtractedField[];
  progressPercent?: number;
  targets: SeedTarget[];
  title?: string;
};

const documentMeta: Record<SourceDocumentType, { labelKey: MessageKey; tone: StatusTone }> = {
  CONTRACT: { labelKey: "room.seed.docContract", tone: "room" },
  ESTIMATE: { labelKey: "room.seed.docEstimate", tone: "todo" },
  MEETING_NOTE: { labelKey: "room.seed.docMinutes", tone: "memo" },
  REQUIREMENTS: { labelKey: "room.seed.docRequirements", tone: "agent" },
};

const statusMeta: Record<CandidateStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  APPROVED: { labelKey: "room.seed.statusApproved", tone: "approved" },
  NEEDS_REVIEW: { labelKey: "room.seed.statusNeedsReview", tone: "warning" },
  READY: { labelKey: "room.seed.statusReady", tone: "pending" },
};

// 아이콘 선택용으로 기본 타깃 라벨을 상수로 둔다.
const SEED_TARGET_ROOM_LABEL = "프로젝트룸 정보";
const SEED_TARGET_WBS_LABEL = "WBS/TODO 후보";

export const defaultSeedDocuments: SourceDocument[] = [
  {
    filename: "업무기준문서_v2.pdf",
    kind: "CONTRACT",
    status: "READY",
  },
  {
    filename: "서비스_견적서.xlsx",
    kind: "ESTIMATE",
    status: "NEEDS_REVIEW",
  },
  {
    filename: "요구사항_정리본.md",
    kind: "REQUIREMENTS",
    status: "READY",
  },
];

export const defaultSeedFields: ExtractedField[] = [
  {
    label: "프로젝트명",
    sourceLabel: "요구사항 문서",
    status: "APPROVED",
    value: "신규 웹사이트 번역",
  },
  {
    label: "클라이언트명",
    sourceLabel: "업무 문서",
    status: "APPROVED",
    value: "ABC 콘텐츠",
  },
  {
    label: "납품일",
    sourceLabel: "업무 문서, 회의록",
    status: "NEEDS_REVIEW",
    value: "7월 15일 또는 2026.07.20",
  },
  {
    label: "납품물",
    sourceLabel: "요구사항 문서",
    status: "READY",
    value: "번역 원고, 용어집, 검수표",
  },
  {
    label: "금액 참고값",
    sourceLabel: "견적서",
    status: "READY",
    value: "8,000,000원",
  },
];

export const defaultSeedTargets: SeedTarget[] = [
  {
    description: "확인한 프로젝트명, 클라이언트, 기간만 프로젝트룸 기본 정보로 사용합니다.",
    label: "프로젝트룸 정보",
    tone: "room",
  },
  {
    description: "승인한 납품물과 작업 범위만 WBS와 TODO 후보로 이어집니다.",
    label: "WBS/TODO 후보",
    tone: "todo",
  },
  {
    description: "검토가 끝난 마감일과 회의 일정만 일정 데이터로 연결합니다.",
    label: "일정 후보",
    tone: "timer",
  },
];

export function ProjectRoomDocumentSeedPanel({
  className,
  documents,
  fields,
  progressPercent = 64,
  targets,
  title,
  ...props
}: ProjectRoomDocumentSeedPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("room.seed.defaultTitle");
  const reviewCount = fields.filter((field) => field.status === "NEEDS_REVIEW").length;
  const approvedCount = fields.filter((field) => field.status === "APPROVED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileCheck2 size={16} strokeWidth={2.1} />}>{t("room.seed.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("room.seed.description")}</p>
          </div>
        </div>
        <div className={styles.statusCard} aria-label={t("room.seed.progressAria")}>
          <span>{t("room.seed.progressLabel")}</span>
          <strong>{progressPercent}%</strong>
          <ProgressBar value={progressPercent} />
        </div>
      </header>

      <section className={styles.flow} aria-label={t("room.seed.flowAria")}>
        <article className={styles.flowCard}>
          <span className={styles.flowIcon}>
            <FileText size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("room.seed.flowUpload")}</strong>
            <p>{t("room.seed.flowUploadBody")}</p>
          </div>
        </article>
        <ArrowRight className={styles.flowArrow} size={20} strokeWidth={2.1} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.flowIcon}>
            <Sparkles size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("room.seed.flowGenerate")}</strong>
            <p>{t("room.seed.flowGenerateBody")}</p>
          </div>
        </article>
        <ArrowRight className={styles.flowArrow} size={20} strokeWidth={2.1} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.flowIcon}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("room.seed.flowConfirm")}</strong>
            <p>{t("room.seed.flowConfirmBody")}</p>
          </div>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.documentColumn} aria-label={t("room.seed.docColumnAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("room.seed.docColumnTitle")}</strong>
            <StatusBadge tone="pending">{t("room.seed.docCount", { count: documents.length })}</StatusBadge>
          </div>
          <div className={styles.documentStack}>
            {documents.map((document) => {
              const kind = documentMeta[document.kind];
              const status = statusMeta[document.status];

              return (
                <article className={styles.documentRow} key={`${document.kind}-${document.filename}`}>
                  <span className={styles.fileTile}>
                    <FileText size={16} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <span className={styles.documentCopy}>
                    <b>{document.filename}</b>
                    <span>{t(kind.labelKey)}</span>
                  </span>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.fieldColumn} aria-label={t("room.seed.fieldColumnAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("room.seed.fieldColumnTitle")}</strong>
            <span className={styles.sectionMeta}>
              {t("room.seed.fieldColumnMeta", { approved: approvedCount, review: reviewCount })}
            </span>
          </div>
          <div className={styles.fieldStack}>
            {fields.map((field) => {
              const status = statusMeta[field.status];

              return (
                <article className={cn(styles.fieldRow, field.status === "NEEDS_REVIEW" && styles.needsReview)} key={field.label}>
                  <div className={styles.fieldCopy}>
                    <span>{field.label}</span>
                    <strong>{field.value}</strong>
                    <small>{field.sourceLabel}</small>
                  </div>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.targetGrid} aria-label={t("room.seed.targetAria")}>
        {targets.map((target) => (
          <article key={target.label}>
            {target.label === SEED_TARGET_ROOM_LABEL ? (
              <PenLine size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : target.label === SEED_TARGET_WBS_LABEL ? (
              <ListChecks size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : (
              <CalendarDays size={17} strokeWidth={2.1} aria-hidden="true" />
            )}
            <div>
              <strong>{target.label}</strong>
              <p>{target.description}</p>
              <StatusBadge tone={target.tone}>{t("room.seed.applyTarget")}</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("room.seed.notice")}</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<PenLine size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("room.seed.editCandidate")}
          </Button>
          <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            {t("room.seed.applyConfirmed")}
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
