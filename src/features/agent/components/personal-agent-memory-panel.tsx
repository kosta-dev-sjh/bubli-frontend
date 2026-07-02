"use client";

import {
  Archive,
  CheckCircle2,
  Database,
  HardDrive,
  MessageSquareText,
  Server,
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

import styles from "./personal-agent-memory-panel.module.css";

type MemoryLocation = "LOCAL_ONLY" | "LOCAL_SUMMARY" | "SERVER_APPROVED";
type MemoryStatus = "ACTIVE" | "ROLLUP_READY" | "APPROVED" | "BACKUP_READY";

type MemoryItem = {
  description: string;
  label: string;
  location: MemoryLocation;
  status: MemoryStatus;
};

type MemoryRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type PersonalAgentMemoryPanelProps = HTMLAttributes<HTMLElement> & {
  dailySummaryTitle: string;
  memoryItems: MemoryItem[];
  messageLimit: number;
  rules: MemoryRule[];
  usedMessageCount: number;
  title?: string;
};

const locationMeta: Record<MemoryLocation, { labelKey: MessageKey; tone: StatusTone }> = {
  LOCAL_ONLY: { labelKey: "agent.mem.locLocalOnly", tone: "personal" },
  LOCAL_SUMMARY: { labelKey: "agent.mem.locLocalSummary", tone: "agent" },
  SERVER_APPROVED: { labelKey: "agent.mem.locServerApproved", tone: "approved" },
};

const statusMeta: Record<MemoryStatus, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  ACTIVE: { actionLabelKey: "agent.mem.statusActiveAction", labelKey: "agent.mem.statusActive", tone: "personal" },
  APPROVED: { actionLabelKey: "agent.mem.statusApprovedAction", labelKey: "agent.mem.statusApproved", tone: "approved" },
  BACKUP_READY: { actionLabelKey: "agent.mem.statusBackupAction", labelKey: "agent.mem.statusBackup", tone: "room" },
  ROLLUP_READY: { actionLabelKey: "agent.mem.statusRollupAction", labelKey: "agent.mem.statusRollup", tone: "agent" },
};

// label/description は t() キーを保持し、レンダー時に翻訳する。
export const defaultPersonalAgentMemoryItems: MemoryItem[] = [
  {
    description: "agent.mem.item1Desc",
    label: "agent.mem.item1Label",
    location: "LOCAL_ONLY",
    status: "ACTIVE",
  },
  {
    description: "agent.mem.item2Desc",
    label: "agent.mem.item2Label",
    location: "LOCAL_SUMMARY",
    status: "ROLLUP_READY",
  },
  {
    description: "agent.mem.item3Desc",
    label: "agent.mem.item3Label",
    location: "SERVER_APPROVED",
    status: "APPROVED",
  },
  {
    description: "agent.mem.item4Desc",
    label: "agent.mem.item4Label",
    location: "LOCAL_ONLY",
    status: "BACKUP_READY",
  },
];

export const defaultPersonalAgentMemoryRules: MemoryRule[] = [
  {
    description: "agent.mem.rule1Desc",
    label: "agent.mem.rule1Label",
    tone: "personal",
  },
  {
    description: "agent.mem.rule2Desc",
    label: "agent.mem.rule2Label",
    tone: "agent",
  },
  {
    description: "agent.mem.rule3Desc",
    label: "agent.mem.rule3Label",
    tone: "approved",
  },
];

export function PersonalAgentMemoryPanel({
  className,
  dailySummaryTitle,
  memoryItems,
  messageLimit,
  rules,
  title,
  usedMessageCount,
  ...props
}: PersonalAgentMemoryPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("agent.mem.defaultTitle");
  const usagePercent = Math.round((usedMessageCount / messageLimit) * 100);
  const localOnlyCount = memoryItems.filter((item) => item.location === "LOCAL_ONLY").length;
  const serverApprovedCount = memoryItems.filter((item) => item.location === "SERVER_APPROVED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Sparkles size={16} strokeWidth={2.1} />}>{t("agent.mem.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("agent.mem.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("agent.mem.summaryLabel")}</span>
          <strong>{dailySummaryTitle}</strong>
          <StatusBadge tone="personal">{t("agent.mem.personalArea")}</StatusBadge>
        </div>
      </header>

      <section className={styles.memoryGrid} aria-label={t("agent.mem.gridAria")}>
        <article className={styles.memoryCard}>
          <span className={styles.iconTile}>
            <HardDrive size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="personal">{t("agent.mem.localKeep")}</StatusBadge>
            <h3>{t("agent.mem.recentTitle")}</h3>
            <p>{t("agent.mem.recentDesc")}</p>
          </div>
        </article>

        <article className={styles.centerCard}>
          <span className={styles.iconTile}>
            <MessageSquareText size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>
            {t("agent.mem.usageCount", { limit: messageLimit, used: usedMessageCount })}
          </Chip>
          <h3>{t("agent.mem.usageTitle")}</h3>
          <p>{t("agent.mem.usageDesc")}</p>
          <ProgressBar label={t("agent.mem.usageBar")} value={usagePercent} />
          <Button size="sm" variant="secondary">
            {t("agent.mem.checkDaily")}
          </Button>
        </article>

        <article className={styles.memoryCard}>
          <span className={styles.iconTile}>
            <Server size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="approved">{t("agent.mem.saveAfterCheck")}</StatusBadge>
            <h3>{t("agent.mem.approvedTitle")}</h3>
            <p>{t("agent.mem.approvedDesc")}</p>
          </div>
        </article>
      </section>

      <section className={styles.metrics} aria-label={t("agent.mem.metricsAria")}>
        <article>
          <span>{t("agent.mem.localItems")}</span>
          <strong>{localOnlyCount}</strong>
          <StatusBadge tone="personal">{t("agent.mem.localBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("agent.mem.serverSummary")}</span>
          <strong>{serverApprovedCount}</strong>
          <StatusBadge tone="approved">{t("agent.mem.afterApproval")}</StatusBadge>
        </article>
        <article>
          <span>{t("agent.mem.rawRestore")}</span>
          <strong>{t("agent.mem.backup")}</strong>
          <StatusBadge tone="room">{t("agent.mem.deviceBasis")}</StatusBadge>
        </article>
      </section>

      <section className={styles.itemList} aria-label={t("agent.mem.itemListAria")}>
        {memoryItems.map((item) => {
          const location = locationMeta[item.location];
          const status = statusMeta[item.status];

          return (
            <article className={styles.itemCard} key={item.label}>
              <span className={styles.iconTile}>
                {item.location === "SERVER_APPROVED" ? (
                  <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : item.status === "BACKUP_READY" ? (
                  <Archive size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : (
                  <Database size={18} strokeWidth={2.1} aria-hidden="true" />
                )}
              </span>
              <div className={styles.itemMain}>
                <strong>{t(item.label as MessageKey)}</strong>
                <p>{t(item.description as MessageKey)}</p>
              </div>
              <StatusBadge tone={location.tone}>{t(location.labelKey)}</StatusBadge>
              <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              <Button size="sm" variant={item.status === "ROLLUP_READY" ? "secondary" : "quiet"}>
                {t(status.actionLabelKey)}
              </Button>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label={t("agent.mem.ruleGridAria")}>
        {rules.map((rule) => (
          <article key={rule.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{t(rule.label as MessageKey)}</StatusBadge>
              <p>{t(rule.description as MessageKey)}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
