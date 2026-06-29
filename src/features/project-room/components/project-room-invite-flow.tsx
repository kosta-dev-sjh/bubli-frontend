import type { ReactNode } from "react";

import {
  KeyRound,
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
          <h2>프로젝트룸 초대는 친구 목록을 기준으로 관리합니다</h2>
          <p>
            프로젝트 리더는 수락된 친구 목록에서 사용자를 선택해 프로젝트룸에 초대합니다. 수락 뒤에만
            자료, WBS/TODO, 채팅, 보이스 접근 권한이 생깁니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="room">프로젝트 리더 권한</StatusBadge>
          <strong>1</strong>
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
                <p>친구 목록에서 선택한 사용자와 초대 상태를 저장합니다.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <UserCheck size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>친구가 수락</strong>
                <p>초대받은 사용자가 수락해야 프로젝트룸 멤버 권한이 생깁니다.</p>
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
          <h3>초대 제한 기준</h3>
          <p>프로젝트룸 초대는 기존 회원과 친구 관계가 확인된 사용자만 대상으로 합니다.</p>
          <div className={styles.linkAccess}>
            <Chip icon={<UsersRound size={14} />} selected>
              친구 목록
            </Chip>
            <Chip icon={<UserCheck size={14} />}>기존 회원</Chip>
            <Chip icon={<ShieldCheck size={14} />}>권한 재확인</Chip>
          </div>
          <Button icon={<UserPlus size={15} />} size="sm" variant="quiet">
            친구 선택
          </Button>
        </GlassPanel>
      </div>
    </section>
  );
}
