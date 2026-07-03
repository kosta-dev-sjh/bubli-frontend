import {
  CheckCircle2,
  Crown,
  DoorOpen,
  KeyRound,
  UserCheck,
  UserRound,
  UsersRound,
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

import styles from "./project-room-leader-handoff-panel.module.css";

type HandoffStatus = "READY" | "NEEDS_LEADER" | "MEMBER_ONLY";
type MemberRole = "PROJECT_LEADER" | "MEMBER";

type HandoffCandidate = {
  displayName: string;
  lastActiveLabel: string;
  role: MemberRole;
  status: HandoffStatus;
  taskCount: number;
};

type HandoffRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ProjectRoomLeaderHandoffPanelProps = HTMLAttributes<HTMLElement> & {
  candidates: HandoffCandidate[];
  currentUserName: string;
  roomName: string;
  rules: HandoffRule[];
  title?: string;
};

const statusMetaKey: Record<HandoffStatus, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  MEMBER_ONLY: { actionLabelKey: "room.handoff.statusMemberOnlyAction", labelKey: "room.handoff.statusMemberOnlyLabel", tone: "personal" },
  NEEDS_LEADER: { actionLabelKey: "room.handoff.statusNeedsLeaderAction", labelKey: "room.handoff.statusNeedsLeaderLabel", tone: "warning" },
  READY: { actionLabelKey: "room.handoff.statusReadyAction", labelKey: "room.handoff.statusReadyLabel", tone: "approved" },
};

const roleMetaKey: Record<MemberRole, { labelKey: MessageKey; tone: StatusTone }> = {
  MEMBER: { labelKey: "room.handoff.roleMember", tone: "personal" },
  PROJECT_LEADER: { labelKey: "room.handoff.roleLeader", tone: "room" },
};

export const defaultHandoffCandidates: HandoffCandidate[] = [
  {
    displayName: "김지현",
    lastActiveLabel: "오늘 10:12 접속",
    role: "PROJECT_LEADER",
    status: "READY",
    taskCount: 6,
  },
  {
    displayName: "이서연",
    lastActiveLabel: "어제 18:40 접속",
    role: "MEMBER",
    status: "NEEDS_LEADER",
    taskCount: 4,
  },
  {
    displayName: "팀 멤버",
    lastActiveLabel: "3일 전 접속",
    role: "MEMBER",
    status: "MEMBER_ONLY",
    taskCount: 1,
  },
];

export const defaultHandoffRules: HandoffRule[] = [
  {
    description: "프로젝트룸 설정, 멤버 초대, 권한 변경을 관리할 프로젝트 리더가 비지 않도록 확인합니다.",
    label: "운영 권한 유지",
    tone: "room",
  },
  {
    description: "리더가 혼자라면 나가기 전에 다른 참여자를 리더로 지정하거나 프로젝트룸을 종료합니다.",
    label: "선택지 제공",
    tone: "pending",
  },
  {
    description: "위임과 나가기는 서버가 권한을 다시 확인한 뒤 멤버 상태에 반영합니다.",
    label: "서버 확인",
    tone: "approved",
  },
];

export function ProjectRoomLeaderHandoffPanel({
  candidates,
  className,
  currentUserName,
  roomName,
  rules,
  title,
  ...props
}: ProjectRoomLeaderHandoffPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("room.handoff.defaultTitle");
  const hasOtherLeader = candidates.some(
    (candidate) => candidate.role === "PROJECT_LEADER" && candidate.displayName !== currentUserName,
  );
  const needsHandoff = !hasOtherLeader;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<DoorOpen size={16} strokeWidth={2.1} />}>{t("room.handoff.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("room.handoff.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{roomName}</span>
          <strong>{needsHandoff ? t("room.handoff.needsHandoff") : t("room.handoff.canLeave")}</strong>
          <StatusBadge tone={needsHandoff ? "warning" : "approved"}>{currentUserName}</StatusBadge>
        </div>
      </header>

      <section className={styles.stateCard} aria-label={t("room.handoff.stateAria")}>
        <span className={styles.iconTile}>
          <KeyRound size={18} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div>
          <strong>{needsHandoff ? t("room.handoff.selectNext") : t("room.handoff.otherLeaderExists")}</strong>
          <p>{t("room.handoff.stateNote")}</p>
        </div>
        <Button icon={<UserCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("room.handoff.checkCandidates")}
        </Button>
      </section>

      <section className={styles.candidateGrid} aria-label={t("room.handoff.candidateAria")}>
        {candidates.map((candidate) => {
          const role = roleMetaKey[candidate.role];
          const status = statusMetaKey[candidate.status];

          return (
            <article
              className={cn(styles.candidateCard, candidate.status === "NEEDS_LEADER" && styles.recommendedCard)}
              key={candidate.displayName}
            >
              <div className={styles.candidateTop}>
                <span className={styles.iconTile}>
                  {candidate.role === "PROJECT_LEADER" ? (
                    <Crown size={18} strokeWidth={2.1} aria-hidden="true" />
                  ) : (
                    <UserRound size={18} strokeWidth={2.1} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.candidateTitle}>
                  <strong>{candidate.displayName}</strong>
                  <span>{candidate.lastActiveLabel}</span>
                </div>
                <StatusBadge tone={role.tone}>{t(role.labelKey)}</StatusBadge>
              </div>

              <div className={styles.candidateMeta}>
                <span>
                  <UsersRound size={15} strokeWidth={2.1} aria-hidden="true" />
                  {t("room.handoff.taskCount", { count: candidate.taskCount })}
                </span>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              </div>

              <footer className={styles.candidateFooter}>
                <span>{t(role.labelKey)}</span>
                <Button
                  disabled={candidate.status === "MEMBER_ONLY"}
                  size="sm"
                  variant={candidate.status === "NEEDS_LEADER" ? "secondary" : "ghost"}
                >
                  {t(status.actionLabelKey)}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label={t("room.handoff.ruleAria")}>
        {rules.map((rule) => (
          <article key={rule.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
