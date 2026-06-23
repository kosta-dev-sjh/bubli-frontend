import { LockKeyhole, Mic, MicOff, PhoneOff, Radio, ShieldCheck, UsersRound, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type Participant = {
  name: string;
  role: "프로젝트 리더" | "멤버";
  state: "speaking" | "muted" | "listening";
};

const participants: Participant[] = [
  { name: "김정현", role: "프로젝트 리더", state: "speaking" },
  { name: "박민수", role: "멤버", state: "listening" },
  { name: "이서연", role: "멤버", state: "muted" },
];

const participantState: Record<Participant["state"], { label: string; tone: "success" | "personal" | "communication" }> = {
  listening: { label: "참여 중", tone: "personal" },
  muted: { label: "마이크 꺼짐", tone: "communication" },
  speaking: { label: "말하는 중", tone: "success" },
};

function ParticipantRow({ participant }: { participant: Participant }) {
  const state = participantState[participant.state];

  return (
    <article className="voice-session-participant">
      <span className="voice-session-participant__avatar" aria-hidden="true">
        {participant.name.slice(0, 1)}
      </span>
      <div>
        <div className="voice-session-participant__meta">
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
          <span>{participant.role}</span>
        </div>
        <h3>{participant.name}</h3>
      </div>
      {participant.state === "muted" ? <MicOff size={17} strokeWidth={2.1} /> : <Mic size={17} strokeWidth={2.1} />}
    </article>
  );
}

export function VoiceSessionPanel() {
  return (
    <section className="voice-session" aria-label="보이스챗 세션">
      <GlassPanel className="voice-session__hero">
        <div className="voice-session__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Radio size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>보이스챗</Chip>
            <h2>회원 웹 앱과 Tauri 버블이 같은 LiveKit 연결로 프로젝트룸 소통을 이어갑니다</h2>
            <p>
              웹에서는 소통 탭에서, Tauri에서는 별도 창이나 소통 버블에서 참여합니다. 토큰은 API 서버가 발급하고,
              프론트와 Tauri는 LiveKit 서버를 직접 설정하지 않습니다.
            </p>
          </div>
        </div>
        <div className="voice-session__status">
          <StatusBadge tone="success">연결됨</StatusBadge>
          <strong>4명</strong>
          <span>현재 참여자</span>
          <ProgressBar label="연결 품질" value={92} />
        </div>
      </GlassPanel>

      <div className="voice-session__grid">
        <GlassPanel className="voice-session__panel">
          <div className="voice-session__panel-header">
            <div>
              <h3>프로젝트룸 보이스</h3>
              <p>대화와 보이스는 같은 프로젝트룸 맥락에 묶이고, 음성 저장과 회의 내용 요약은 포함하지 않습니다.</p>
            </div>
            <Chip icon={<Volume2 size={14} />}>LiveKit</Chip>
          </div>

          <div className="voice-session__participants">
            {participants.map((participant) => (
              <ParticipantRow key={`${participant.name}-${participant.role}`} participant={participant} />
            ))}
          </div>

          <footer className="voice-session__controls">
            <Button icon={<Mic size={15} />} size="sm" variant="primary">
              마이크 켜짐
            </Button>
            <Button icon={<PhoneOff size={15} />} size="sm" variant="quiet">
              나가기
            </Button>
          </footer>
        </GlassPanel>

        <GlassPanel className="voice-session__policy">
          <h3>접근과 권한</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <LockKeyhole size={16} strokeWidth={2.1} />
            </span>
            <p>LiveKit 토큰은 API 서버에서 발급하고, 모델 키나 내부 토큰은 클라이언트에 노출하지 않습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>보이스 참여는 프로젝트룸 멤버 권한을 기준으로 확인합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>멤버는 프로젝트룸 권한에 따라 참여하고, 프로젝트 리더가 초대와 역할을 관리합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
