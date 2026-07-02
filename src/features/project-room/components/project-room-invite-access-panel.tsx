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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const friendStatusMeta: Record<FriendInviteStatus, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  FRIEND: { actionLabelKey: "room.inviteAccess.statusFriendAction", labelKey: "room.inviteAccess.statusFriendLabel", tone: "personal" },
  INVITED: { actionLabelKey: "room.inviteAccess.statusInvitedAction", labelKey: "room.inviteAccess.statusInvitedLabel", tone: "pending" },
  JOINED: { actionLabelKey: "room.inviteAccess.statusJoinedAction", labelKey: "room.inviteAccess.statusJoinedLabel", tone: "approved" },
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
    displayName: "팀 멤버",
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
  title,
  ...props
}: ProjectRoomInviteAccessPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("room.inviteAccess.defaultTitle");
  const invitedCount = friends.filter((friend) => friend.status === "INVITED").length;
  const joinedCount = friends.filter((friend) => friend.status === "JOINED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UserPlus size={16} strokeWidth={2.1} />}>{t("room.inviteAccess.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("room.inviteAccess.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("room.inviteAccess.targetRoom")}</span>
          <strong>{roomName}</strong>
          <StatusBadge tone="approved">{t("room.inviteAccess.joinedCount", { count: joinedCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.inviteGrid} aria-label={t("room.inviteAccess.gridAria")}>
        <article className={styles.inviteCard}>
          <div className={styles.cardTop}>
            <span className={styles.iconTile}>
              <UsersRound size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{t("room.inviteAccess.fromFriendsTitle")}</strong>
              <p>{t("room.inviteAccess.fromFriendsBody")}</p>
            </div>
            <StatusBadge tone="personal">{t("room.inviteAccess.defaultMethod")}</StatusBadge>
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
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                  <Button disabled={friend.status === "INVITED"} size="sm" variant="quiet">
                    {t(status.actionLabelKey)}
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
              <strong>{t("room.inviteAccess.limitTitle")}</strong>
              <p>{t("room.inviteAccess.limitBody")}</p>
            </div>
            <StatusBadge tone="warning">{t("room.inviteAccess.exclusionBadge")}</StatusBadge>
          </div>
          <div className={styles.linkBox}>
            <span>{t("room.inviteAccess.checkFriend")}</span>
            <Button icon={<UserPlus size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
              {t("room.inviteAccess.selectFriend")}
            </Button>
          </div>
          <div className={styles.statRow}>
            <span>{t("room.inviteAccess.invitedCount", { count: invitedCount })}</span>
            <span>{t("room.inviteAccess.joinedStat", { count: joinedCount })}</span>
          </div>
        </article>

      </section>

      <section className={styles.ruleGrid} aria-label={t("room.inviteAccess.ruleAria")}>
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
