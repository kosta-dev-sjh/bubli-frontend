import { Link2, MessageCircle, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

type FriendItem = {
  name: string;
  handle: string;
  roleHint: string;
  status: "friend" | "pending" | "invited";
};

const friends: FriendItem[] = [
  {
    handle: "jihyun.kim",
    name: "김지현",
    roleHint: "UI 디자인",
    status: "friend",
  },
  {
    handle: "minsu.park",
    name: "박민수",
    roleHint: "프론트 개발",
    status: "invited",
  },
  {
    handle: "seoyeon.lee",
    name: "이서연",
    roleHint: "자료 검토",
    status: "pending",
  },
];

const friendStatus: Record<FriendItem["status"], { label: string; tone: "success" | "pending" | "room" }> = {
  friend: { label: "친구", tone: "success" },
  invited: { label: "초대됨", tone: "room" },
  pending: { label: "요청 대기", tone: "pending" },
};

function FriendRow({ friend }: { friend: FriendItem }) {
  const status = friendStatus[friend.status];

  return (
    <article className="friend-invite-row">
      <span className="friend-invite-row__avatar" aria-hidden="true">
        {friend.name.slice(0, 1)}
      </span>
      <div>
        <div className="friend-invite-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>@{friend.handle}</span>
        </div>
        <h3>{friend.name}</h3>
        <p>{friend.roleHint}</p>
      </div>
      <Button size="sm" variant={friend.status === "friend" ? "primary" : "quiet"}>
        {friend.status === "friend" ? "프로젝트룸 초대" : "상태 보기"}
      </Button>
    </article>
  );
}

export function FriendInvitePanel() {
  return (
    <section className="friend-invite" aria-label="친구와 프로젝트룸 초대">
      <GlassPanel className="friend-invite__hero">
        <div className="friend-invite__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <UserPlus size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>소통</Chip>
            <h2>친구를 추가하고, 프로젝트룸에는 친구나 제한된 링크로 초대합니다</h2>
            <p>
              친구는 1:1 채팅과 프로젝트룸 초대의 기준이 됩니다. 초대 링크로 들어온 게스트는 채팅과 보이스챗만
              잠깐 사용할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="friend-invite__search">
          <span>아이디로 친구 추가</span>
          <strong>@bubli.user</strong>
          <Button icon={<UserPlus size={15} />} size="sm" variant="primary">
            요청 보내기
          </Button>
        </div>
      </GlassPanel>

      <div className="friend-invite__grid">
        <GlassPanel className="friend-invite__panel">
          <div className="friend-invite__panel-header">
            <div>
              <h3>친구 목록</h3>
              <p>친구를 선택해 1:1 채팅을 시작하거나 프로젝트룸에 초대합니다.</p>
            </div>
            <Chip icon={<MessageCircle size={14} />}>1:1 채팅 가능</Chip>
          </div>

          <div className="friend-invite__list">
            {friends.map((friend) => (
              <FriendRow friend={friend} key={friend.handle} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="friend-invite__policy">
          <h3>초대 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>프로젝트룸 멤버는 프로젝트 리더가 친구 목록에서 초대합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Link2 size={16} strokeWidth={2.1} />
            </span>
            <p>초대 링크는 임시 게스트 입장에 쓰며, 만료 시간과 접근 범위를 제한합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>게스트는 자료, WBS, 일정, 멤버 목록, 다운로드에 접근하지 못합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
