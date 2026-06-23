import type { ReactNode } from "react";

import {
  Clock3,
  Copy,
  KeyRound,
  Link2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./project-room-invite-flow.module.css";

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "ACTIVE" | "LIMITED";

type InviteMethod = {
  api: string;
  description: string;
  expiry: string;
  icon: ReactNode;
  id: string;
  scope: string[];
  status: InviteStatus;
  title: string;
};

const methods: InviteMethod[] = [
  {
    api: "POST /api/project-rooms/{roomId}/invitations",
    description: "수락된 친구 목록에서 사용자를 골라 프로젝트룸 멤버로 초대합니다.",
    expiry: "기본 7일",
    icon: <UsersRound size={18} strokeWidth={2.1} />,
    id: "friend-invite",
    scope: ["room_members 생성", "자료/WBS/TODO 접근", "프로젝트룸 알림"],
    status: "PENDING",
    title: "친구 초대",
  },
  {
    api: "POST /api/project-rooms/{roomId}/invite-links",
    description: "아직 친구가 아닌 로그인 사용자에게 만료 시간이 있는 초대 URL을 보냅니다.",
    expiry: "기본 7일",
    icon: <Link2 size={18} strokeWidth={2.1} />,
    id: "member-link",
    scope: ["로그인 후 수락", "token_hash 저장", "수락 후 멤버 권한"],
    status: "ACCEPTED",
    title: "링크 초대",
  },
  {
    api: "POST /api/project-rooms/{roomId}/guest-sessions",
    description: "가입하지 않은 외부 참여자가 임시 이름으로 소통에만 들어오는 링크입니다.",
    expiry: "기본 2시간",
    icon: <MessageCircle size={18} strokeWidth={2.1} />,
    id: "guest-session",
    scope: ["채팅", "보이스챗", "자료/WBS/TODO 제외"],
    status: "LIMITED",
    title: "게스트 참여",
  },
];

const statusMeta: Record<InviteStatus, { label: string; tone: "pending" | "success" | "warning" | "communication" }> = {
  ACCEPTED: { label: "수락됨", tone: "success" },
  ACTIVE: { label: "활성", tone: "communication" },
  EXPIRED: { label: "만료", tone: "warning" },
  LIMITED: { label: "제한 접근", tone: "warning" },
  PENDING: { label: "대기", tone: "pending" },
};

function InviteMethodCard({ method }: { method: InviteMethod }) {
  const status = statusMeta[method.status];

  return (
    <article className={styles.methodCard}>
      <div className={styles.methodHead}>
        <span className="bubli-icon-tile" aria-hidden="true">
          {method.icon}
        </span>
        <div>
          <div className={styles.meta}>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <span>{method.expiry}</span>
          </div>
          <h3>{method.title}</h3>
          <p>{method.description}</p>
        </div>
      </div>
      <code>{method.api}</code>
      <div className={styles.scopeList}>
        {method.scope.map((scope) => (
          <Chip key={scope}>{scope}</Chip>
        ))}
      </div>
    </article>
  );
}

export function ProjectRoomInviteFlow() {
  return (
    <section className={styles.panel} aria-label="프로젝트룸 초대 흐름">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<UserPlus size={14} />} selected>
            프로젝트룸 초대
          </Chip>
          <h2>프로젝트룸 초대는 친구, 링크, 게스트 참여를 분리해서 관리합니다</h2>
          <p>
            프로젝트 리더는 친구를 바로 초대하거나 로그인 사용자용 초대 링크를 만들 수 있습니다. 비회원 게스트는
            프로젝트룸 멤버가 아니며, 채팅과 보이스챗에만 잠깐 참여합니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="room">프로젝트 리더 권한</StatusBadge>
          <strong>3</strong>
          <span>초대 방식</span>
        </div>
      </GlassPanel>

      <div className={styles.methodGrid}>
        {methods.map((method) => (
          <InviteMethodCard key={method.id} method={method} />
        ))}
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.acceptPanel}>
          <h3>수락 후 권한 생성</h3>
          <div className={styles.timeline}>
            <article>
              <span aria-hidden="true">
                <KeyRound size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>초대 생성</strong>
                <p>친구 초대는 invitee_user_id를, 링크 초대는 token_hash와 expires_at을 저장합니다.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <UserCheck size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>로그인 후 수락</strong>
                <p>링크를 받은 사용자는 로그인한 뒤 수락해야 room_members가 생성됩니다.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <ShieldCheck size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>접근 권한 적용</strong>
                <p>수락 뒤에만 자료, WBS/TODO, 일정, 프로젝트룸 알림 접근 권한이 생깁니다.</p>
              </div>
            </article>
          </div>
        </GlassPanel>

        <GlassPanel className={styles.guestPanel}>
          <h3>게스트 제한</h3>
          <p>게스트 세션은 room_members에 들어가지 않고 소통용 접근 기록만 남깁니다.</p>
          <div className={styles.guestAccess}>
            <Chip icon={<MessageCircle size={14} />} selected>
              채팅 가능
            </Chip>
            <Chip icon={<Video size={14} />} selected>
              보이스 가능
            </Chip>
            <Chip icon={<LockKeyhole size={14} />}>자료 제외</Chip>
            <Chip icon={<Clock3 size={14} />}>2시간 만료</Chip>
          </div>
          <Button icon={<Copy size={15} />} size="sm" variant="quiet">
            게스트 링크 복사
          </Button>
        </GlassPanel>
      </div>
    </section>
  );
}
