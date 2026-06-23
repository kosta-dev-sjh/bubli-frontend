import {
  CalendarClock,
  CheckCircle2,
  FileUp,
  Link2,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";

type ProjectRoomRole = "PROJECT_LEADER" | "MEMBER";
type ProjectRoomStatus = "active" | "review" | "archived";
type InviteMethod = "friend" | "link";

type ProjectRoomItem = {
  checkNeededCount: number;
  dueLabel: string;
  id: string;
  memberCount: number;
  name: string;
  myRole: ProjectRoomRole;
  progress: number;
  resourceCount: number;
  status: ProjectRoomStatus;
  todoCount: number;
};

type MemberItem = {
  displayName: string;
  role: ProjectRoomRole;
  status: "ACTIVE" | "INVITED";
};

type InvitePolicy = {
  description: string;
  method: InviteMethod;
  title: string;
};

const projectRooms: ProjectRoomItem[] = [
  {
    checkNeededCount: 3,
    dueLabel: "D-9",
    id: "room-1",
    memberCount: 4,
    name: "K-Stay 번역 프로젝트",
    myRole: "PROJECT_LEADER",
    progress: 68,
    resourceCount: 18,
    status: "review",
    todoCount: 12,
  },
  {
    checkNeededCount: 1,
    dueLabel: "D-21",
    id: "room-2",
    memberCount: 1,
    name: "브랜드 소개 페이지",
    myRole: "PROJECT_LEADER",
    progress: 42,
    resourceCount: 7,
    status: "active",
    todoCount: 8,
  },
  {
    checkNeededCount: 0,
    dueLabel: "보관",
    id: "room-3",
    memberCount: 3,
    name: "상반기 캠페인 회고",
    myRole: "MEMBER",
    progress: 100,
    resourceCount: 24,
    status: "archived",
    todoCount: 0,
  },
];

const members: MemberItem[] = [
  { displayName: "정현", role: "PROJECT_LEADER", status: "ACTIVE" },
  { displayName: "지유", role: "MEMBER", status: "ACTIVE" },
  { displayName: "하루카", role: "MEMBER", status: "ACTIVE" },
  { displayName: "민지", role: "MEMBER", status: "INVITED" },
];

const invitePolicies: InvitePolicy[] = [
  {
    description: "수락된 친구 목록에서 선택해 프로젝트룸 멤버로 초대합니다.",
    method: "friend",
    title: "친구 초대",
  },
  {
    description: "아직 친구가 아닌 로그인 사용자에게 7일 만료 링크를 보낼 수 있습니다.",
    method: "link",
    title: "링크 초대",
  },
];

const roleLabel: Record<ProjectRoomRole, string> = {
  PROJECT_LEADER: "프로젝트 리더",
  MEMBER: "멤버",
};

const statusLabel: Record<ProjectRoomStatus, string> = {
  active: "진행 중",
  review: "확인 필요",
  archived: "보관",
};

function RoomCard({ room }: { room: ProjectRoomItem }) {
  return (
    <GlassPanel as="article" className="project-room-card">
      <div className="project-room-card__head">
        <div>
          <StatusBadge tone={room.status === "review" ? "warning" : room.status === "archived" ? "neutral" : "success"}>
            {statusLabel[room.status]}
          </StatusBadge>
          <h3>{room.name}</h3>
        </div>
        <Chip selected={room.myRole === "PROJECT_LEADER"}>{roleLabel[room.myRole]}</Chip>
      </div>
      <ProgressBar label={`${room.name} 진행률`} value={room.progress} />
      <dl className="project-room-card__stats">
        <div>
          <dt>자료</dt>
          <dd>{room.resourceCount}</dd>
        </div>
        <div>
          <dt>TODO</dt>
          <dd>{room.todoCount}</dd>
        </div>
        <div>
          <dt>멤버</dt>
          <dd>{room.memberCount}</dd>
        </div>
        <div>
          <dt>마감</dt>
          <dd>{room.dueLabel}</dd>
        </div>
      </dl>
      <footer className="project-room-card__footer">
        {room.checkNeededCount > 0 ? <Chip selected>확인 필요 {room.checkNeededCount}개</Chip> : <Chip>확인 필요 없음</Chip>}
        <Button size="sm" variant="quiet">
          열기
        </Button>
      </footer>
    </GlassPanel>
  );
}

function CreationFlow() {
  const steps = [
    { icon: FileUp, label: "계약서·견적서·요구사항 업로드" },
    { icon: CheckCircle2, label: "추출 후보 확인" },
    { icon: CalendarClock, label: "WBS·TODO·일정 저장" },
  ];

  return (
    <GlassPanel className="project-room-flow">
      <div className="project-room-panel-head">
        <div>
          <h3>새 프로젝트룸 만들기</h3>
          <p>문서에서 뽑은 값은 후보로만 보여주고, 사용자가 확인한 값만 저장합니다.</p>
        </div>
        <Button icon={<Plus size={16} />} size="sm" variant="primary">
          만들기
        </Button>
      </div>
      <ol className="project-room-flow__steps">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.label}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="project-room-candidate">
        <b>생성 후보</b>
        <span>프로젝트명, 클라이언트명, 납품일, 납품물, 확인 필요 항목, WBS/TODO 후보</span>
      </div>
    </GlassPanel>
  );
}

function InvitePanel() {
  const iconByMethod = {
    friend: UserPlus,
    link: Link2,
  } satisfies Record<InviteMethod, typeof UserPlus>;

  return (
    <GlassPanel className="project-room-invite">
      <div className="project-room-panel-head">
        <div>
          <h3>초대와 참여 기준</h3>
          <p>프로젝트 리더가 친구 초대와 로그인 사용자용 링크 초대를 관리합니다.</p>
        </div>
        <Chip selected>프로젝트룸 단위</Chip>
      </div>
      <div className="project-room-invite__grid">
        {invitePolicies.map((policy) => {
          const Icon = iconByMethod[policy.method];
          return (
            <article className="project-room-policy" key={policy.method}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <div>
                <b>{policy.title}</b>
                <p>{policy.description}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="project-room-guardrail">
        수락된 멤버만 자료, WBS/TODO, 일정, 멤버 목록, 위젯 표시 대상에 들어갑니다.
      </div>
    </GlassPanel>
  );
}

function MemberPanel() {
  return (
    <GlassPanel className="project-room-members">
      <div className="project-room-panel-head">
        <div>
          <h3>멤버와 권한</h3>
          <p>기본 권한은 프로젝트 리더와 멤버로 시작합니다.</p>
        </div>
        <Chip icon={<UsersRound size={14} />}>4명</Chip>
      </div>
      <div className="project-room-members__list">
        {members.map((member) => (
          <div className="project-room-member" key={member.displayName}>
            <span className="project-room-member__avatar">{member.displayName.slice(0, 1)}</span>
            <div>
              <b>{member.displayName}</b>
              <span>{roleLabel[member.role]}</span>
            </div>
            <StatusBadge tone={member.status === "ACTIVE" ? "success" : "pending"}>
              {member.status === "ACTIVE" ? "참여 중" : "초대 대기"}
            </StatusBadge>
          </div>
        ))}
      </div>
      <p className="project-room-members__note">
        마지막 프로젝트 리더가 나가려면 먼저 다른 참여 중인 멤버에게 프로젝트 리더 권한을 넘깁니다.
      </p>
    </GlassPanel>
  );
}

export function ProjectRoomBoard() {
  return (
    <section className="project-room-board" aria-label="프로젝트룸 관리">
      <SectionHeading
        eyebrow="프로젝트룸"
        title="프로젝트를 혼자 시작하고, 필요할 때 함께 봅니다"
        description="프로젝트룸은 자료, WBS, TODO, 채팅을 프로젝트 단위로 묶는 공간입니다. 혼자 만들 수 있고, 친구나 링크로 멤버를 초대할 수 있습니다."
      />

      <div className="project-room-board__summary">
        <GlassPanel className="project-room-summary-card">
          <b>내가 만든 프로젝트룸</b>
          <strong>2</strong>
          <span>프로젝트 리더 기준</span>
        </GlassPanel>
        <GlassPanel className="project-room-summary-card">
          <b>참여 중</b>
          <strong>3</strong>
          <span>참여 중인 프로젝트룸</span>
        </GlassPanel>
        <GlassPanel className="project-room-summary-card">
          <b>초대 대기</b>
          <strong>1</strong>
          <span>7일 만료 기준</span>
        </GlassPanel>
      </div>

      <div className="project-room-board__main">
        <div className="project-room-board__list">
          {projectRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
        <div className="project-room-board__side">
          <CreationFlow />
          <InvitePanel />
          <MemberPanel />
        </div>
      </div>
    </section>
  );
}
