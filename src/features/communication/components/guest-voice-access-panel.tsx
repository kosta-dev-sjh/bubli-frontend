import {
  Ban,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Link2,
  MessageCircle,
  Mic2,
  MonitorUp,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./guest-voice-access-panel.module.css";

export type GuestAccessStatus = "WAITING" | "ACTIVE" | "EXPIRED" | "REVOKED";

export type GuestCapability = {
  allowed: boolean;
  description: string;
  id: string;
  label: string;
};

type GuestVoiceAccessPanelProps = HTMLAttributes<HTMLElement> & {
  accessStatus?: GuestAccessStatus;
  activeGuestCount?: number;
  expiresInMinutes?: number;
  onCreateGuestLink?: () => void;
  onIssueVoiceToken?: () => void;
  onRevokeGuestLink?: () => void;
  roomLabel?: string;
  tauriMode?: "web-tab" | "desktop-bubble";
};

const statusCopy: Record<GuestAccessStatus, string> = {
  ACTIVE: "참여 중",
  EXPIRED: "만료됨",
  REVOKED: "종료됨",
  WAITING: "대기 중",
};

const statusTone: Record<GuestAccessStatus, StatusTone> = {
  ACTIVE: "success",
  EXPIRED: "warning",
  REVOKED: "neutral",
  WAITING: "pending",
};

const capabilities: GuestCapability[] = [
  {
    allowed: true,
    description: "게스트 링크와 만료 시간이 유효할 때만 메시지를 보낼 수 있습니다.",
    id: "chat",
    label: "프로젝트룸 채팅",
  },
  {
    allowed: true,
    description: "서버가 guest session을 확인한 뒤 LiveKit 접속 토큰을 발급합니다.",
    id: "voice",
    label: "프로젝트룸 보이스",
  },
  {
    allowed: false,
    description: "자료, WBS/TODO, 일정, 다운로드, 멤버 목록은 열 수 없습니다.",
    id: "room-data",
    label: "자료와 작업 화면",
  },
  {
    allowed: false,
    description: "게스트는 프로젝트룸 멤버가 아니므로 대시보드와 버블 표시 대상이 아닙니다.",
    id: "personal",
    label: "개인 화면 반영",
  },
];

const flowSteps = [
  {
    description: "프로젝트 리더가 소통 화면에서 임시 링크를 만듭니다.",
    icon: <Link2 size={17} />,
    label: "게스트 링크 생성",
  },
  {
    description: "게스트는 이름을 입력하고 만료 시간 안에서만 참여합니다.",
    icon: <DoorOpen size={17} />,
    label: "임시 참여",
  },
  {
    description: "채팅은 서버 원본에 저장되고, 보이스는 서버 토큰으로 연결됩니다.",
    icon: <ShieldCheck size={17} />,
    label: "권한 확인",
  },
];

export function GuestVoiceAccessPanel({
  accessStatus = "ACTIVE",
  activeGuestCount = 2,
  className,
  expiresInMinutes = 84,
  onCreateGuestLink,
  onIssueVoiceToken,
  onRevokeGuestLink,
  roomLabel = "K-Stay 프로젝트룸",
  tauriMode = "desktop-bubble",
  ...props
}: GuestVoiceAccessPanelProps) {
  const remainingPercent = Math.max(0, Math.min(100, Math.round((expiresInMinutes / 120) * 100)));
  const isActive = accessStatus === "ACTIVE" || accessStatus === "WAITING";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <MessageCircle size={22} />
          </span>
          <div>
            <StatusBadge tone={statusTone[accessStatus]}>{statusCopy[accessStatus]}</StatusBadge>
            <h2>게스트 소통 접근</h2>
            <p>비회원은 프로젝트룸에 가입하지 않고, 정해진 시간 동안 채팅과 보이스에만 참여합니다.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Link2 size={15} />} onClick={onCreateGuestLink} size="sm" variant="quiet">
            게스트 링크 만들기
          </Button>
          <Button icon={<Mic2 size={15} />} onClick={onIssueVoiceToken} size="sm" variant="primary">
            보이스 토큰 요청
          </Button>
        </div>
      </header>

      <div className={styles.liveCard}>
        <div className={styles.roomInfo}>
          <Chip>{roomLabel}</Chip>
          <strong>{activeGuestCount}명 임시 참여</strong>
          <span>기본 만료 시간은 2시간입니다.</span>
        </div>
        <div className={styles.timerBlock}>
          <Clock3 size={18} />
          <div>
            <strong>{expiresInMinutes}분</strong>
            <span>남은 시간</span>
          </div>
        </div>
        <ProgressBar label="게스트 세션 남은 시간" value={remainingPercent} />
      </div>

      <div className={styles.modeGrid}>
        <article className={styles.modeCard} data-active={tauriMode === "web-tab"}>
          <span aria-hidden="true">
            <UserRoundCheck size={18} />
          </span>
          <div>
            <strong>회원 웹 앱</strong>
            <p>웹에서는 소통 탭에서 1:1 채팅, 프로젝트룸 채팅, 보이스를 사용합니다.</p>
          </div>
        </article>
        <article className={styles.modeCard} data-active={tauriMode === "desktop-bubble"}>
          <span aria-hidden="true">
            <MonitorUp size={18} />
          </span>
          <div>
            <strong>Tauri 앱</strong>
            <p>앱에서는 소통을 별도 창이나 소통 버블로 열고, 같은 API와 LiveKit 연결을 씁니다.</p>
          </div>
        </article>
      </div>

      <div className={styles.capabilityGrid} aria-label="게스트 허용 범위">
        {capabilities.map((capability) => (
          <article className={styles.capabilityCard} data-allowed={capability.allowed} key={capability.id}>
            <span aria-hidden="true">{capability.allowed ? <CheckCircle2 size={17} /> : <Ban size={17} />}</span>
            <div>
              <StatusBadge tone={capability.allowed ? "success" : "warning"}>
                {capability.allowed ? "허용" : "차단"}
              </StatusBadge>
              <h3>{capability.label}</h3>
              <p>{capability.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.flowList} aria-label="게스트 참여 흐름">
        {flowSteps.map((step) => (
          <FlowStep key={step.label} {...step} />
        ))}
      </div>

      <footer className={styles.footer}>
        <div>
          <ShieldCheck size={16} />
          LiveKit API key와 secret은 서버에서만 관리하고, 클라이언트는 발급받은 접속 토큰만 사용합니다.
        </div>
        <Button disabled={!isActive} icon={<Ban size={14} />} onClick={onRevokeGuestLink} size="sm" variant="ghost">
          게스트 세션 종료
        </Button>
      </footer>
    </GlassPanel>
  );
}

function FlowStep({ description, icon, label }: { description: string; icon: ReactNode; label: string }) {
  return (
    <article className={styles.flowStep}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
    </article>
  );
}
