"use client";

import { MessageCircle, ShieldCheck, UserCheck, UserPlus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type FriendItem = {
  nameKey: MessageKey;
  handle: string;
  roleHintKey: MessageKey;
  status: "friend" | "pending" | "invited";
};

const friends: FriendItem[] = [
  {
    handle: "jihyun.kim",
    nameKey: "chat.friendInvite.friend1Name",
    roleHintKey: "chat.friendInvite.friend1Role",
    status: "friend",
  },
  {
    handle: "minsu.park",
    nameKey: "chat.friendInvite.friend2Name",
    roleHintKey: "chat.friendInvite.friend2Role",
    status: "invited",
  },
  {
    handle: "seoyeon.lee",
    nameKey: "chat.friendInvite.friend3Name",
    roleHintKey: "chat.friendInvite.friend3Role",
    status: "pending",
  },
];

const friendStatus: Record<FriendItem["status"], { labelKey: MessageKey; tone: "success" | "pending" | "room" }> = {
  friend: { labelKey: "chat.friendInvite.statusFriend", tone: "success" },
  invited: { labelKey: "chat.friendInvite.statusInvited", tone: "room" },
  pending: { labelKey: "chat.friendInvite.statusPending", tone: "pending" },
};

function FriendRow({ friend }: { friend: FriendItem }) {
  const { t } = useI18n();
  const status = friendStatus[friend.status];
  const name = t(friend.nameKey);

  return (
    <article className="friend-invite-row">
      <span className="friend-invite-row__avatar" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
      <div>
        <div className="friend-invite-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>@{friend.handle}</span>
        </div>
        <h3>{name}</h3>
        <p>{t(friend.roleHintKey)}</p>
      </div>
      <Button size="sm" variant={friend.status === "friend" ? "primary" : "quiet"}>
        {friend.status === "friend" ? t("chat.friendInvite.inviteAction") : t("chat.friendInvite.statusAction")}
      </Button>
    </article>
  );
}

export function FriendInvitePanel() {
  const { t } = useI18n();

  return (
    <section className="friend-invite" aria-label={t("chat.friendInvite.aria")}>
      <GlassPanel className="friend-invite__hero">
        <div className="friend-invite__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <UserPlus size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("chat.friendInvite.chip")}</Chip>
            <h2>{t("chat.friendInvite.heroTitle")}</h2>
            <p>
              {t("chat.friendInvite.heroBody")}
            </p>
          </div>
        </div>
        <div className="friend-invite__search">
          <span>{t("chat.friendInvite.searchHint")}</span>
          <strong>@bubli.user</strong>
          <Button icon={<UserPlus size={15} />} size="sm" variant="primary">
            {t("chat.friendInvite.sendRequest")}
          </Button>
        </div>
      </GlassPanel>

      <div className="friend-invite__grid">
        <GlassPanel className="friend-invite__panel">
          <div className="friend-invite__panel-header">
            <div>
              <h3>{t("chat.friendInvite.listTitle")}</h3>
              <p>{t("chat.friendInvite.listBody")}</p>
            </div>
            <Chip icon={<MessageCircle size={14} />}>{t("chat.friendInvite.directChip")}</Chip>
          </div>

          <div className="friend-invite__list">
            {friends.map((friend) => (
              <FriendRow friend={friend} key={friend.handle} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="friend-invite__policy">
          <h3>{t("chat.friendInvite.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>{t("chat.friendInvite.policy1")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UserCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("chat.friendInvite.policy2")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("chat.friendInvite.policy3")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
