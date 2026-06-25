import { Crown, Settings2, ShieldCheck, UserCheck, UserPlus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type MemberItem = {
  name: string;
  role: "leader" | "member";
  status: string;
  visibleScope: string;
};

const members: MemberItem[] = [
  {
    name: "정현",
    role: "leader",
    status: "프로젝트 리더",
    visibleScope: "설정, 초대, 역할 변경 가능",
  },
  {
    name: "미연",
    role: "member",
    status: "멤버",
    visibleScope: "자료, WBS, TODO, 일정 확인 가능",
  },
];

const roleMeta: Record<MemberItem["role"], { tone: "approved" | "room" | "warning"; icon: typeof Crown }> = {
  leader: { icon: Crown, tone: "approved" },
  member: { icon: UserCheck, tone: "room" },
};

function MemberRow({ item }: { item: MemberItem }) {
  const meta = roleMeta[item.role];
  const Icon = meta.icon;

  return (
    <article className="member-role-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="member-role-row__meta">
          <StatusBadge tone={meta.tone}>{item.status}</StatusBadge>
          <span>{item.visibleScope}</span>
        </div>
        <h3>{item.name}</h3>
      </div>
      <Button size="sm" variant={item.role === "leader" ? "quiet" : "secondary"}>
        관리
      </Button>
    </article>
  );
}

export function MemberRolePanel() {
  return (
    <section className="member-role" aria-label="프로젝트룸 멤버와 역할 관리">
      <GlassPanel className="member-role__hero">
        <div>
          <Chip icon={<UsersRound size={14} />} selected>
            프로젝트룸 멤버
          </Chip>
          <h2>프로젝트룸 안의 역할은 사용자 권한으로 관리합니다</h2>
          <p>
            프로젝트룸은 혼자 시작할 수 있고, 필요하면 친구를 초대해 함께 씁니다. 프로젝트 리더는 설정과 초대를
            관리하고, 멤버는 프로젝트룸 자료와 작업을 함께 확인합니다.
          </p>
        </div>
        <div className="member-role__summary">
          <StatusBadge tone="room">접근 권한</StatusBadge>
          <strong>3명</strong>
          <span>참여 중</span>
          <ProgressBar label="멤버 설정 완료율" value={78} />
        </div>
      </GlassPanel>

      <div className="member-role__grid">
        <GlassPanel className="member-role__list">
          <div className="member-role__list-top">
            <div>
              <h3>역할 목록</h3>
          <p>프로젝트 리더와 멤버는 별도 사용자 타입이 아니라 프로젝트룸 안에서 부여되는 권한입니다.</p>
            </div>
            <Button icon={<UserPlus size={15} />} size="sm" variant="primary">
              친구 초대
            </Button>
          </div>
          <div className="member-role__items">
            {members.map((item) => (
              <MemberRow item={item} key={`${item.role}-${item.name}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="member-role__policy">
          <h3>관리 기준</h3>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>프로젝트 리더는 멤버 초대, 역할 변경, 프로젝트룸 설정 변경을 맡습니다.</p>
          </div>
          <div>
            <Settings2 size={17} strokeWidth={2.1} />
            <p>마지막 프로젝트 리더는 바로 나갈 수 없고, 다른 멤버에게 리더 역할을 넘긴 뒤 나갑니다.</p>
          </div>
          <div>
            <UserPlus size={17} strokeWidth={2.1} />
            <p>초대는 수락된 친구 목록에서 기존 회원을 선택하는 방식으로 진행합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
