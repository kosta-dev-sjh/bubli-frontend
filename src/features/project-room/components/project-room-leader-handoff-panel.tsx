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

const statusMeta: Record<HandoffStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  MEMBER_ONLY: { actionLabel: "보기", label: "일반 멤버", tone: "personal" },
  NEEDS_LEADER: { actionLabel: "위임 선택", label: "위임 필요", tone: "warning" },
  READY: { actionLabel: "나가기", label: "나가기 가능", tone: "approved" },
};

const roleMeta: Record<MemberRole, { label: string; tone: StatusTone }> = {
  MEMBER: { label: "멤버", tone: "personal" },
  PROJECT_LEADER: { label: "프로젝트 리더", tone: "room" },
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
    displayName: "박민수",
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
    description: "위임과 나가기는 API 서버가 권한을 다시 확인한 뒤 room_members 상태에 반영합니다.",
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
  title = "프로젝트룸 나가기",
  ...props
}: ProjectRoomLeaderHandoffPanelProps) {
  const hasOtherLeader = candidates.some(
    (candidate) => candidate.role === "PROJECT_LEADER" && candidate.displayName !== currentUserName,
  );
  const needsHandoff = !hasOtherLeader;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<DoorOpen size={16} strokeWidth={2.1} />}>room_members</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              프로젝트룸을 나가기 전에 초대, 권한 변경, 설정을 관리할 프로젝트 리더가 남아 있는지 확인합니다. 리더가
              비게 되면 위임 후보를 먼저 선택합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{roomName}</span>
          <strong>{needsHandoff ? "위임 필요" : "나가기 가능"}</strong>
          <StatusBadge tone={needsHandoff ? "warning" : "approved"}>{currentUserName}</StatusBadge>
        </div>
      </header>

      <section className={styles.stateCard} aria-label="프로젝트 리더 위임 상태">
        <span className={styles.iconTile}>
          <KeyRound size={18} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div>
          <strong>{needsHandoff ? "다음 프로젝트 리더를 선택하세요" : "다른 프로젝트 리더가 있습니다"}</strong>
          <p>
            나가기를 막기 위한 장치가 아니라, 프로젝트룸의 설정과 초대 권한이 비지 않도록 확인하는 단계입니다.
          </p>
        </div>
        <Button icon={<UserCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          후보 확인
        </Button>
      </section>

      <section className={styles.candidateGrid} aria-label="프로젝트 리더 위임 후보">
        {candidates.map((candidate) => {
          const role = roleMeta[candidate.role];
          const status = statusMeta[candidate.status];

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
                <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
              </div>

              <div className={styles.candidateMeta}>
                <span>
                  <UsersRound size={15} strokeWidth={2.1} aria-hidden="true" />
                  담당 작업 {candidate.taskCount}개
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>

              <footer className={styles.candidateFooter}>
                <span>{candidate.role.toLowerCase()}</span>
                <Button
                  disabled={candidate.status === "MEMBER_ONLY"}
                  size="sm"
                  variant={candidate.status === "NEEDS_LEADER" ? "secondary" : "ghost"}
                >
                  {status.actionLabel}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="프로젝트룸 나가기 기준">
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
