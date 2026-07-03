"use client";

import {
  ArchiveRestore,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./daily-summary-evidence-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type DailySummaryStatus = "DRAFT" | "READY_TO_APPROVE" | "APPROVED" | "HELD";

export type DailySummaryEvidence = {
  countLabel: string;
  description: string;
  id: string;
  label: string;
  source: string;
  tone?: StatusTone;
};

type DailySummaryEvidencePanelProps = HTMLAttributes<HTMLElement> & {
  approvedSourceCount?: number;
  dateLabel?: string;
  evidenceItems?: DailySummaryEvidence[];
  localContextLabel?: string;
  onApproveSummary?: () => void;
  onCreateLocalBackup?: () => void;
  onRefreshEvidence?: () => void;
  status?: DailySummaryStatus;
};

const statusCopyKeys: Record<DailySummaryStatus, MessageKey> = {
  APPROVED: "agent.daily.statusApproved",
  DRAFT: "agent.daily.statusDraft",
  HELD: "agent.daily.statusHeld",
  READY_TO_APPROVE: "agent.daily.statusReadyToApprove",
};

const statusTone: Record<DailySummaryStatus, StatusTone> = {
  APPROVED: "success",
  DRAFT: "pending",
  HELD: "warning",
  READY_TO_APPROVE: "agent",
};

// countLabel/description/label/source は t() キーを保持し、レンダー時に翻訳する(label "TODO" は t() 폴백で그대로 통과)。
const defaultEvidenceItems: DailySummaryEvidence[] = [
  {
    countLabel: "agent.daily.ev1Count",
    description: "agent.daily.ev1Desc",
    id: "tasks",
    label: "TODO",
    source: "agent.daily.ev1Source",
    tone: "todo",
  },
  {
    countLabel: "agent.daily.ev2Count",
    description: "agent.daily.ev2Desc",
    id: "time",
    label: "agent.daily.ev2Label",
    source: "agent.daily.ev2Source",
    tone: "timer",
  },
  {
    countLabel: "agent.daily.ev3Count",
    description: "agent.daily.ev3Desc",
    id: "schedule",
    label: "agent.daily.ev3Label",
    source: "agent.daily.ev3Source",
    tone: "room",
  },
  {
    countLabel: "agent.daily.ev4Count",
    description: "agent.daily.ev4Desc",
    id: "widget",
    label: "agent.daily.ev4Label",
    source: "agent.daily.ev4Source",
    tone: "personal",
  },
  {
    countLabel: "agent.daily.ev5Count",
    description: "agent.daily.ev5Desc",
    id: "agent",
    label: "agent.daily.ev5Label",
    source: "agent.daily.ev5Source",
    tone: "agent",
  },
];

export function DailySummaryEvidencePanel({
  approvedSourceCount = 4,
  className,
  dateLabel,
  evidenceItems = defaultEvidenceItems,
  localContextLabel,
  onApproveSummary,
  onCreateLocalBackup,
  onRefreshEvidence,
  status = "READY_TO_APPROVE",
  ...props
}: DailySummaryEvidencePanelProps) {
  const { t } = useI18n();
  const resolvedDateLabel = dateLabel ?? t("agent.daily.today");
  const resolvedLocalContext = localContextLabel ?? t("agent.daily.localContext");
  const totalSourceCount = evidenceItems.length;
  const evidencePercent = Math.round((approvedSourceCount / Math.max(totalSourceCount, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <Bot size={22} />
          </span>
          <div>
            <StatusBadge tone={statusTone[status]}>{t(statusCopyKeys[status])}</StatusBadge>
            <h2>{t("agent.daily.title")}</h2>
            <p>{t("agent.daily.subtitle")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<FileCheck2 size={15} />} onClick={onRefreshEvidence} size="sm" variant="quiet">
            {t("agent.daily.reviewEvidence")}
          </Button>
          <Button icon={<CheckCircle2 size={15} />} onClick={onApproveSummary} size="sm" variant="primary">
            {t("agent.daily.saveAfterCheck")}
          </Button>
        </div>
      </header>

      <div className={styles.summaryCard}>
        <div>
          <Chip>{resolvedDateLabel}</Chip>
          <strong>{t("agent.daily.evidenceReady", { approved: approvedSourceCount, total: totalSourceCount })}</strong>
          <span>{t("agent.daily.saveTargetNote")}</span>
        </div>
        <ProgressBar label={t("agent.daily.evidenceBar")} value={evidencePercent} />
      </div>

      <div className={styles.evidenceGrid} aria-label={t("agent.daily.evidenceGridAria")}>
        {evidenceItems.map((item) => (
          <EvidenceCard item={item} key={item.id} t={t} />
        ))}
      </div>

      <div className={styles.boundaryGrid}>
        <BoundaryItem
          icon={<Database size={17} />}
          label={t("agent.daily.boundaryServerLabel")}
          value={t("agent.daily.boundaryServerValue")}
        />
        <BoundaryItem
          icon={<LockKeyhole size={17} />}
          label={t("agent.daily.boundaryLocalLabel")}
          value={t("agent.daily.boundaryLocalValue")}
        />
        <BoundaryItem
          icon={<ArchiveRestore size={17} />}
          label={t("agent.daily.boundaryRestoreLabel")}
          value={t("agent.daily.boundaryRestoreValue")}
        />
      </div>

      <footer className={styles.footer}>
        <div>
          <ShieldCheck size={16} />
          {resolvedLocalContext}
        </div>
        <Button icon={<ArchiveRestore size={14} />} onClick={onCreateLocalBackup} size="sm" variant="ghost">
          {t("agent.daily.createLocalBackup")}
        </Button>
      </footer>
    </GlassPanel>
  );
}

function EvidenceCard({ item, t }: { item: DailySummaryEvidence; t: TranslateFn }) {
  return (
    <article className={styles.evidenceCard}>
      <span aria-hidden="true">{evidenceIcon[item.id] ?? <Database size={17} />}</span>
      <div>
        <div className={styles.cardTop}>
          <StatusBadge tone={item.tone}>{t(item.label as MessageKey)}</StatusBadge>
          <Chip>{t(item.countLabel as MessageKey)}</Chip>
        </div>
        <strong>{t(item.source as MessageKey)}</strong>
        <p>{t(item.description as MessageKey)}</p>
      </div>
    </article>
  );
}

function BoundaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className={styles.boundaryItem}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </article>
  );
}

const evidenceIcon: Record<string, ReactNode> = {
  agent: <MessageSquareText size={17} />,
  schedule: <CalendarCheck2 size={17} />,
  tasks: <ListChecks size={17} />,
  time: <Clock3 size={17} />,
  widget: <Bot size={17} />,
};
