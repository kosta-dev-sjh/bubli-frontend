"use client";

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
import { useI18n, type MessageKey } from "@/lib/i18n";
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

const readinessMeta: Record<ShareReadiness, { actionLabel: MessageKey; label: MessageKey; tone: StatusTone }> = {
  NEEDS_REVIEW: {
    actionLabel: "resources.shareBoundary.readiness.NEEDS_REVIEW.action",
    label: "resources.shareBoundary.readiness.NEEDS_REVIEW.label",
    tone: "warning",
  },
  PRIVATE_ONLY: {
    actionLabel: "resources.shareBoundary.readiness.PRIVATE_ONLY.action",
    label: "resources.shareBoundary.readiness.PRIVATE_ONLY.label",
    tone: "personal",
  },
  READY: {
    actionLabel: "resources.shareBoundary.readiness.READY.action",
    label: "resources.shareBoundary.readiness.READY.label",
    tone: "approved",
  },
};

const typeTone: Record<ResourceType, StatusTone> = {
  DOCX: "room",
  MD: "memo",
  PDF: "warning",
  XLSX: "success",
};

export const defaultShareResources: ShareResource[] = [
  {
    fileName: "번역 계약서_검토본.pdf",
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
  title,
  ...props
}: PersonalResourceShareBoundaryPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.shareBoundary.defaultTitle");
  const readyCount = resources.filter((resource) => resource.readiness === "READY").length;
  const reviewCount = resources.filter((resource) => resource.readiness === "NEEDS_REVIEW").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderLock size={16} strokeWidth={2.1} />}>{t("resources.shareBoundary.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.shareBoundary.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.shareBoundary.targetLabel")}</span>
          <strong>{targetProjectRoom}</strong>
          <StatusBadge tone="room">{t("resources.shareBoundary.selectedCount", { count: selectedCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.flowCard} aria-label={t("resources.shareBoundary.flowAria")}>
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <FolderLock size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.shareBoundary.flowPersonalTitle")}</strong>
            <p>{t("resources.shareBoundary.flowPersonalDesc")}</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.shareBoundary.flowConfirmTitle")}</strong>
            <p>{t("resources.shareBoundary.flowConfirmDesc")}</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <FolderOpen size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.shareBoundary.flowRoomTitle")}</strong>
            <p>{t("resources.shareBoundary.flowRoomDesc")}</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label={t("resources.shareBoundary.metricsAria")}>
        <article>
          <span>{t("resources.shareBoundary.metricSelected")}</span>
          <strong>{selectedCount}</strong>
          <StatusBadge tone="approved">{t("resources.shareBoundary.metricSelectedBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("resources.shareBoundary.metricReady")}</span>
          <strong>{readyCount}</strong>
          <StatusBadge tone="room">{t("resources.shareBoundary.metricReadyBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("resources.shareBoundary.metricReview")}</span>
          <strong>{reviewCount}</strong>
          <StatusBadge tone="warning">{t("resources.shareBoundary.metricReviewBadge")}</StatusBadge>
        </article>
      </section>

      <section className={styles.resourceList} aria-label={t("resources.shareBoundary.listAria")}>
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
                  {resource.linkedProjectRoom ?? t("resources.shareBoundary.noLinkedRoom")}
                </span>
                <StatusBadge tone={readiness.tone}>{t(readiness.label)}</StatusBadge>
              </div>

              <footer className={styles.resourceFooter}>
                <span>{t(readiness.label)}</span>
                <Button
                  disabled={resource.readiness === "PRIVATE_ONLY"}
                  size="sm"
                  variant={resource.readiness === "READY" ? "secondary" : "quiet"}
                >
                  {t(readiness.actionLabel)}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.stepGrid} aria-label={t("resources.shareBoundary.stepAria")}>
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
