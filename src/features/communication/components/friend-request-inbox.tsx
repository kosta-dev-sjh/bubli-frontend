import { Ban, Clock3, MessageCircle, Search, ShieldCheck, UserCheck, UserPlus, UserX } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

import styles from "./friend-request-inbox.module.css";

type FriendRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED";
type FriendshipStatus = "ACCEPTED" | "BLOCKED";

type FriendRequest = {
  bubliId: string;
  displayName: string;
  direction: "incoming" | "outgoing";
  id: string;
  message: string;
  projectHint?: string;
  requestedAt: string;
  status: FriendRequestStatus;
};

type Friend = {
  bubliId: string;
  displayName: string;
  lastSeenLabel: string;
  projectHint: string;
  status: FriendshipStatus;
};

const incomingRequests: FriendRequest[] = [
  {
    bubliId: "miyeon",
    direction: "incoming",
    displayName: "김미연",
    id: "request-1",
    message: "신규 홈페이지 프로젝트룸에 초대하려고 친구 요청을 보냈어요.",
    projectHint: "신규 홈페이지 리뉴얼",
    requestedAt: "10분 전",
    status: "PENDING",
  },
  {
    bubliId: "junhwa",
    direction: "incoming",
    displayName: "홍준화",
    id: "request-2",
    message: "1:1 채팅으로 API 계약을 맞춰보고 싶어요.",
    projectHint: "API 계약 정리",
    requestedAt: "35분 전",
    status: "PENDING",
  },
];

const outgoingRequests: FriendRequest[] = [
  {
    bubliId: "jihyun",
    direction: "outgoing",
    displayName: "박지현",
    id: "request-3",
    message: "디자인 보드 피드백을 같이 보려고 요청을 보냈습니다.",
    requestedAt: "오늘 09:42",
    status: "PENDING",
  },
  {
    bubliId: "seoyeon",
    direction: "outgoing",
    displayName: "이서연",
    id: "request-4",
    message: "이미 처리된 요청입니다.",
    requestedAt: "어제",
    status: "ACCEPTED",
  },
];

const acceptedFriends: Friend[] = [
  {
    bubliId: "damin",
    displayName: "정다민",
    lastSeenLabel: "방금 전",
    projectHint: "Bubli 발표 자료",
    status: "ACCEPTED",
  },
  {
    bubliId: "taewoo",
    displayName: "김태우",
    lastSeenLabel: "1시간 전",
    projectHint: "LiveKit 테스트",
    status: "ACCEPTED",
  },
  {
    bubliId: "blocked-user",
    displayName: "차단된 사용자",
    lastSeenLabel: "숨김",
    projectHint: "초대 대상 제외",
    status: "BLOCKED",
  },
];

const statusLabel: Record<FriendRequestStatus, string> = {
  ACCEPTED: "수락됨",
  CANCELED: "취소됨",
  PENDING: "대기 중",
  REJECTED: "거절됨",
};

export function FriendRequestInbox() {
  const pendingIncomingCount = incomingRequests.filter((request) => request.status === "PENDING").length;
  const inviteReadyCount = acceptedFriends.filter((friend) => friend.status === "ACCEPTED").length;

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>소통</Chip>
          <h2 className={styles.title}>친구 요청함</h2>
          <p className={styles.description}>
            Bubli ID로 받은 친구 요청을 확인하고, 수락된 친구만 1:1 채팅과 프로젝트룸 초대 대상에 표시합니다.
          </p>
        </div>
        <Button icon={<Search size={16} />} size="sm" variant="quiet">
          Bubli ID 검색
        </Button>
      </header>

      <div className={styles.summaryGrid} aria-label="친구 요청 요약">
        <SummaryCard icon={<Clock3 size={18} />} label="받은 요청" value={`${pendingIncomingCount}건`} />
        <SummaryCard icon={<UserCheck size={18} />} label="초대 가능 친구" value={`${inviteReadyCount}명`} />
        <SummaryCard icon={<ShieldCheck size={18} />} label="권한 기준" value="친구 수락 후" />
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.section} aria-labelledby="incoming-friend-requests">
          <div className={styles.sectionHeader}>
            <h3 id="incoming-friend-requests">받은 요청</h3>
            <StatusBadge tone="pending">검토 필요</StatusBadge>
          </div>
          <div className={styles.requestList}>
            {incomingRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="accepted-friends">
          <div className={styles.sectionHeader}>
            <h3 id="accepted-friends">친구 목록</h3>
            <StatusBadge tone="success">초대 가능</StatusBadge>
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
          <h3 id="outgoing-friend-requests">보낸 요청</h3>
          <span className={styles.helperText}>상대가 수락하면 친구 목록에 표시됩니다.</span>
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
  return (
    <article className={styles.requestCard}>
      <div className={styles.personLine}>
        <Avatar name={request.displayName} />
        <div>
          <strong>{request.displayName}</strong>
          <span>@{request.bubliId}</span>
        </div>
        <StatusBadge tone="pending">{statusLabel[request.status]}</StatusBadge>
      </div>
      <p className={styles.message}>{request.message}</p>
      <div className={styles.metaLine}>
        <span>{request.requestedAt}</span>
        {request.projectHint ? <span>{request.projectHint}</span> : null}
      </div>
      <div className={styles.actionRow}>
        <Button icon={<UserCheck size={15} />} size="sm" variant="primary">
          수락
        </Button>
        <Button icon={<UserX size={15} />} size="sm" variant="quiet">
          거절
        </Button>
        <Button icon={<Ban size={15} />} size="sm" variant="ghost">
          차단
        </Button>
      </div>
    </article>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const isBlocked = friend.status === "BLOCKED";

  return (
    <article className={cn(styles.friendRow, isBlocked && styles.friendRowBlocked)}>
      <Avatar name={friend.displayName} muted={isBlocked} />
      <div className={styles.friendInfo}>
        <strong>{friend.displayName}</strong>
        <span>
          @{friend.bubliId} · {friend.projectHint}
        </span>
      </div>
      <span className={styles.friendSeen}>{friend.lastSeenLabel}</span>
      {isBlocked ? (
        <StatusBadge tone="warning">초대 제외</StatusBadge>
      ) : (
        <div className={styles.friendActions}>
          <Button icon={<MessageCircle size={15} />} size="sm" variant="quiet">
            1:1 채팅
          </Button>
          <Button icon={<UserPlus size={15} />} size="sm" variant="secondary">
            프로젝트룸 초대
          </Button>
        </div>
      )}
    </article>
  );
}

function OutgoingRequestRow({ request }: { request: FriendRequest }) {
  const pending = request.status === "PENDING";

  return (
    <article className={styles.outgoingRow}>
      <div>
        <strong>{request.displayName}</strong>
        <span>
          @{request.bubliId} · {request.requestedAt}
        </span>
      </div>
      <StatusBadge tone={pending ? "pending" : "success"}>{statusLabel[request.status]}</StatusBadge>
      {pending ? (
        <Button size="sm" variant="ghost">
          요청 취소
        </Button>
      ) : (
        <Button icon={<MessageCircle size={15} />} size="sm" variant="quiet">
          1:1 채팅
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
