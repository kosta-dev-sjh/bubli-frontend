import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Globe2,
  MessageCircle,
  MonitorUp,
  RadioTower,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./tauri-communication-mode-panel.module.css";

type CommunicationSurface = "web-tab" | "tauri-window" | "bubble";
type ConnectionStatus = "ready" | "checking" | "blocked";

type CommunicationChannel = {
  description: string;
  label: string;
  tone: StatusTone;
};

type SharedConnection = {
  description: string;
  label: string;
  status: ConnectionStatus;
};

export type TauriCommunicationModePanelProps = HTMLAttributes<HTMLElement> & {
  channels: CommunicationChannel[];
  sharedConnections: SharedConnection[];
  surface: CommunicationSurface;
  title?: string;
  webRoute: string;
};

const surfaceMeta: Record<CommunicationSurface, { badge: string; description: string; icon: ReactNode; label: string }> = {
  "web-tab": {
    badge: "회원 웹 앱",
    description: "브라우저에서는 소통 탭에서 채팅과 보이스를 바로 사용합니다.",
    icon: <Globe2 size={20} strokeWidth={2.1} />,
    label: "웹 소통 탭",
  },
  "tauri-window": {
    badge: "데스크탑 전용 창",
    description: "앱에서는 메인 화면의 소통 탭을 숨기고, 별도 창에서 같은 연결을 엽니다.",
    icon: <MonitorUp size={20} strokeWidth={2.1} />,
    label: "앱 소통 창",
  },
  bubble: {
    badge: "소통 버블",
    description: "작업 중에는 소통 버블에서 메시지와 보이스 상태만 짧게 확인합니다.",
    icon: <MessageCircle size={20} strokeWidth={2.1} />,
    label: "소통 버블",
  },
};

const connectionMeta: Record<ConnectionStatus, { label: string; tone: StatusTone }> = {
  blocked: { label: "확인 필요", tone: "warning" },
  checking: { label: "점검 중", tone: "pending" },
  ready: { label: "연결 가능", tone: "success" },
};

export function TauriCommunicationModePanel({
  channels,
  className,
  sharedConnections,
  surface,
  title = "웹과 앱의 소통 화면 연결",
  webRoute,
  ...props
}: TauriCommunicationModePanelProps) {
  const currentSurface = surfaceMeta[surface];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<RadioTower size={16} strokeWidth={2.1} />}>소통 구조</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              웹은 {webRoute}에서 소통을 다루고, 데스크톱 앱은 배포된 회원 화면의 같은 서버 연결을 사용합니다.
              앱에서는 작업 흐름을 줄이기 위해 소통을 별도 창이나 버블로 보여줄 수 있습니다.
            </p>
          </div>
        </div>
        <div className={styles.surfaceBadge}>
          <span>{currentSurface.badge}</span>
          <strong>{currentSurface.label}</strong>
        </div>
      </header>

      <div className={styles.flowGrid} aria-label="웹과 데스크탑 소통 화면 연결 흐름">
        <article className={styles.surfaceCard}>
          <span className={styles.surfaceIcon} aria-hidden="true">
            <Globe2 size={22} strokeWidth={2.1} />
          </span>
          <div>
            <strong>회원 웹 앱</strong>
            <p>{webRoute}에서 친구 대화, 프로젝트룸 채팅, 프로젝트룸 보이스를 한 화면에서 사용합니다.</p>
          </div>
        </article>

        <div className={styles.bridge} aria-hidden="true">
          <span />
          <b>같은 연결</b>
          <span />
        </div>

        <article className={cn(styles.surfaceCard, styles.activeSurface)}>
          <span className={styles.surfaceIcon} aria-hidden="true">
            {currentSurface.icon}
          </span>
          <div>
            <strong>{currentSurface.label}</strong>
            <p>{currentSurface.description}</p>
          </div>
        </article>
      </div>

      <section className={styles.channelGrid} aria-label="소통 채널">
        {channels.map((channel) => (
          <article className={styles.channelCard} key={channel.label}>
            <StatusBadge tone={channel.tone}>{channel.label}</StatusBadge>
            <p>{channel.description}</p>
          </article>
        ))}
      </section>

      <section className={styles.connectionList} aria-label="공유하는 연결 기준">
        {sharedConnections.map((connection) => {
          const status = connectionMeta[connection.status];

          return (
            <article className={styles.connectionItem} key={connection.label}>
              <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>{connection.label}</strong>
                <p>{connection.description}</p>
              </div>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <div className={styles.guardRail}>
          <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          <span>보이스 연결 정보는 앱이나 브라우저에서 직접 만들지 않고 서버에서 받은 값만 사용합니다.</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<ExternalLink size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            소통 열기
          </Button>
          <Button icon={<BellRing size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            버블 알림 보기
          </Button>
          <Button icon={<Volume2 size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            보이스 상태
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
