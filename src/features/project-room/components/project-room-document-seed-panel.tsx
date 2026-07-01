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

const documentMeta: Record<SourceDocumentType, { label: string; tone: StatusTone }> = {
  CONTRACT: { label: "업무 기준 문서", tone: "room" },
  ESTIMATE: { label: "견적서", tone: "todo" },
  MEETING_NOTE: { label: "회의록", tone: "memo" },
  REQUIREMENTS: { label: "요구사항 문서", tone: "agent" },
};

const statusMeta: Record<CandidateStatus, { label: string; tone: StatusTone }> = {
  APPROVED: { label: "확인됨", tone: "approved" },
  NEEDS_REVIEW: { label: "확인 필요", tone: "warning" },
  READY: { label: "후보", tone: "pending" },
};

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
    sourceLabel: "업무 기준 문서",
    status: "APPROVED",
    value: "ABC 콘텐츠",
  },
  {
    label: "납품일",
    sourceLabel: "업무 기준 문서, 회의록",
    status: "NEEDS_REVIEW",
    value: "2026.07.15 또는 2026.07.20",
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
  title = "문서로 프로젝트룸 시작하기",
  ...props
}: ProjectRoomDocumentSeedPanelProps) {
  const reviewCount = fields.filter((field) => field.status === "NEEDS_REVIEW").length;
  const approvedCount = fields.filter((field) => field.status === "APPROVED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileCheck2 size={16} strokeWidth={2.1} />}>프로젝트룸 생성</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              업무 기준 문서, 견적서, 요구사항 문서를 올리면 에이전트가 프로젝트룸에 필요한 값을 후보로 정리합니다.
              확인한 값만 프로젝트룸 정보와 WBS/TODO, 일정 후보로 이어집니다.
            </p>
          </div>
        </div>
        <div className={styles.statusCard} aria-label="초기값 확인 진행률">
          <span>초기값 확인</span>
          <strong>{progressPercent}%</strong>
          <ProgressBar value={progressPercent} />
        </div>
      </header>

      <section className={styles.flow} aria-label="문서에서 프로젝트룸으로 이어지는 흐름">
        <article className={styles.flowCard}>
          <span className={styles.flowIcon}>
            <FileText size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>문서 업로드</strong>
            <p>업무 기준 문서, 견적서, 요구사항 문서를 같은 프로젝트 맥락에 둡니다.</p>
          </div>
        </article>
        <ArrowRight className={styles.flowArrow} size={20} strokeWidth={2.1} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.flowIcon}>
            <Sparkles size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>후보 생성</strong>
            <p>작업 범위, 납품물, 마감, 확인 질문을 후보로 정리합니다.</p>
          </div>
        </article>
        <ArrowRight className={styles.flowArrow} size={20} strokeWidth={2.1} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.flowIcon}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>사용자 확인</strong>
            <p>승인한 값만 프로젝트룸 데이터로 반영합니다.</p>
          </div>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.documentColumn} aria-label="업로드 문서">
          <div className={styles.sectionTitle}>
            <strong>업로드 문서</strong>
            <StatusBadge tone="pending">{documents.length}개</StatusBadge>
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
                    <span>{kind.label}</span>
                  </span>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.fieldColumn} aria-label="추출 후보">
          <div className={styles.sectionTitle}>
            <strong>추출 후보</strong>
            <span className={styles.sectionMeta}>
              확인됨 {approvedCount} · 확인 필요 {reviewCount}
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
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.targetGrid} aria-label="승인 후 반영 위치">
        {targets.map((target) => (
          <article key={target.label}>
            {target.label === "프로젝트룸 정보" ? (
              <PenLine size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : target.label === "WBS/TODO 후보" ? (
              <ListChecks size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : (
              <CalendarDays size={17} strokeWidth={2.1} aria-hidden="true" />
            )}
            <div>
              <strong>{target.label}</strong>
              <p>{target.description}</p>
              <StatusBadge tone={target.tone}>반영 대상</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>에이전트 결과는 후보입니다. 확정 데이터는 사용자 승인 후 저장합니다.</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<PenLine size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            후보 수정
          </Button>
          <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            확인한 값 반영
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
