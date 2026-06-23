import { Archive, CalendarClock, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
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

const statusMeta: Record<RetentionStatus, { label: string; tone: StatusTone }> = {
  active: { label: "활성", tone: "success" },
  readonly: { label: "읽기 전용", tone: "neutral" },
  needsLeader: { label: "리더 필요", tone: "warning" },
  blocked: { label: "차단", tone: "pending" },
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
  title = "프로젝트룸 보관 정책",
  ...props
}: ProjectRoomRetentionPolicyPanelProps) {
  const leaderStatus = leaderCount > 0 ? "active" : "needsLeader";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Archive size={14} strokeWidth={2.1} />}>프로젝트룸 설정</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              프로젝트룸은 만료 즉시 지우지 않고, 보관 또는 읽기 전용 상태로 남깁니다. 멤버 권한과 자료 접근은 서버의 프로젝트룸 상태를 기준으로 판단합니다.
            </p>
          </div>
        </div>
        <div className={styles.roomCard}>
          <span>대상 프로젝트룸</span>
          <strong>{roomName}</strong>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarClock size={18} strokeWidth={2.1} />
          </span>
          <div>
            <p>활성 기간</p>
            <strong>{activeUntilLabel}</strong>
          </div>
        </article>
        <article className={styles.summaryCard}>
          <span className="bubli-icon-tile" aria-hidden="true">
            <UsersRound size={18} strokeWidth={2.1} />
          </span>
          <div>
            <p>멤버와 프로젝트 리더</p>
            <strong>{memberCount}명 중 {leaderCount}명</strong>
          </div>
          <StatusBadge tone={statusMeta[leaderStatus].tone}>{statusMeta[leaderStatus].label}</StatusBadge>
        </article>
      </div>

      <section className={styles.ruleGrid} aria-label="보관 정책 기준">
        {retentionRules.map((rule) => {
          const meta = statusMeta[rule.status];

          return (
            <article className={styles.ruleCard} key={`${rule.label}-${rule.value}`}>
              <div className={styles.ruleHeader}>
                <h3>{rule.label}</h3>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
              <strong>{rule.value}</strong>
              <p>{rule.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.actionList} aria-label="프로젝트룸 보관 작업">
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
        <p>
          마지막 프로젝트 리더가 나가거나 멤버로 바뀌려면 먼저 다른 활성 멤버에게 리더 권한을 넘깁니다. 혼자 남은 리더는 보관 또는 삭제 검토를 선택할 수 있습니다.
        </p>
      </footer>
    </GlassPanel>
  );
}
