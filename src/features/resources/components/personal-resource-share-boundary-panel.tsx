import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderLock,
  FolderOpen,
  Link2,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./personal-resource-share-boundary-panel.module.css";

type ResourceType = "PDF" | "DOCX" | "MD" | "XLSX";
type ShareReadiness = "READY" | "NEEDS_REVIEW" | "PRIVATE_ONLY";

type ShareResource = {
  fileName: string;
  linkedProjectRoom?: string;
  readiness: ShareReadiness;
  sourceLabel: string;
  type: ResourceType;
  updatedLabel: string;
};

type BoundaryStep = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type PersonalResourceShareBoundaryPanelProps = HTMLAttributes<HTMLElement> & {
  resources: ShareResource[];
  selectedCount: number;
  steps: BoundaryStep[];
  targetProjectRoom: string;
  title?: string;
};

const readinessMeta: Record<ShareReadiness, { actionLabel: string; label: string; tone: StatusTone }> = {
  NEEDS_REVIEW: { actionLabel: "확인", label: "확인 필요", tone: "warning" },
  PRIVATE_ONLY: { actionLabel: "제외", label: "개인 보관", tone: "personal" },
  READY: { actionLabel: "선택", label: "공유 가능", tone: "approved" },
};

const typeTone: Record<ResourceType, StatusTone> = {
  DOCX: "room",
  MD: "memo",
  PDF: "warning",
  XLSX: "success",
};

export const defaultShareResources: ShareResource[] = [
  {
    fileName: "업무범위정리_검토본.pdf",
    linkedProjectRoom: "신규 번역 프로젝트룸",
    readiness: "READY",
    sourceLabel: "개인 자료함",
    type: "PDF",
    updatedLabel: "오늘 09:42",
  },
  {
    fileName: "회의 후 확인할 질문.md",
    linkedProjectRoom: "신규 번역 프로젝트룸",
    readiness: "NEEDS_REVIEW",
    sourceLabel: "개인 메모",
    type: "MD",
    updatedLabel: "어제 18:10",
  },
  {
    fileName: "개인 정리 노트.docx",
    readiness: "PRIVATE_ONLY",
    sourceLabel: "개인 자료함",
    type: "DOCX",
    updatedLabel: "6월 18일",
  },
];

export const defaultBoundarySteps: BoundaryStep[] = [
  {
    description: "개인 자료는 사용자가 선택하기 전까지 프로젝트룸 자료 목록에 보이지 않습니다.",
    label: "개인 자료 유지",
    tone: "personal",
  },
  {
    description: "공유할 자료와 대상 프로젝트룸을 확인한 뒤 서버가 권한을 다시 검사합니다.",
    label: "권한 확인",
    tone: "room",
  },
  {
    description: "승인된 자료만 프로젝트룸 자료로 연결됩니다.",
    label: "승인 후 반영",
    tone: "approved",
  },
];

export function PersonalResourceShareBoundaryPanel({
  className,
  resources,
  selectedCount,
  steps,
  targetProjectRoom,
  title = "개인 자료 공유 확인",
  ...props
}: PersonalResourceShareBoundaryPanelProps) {
  const readyCount = resources.filter((resource) => resource.readiness === "READY").length;
  const reviewCount = resources.filter((resource) => resource.readiness === "NEEDS_REVIEW").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderLock size={16} strokeWidth={2.1} />}>자료 공유</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              개인 자료함에서 고른 파일을 프로젝트룸 자료로 넘기기 전에 대상, 권한, 연결 방식을 확인합니다.
              선택하지 않은 개인 자료는 프로젝트룸에 표시되지 않습니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>대상 프로젝트룸</span>
          <strong>{targetProjectRoom}</strong>
          <StatusBadge tone="room">선택 {selectedCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.flowCard} aria-label="개인 자료 공유 흐름">
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <FolderLock size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>개인 자료</strong>
            <p>본인만 보는 자료</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>사용자 확인</strong>
            <p>대상과 권한 확인</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <FolderOpen size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>프로젝트룸 자료</strong>
            <p>멤버가 보는 자료</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="공유 전 점검 요약">
        <article>
          <span>선택됨</span>
          <strong>{selectedCount}</strong>
          <StatusBadge tone="approved">반영 대기</StatusBadge>
        </article>
        <article>
          <span>공유 가능</span>
          <strong>{readyCount}</strong>
          <StatusBadge tone="room">권한 확인</StatusBadge>
        </article>
        <article>
          <span>확인 필요</span>
          <strong>{reviewCount}</strong>
          <StatusBadge tone="warning">검토 후 선택</StatusBadge>
        </article>
      </section>

      <section className={styles.resourceList} aria-label="개인 자료 선택 목록">
        {resources.map((resource) => {
          const readiness = readinessMeta[resource.readiness];

          return (
            <article className={styles.resourceCard} key={resource.fileName}>
              <div className={styles.resourceTop}>
                <span className={styles.iconTile}>
                  <FileText size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.resourceTitle}>
                  <strong>{resource.fileName}</strong>
                  <span>
                    {resource.sourceLabel} · {resource.updatedLabel}
                  </span>
                </div>
                <StatusBadge tone={typeTone[resource.type]}>{resource.type}</StatusBadge>
              </div>

              <div className={styles.resourceMeta}>
                <span>
                  <Link2 size={15} strokeWidth={2.1} aria-hidden="true" />
                  {resource.linkedProjectRoom ?? "연결할 프로젝트룸 없음"}
                </span>
                <StatusBadge tone={readiness.tone}>{readiness.label}</StatusBadge>
              </div>

              <footer className={styles.resourceFooter}>
                <span>{readiness.label}</span>
                <Button
                  disabled={resource.readiness === "PRIVATE_ONLY"}
                  size="sm"
                  variant={resource.readiness === "READY" ? "secondary" : "quiet"}
                >
                  {readiness.actionLabel}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.stepGrid} aria-label="공유 처리 기준">
        {steps.map((step) => (
          <article key={step.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={step.tone}>{step.label}</StatusBadge>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
