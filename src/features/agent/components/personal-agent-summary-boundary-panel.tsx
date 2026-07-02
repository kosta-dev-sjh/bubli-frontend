"use client";

import {
  Archive,
  CheckCircle2,
  Cloud,
  FileClock,
  HardDrive,
  LockKeyhole,
  ShieldCheck,
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

import styles from "./personal-agent-summary-boundary-panel.module.css";

type StorageSide = "LOCAL_ONLY" | "LOCAL_SUMMARY" | "SERVER_APPROVED";
type BoundaryStatus = "ACTIVE" | "READY" | "SAVED";

type BoundaryItem = {
  description: string;
  label: string;
  side: StorageSide;
  status: BoundaryStatus;
};

type SummaryInput = {
  label: string;
  source: string;
  tone: StatusTone;
  value: string;
};

export type PersonalAgentSummaryBoundaryPanelProps = HTMLAttributes<HTMLElement> & {
  items: BoundaryItem[];
  localMessageLimit?: number;
  title?: string;
  summaryInputs: SummaryInput[];
};

const sideMeta: Record<StorageSide, { labelKey: MessageKey; tone: StatusTone; icon: typeof HardDrive }> = {
  LOCAL_ONLY: { icon: HardDrive, labelKey: "agent.boundary.sideLocalOnly", tone: "personal" },
  LOCAL_SUMMARY: { icon: Archive, labelKey: "agent.boundary.sideLocalSummary", tone: "pending" },
  SERVER_APPROVED: { icon: Cloud, labelKey: "agent.boundary.sideServerApproved", tone: "approved" },
};

const statusMeta: Record<BoundaryStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  ACTIVE: { labelKey: "agent.boundary.statusActive", tone: "todo" },
  READY: { labelKey: "agent.boundary.statusReady", tone: "pending" },
  SAVED: { labelKey: "agent.boundary.statusSaved", tone: "approved" },
};

// label/description/source は t() キーを保持し、レンダー時に翻訳する(value はそのまま表示)。
export const defaultBoundaryItems: BoundaryItem[] = [
  {
    description: "agent.boundary.item1Desc",
    label: "agent.boundary.item1Label",
    side: "LOCAL_ONLY",
    status: "ACTIVE",
  },
  {
    description: "agent.boundary.item2Desc",
    label: "agent.boundary.item2Label",
    side: "LOCAL_SUMMARY",
    status: "READY",
  },
  {
    description: "agent.boundary.item3Desc",
    label: "agent.boundary.item3Label",
    side: "SERVER_APPROVED",
    status: "SAVED",
  },
];

export const defaultSummaryInputs: SummaryInput[] = [
  {
    label: "agent.boundary.input1Label",
    source: "agent.boundary.input1Source",
    tone: "todo",
    value: "agent.boundary.input1Value",
  },
  {
    label: "agent.boundary.input2Label",
    source: "agent.boundary.input2Source",
    tone: "timer",
    value: "3h 42m",
  },
  {
    label: "agent.boundary.input3Label",
    source: "agent.boundary.input3Source",
    tone: "agent",
    value: "agent.boundary.input3Value",
  },
  {
    label: "agent.boundary.input4Label",
    source: "agent.boundary.input4Source",
    tone: "personal",
    value: "agent.boundary.input4Value",
  },
];

export function PersonalAgentSummaryBoundaryPanel({
  className,
  items,
  localMessageLimit = 100,
  summaryInputs,
  title,
  ...props
}: PersonalAgentSummaryBoundaryPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("agent.boundary.defaultTitle");
  const serverSavedCount = items.filter((item) => item.side === "SERVER_APPROVED").length;
  const localOnlyCount = items.filter((item) => item.side !== "SERVER_APPROVED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<LockKeyhole size={16} strokeWidth={2.1} />}>{t("agent.boundary.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("agent.boundary.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("agent.boundary.localLimit")}</span>
          <strong>{t("agent.boundary.countItems", { count: localMessageLimit })}</strong>
          <StatusBadge tone="personal">{t("agent.boundary.localKeep")}</StatusBadge>
        </div>
      </header>

      <section className={styles.boundaryGrid} aria-label={t("agent.boundary.gridAria")}>
        {items.map((item) => {
          const side = sideMeta[item.side];
          const status = statusMeta[item.status];
          const Icon = side.icon;

          return (
            <article key={item.label}>
              <span className={styles.iconTile}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div className={styles.boundaryCopy}>
                <div className={styles.boundaryTop}>
                  <strong>{t(item.label as MessageKey)}</strong>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                </div>
                <p>{t(item.description as MessageKey)}</p>
                <StatusBadge tone={side.tone}>{t(side.labelKey)}</StatusBadge>
              </div>
            </article>
          );
        })}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.policyCard} aria-label={t("agent.boundary.policyAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("agent.boundary.policyTitle")}</strong>
            <StatusBadge tone="approved">{t("agent.boundary.boundarySplit")}</StatusBadge>
          </div>
          <div className={styles.policyRows}>
            <div>
              <span className={styles.policyIcon}>
                <HardDrive size={16} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <b>{t("agent.boundary.policyLocalLabel")}</b>
                <p>{t("agent.boundary.policyLocalDesc")}</p>
              </div>
              <strong>{t("agent.boundary.countKinds", { count: localOnlyCount })}</strong>
            </div>
            <div>
              <span className={styles.policyIcon}>
                <Cloud size={16} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <b>{t("agent.boundary.policyServerLabel")}</b>
                <p>{t("agent.boundary.policyServerDesc")}</p>
              </div>
              <strong>{t("agent.boundary.countKinds", { count: serverSavedCount })}</strong>
            </div>
          </div>
          <ProgressBar value={64} />
          <p className={styles.policyNote}>{t("agent.boundary.policyNote")}</p>
        </section>

        <section className={styles.inputCard} aria-label={t("agent.boundary.inputAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("agent.boundary.inputTitle")}</strong>
            <span className={styles.sectionMeta}>{t("agent.boundary.inputMeta")}</span>
          </div>
          <div className={styles.inputGrid}>
            {summaryInputs.map((input) => (
              <article key={input.label}>
                <span>{t(input.label as MessageKey)}</span>
                <strong>{t(input.value as MessageKey)}</strong>
                <small>{t(input.source as MessageKey)}</small>
                <StatusBadge tone={input.tone}>{t("agent.boundary.reference")}</StatusBadge>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("agent.boundary.footerNotice")}</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<FileClock size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("agent.boundary.viewLocalSummary")}
          </Button>
          <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            {t("agent.boundary.saveDaily")}
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
