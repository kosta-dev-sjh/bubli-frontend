"use client";

import { Archive, Bell, BellDot, CheckCheck, Eye, MessageCircle, Radio, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./chat-read-state-panel.module.css";

type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

type ReadRoom = {
  id: string;
  lastReadKey: MessageKey;
  lastSequence: number;
  roomTitleKey: MessageKey;
  unreadCount: number;
};

type NotificationItem = {
  id: string;
  sourceKey: MessageKey;
  status: NotificationStatus;
  titleKey: MessageKey;
  updatedKey: MessageKey;
};

const readRooms: ReadRoom[] = [
  {
    id: "read-room-1",
    lastReadKey: "chat.readPanel.room1LastRead",
    lastSequence: 128,
    roomTitleKey: "chat.readPanel.room1Title",
    unreadCount: 3,
  },
  {
    id: "read-room-2",
    lastReadKey: "chat.readPanel.room2LastRead",
    lastSequence: 41,
    roomTitleKey: "chat.readPanel.room2Title",
    unreadCount: 0,
  },
  {
    id: "read-room-3",
    lastReadKey: "chat.readPanel.room3LastRead",
    lastSequence: 77,
    roomTitleKey: "chat.readPanel.room3Title",
    unreadCount: 6,
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notice-1",
    sourceKey: "chat.readPanel.notice1Source",
    status: "UNREAD",
    titleKey: "chat.readPanel.notice1Title",
    updatedKey: "chat.readPanel.notice1Updated",
  },
  {
    id: "notice-2",
    sourceKey: "chat.readPanel.notice2Source",
    status: "READ",
    titleKey: "chat.readPanel.notice2Title",
    updatedKey: "chat.readPanel.notice2Updated",
  },
  {
    id: "notice-3",
    sourceKey: "chat.readPanel.notice3Source",
    status: "ARCHIVED",
    titleKey: "chat.readPanel.notice3Title",
    updatedKey: "chat.readPanel.notice3Updated",
  },
];

const notificationTone: Record<NotificationStatus, "pending" | "success" | "neutral"> = {
  ARCHIVED: "neutral",
  READ: "success",
  UNREAD: "pending",
};

const notificationStatusLabelKey: Record<NotificationStatus, MessageKey> = {
  ARCHIVED: "chat.readPanel.status.archived",
  READ: "chat.readPanel.status.read",
  UNREAD: "chat.readPanel.status.unread",
};

export function ChatReadStatePanel() {
  const { t } = useI18n();
  const totalUnread = readRooms.reduce((sum, room) => sum + room.unreadCount, 0);

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>{t("chat.readPanel.chip")}</Chip>
          <h2 className={styles.title}>{t("chat.readPanel.title")}</h2>
          <p className={styles.description}>
            {t("chat.readPanel.description")}
          </p>
        </div>
        <Button icon={<CheckCheck size={16} />} size="sm" variant="primary">
          {t("chat.readPanel.markRead")}
        </Button>
      </header>

      <div className={styles.summaryGrid} aria-label={t("chat.readPanel.summaryAria")}>
        <SummaryCard icon={<BellDot size={18} />} label={t("chat.readPanel.summaryUnread")} value={t("chat.readPanel.summaryUnreadValue", { count: totalUnread })} />
        <SummaryCard icon={<Eye size={18} />} label={t("chat.readPanel.summaryBasis")} value={t("chat.readPanel.summaryBasisValue")} />
        <SummaryCard icon={<Radio size={18} />} label={t("chat.readPanel.summaryPath")} value={t("chat.readPanel.summaryPathValue")} />
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.section} aria-labelledby="read-room-title">
          <div className={styles.sectionHeader}>
            <h3 id="read-room-title">{t("chat.readPanel.roomSectionTitle")}</h3>
            <span>{t("chat.readPanel.roomSectionSubtitle")}</span>
          </div>
          <div className={styles.roomList}>
            {readRooms.map((room) => (
              <ReadRoomRow key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="notification-state-title">
          <div className={styles.sectionHeader}>
            <h3 id="notification-state-title">{t("chat.readPanel.noticeSectionTitle")}</h3>
            <span>{t("chat.readPanel.noticeSectionSubtitle")}</span>
          </div>
          <div className={styles.noticeList}>
            {notifications.map((notice) => (
              <NotificationRow key={notice.id} notice={notice} />
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.policyBar}>
        <ShieldCheck size={17} />
        <span>{t("chat.readPanel.policy")}</span>
      </footer>
    </GlassPanel>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.summaryCard}>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ReadRoomRow({ room }: { room: ReadRoom }) {
  const { t } = useI18n();
  const hasUnread = room.unreadCount > 0;

  return (
    <article className={styles.roomRow}>
      <span className={styles.roomIcon} aria-hidden="true">
        <MessageCircle size={17} />
      </span>
      <div className={styles.roomMain}>
        <strong>{t(room.roomTitleKey)}</strong>
        <span>{t("chat.readPanel.lastReadMeta", { when: t(room.lastReadKey), sequence: room.lastSequence })}</span>
      </div>
      <StatusBadge tone={hasUnread ? "pending" : "success"}>{hasUnread ? t("chat.readPanel.unreadCount", { count: room.unreadCount }) : t("chat.readPanel.read")}</StatusBadge>
    </article>
  );
}

function NotificationRow({ notice }: { notice: NotificationItem }) {
  const { t } = useI18n();
  const icon = notice.status === "ARCHIVED" ? <Archive size={16} /> : notice.status === "READ" ? <CheckCheck size={16} /> : <Bell size={16} />;

  return (
    <article className={styles.noticeRow}>
      <span className={styles.noticeIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.noticeMain}>
        <strong>{t(notice.titleKey)}</strong>
        <span>
          {t(notice.sourceKey)} · {t(notice.updatedKey)}
        </span>
      </div>
      <StatusBadge tone={notificationTone[notice.status]}>{t(notificationStatusLabelKey[notice.status])}</StatusBadge>
    </article>
  );
}
