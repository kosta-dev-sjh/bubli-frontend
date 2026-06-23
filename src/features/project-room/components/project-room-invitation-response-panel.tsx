import { CalendarClock, CheckCircle2, DoorOpen, Link2, UserPlus, UsersRound, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./project-room-invitation-response-panel.module.css";

type InvitationType = "friend" | "link";
type InvitationStatus = "pending" | "accepted" | "expired" | "canceled";

type InvitationAccess = {
  label: string;
  description: string;
};

export type ProjectRoomInvitationResponsePanelProps = HTMLAttributes<HTMLElement> & {
  accessPreview: InvitationAccess[];
  expiresLabel: string;
  invitationType: InvitationType;
  inviterName: string;
  projectRoomName: string;
  roleLabel: "프로젝트 리더" | "멤버";
  status: InvitationStatus;
  title?: string;
};

const typeMeta: Record<InvitationType, { icon: ReactNode; label: string; tone: StatusTone }> = {
  friend: {
    icon: <UserPlus size={18} strokeWidth={2.1} />,
    label: "친구 초대",
    tone: "personal",
  },
  link: {
    icon: <Link2 size={18} strokeWidth={2.1} />,
    label: "링크 초대",
    tone: "room",
  },
};

const statusMeta: Record<InvitationStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "수락 대기", tone: "pending" },
  accepted: { label: "수락됨", tone: "success" },
  expired: { label: "만료됨", tone: "warning" },
  canceled: { label: "취소됨", tone: "neutral" },
};

export function ProjectRoomInvitationResponsePanel({
  accessPreview,
  className,
  expiresLabel,
  invitationType,
  inviterName,
  projectRoomName,
  roleLabel,
  status,
  title = "프로젝트룸 초대",
  ...props
}: ProjectRoomInvitationResponsePanelProps) {
  const type = typeMeta[invitationType];
  const currentStatus = statusMeta[status];
  const canRespond = status === "pending";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={type.icon}>{type.label}</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              초대를 수락하면 프로젝트룸 멤버가 되고, 그때부터 자료, WBS/TODO, 채팅, 보이스, 알림 접근 권한이 생깁니다.
            </p>
          </div>
        </div>
        <div className={styles.statusCard}>
          <span>초대 상태</span>
          <strong>{currentStatus.label}</strong>
          <StatusBadge tone={currentStatus.tone}>{currentStatus.label}</StatusBadge>
        </div>
      </header>

      <section className={styles.inviteCard} aria-label="초대 정보">
        <div className={styles.roomIntro}>
          <span className={styles.roomIcon} aria-hidden="true">
            <DoorOpen size={22} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{projectRoomName}</h3>
            <p>{inviterName} 님이 프로젝트룸에 초대했습니다.</p>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <article>
            <UsersRound size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>초대 역할</span>
            <strong>{roleLabel}</strong>
          </article>
          <article>
            <CalendarClock size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>만료</span>
            <strong>{expiresLabel}</strong>
          </article>
          <article>
            {type.icon}
            <span>방식</span>
            <strong>{type.label}</strong>
          </article>
        </div>

        {invitationType === "link" ? (
          <div className={styles.guardRail}>
            <Link2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <span>링크 초대는 로그인한 사용자만 수락할 수 있습니다. 링크만으로 프로젝트룸 자료를 볼 수 없습니다.</span>
          </div>
        ) : null}

        <div className={styles.accessGrid} aria-label="수락 후 접근 가능 항목">
          {accessPreview.map((item) => (
            <article className={styles.accessCard} key={item.label}>
              <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.actions} aria-label="초대 응답">
          <Button disabled={!canRespond} icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            초대 수락
          </Button>
          <Button disabled={!canRespond} icon={<XCircle size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            거절
          </Button>
        </div>
      </section>
    </GlassPanel>
  );
}
