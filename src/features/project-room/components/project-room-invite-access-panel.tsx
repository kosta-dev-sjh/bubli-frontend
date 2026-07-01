import {
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./project-room-invite-access-panel.module.css";

type FriendInviteStatus = "FRIEND" | "INVITED" | "JOINED";

type FriendInvite = {
  displayName: string;
  handle: string;
  lastSeenLabel: string;
  status: FriendInviteStatus;
};

type InviteRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ProjectRoomInviteAccessPanelProps = HTMLAttributes<HTMLElement> & {
  friends: FriendInvite[];
  roomName: string;
  rules: InviteRule[];
  title?: string;
};

const friendStatusMeta: Record<FriendInviteStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  FRIEND: { actionLabel: "초대", label: "친구", tone: "personal" },
  INVITED: { actionLabel: "대기", label: "초대 보냄", tone: "pending" },
  JOINED: { actionLabel: "보기", label: "참여 중", tone: "approved" },
};

export const defaultInviteFriends: FriendInvite[] = [
  {
    displayName: "김지현",
    handle: "jihyun.k",
    lastSeenLabel: "오늘 접속",
    status: "FRIEND",
  },
  {
    displayName: "이서연",
    handle: "seoyeon.lee",
    lastSeenLabel: "초대 확인 전",
    status: "INVITED",
  },
  {
    displayName: "멤버 B",
    handle: "minsu.park",
    lastSeenLabel: "어제 참여",
    status: "JOINED",
  },
];

export const defaultInviteRules: InviteRule[] = [
  {
    description: "프로젝트룸 초대는 친구 목록에서 불러오는 방식을 기본으로 둡니다.",
    label: "친구 기반 초대",
    tone: "personal",
  },
  {
    description: "친구 관계가 수락된 기존 회원만 프로젝트룸 초대 대상에 표시합니다.",
    label: "기존 회원만",
    tone: "room",
  },
  {
    description: "초대 수락 뒤에만 프로젝트룸 멤버 권한이 생기고 자료와 작업에 접근합니다.",
    label: "수락 후 권한",
    tone: "approved",
  },
];

export function ProjectRoomInviteAccessPanel({
  className,
  friends,
  roomName,
  rules,
  title = "프로젝트룸 초대",
  ...props
}: ProjectRoomInviteAccessPanelProps) {
  const invitedCount = friends.filter((friend) => friend.status === "INVITED").length;
  const joinedCount = friends.filter((friend) => friend.status === "JOINED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UserPlus size={16} strokeWidth={2.1} />}>친구 초대</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              프로젝트룸에는 수락된 친구 목록에서 기존 회원을 불러옵니다. 수락 뒤에만 멤버 권한이 생깁니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>대상 프로젝트룸</span>
          <strong>{roomName}</strong>
          <StatusBadge tone="approved">참여 {joinedCount}명</StatusBadge>
        </div>
      </header>

      <section className={styles.inviteGrid} aria-label="프로젝트룸 초대 방식">
        <article className={styles.inviteCard}>
          <div className={styles.cardTop}>
            <span className={styles.iconTile}>
              <UsersRound size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>친구 목록에서 초대</strong>
              <p>아이디로 추가한 친구를 프로젝트룸으로 불러옵니다.</p>
            </div>
            <StatusBadge tone="personal">기본 방식</StatusBadge>
          </div>
          <div className={styles.friendList}>
            {friends.map((friend) => {
              const status = friendStatusMeta[friend.status];

              return (
                <div className={styles.friendRow} key={friend.handle}>
                  <div>
                    <strong>{friend.displayName}</strong>
                    <span>
                      @{friend.handle} · {friend.lastSeenLabel}
                    </span>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  <Button disabled={friend.status === "INVITED"} size="sm" variant="quiet">
                    {status.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        </article>

        <article className={styles.inviteCard}>
          <div className={styles.cardTop}>
            <span className={styles.iconTile}>
              <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>초대 제한</strong>
              <p>친구가 아닌 사용자, 직접 주소 입력, 임시 참여는 프로젝트룸 초대에서 제외합니다.</p>
            </div>
            <StatusBadge tone="warning">제외 기준</StatusBadge>
          </div>
          <div className={styles.linkBox}>
            <span>친구 관계 확인 후 초대 요청 생성</span>
            <Button icon={<UserPlus size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
              친구 선택
            </Button>
          </div>
          <div className={styles.statRow}>
            <span>초대 대기 {invitedCount}명</span>
            <span>참여 중 {joinedCount}명</span>
          </div>
        </article>

      </section>

      <section className={styles.ruleGrid} aria-label="초대와 접근 기준">
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
