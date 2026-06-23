import type { ReactNode } from "react";

import {
  Clock3,
  Copy,
  KeyRound,
  Link2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./project-room-invite-flow.module.css";

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

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
    api: "친구 목록에서 초대 요청",
    description: "수락된 친구 목록에서 사용자를 골라 프로젝트룸 멤버로 초대합니다.",
    expiry: "기본 7일",
    icon: <UsersRound size={18} strokeWidth={2.1} />,
    id: "friend-invite",
    scope: ["멤버 권한 생성", "자료/WBS/TODO 접근", "프로젝트룸 알림"],
    status: "PENDING",
    title: "친구 초대",
  },
  {
    api: "만료 시간이 있는 링크 생성",
    description: "아직 친구가 아닌 로그인 사용자에게 만료 시간이 있는 초대 URL을 보냅니다.",
    expiry: "기본 7일",
    icon: <Link2 size={18} strokeWidth={2.1} />,
    id: "member-link",
    scope: ["로그인 후 수락", "만료 링크 저장", "수락 후 멤버 권한"],
    status: "ACCEPTED",
    title: "링크 초대",
  },
];

const statusMeta: Record<InviteStatus, { label: string; tone: "pending" | "success" | "warning" }> = {
  ACCEPTED: { label: "수락됨", tone: "success" },
  EXPIRED: { label: "만료", tone: "warning" },
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
      <div className={styles.methodApi}>{method.api}</div>
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
          <h2>프로젝트룸 초대는 친구와 링크를 기준으로 관리합니다</h2>
          <p>
            프로젝트 리더는 친구를 바로 초대하거나 로그인 사용자용 초대 링크를 만들 수 있습니다. 수락 뒤에만
            프로젝트룸 멤버 권한이 생깁니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="room">프로젝트 리더 권한</StatusBadge>
          <strong>2</strong>
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
                <p>친구 초대는 초대받을 사용자를, 링크 초대는 만료 시간과 확인용 값을 저장합니다.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <UserCheck size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>로그인 후 수락</strong>
                <p>링크를 받은 사용자는 로그인한 뒤 수락해야 멤버 권한이 생깁니다.</p>
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

        <GlassPanel className={styles.linkPanel}>
          <h3>링크 관리 기준</h3>
          <p>초대 링크는 로그인 사용자의 입장 요청에만 사용하고, 수락 뒤 서버가 멤버 권한을 다시 확인합니다.</p>
          <div className={styles.linkAccess}>
            <Chip icon={<Link2 size={14} />} selected>
              로그인 필요
            </Chip>
            <Chip icon={<Clock3 size={14} />}>만료 시간</Chip>
            <Chip icon={<ShieldCheck size={14} />}>권한 재확인</Chip>
          </div>
          <Button icon={<Copy size={15} />} size="sm" variant="quiet">
            초대 링크 복사
          </Button>
        </GlassPanel>
      </div>
    </section>
  );
}
