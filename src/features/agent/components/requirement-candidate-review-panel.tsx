"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePause,
  Database,
  FileText,
  LayoutPanelTop,
  Link2,
  ListChecks,
  LockKeyhole,
  PencilLine,
  ServerCog,
  Workflow,
  XCircle,
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

import styles from "./requirement-candidate-review-panel.module.css";

export type RequirementCandidateStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type RequirementCategory = "FEATURE" | "SCREEN" | "PERMISSION" | "DATA" | "INTEGRATION" | "ENVIRONMENT";

export type RequirementCandidate = {
  category: RequirementCategory;
  confidence?: number;
  description: string;
  id: string;
  sourceLabel: string;
  status: RequirementCandidateStatus;
  title: string;
};

export type RequirementCandidateReviewPanelProps = {
  candidates?: RequirementCandidate[];
  className?: string;
  jobStatusLabel?: string;
  onApproveCandidate?: (candidateId: string) => void;
  onEditCandidate?: (candidateId: string) => void;
  onHoldCandidate?: (candidateId: string) => void;
  onRejectCandidate?: (candidateId: string) => void;
  onRunRequirementJob?: () => void;
};

const categoryCopyKeys: Record<RequirementCategory, MessageKey> = {
  DATA: "agent.req.catData",
  ENVIRONMENT: "agent.req.catEnvironment",
  FEATURE: "agent.req.catFeature",
  INTEGRATION: "agent.req.catIntegration",
  PERMISSION: "agent.req.catPermission",
  SCREEN: "agent.req.catScreen",
};

const categoryIcon: Record<RequirementCategory, ReactNode> = {
  DATA: <Database size={17} strokeWidth={2.1} />,
  ENVIRONMENT: <ServerCog size={17} strokeWidth={2.1} />,
  FEATURE: <ListChecks size={17} strokeWidth={2.1} />,
  INTEGRATION: <Link2 size={17} strokeWidth={2.1} />,
  PERMISSION: <LockKeyhole size={17} strokeWidth={2.1} />,
  SCREEN: <LayoutPanelTop size={17} strokeWidth={2.1} />,
};

const statusCopyKeys: Record<RequirementCandidateStatus, MessageKey> = {
  APPROVED: "agent.req.statusApproved",
  DRAFT: "agent.req.statusDraft",
  HELD: "agent.req.statusHeld",
  REJECTED: "agent.req.statusRejected",
};

const statusTone: Record<RequirementCandidateStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

// description/sourceLabel/title は t() キーを保持し、レンダー時に翻訳する(호출부 문자열은 t() 폴백으로 그대로 통과)。
const defaultCandidates: RequirementCandidate[] = [
  {
    category: "FEATURE",
    confidence: 93,
    description: "agent.req.cand1Desc",
    id: "candidate-feature-resource-group",
    sourceLabel: "agent.req.cand1Source",
    status: "DRAFT",
    title: "agent.req.cand1Title",
  },
  {
    category: "SCREEN",
    confidence: 88,
    description: "agent.req.cand2Desc",
    id: "candidate-screen-resource-detail",
    sourceLabel: "agent.req.cand2Source",
    status: "APPROVED",
    title: "agent.req.cand2Title",
  },
  {
    category: "PERMISSION",
    confidence: 84,
    description: "agent.req.cand3Desc",
    id: "candidate-permission-member-only",
    sourceLabel: "agent.req.cand3Source",
    status: "DRAFT",
    title: "agent.req.cand3Title",
  },
  {
    category: "DATA",
    confidence: 79,
    description: "agent.req.cand4Desc",
    id: "candidate-data-draft",
    sourceLabel: "agent.req.cand4Source",
    status: "HELD",
    title: "agent.req.cand4Title",
  },
];

export function RequirementCandidateReviewPanel({
  candidates = defaultCandidates,
  className,
  jobStatusLabel,
  onApproveCandidate,
  onEditCandidate,
  onHoldCandidate,
  onRejectCandidate,
  onRunRequirementJob,
}: RequirementCandidateReviewPanelProps) {
  const { t } = useI18n();
  const resolvedJobStatusLabel = jobStatusLabel ?? t("agent.req.jobStatus");
  const counts = candidates.reduce(
    (acc, candidate) => {
      acc[candidate.status] += 1;
      return acc;
    },
    { APPROVED: 0, DRAFT: 0, HELD: 0, REJECTED: 0 } satisfies Record<RequirementCandidateStatus, number>,
  );

  const approvedRatio = candidates.length > 0 ? Math.round((counts.APPROVED / candidates.length) * 100) : 0;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Bot size={14} />}>{t("agent.req.chip")}</Chip>
          <h2>{t("agent.req.heroTitle")}</h2>
          <p>{t("agent.req.heroDesc")}</p>
        </div>
        <div className={styles.headerAside}>
          <StatusBadge tone="approved">{resolvedJobStatusLabel}</StatusBadge>
          <Button icon={<Workflow size={15} />} onClick={onRunRequirementJob} size="sm" variant="quiet">
            {t("agent.req.regenerate")}
          </Button>
        </div>
      </header>

      <section className={styles.statusStrip} aria-label={t("agent.req.statusAria")}>
        <article>
          <strong>{candidates.length}</strong>
          <span>{t("agent.req.total")}</span>
        </article>
        <article>
          <strong>{counts.APPROVED}</strong>
          <span>{t("agent.req.approved")}</span>
        </article>
        <article>
          <strong>{counts.DRAFT}</strong>
          <span>{t("agent.req.beforeReview")}</span>
        </article>
        <article>
          <strong>{counts.HELD}</strong>
          <span>{t("agent.req.held")}</span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.candidateList} aria-label={t("agent.req.listAria")}>
          {candidates.map((candidate) => (
            <article className={styles.candidateCard} key={candidate.id}>
              <span className={styles.categoryIcon} aria-hidden="true">
                {categoryIcon[candidate.category]}
              </span>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <div>
                    <Chip>{t(categoryCopyKeys[candidate.category])}</Chip>
                    <h3>{t(candidate.title as MessageKey)}</h3>
                  </div>
                  <StatusBadge tone={statusTone[candidate.status]}>{t(statusCopyKeys[candidate.status])}</StatusBadge>
                </div>
                <p>{t(candidate.description as MessageKey)}</p>
                <div className={styles.sourceRow}>
                  <FileText size={14} strokeWidth={2.1} />
                  <span>{t(candidate.sourceLabel as MessageKey)}</span>
                </div>
                {typeof candidate.confidence === "number" ? (
                  <ProgressBar label={t("agent.req.confidence")} value={candidate.confidence} />
                ) : null}
                <footer className={styles.actions}>
                  <button onClick={() => onApproveCandidate?.(candidate.id)} type="button">
                    <CheckCircle2 size={14} />
                    {t("agent.req.approve")}
                  </button>
                  <button onClick={() => onEditCandidate?.(candidate.id)} type="button">
                    <PencilLine size={14} />
                    {t("agent.req.edit")}
                  </button>
                  <button onClick={() => onHoldCandidate?.(candidate.id)} type="button">
                    <CirclePause size={14} />
                    {t("agent.req.hold")}
                  </button>
                  <button onClick={() => onRejectCandidate?.(candidate.id)} type="button">
                    <XCircle size={14} />
                    {t("agent.req.reject")}
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </section>

        <aside className={styles.flowPanel} aria-label={t("agent.req.flowAria")}>
          <div className={styles.flowHeader}>
            <Sparkline />
            <div>
              <h3>{t("agent.req.afterApproval")}</h3>
              <p>{t("agent.req.afterApprovalDesc")}</p>
            </div>
          </div>
          <ProgressBar label={t("agent.req.approvedRatio")} value={approvedRatio} />
          <ol className={styles.flowList}>
            <li>
              <span>1</span>
              <div>
                <strong>{t("agent.req.step1Title")}</strong>
                <p>{t("agent.req.step1Desc")}</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>{t("agent.req.step2Title")}</strong>
                <p>{t("agent.req.step2Desc")}</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>{t("agent.req.step3Title")}</strong>
                <p>{t("agent.req.step3Desc")}</p>
              </div>
            </li>
          </ol>
          <div className={styles.flowFooter}>
            <span>{t("agent.req.flowReq")}</span>
            <ArrowRight size={16} />
            <span>{t("agent.req.flowWbs")}</span>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}

function Sparkline() {
  return (
    <span className={styles.sparkline} aria-hidden="true">
      <ListChecks size={22} strokeWidth={2.2} />
    </span>
  );
}
