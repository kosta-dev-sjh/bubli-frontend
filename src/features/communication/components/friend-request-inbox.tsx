"use client";

import { Ban, Clock3, MessageCircle, Search, ShieldCheck, UserCheck, UserPlus, UserX } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./friend-request-inbox.module.css";

type FriendRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED";
type FriendshipStatus = "ACCEPTED" | "BLOCKED";

type FriendRequest = {
  bubliId: string;
  displayNameKey: MessageKey;
  direction: "incoming" | "outgoing";
  id: string;
  messageKey: MessageKey;
  projectHintKey?: MessageKey;
  requestedAtKey: MessageKey;
  status: FriendRequestStatus;
};

type Friend = {
  bubliId: string;
  displayNameKey: MessageKey;
  lastSeenKey: MessageKey;
  projectHintKey: MessageKey;
  status: FriendshipStatus;
};

const incomingRequests: FriendRequest[] = [
  {
    bubliId: "miyeon",
    direction: "incoming",
    displayNameKey: "chat.requestInbox.in1Name",
    id: "request-1",
    messageKey: "chat.requestInbox.in1Message",
    projectHintKey: "chat.requestInbox.in1Project",
    requestedAtKey: "chat.requestInbox.in1RequestedAt",
    status: "PENDING",
  },
  {
    bubliId: "junhwa",
    direction: "incoming",
    displayNameKey: "chat.requestInbox.in2Name",
    id: "request-2",
    messageKey: "chat.requestInbox.in2Message",
    projectHintKey: "chat.requestInbox.in2Project",
    requestedAtKey: "chat.requestInbox.in2RequestedAt",
    status: "PENDING",
  },
];

const outgoingRequests: FriendRequest[] = [
  {
    bubliId: "jihyun",
    direction: "outgoing",
    displayNameKey: "chat.requestInbox.out1Name",
    id: "request-3",
    messageKey: "chat.requestInbox.out1Message",
    requestedAtKey: "chat.requestInbox.out1RequestedAt",
    status: "PENDING",
  },
  {
    bubliId: "seoyeon",
    direction: "outgoing",
    displayNameKey: "chat.requestInbox.out2Name",
    id: "request-4",
    messageKey: "chat.requestInbox.out2Message",
    requestedAtKey: "chat.requestInbox.out2RequestedAt",
    status: "ACCEPTED",
  },
];

const acceptedFriends: Friend[] = [
  {
    bubliId: "damin",
    displayNameKey: "chat.requestInbox.friend1Name",
    lastSeenKey: "chat.requestInbox.friend1Seen",
    projectHintKey: "chat.requestInbox.friend1Project",
    status: "ACCEPTED",
  },
  {
    bubliId: "taewoo",
    displayNameKey: "chat.requestInbox.friend2Name",
    lastSeenKey: "chat.requestInbox.friend2Seen",
    projectHintKey: "chat.requestInbox.friend2Project",
    status: "ACCEPTED",
  },
  {
    bubliId: "blocked-user",
    displayNameKey: "chat.requestInbox.friend3Name",
    lastSeenKey: "chat.requestInbox.friend3Seen",
    projectHintKey: "chat.requestInbox.friend3Project",
    status: "BLOCKED",
  },
];

const statusLabelKey: Record<FriendRequestStatus, MessageKey> = {
  ACCEPTED: "chat.requestInbox.statusAccepted",
  CANCELED: "chat.requestInbox.statusCanceled",
  PENDING: "chat.requestInbox.statusPending",
  REJECTED: "chat.requestInbox.statusRejected",
};

export function FriendRequestInbox() {
  const { t } = useI18n();
  const pendingIncomingCount = incomingRequests.filter((request) => request.status === "PENDING").length;
  const inviteReadyCount = acceptedFriends.filter((friend) => friend.status === "ACCEPTED").length;

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>{t("chat.requestInbox.chip")}</Chip>
          <h2 className={styles.title}>{t("chat.requestInbox.title")}</h2>
          <p className={styles.description}>
            {t("chat.requestInbox.description")}
          </p>
        </div>
        <Button icon={<Search size={16} />} size="sm" variant="quiet">
          {t("chat.requestInbox.search")}
        </Button>
      </header>

      <div className={styles.summaryGrid} aria-label={t("chat.requestInbox.summaryAria")}>
        <SummaryCard icon={<Clock3 size={18} />} label={t("chat.requestInbox.summaryReceived")} value={t("chat.requestInbox.summaryReceivedValue", { count: pendingIncomingCount })} />
        <SummaryCard icon={<UserCheck size={18} />} label={t("chat.requestInbox.summaryInvitable")} value={t("chat.requestInbox.summaryInvitableValue", { count: inviteReadyCount })} />
        <SummaryCard icon={<ShieldCheck size={18} />} label={t("chat.requestInbox.summaryPermission")} value={t("chat.requestInbox.summaryPermissionValue")} />
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.section} aria-labelledby="incoming-friend-requests">
          <div className={styles.sectionHeader}>
            <h3 id="incoming-friend-requests">{t("chat.requestInbox.incomingTitle")}</h3>
            <StatusBadge tone="pending">{t("chat.requestInbox.incomingBadge")}</StatusBadge>
          </div>
          <div className={styles.requestList}>
            {incomingRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="accepted-friends">
          <div className={styles.sectionHeader}>
            <h3 id="accepted-friends">{t("chat.requestInbox.friendsTitle")}</h3>
            <StatusBadge tone="success">{t("chat.requestInbox.friendsBadge")}</StatusBadge>
          </div>
          <div className={styles.friendList}>
            {acceptedFriends.map((friend) => (
              <FriendRow friend={friend} key={friend.bubliId} />
            ))}
          </div>
        </section>
      </div>

      <section className={styles.outgoingSection} aria-labelledby="outgoing-friend-requests">
        <div className={styles.sectionHeader}>
          <h3 id="outgoing-friend-requests">{t("chat.requestInbox.outgoingTitle")}</h3>
          <span className={styles.helperText}>{t("chat.requestInbox.outgoingHelper")}</span>
        </div>
        <div className={styles.outgoingList}>
          {outgoingRequests.map((request) => (
            <OutgoingRequestRow key={request.id} request={request} />
          ))}
        </div>
      </section>
    </GlassPanel>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.summaryLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RequestCard({ request }: { request: FriendRequest }) {
  const { t } = useI18n();

  return (
    <article className={styles.requestCard}>
      <div className={styles.personLine}>
        <Avatar name={t(request.displayNameKey)} />
        <div>
          <strong>{t(request.displayNameKey)}</strong>
          <span>@{request.bubliId}</span>
        </div>
        <StatusBadge tone="pending">{t(statusLabelKey[request.status])}</StatusBadge>
      </div>
      <p className={styles.message}>{t(request.messageKey)}</p>
      <div className={styles.metaLine}>
        <span>{t(request.requestedAtKey)}</span>
        {request.projectHintKey ? <span>{t(request.projectHintKey)}</span> : null}
      </div>
      <div className={styles.actionRow}>
        <Button icon={<UserCheck size={15} />} size="sm" variant="primary">
          {t("chat.requestInbox.accept")}
        </Button>
        <Button icon={<UserX size={15} />} size="sm" variant="quiet">
          {t("chat.requestInbox.reject")}
        </Button>
        <Button icon={<Ban size={15} />} size="sm" variant="ghost">
          {t("chat.requestInbox.block")}
        </Button>
      </div>
    </article>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const { t } = useI18n();
  const isBlocked = friend.status === "BLOCKED";

  return (
    <article className={cn(styles.friendRow, isBlocked && styles.friendRowBlocked)}>
      <Avatar name={t(friend.displayNameKey)} muted={isBlocked} />
      <div className={styles.friendInfo}>
        <strong>{t(friend.displayNameKey)}</strong>
        <span>
          @{friend.bubliId} · {t(friend.projectHintKey)}
        </span>
      </div>
      <span className={styles.friendSeen}>{t(friend.lastSeenKey)}</span>
      {isBlocked ? (
        <StatusBadge tone="warning">{t("chat.requestInbox.inviteExcluded")}</StatusBadge>
      ) : (
        <div className={styles.friendActions}>
          <Button icon={<MessageCircle size={15} />} size="sm" variant="quiet">
            {t("chat.requestInbox.directChat")}
          </Button>
          <Button icon={<UserPlus size={15} />} size="sm" variant="secondary">
            {t("chat.requestInbox.roomInvite")}
          </Button>
        </div>
      )}
    </article>
  );
}

function OutgoingRequestRow({ request }: { request: FriendRequest }) {
  const { t } = useI18n();
  const pending = request.status === "PENDING";

  return (
    <article className={styles.outgoingRow}>
      <div>
        <strong>{t(request.displayNameKey)}</strong>
        <span>
          @{request.bubliId} · {t(request.requestedAtKey)}
        </span>
      </div>
      <StatusBadge tone={pending ? "pending" : "success"}>{t(statusLabelKey[request.status])}</StatusBadge>
      {pending ? (
        <Button size="sm" variant="ghost">
          {t("chat.requestInbox.cancelRequest")}
        </Button>
      ) : (
        <Button icon={<MessageCircle size={15} />} size="sm" variant="quiet">
          {t("chat.requestInbox.directChat")}
        </Button>
      )}
    </article>
  );
}

function Avatar({ muted = false, name }: { muted?: boolean; name: string }) {
  return (
    <span className={cn(styles.avatar, muted && styles.avatarMuted)} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}
