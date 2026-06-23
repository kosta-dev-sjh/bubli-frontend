import { CalendarClock, Copy, Link2, RotateCcw, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./project-room-invite-link-panel.module.css";

type InviteLinkStatus = "pending" | "accepted" | "expired" | "canceled";

type InviteLinkRecord = {
  acceptedByLabel?: string;
  createdByLabel: string;
  createdLabel: string;
  expiresLabel: string;
  roleLabel: "프로젝트 리더" | "멤버";
  status: InviteLinkStatus;
  urlPreview: string;
};

export type ProjectRoomInviteLinkPanelProps = HTMLAttributes<HTMLElement> & {
  activeLink?: InviteLinkRecord;
  projectRoomName: string;
  title?: string;
};

const statusMeta: Record<InviteLinkStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "대기", tone: "pending" },
  accepted: { label: "수락됨", tone: "success" },
  expired: { label: "만료됨", tone: "warning" },
  canceled: { label: "취소됨", tone: "neutral" },
};

export function ProjectRoomInviteLinkPanel({
  activeLink,
  className,
  projectRoomName,
  title = "프로젝트룸 초대 링크",
  ...props
}: ProjectRoomInviteLinkPanelProps) {
  const status = activeLink ? statusMeta[activeLink.status] : undefined;
  const isActive = activeLink?.status === "pending";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Link2 size={14} strokeWidth={2.1} />}>LINK invitation</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              아직 친구가 아닌 사람에게는 만료 시간이 있는 링크를 보냅니다. 링크를 받은 사람도 로그인 후 수락해야 프로젝트룸 멤버가 됩니다.
            </p>
          </div>
        </div>
        <div className={styles.roomCard}>
          <span>대상 프로젝트룸</span>
          <strong>{projectRoomName}</strong>
        </div>
      </header>

      <section className={styles.guardRail} aria-label="초대 링크 접근 기준">
        <span aria-hidden="true">
          <ShieldCheck size={18} strokeWidth={2.1} />
        </span>
        <p>
          링크만으로 자료, WBS/TODO, 일정에 접근할 수 없습니다. 수락 뒤 `room_members`가 생겨야 프로젝트룸 권한이 적용됩니다.
        </p>
      </section>

      {activeLink ? (
        <section className={styles.linkCard} aria-label="초대 링크 상태">
          <div className={styles.linkMain}>
            <div className={styles.linkIcon} aria-hidden="true">
              <Link2 size={22} strokeWidth={2.1} />
            </div>
            <div>
              <div className={styles.linkTitleRow}>
                <h3>{activeLink.urlPreview}</h3>
                {status ? <StatusBadge tone={status.tone}>{status.label}</StatusBadge> : null}
              </div>
              <p>원본 토큰은 화면에만 표시하고, 서버에는 token_hash와 만료 시간만 저장합니다.</p>
            </div>
          </div>

          <div className={styles.metaGrid}>
            <article>
              <CalendarClock size={16} strokeWidth={2.1} aria-hidden="true" />
              <span>만료</span>
              <strong>{activeLink.expiresLabel}</strong>
            </article>
            <article>
              <UserCheck size={16} strokeWidth={2.1} aria-hidden="true" />
              <span>초대 역할</span>
              <strong>{activeLink.roleLabel}</strong>
            </article>
            <article>
              <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
              <span>생성자</span>
              <strong>{activeLink.createdByLabel}</strong>
            </article>
            <article>
              <CalendarClock size={16} strokeWidth={2.1} aria-hidden="true" />
              <span>생성 시각</span>
              <strong>{activeLink.createdLabel}</strong>
            </article>
          </div>

          {activeLink.acceptedByLabel ? (
            <div className={styles.acceptedBox}>
              <UserCheck size={18} strokeWidth={2.1} aria-hidden="true" />
              <span>{activeLink.acceptedByLabel} 님이 이 링크로 수락했습니다.</span>
            </div>
          ) : null}

          <div className={styles.actions} aria-label="초대 링크 작업">
            <Button disabled={!isActive} icon={<Copy size={15} strokeWidth={2.1} />} size="sm" variant="primary">
              링크 복사
            </Button>
            <Button icon={<RotateCcw size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
              새로 만들기
            </Button>
            <Button disabled={!isActive} icon={<XCircle size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
              링크 취소
            </Button>
          </div>
        </section>
      ) : (
        <section className={styles.emptyState} aria-label="초대 링크 없음">
          <div className={styles.linkIcon} aria-hidden="true">
            <Link2 size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h3>활성 초대 링크가 없습니다</h3>
            <p>프로젝트 리더만 초대 링크를 만들 수 있습니다. 기본 만료 시간은 7일입니다.</p>
          </div>
          <Button icon={<Link2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            초대 링크 만들기
          </Button>
        </section>
      )}
    </GlassPanel>
  );
}
