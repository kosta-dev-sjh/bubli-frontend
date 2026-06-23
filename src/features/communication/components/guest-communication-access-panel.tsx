import { LockKeyhole, MessageCircle, Mic2, ShieldCheck, UserRoundPlus, UsersRound, Video, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

type AccessItem = {
  title: string;
  description: string;
  status: "allowed" | "blocked";
};

const accessItems: AccessItem[] = [
  {
    description: "초대 링크로 들어온 게스트는 프로젝트룸의 대화에 잠깐 참여할 수 있습니다.",
    status: "allowed",
    title: "프로젝트룸 채팅",
  },
  {
    description: "보이스챗은 서버에서 발급한 입장 권한이 있을 때만 참여합니다.",
    status: "allowed",
    title: "보이스챗",
  },
  {
    description: "자료보드, WBS/작업판, 일정, 멤버 목록은 프로젝트룸 멤버만 볼 수 있습니다.",
    status: "blocked",
    title: "업무 자료 접근",
  },
];

function AccessRow({ item }: { item: AccessItem }) {
  const allowed = item.status === "allowed";

  return (
    <article className="guest-access-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        {allowed ? <ShieldCheck size={16} strokeWidth={2.1} /> : <LockKeyhole size={16} strokeWidth={2.1} />}
      </span>
      <div>
        <div className="guest-access-row__meta">
          <StatusBadge tone={allowed ? "success" : "warning"}>{allowed ? "가능" : "제한"}</StatusBadge>
          <span>{allowed ? "소통만 허용" : "멤버 권한 필요"}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

export function GuestCommunicationAccessPanel() {
  return (
    <section className="guest-access" aria-label="게스트 채팅과 보이스챗 접근">
      <GlassPanel className="guest-access__hero">
        <div>
          <Chip icon={<UserRoundPlus size={14} />} selected>
            게스트 초대
          </Chip>
          <h2>비회원은 소통에만 잠깐 참여하고, 업무 자료는 열 수 없습니다</h2>
          <p>
            게스트는 프로젝트룸 멤버가 아닙니다. 초대 링크로 들어와 채팅과 보이스챗에 참여할 수 있지만,
            자료보드와 WBS/작업판은 볼 수 없습니다.
          </p>
        </div>
        <div className="guest-access__badge">
          <StatusBadge tone="communication">채팅/보이스</StatusBadge>
          <strong>임시</strong>
          <span>게스트 세션</span>
        </div>
      </GlassPanel>

      <div className="guest-access__grid">
        <GlassPanel className="guest-access__session">
          <div className="guest-access__session-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>초대 링크 입장</h3>
              <p>게스트는 닉네임을 입력하고 프로젝트룸 소통 화면으로 들어갑니다.</p>
            </div>
          </div>

          <div className="guest-access__preview">
            <div className="guest-access__chat">
              <span>
                <MessageCircle size={14} strokeWidth={2.1} />
                채팅
              </span>
              <p>검수 기준만 빠르게 확인하고 나가겠습니다.</p>
            </div>
            <div className="guest-access__voice">
              <span>
                <Mic2 size={14} strokeWidth={2.1} />
                보이스
              </span>
              <strong>입장 가능</strong>
              <p>마이크 on/off, 나가기, 참여자 표시</p>
            </div>
          </div>

          <div className="guest-access__actions">
            <Button icon={<Video size={15} />} variant="primary">
              보이스 입장
            </Button>
            <Button icon={<MessageCircle size={15} />} variant="quiet">
              채팅 열기
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="guest-access__rules">
          <div className="guest-access__rules-top">
            <div>
              <h3>접근 기준</h3>
              <p>게스트 세션은 소통 보조용입니다. 프로젝트룸 멤버 권한과 분리합니다.</p>
            </div>
            <Chip>게스트 세션</Chip>
          </div>
          <div className="guest-access__items">
            {accessItems.map((item) => (
              <AccessRow item={item} key={item.title} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="guest-access__blocked">
        <XCircle size={18} strokeWidth={2.1} />
        <p>자료 다운로드, WBS 승인, TODO 담당자 변경, 일정 수정은 게스트 화면에서 제공하지 않습니다.</p>
      </GlassPanel>
    </section>
  );
}
