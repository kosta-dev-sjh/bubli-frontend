import { Bot, Mic2, MessageCircle, UserPlus, UsersRound } from "lucide-react";

import { BubbleCard } from "@/components/bubbles/bubble-card";
import { ChatMessage } from "@/components/domain/chat-message";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

const summaryItems = [
  {
    body: "Bubli ID로 친구를 추가하고 1:1 채팅방을 엽니다.",
    icon: UserPlus,
    title: "친구와 1:1 채팅",
  },
  {
    body: "프로젝트룸 자료와 작업 맥락을 기준으로 대화합니다.",
    icon: UsersRound,
    title: "프로젝트룸 채팅",
  },
  {
    body: "서버에서 발급한 연결 정보로 프로젝트룸 보이스에 입장합니다.",
    icon: Mic2,
    title: "프로젝트룸 보이스",
  },
  {
    body: "명령어로 후보 생성과 정리를 요청합니다.",
    icon: Bot,
    title: "프로젝트룸 에이전트 호출",
  },
  {
    body: "개인 에이전트 대화는 프로젝트룸 채팅과 분리합니다.",
    icon: MessageCircle,
    title: "개인 에이전트 대화",
  },
];

const rooms = [
  {
    badge: "프로젝트룸",
    detail: "번역계약서_v2.pdf 기준 대화",
    title: "토모에 번역 프로젝트",
  },
  {
    badge: "1:1",
    detail: "김미연 님과 직접 대화",
    title: "김미연",
  },
  {
    badge: "프로젝트룸",
    detail: "WBS 검토와 보이스 연결 대기",
    title: "Bubli 제품 고도화",
  },
];

export function CommunicationPanel() {
  return (
    <section className="communication-panel" aria-label="소통">
      <div className="communication-panel__summary" aria-label="소통 기능 구분">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <GlassPanel className="communication-panel__summary-card" key={item.title}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <b>{item.title}</b>
              <span>{item.body}</span>
            </GlassPanel>
          );
        })}
      </div>

      <div className="communication-panel__grid">
        <aside className="communication-panel__pane" aria-label="채팅방 목록">
          <div className="communication-panel__head">
            <div>
              <h2>소통</h2>
              <p>친구와 프로젝트룸 대화를 한 목록에서 확인합니다.</p>
            </div>
            <Button size="sm" variant="primary">
              친구 추가
            </Button>
          </div>
          <div className="communication-panel__room-list">
            {rooms.map((room) => (
              <div className="communication-panel__room" key={room.title}>
                <b>{room.title}</b>
                <span>{room.detail}</span>
                <div>
                  <Chip selected={room.badge === "프로젝트룸"}>{room.badge}</Chip>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="communication-panel__chat" aria-label="프로젝트룸 채팅">
          <div className="communication-panel__head">
          <div>
            <h2>토모에 번역 프로젝트</h2>
              <p>프로젝트룸 채팅은 서버에 저장되고, 데스크톱 앱은 최근 메시지를 빠르게 불러옵니다.</p>
            </div>
            <StatusBadge tone="communication">프로젝트룸 채팅</StatusBadge>
          </div>
          <div className="communication-panel__messages">
            <ChatMessage
              author="김미연"
              message="검수 기준은 계약서 기준으로 다시 확인해볼게요."
              roleLabel="프리랜서 사용자"
              timeLabel="10:24"
            />
            <ChatMessage
              author="Bubli"
              message="계약서와 회의록의 납품일 표현이 다릅니다. 확인 질문 후보를 만들 수 있습니다."
              roleLabel="프로젝트룸 에이전트"
              timeLabel="10:25"
            />
            <ChatMessage
              author="정현"
              message="/bubli 질문 후보로 정리해줘."
              mine
              roleLabel="프리랜서 사용자"
              timeLabel="10:26"
            />
          </div>
          <div className="communication-panel__composer">
            <input aria-label="메시지 입력" placeholder="프로젝트룸에 메시지 보내기" />
            <Button variant="primary">보내기</Button>
          </div>
        </section>

        <aside className="communication-panel__pane" aria-label="소통 보조 정보">
          <BubbleCard
            className="communication-panel__bubble"
            items={["새 메시지 2개", "프로젝트룸 보이스 참여 가능", "확인 질문 후보 2개"]}
            meta="소통"
            type="communication"
          />
          <GlassPanel className="communication-panel__side-card">
            <h3>소통 접근 기준</h3>
            <ul>
              <li>1:1 채팅은 친구 관계를 기준으로 엽니다.</li>
              <li>프로젝트룸 채팅과 보이스는 멤버 권한을 기준으로 엽니다.</li>
              <li>프로젝트룸 초대는 수락된 친구 목록에서 보냅니다.</li>
            </ul>
          </GlassPanel>
          <GlassPanel className="communication-panel__side-card">
            <h3>Tauri 앱 기준</h3>
            <p>앱에서 소통 탭을 숨기더라도 버블이나 전용 창에서 같은 서버와 보이스 연결을 씁니다.</p>
          </GlassPanel>
        </aside>
      </div>
    </section>
  );
}
