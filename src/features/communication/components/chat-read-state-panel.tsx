import { Archive, Bell, BellDot, CheckCheck, Eye, MessageCircle, Radio, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./chat-read-state-panel.module.css";

type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

type ReadRoom = {
  id: string;
  lastReadAt: string;
  lastSequence: number;
  roomTitle: string;
  unreadCount: number;
};

type NotificationItem = {
  id: string;
  source: string;
  status: NotificationStatus;
  title: string;
  updatedAt: string;
};

const readRooms: ReadRoom[] = [
  {
    id: "read-room-1",
    lastReadAt: "오늘 10:32",
    lastSequence: 128,
    roomTitle: "K-Stay 프로젝트룸 채팅",
    unreadCount: 3,
  },
  {
    id: "read-room-2",
    lastReadAt: "오늘 09:58",
    lastSequence: 41,
    roomTitle: "김미연과 1:1 채팅",
    unreadCount: 0,
  },
  {
    id: "read-room-3",
    lastReadAt: "어제 18:20",
    lastSequence: 77,
    roomTitle: "자료 검토 프로젝트룸",
    unreadCount: 6,
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notice-1",
    source: "chat_messages",
    status: "UNREAD",
    title: "새 프로젝트룸 메시지 3개",
    updatedAt: "방금 전",
  },
  {
    id: "notice-2",
    source: "agent_jobs",
    status: "READ",
    title: "에이전트 정리 완료",
    updatedAt: "12분 전",
  },
  {
    id: "notice-3",
    source: "resource_versions",
    status: "ARCHIVED",
    title: "자료 새 버전 알림 보관",
    updatedAt: "어제",
  },
];

const notificationTone: Record<NotificationStatus, "pending" | "success" | "neutral"> = {
  ARCHIVED: "neutral",
  READ: "success",
  UNREAD: "pending",
};

export function ChatReadStatePanel() {
  const totalUnread = readRooms.reduce((sum, room) => sum + room.unreadCount, 0);

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>읽음 상태</Chip>
          <h2 className={styles.title}>채팅 읽음과 알림</h2>
          <p className={styles.description}>
            채팅방 읽음 처리는 사용자별로 저장합니다. 새 메시지 알림은 웹과 알림 버블에서 같은 서버 상태를 봅니다.
          </p>
        </div>
        <Button icon={<CheckCheck size={16} />} size="sm" variant="primary">
          현재 방 읽음 처리
        </Button>
      </header>

      <div className={styles.summaryGrid} aria-label="읽음 처리 요약">
        <SummaryCard icon={<BellDot size={18} />} label="읽지 않은 메시지" value={`${totalUnread}개`} />
        <SummaryCard icon={<Eye size={18} />} label="저장 위치" value="last_read_at" />
        <SummaryCard icon={<Radio size={18} />} label="전달 경로" value="/user/queue" />
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.section} aria-labelledby="read-room-title">
          <div className={styles.sectionHeader}>
            <h3 id="read-room-title">채팅방별 읽음 기준</h3>
            <span>room_sequence 이후 메시지를 읽지 않은 메시지로 봅니다.</span>
          </div>
          <div className={styles.roomList}>
            {readRooms.map((room) => (
              <ReadRoomRow key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="notification-state-title">
          <div className={styles.sectionHeader}>
            <h3 id="notification-state-title">알림 상태</h3>
            <span>알림 버블은 필요한 항목만 짧게 보여줍니다.</span>
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
        <span>읽음 상태와 알림 설정은 사용자별 설정입니다. 같은 프로젝트룸 멤버에게 영향을 주지 않습니다.</span>
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
  const hasUnread = room.unreadCount > 0;

  return (
    <article className={styles.roomRow}>
      <span className={styles.roomIcon} aria-hidden="true">
        <MessageCircle size={17} />
      </span>
      <div className={styles.roomMain}>
        <strong>{room.roomTitle}</strong>
        <span>
          마지막 읽음 {room.lastReadAt} · sequence {room.lastSequence}
        </span>
      </div>
      <StatusBadge tone={hasUnread ? "pending" : "success"}>{hasUnread ? `${room.unreadCount}개` : "읽음"}</StatusBadge>
    </article>
  );
}

function NotificationRow({ notice }: { notice: NotificationItem }) {
  const icon = notice.status === "ARCHIVED" ? <Archive size={16} /> : notice.status === "READ" ? <CheckCheck size={16} /> : <Bell size={16} />;

  return (
    <article className={styles.noticeRow}>
      <span className={styles.noticeIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.noticeMain}>
        <strong>{notice.title}</strong>
        <span>
          {notice.source} · {notice.updatedAt}
        </span>
      </div>
      <StatusBadge tone={notificationTone[notice.status]}>{notice.status}</StatusBadge>
    </article>
  );
}
