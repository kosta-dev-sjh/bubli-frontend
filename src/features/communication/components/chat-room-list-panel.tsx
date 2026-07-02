"use client";

import { Bot, Database, MessageCircle, Radio, RefreshCcw, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./chat-room-list-panel.module.css";

type ChatRoomType = "PROJECT_ROOM" | "DIRECT";
type CacheStatus = "SERVER_ONLY" | "CACHE_VALID" | "CACHE_STALE";

type ChatRoomItem = {
  cacheStatus: CacheStatus;
  id: string;
  lastMessageKey: MessageKey;
  lastSequence?: number;
  memberCount: number;
  permissionKey: MessageKey;
  titleKey: MessageKey;
  type: ChatRoomType;
  unreadCount: number;
  updatedKey: MessageKey;
};

const chatRooms: ChatRoomItem[] = [
  {
    cacheStatus: "CACHE_VALID",
    id: "room-chat-1",
    lastMessageKey: "chat.roomListPanel.room1LastMessage",
    lastSequence: 128,
    memberCount: 5,
    permissionKey: "chat.roomListPanel.room1Permission",
    titleKey: "chat.roomListPanel.room1Title",
    type: "PROJECT_ROOM",
    unreadCount: 3,
    updatedKey: "chat.roomListPanel.room1Updated",
  },
  {
    cacheStatus: "SERVER_ONLY",
    id: "direct-chat-1",
    lastMessageKey: "chat.roomListPanel.room2LastMessage",
    memberCount: 2,
    permissionKey: "chat.roomListPanel.room2Permission",
    titleKey: "chat.roomListPanel.room2Title",
    type: "DIRECT",
    unreadCount: 0,
    updatedKey: "chat.roomListPanel.room2Updated",
  },
  {
    cacheStatus: "CACHE_STALE",
    id: "room-chat-2",
    lastMessageKey: "chat.roomListPanel.room3LastMessage",
    lastSequence: 42,
    memberCount: 3,
    permissionKey: "chat.roomListPanel.room3Permission",
    titleKey: "chat.roomListPanel.room3Title",
    type: "PROJECT_ROOM",
    unreadCount: 1,
    updatedKey: "chat.roomListPanel.room3Updated",
  },
];

const roomTypeCopy: Record<ChatRoomType, { icon: ReactNode; labelKey: MessageKey; tone: "communication" | "room" }> = {
  DIRECT: { icon: <UserRound size={16} />, labelKey: "chat.roomListPanel.typeDirect", tone: "communication" },
  PROJECT_ROOM: { icon: <UsersRound size={16} />, labelKey: "chat.roomListPanel.typeRoom", tone: "room" },
};

const cacheCopy: Record<CacheStatus, { labelKey: MessageKey; tone: "neutral" | "pending" | "success" }> = {
  CACHE_STALE: { labelKey: "chat.roomListPanel.cacheStale", tone: "pending" },
  CACHE_VALID: { labelKey: "chat.roomListPanel.cacheValid", tone: "success" },
  SERVER_ONLY: { labelKey: "chat.roomListPanel.cacheServerOnly", tone: "neutral" },
};

export function ChatRoomListPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>{t("chat.roomListPanel.chip")}</Chip>
          <h2 className={styles.title}>{t("chat.roomListPanel.title")}</h2>
          <p className={styles.description}>
            {t("chat.roomListPanel.description")}
          </p>
        </div>
        <Button icon={<RefreshCcw size={16} />} size="sm" variant="quiet">
          {t("chat.roomListPanel.refresh")}
        </Button>
      </header>

      <div className={styles.policyGrid} aria-label={t("chat.roomListPanel.policyAria")}>
        <PolicyCard icon={<Database size={17} />} label={t("chat.roomListPanel.policySourceLabel")} value={t("chat.roomListPanel.policySourceValue")} />
        <PolicyCard icon={<Radio size={17} />} label={t("chat.roomListPanel.policyDeliverLabel")} value={t("chat.roomListPanel.policyDeliverValue")} />
        <PolicyCard icon={<ShieldCheck size={17} />} label={t("chat.roomListPanel.policyPermissionLabel")} value={t("chat.roomListPanel.policyPermissionValue")} />
        <PolicyCard icon={<Bot size={17} />} label={t("chat.roomListPanel.policyAgentLabel")} value={t("chat.roomListPanel.policyAgentValue")} />
      </div>

      <section className={styles.roomSection} aria-labelledby="chat-room-list-title">
        <div className={styles.sectionHeader}>
          <h3 id="chat-room-list-title">{t("chat.roomListPanel.sectionTitle")}</h3>
          <span>{t("chat.roomListPanel.sectionSubtitle")}</span>
        </div>
        <div className={styles.roomList}>
          {chatRooms.map((room) => (
            <ChatRoomRow key={room.id} room={room} />
          ))}
        </div>
      </section>
    </GlassPanel>
  );
}

function PolicyCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.policyCard}>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ChatRoomRow({ room }: { room: ChatRoomItem }) {
  const { t } = useI18n();
  const roomType = roomTypeCopy[room.type];
  const cache = cacheCopy[room.cacheStatus];

  return (
    <article className={cn(styles.roomRow)}>
      <span className={styles.roomIcon} aria-hidden="true">
        {roomType.icon}
      </span>
      <div className={styles.roomMain}>
        <div className={styles.roomTitleLine}>
          <strong>{t(room.titleKey)}</strong>
          <StatusBadge tone={roomType.tone}>{t(roomType.labelKey)}</StatusBadge>
          {room.unreadCount > 0 ? <span className={styles.unread}>{room.unreadCount}</span> : null}
        </div>
        <p>{t(room.lastMessageKey)}</p>
        <div className={styles.metaLine}>
          <span>{t(room.permissionKey)}</span>
          <span>{t("chat.roomListPanel.members", { count: room.memberCount })}</span>
          <span>{t(room.updatedKey)}</span>
          {room.lastSequence ? <span>{t("chat.roomListPanel.lastBasis", { sequence: room.lastSequence })}</span> : null}
        </div>
      </div>
      <div className={styles.sideActions}>
        <StatusBadge tone={cache.tone}>{t(cache.labelKey)}</StatusBadge>
        <Button icon={<MessageCircle size={15} />} size="sm" variant="primary">
          {t("chat.roomListPanel.open")}
        </Button>
      </div>
    </article>
  );
}
