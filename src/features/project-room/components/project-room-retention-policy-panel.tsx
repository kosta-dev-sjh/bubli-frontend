import { Archive, CalendarClock, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./project-room-retention-policy-panel.module.css";

type RetentionStatus = "active" | "readonly" | "needsLeader" | "blocked";

type RetentionRule = {
  description: string;
  label: string;
  status: RetentionStatus;
  value: string;
};

type RetentionAction = {
  description: string;
  icon: "archive" | "leader" | "delete";
  label: string;
};

export type ProjectRoomRetentionPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  activeUntilLabel: string;
  leaderCount: number;
  memberCount: number;
  retentionActions: RetentionAction[];
  retentionRules: RetentionRule[];
  roomName: string;
  title?: string;
};

const statusMetaKey: Record<RetentionStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  active: { labelKey: "room.retention.statusActive", tone: "success" },
  readonly: { labelKey: "room.retention.statusReadonly", tone: "neutral" },
  needsLeader: { labelKey: "room.retention.statusNeedsLeader", tone: "warning" },
  blocked: { labelKey: "room.retention.statusBlocked", tone: "pending" },
};

const actionIcon: Record<RetentionAction["icon"], ReactNode> = {
  archive: <Archive size={15} strokeWidth={2.1} />,
  leader: <UsersRound size={15} strokeWidth={2.1} />,
  delete: <Trash2 size={15} strokeWidth={2.1} />,
};

export function ProjectRoomRetentionPolicyPanel({
  activeUntilLabel,
  className,
  leaderCount,
  memberCount,
  retentionActions,
  retentionRules,
  roomName,
  title,
  ...props
}: ProjectRoomRetentionPolicyPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("room.retention.defaultTitle");
  const leaderStatus = leaderCount > 0 ? "active" : "needsLeader";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Archive size={14} strokeWidth={2.1} />}>{t("room.retention.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("room.retention.description")}</p>
          </div>
        </div>
        <div className={styles.roomCard}>
          <span>{t("room.retention.targetRoom")}</span>
          <strong>{roomName}</strong>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarClock size={18} strokeWidth={2.1} />
          </span>
          <div>
            <p>{t("room.retention.activePeriod")}</p>
            <strong>{activeUntilLabel}</strong>
          </div>
        </article>
        <article className={styles.summaryCard}>
          <span className="bubli-icon-tile" aria-hidden="true">
            <UsersRound size={18} strokeWidth={2.1} />
          </span>
          <div>
            <p>{t("room.retention.memberLeader")}</p>
            <strong>{t("room.retention.memberLeaderCount", { member: memberCount, leader: leaderCount })}</strong>
          </div>
          <StatusBadge tone={statusMetaKey[leaderStatus].tone}>{t(statusMetaKey[leaderStatus].labelKey)}</StatusBadge>
        </article>
      </div>

      <section className={styles.ruleGrid} aria-label={t("room.retention.ruleAria")}>
        {retentionRules.map((rule) => {
          const meta = statusMetaKey[rule.status];

          return (
            <article className={styles.ruleCard} key={`${rule.label}-${rule.value}`}>
              <div className={styles.ruleHeader}>
                <h3>{rule.label}</h3>
                <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
              </div>
              <strong>{rule.value}</strong>
              <p>{rule.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.actionList} aria-label={t("room.retention.actionAria")}>
        {retentionActions.map((action) => (
          <article className={styles.actionItem} key={action.label}>
            <span className={styles.actionIcon} aria-hidden="true">
              {actionIcon[action.icon]}
            </span>
            <div>
              <h3>{action.label}</h3>
              <p>{action.description}</p>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
        <p>{t("room.retention.footerNote")}</p>
      </footer>
    </GlassPanel>
  );
}
