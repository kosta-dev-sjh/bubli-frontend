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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const readinessMeta: Record<ShareReadiness, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  NEEDS_REVIEW: { actionLabelKey: "resources.share.readinessNeedsReviewAction", labelKey: "resources.share.readinessNeedsReviewLabel", tone: "warning" },
  PRIVATE_ONLY: { actionLabelKey: "resources.share.readinessPrivateAction", labelKey: "resources.share.readinessPrivateLabel", tone: "personal" },
  READY: { actionLabelKey: "resources.share.readinessReadyAction", labelKey: "resources.share.readinessReadyLabel", tone: "approved" },
};

const typeTone: Record<ResourceType, StatusTone> = {
  DOCX: "room",
  MD: "memo",
  PDF: "warning",
  XLSX: "success",
};

// Exported fixtures store message keys in text fields; the panel resolves them via t().
export const defaultShareResources: ShareResource[] = [
  {
    fileName: "resources.share.res1Name",
    linkedProjectRoom: "resources.share.res1Room",
    readiness: "READY",
    sourceLabel: "resources.share.res1Source",
    type: "PDF",
    updatedLabel: "resources.share.res1Updated",
  },
  {
    fileName: "resources.share.res2Name",
    linkedProjectRoom: "resources.share.res2Room",
    readiness: "NEEDS_REVIEW",
    sourceLabel: "resources.share.res2Source",
    type: "MD",
    updatedLabel: "resources.share.res2Updated",
  },
  {
    fileName: "resources.share.res3Name",
    readiness: "PRIVATE_ONLY",
    sourceLabel: "resources.share.res3Source",
    type: "DOCX",
    updatedLabel: "resources.share.res3Updated",
  },
];

export const defaultBoundarySteps: BoundaryStep[] = [
  {
    description: "resources.share.step1Desc",
    label: "resources.share.step1Label",
    tone: "personal",
  },
  {
    description: "resources.share.step2Desc",
    label: "resources.share.step2Label",
    tone: "room",
  },
  {
    description: "resources.share.step3Desc",
    label: "resources.share.step3Label",
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
  const panelTitle = title ?? t("resources.share.defaultTitle");
  const readyCount = resources.filter((resource) => resource.readiness === "READY").length;
  const reviewCount = resources.filter((resource) => resource.readiness === "NEEDS_REVIEW").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderLock size={16} strokeWidth={2.1} />}>{t("resources.share.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{panelTitle}</h2>
            <p className={styles.description}>
              {t("resources.share.description")}
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.share.targetRoom")}</span>
          <strong>{targetProjectRoom}</strong>
          <StatusBadge tone="room">{t("resources.share.selectedCount", { count: selectedCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.flowCard} aria-label={t("resources.share.flowAria")}>
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <FolderLock size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.share.flowPersonalTitle")}</strong>
            <p>{t("resources.share.flowPersonalDesc")}</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.share.flowConfirmTitle")}</strong>
            <p>{t("resources.share.flowConfirmDesc")}</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.flowNode}>
          <span className={styles.iconTile}>
            <FolderOpen size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.share.flowRoomTitle")}</strong>
            <p>{t("resources.share.flowRoomDesc")}</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label={t("resources.share.metricsAria")}>
        <article>
          <span>{t("resources.share.metricSelected")}</span>
          <strong>{selectedCount}</strong>
          <StatusBadge tone="approved">{t("resources.share.metricSelectedBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("resources.share.metricReady")}</span>
          <strong>{readyCount}</strong>
          <StatusBadge tone="room">{t("resources.share.metricReadyBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("resources.share.metricReview")}</span>
          <strong>{reviewCount}</strong>
          <StatusBadge tone="warning">{t("resources.share.metricReviewBadge")}</StatusBadge>
        </article>
      </section>

      <section className={styles.resourceList} aria-label={t("resources.share.listAria")}>
        {resources.map((resource) => {
          const readiness = readinessMeta[resource.readiness];

          return (
            <article className={styles.resourceCard} key={resource.fileName}>
              <div className={styles.resourceTop}>
                <span className={styles.iconTile}>
                  <FileText size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.resourceTitle}>
                  <strong>{t(resource.fileName as MessageKey)}</strong>
                  <span>
                    {t(resource.sourceLabel as MessageKey)} · {t(resource.updatedLabel as MessageKey)}
                  </span>
                </div>
                <StatusBadge tone={typeTone[resource.type]}>{resource.type}</StatusBadge>
              </div>

              <div className={styles.resourceMeta}>
                <span>
                  <Link2 size={15} strokeWidth={2.1} aria-hidden="true" />
                  {resource.linkedProjectRoom ? t(resource.linkedProjectRoom as MessageKey) : t("resources.share.noRoom")}
                </span>
                <StatusBadge tone={readiness.tone}>{t(readiness.labelKey)}</StatusBadge>
              </div>

              <footer className={styles.resourceFooter}>
                <span>{t(readiness.labelKey)}</span>
                <Button
                  disabled={resource.readiness === "PRIVATE_ONLY"}
                  size="sm"
                  variant={resource.readiness === "READY" ? "secondary" : "quiet"}
                >
                  {t(readiness.actionLabelKey)}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.stepGrid} aria-label={t("resources.share.stepGridAria")}>
        {steps.map((step) => (
          <article key={step.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={step.tone}>{t(step.label as MessageKey)}</StatusBadge>
              <p>{t(step.description as MessageKey)}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
