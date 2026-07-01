import { Bot, Database, MessageCircle, Radio, RefreshCcw, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

import styles from "./chat-room-list-panel.module.css";

type ChatRoomType = "PROJECT_ROOM" | "DIRECT";
type CacheStatus = "SERVER_ONLY" | "CACHE_VALID" | "CACHE_STALE";

type ChatRoomItem = {
  cacheStatus: CacheStatus;
  id: string;
  lastMessage: string;
  lastSequence?: number;
  memberCount: number;
  permissionLabel: string;
  title: string;
  type: ChatRoomType;
  unreadCount: number;
  updatedAt: string;
};

const chatRooms: ChatRoomItem[] = [
  {
    cacheStatus: "CACHE_VALID",
    id: "room-chat-1",
    lastMessage: "업무 기준 문서 납품일과 회의록 일정이 달라요. /bubli 질문으로 정리해볼게요.",
    lastSequence: 128,
    memberCount: 5,
    permissionLabel: "프로젝트룸 멤버",
    title: "K-Stay 프로젝트룸 채팅",
    type: "PROJECT_ROOM",
    unreadCount: 3,
    updatedAt: "방금 전",
  },
  {
    cacheStatus: "SERVER_ONLY",
    id: "direct-chat-1",
    lastMessage: "API 기준 문서에서 인증 응답 형태만 더 맞추면 될 것 같아요.",
    memberCount: 2,
    permissionLabel: "친구",
    title: "김팀원 B과 1:1 채팅",
    type: "DIRECT",
    unreadCount: 0,
    updatedAt: "12분 전",
  },
  {
    cacheStatus: "CACHE_STALE",
    id: "room-chat-2",
    lastMessage: "보이스 전에 WBS 누락 항목을 먼저 확인할게요.",
    lastSequence: 42,
    memberCount: 3,
    permissionLabel: "프로젝트룸 멤버",
    title: "Bubli 제품 고도화 채팅",
    type: "PROJECT_ROOM",
    unreadCount: 1,
    updatedAt: "35분 전",
  },
];

const roomTypeCopy: Record<ChatRoomType, { icon: ReactNode; label: string; tone: "communication" | "room" }> = {
  DIRECT: { icon: <UserRound size={16} />, label: "1:1", tone: "communication" },
  PROJECT_ROOM: { icon: <UsersRound size={16} />, label: "프로젝트룸", tone: "room" },
};

const cacheCopy: Record<CacheStatus, { label: string; tone: "neutral" | "pending" | "success" }> = {
  CACHE_STALE: { label: "최근 메시지 보충 필요", tone: "pending" },
  CACHE_VALID: { label: "최근 메시지 준비됨", tone: "success" },
  SERVER_ONLY: { label: "서버 원본", tone: "neutral" },
};

export function ChatRoomListPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>소통</Chip>
          <h2 className={styles.title}>채팅방 목록</h2>
          <p className={styles.description}>
            1:1 채팅은 친구 관계를, 프로젝트룸 채팅은 멤버 권한을 기준으로 열립니다.
          </p>
        </div>
        <Button icon={<RefreshCcw size={16} />} size="sm" variant="quiet">
          최근 메시지 보충
        </Button>
      </header>

      <div className={styles.policyGrid} aria-label="채팅 저장 정책">
        <PolicyCard icon={<Database size={17} />} label="원본" value="서버 메시지" />
        <PolicyCard icon={<Radio size={17} />} label="전달" value="실시간 연결" />
        <PolicyCard icon={<ShieldCheck size={17} />} label="권한" value="친구/멤버" />
        <PolicyCard icon={<Bot size={17} />} label="에이전트" value="응답 메시지" />
      </div>

      <section className={styles.roomSection} aria-labelledby="chat-room-list-title">
        <div className={styles.sectionHeader}>
          <h3 id="chat-room-list-title">참여 중인 채팅</h3>
          <span>서버에 저장된 메시지만 전송 완료로 봅니다.</span>
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
  const roomType = roomTypeCopy[room.type];
  const cache = cacheCopy[room.cacheStatus];

  return (
    <article className={cn(styles.roomRow)}>
      <span className={styles.roomIcon} aria-hidden="true">
        {roomType.icon}
      </span>
      <div className={styles.roomMain}>
        <div className={styles.roomTitleLine}>
          <strong>{room.title}</strong>
          <StatusBadge tone={roomType.tone}>{roomType.label}</StatusBadge>
          {room.unreadCount > 0 ? <span className={styles.unread}>{room.unreadCount}</span> : null}
        </div>
        <p>{room.lastMessage}</p>
        <div className={styles.metaLine}>
          <span>{room.permissionLabel}</span>
          <span>{room.memberCount}명</span>
          <span>{room.updatedAt}</span>
          {room.lastSequence ? <span>최근 기준 {room.lastSequence}</span> : null}
        </div>
      </div>
      <div className={styles.sideActions}>
        <StatusBadge tone={cache.tone}>{cache.label}</StatusBadge>
        <Button icon={<MessageCircle size={15} />} size="sm" variant="primary">
          열기
        </Button>
      </div>
    </article>
  );
}
