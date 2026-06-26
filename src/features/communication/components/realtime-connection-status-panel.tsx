import {
  Bell,
  Clock3,
  Database,
  MessageCircle,
  PlugZap,
  Radio,
  RefreshCcw,
  Server,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./realtime-connection-status-panel.module.css";

export type RealtimeConnectionState = "CONNECTED" | "RECONNECTING" | "DEGRADED" | "DISCONNECTED";

export type RealtimeTopicHealth = {
  icon?: ReactNode;
  id: string;
  label: string;
  lastEventLabel: string;
  lagLabel: string;
  sourceLabel: string;
  state: RealtimeConnectionState;
  topic: string;
};

export type RealtimeRecoveryStep = {
  id: string;
  label: string;
  value: string;
};

type RealtimeConnectionStatusPanelProps = HTMLAttributes<HTMLElement> & {
  appMode?: "web" | "tauri";
  connectionState?: RealtimeConnectionState;
  lastSyncedLabel?: string;
  onRefreshMissingEvents?: () => void;
  onReconnect?: () => void;
  recoverySteps?: RealtimeRecoveryStep[];
  topics?: RealtimeTopicHealth[];
};

const stateCopy: Record<RealtimeConnectionState, string> = {
  CONNECTED: "연결됨",
  RECONNECTING: "재연결 중",
  DEGRADED: "일부 지연",
  DISCONNECTED: "끊김",
};

const stateTone: Record<RealtimeConnectionState, "success" | "pending" | "warning" | "neutral"> = {
  CONNECTED: "success",
  RECONNECTING: "pending",
  DEGRADED: "warning",
  DISCONNECTED: "neutral",
};

const defaultTopics: RealtimeTopicHealth[] = [
  {
    icon: <MessageCircle size={16} />,
    id: "chat",
    label: "채팅 메시지",
    lastEventLabel: "최근 메시지 129",
    lagLabel: "방금 전",
    sourceLabel: "서버 채팅 원본",
    state: "CONNECTED",
    topic: "/topic/chat/{chatRoomId}",
  },
  {
    icon: <Radio size={16} />,
    id: "room-events",
    label: "프로젝트룸 이벤트",
    lastEventLabel: "에이전트 정리 완료 대기",
    lagLabel: "12초 전",
    sourceLabel: "자료와 에이전트 후보",
    state: "RECONNECTING",
    topic: "/topic/project-rooms/{roomId}/events",
  },
  {
    icon: <Bell size={16} />,
    id: "notifications",
    label: "개인 알림",
    lastEventLabel: "읽지 않은 알림 2개",
    lagLabel: "1분 전",
    sourceLabel: "알림 원본",
    state: "DEGRADED",
    topic: "/user/queue/notifications",
  },
];

const defaultRecoverySteps: RealtimeRecoveryStep[] = [
  {
    id: "server-source",
    label: "서버 원본",
    value: "확정 데이터는 서버 DB에서 다시 불러옵니다.",
  },
  {
    id: "tauri-cache",
    label: "앱 임시 보관",
    value: "최근 메시지를 먼저 보여주고 서버 순서값 기준으로 보충합니다.",
  },
  {
    id: "agent-events",
    label: "에이전트 완료",
    value: "에이전트 정리 상태 변경은 API 서버 이벤트와 알림으로 받습니다.",
  },
];

function getConnectionIcon(state: RealtimeConnectionState) {
  if (state === "DISCONNECTED") {
    return <WifiOff size={20} />;
  }

  return <Wifi size={20} />;
}

export function RealtimeConnectionStatusPanel({
  appMode = "tauri",
  className,
  connectionState = "CONNECTED",
  lastSyncedLabel = "최근 동기화 12초 전",
  onRefreshMissingEvents,
  onReconnect,
  recoverySteps = defaultRecoverySteps,
  topics = defaultTopics,
  ...props
}: RealtimeConnectionStatusPanelProps) {
  const connectedTopicCount = topics.filter((topic) => topic.state === "CONNECTED").length;
  const isTauri = appMode === "tauri";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={cn(styles.stateIcon, styles[`stateIcon${connectionState}`])} aria-hidden="true">
            {getConnectionIcon(connectionState)}
          </span>
          <div>
            <StatusBadge tone={stateTone[connectionState]}>{stateCopy[connectionState]}</StatusBadge>
            <h2>실시간 연결 상태</h2>
            <p>채팅, 알림, 에이전트 완료 이벤트를 받는 통로입니다.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<RefreshCcw size={15} />} onClick={onRefreshMissingEvents} size="sm" variant="quiet">
            빠진 이벤트 확인
          </Button>
          <Button icon={<PlugZap size={15} />} onClick={onReconnect} size="sm" variant="primary">
            재연결
          </Button>
        </div>
      </header>

      <div className={styles.summaryGrid} aria-label="실시간 연결 요약">
        <SummaryItem icon={<Server size={17} />} label="연결 기준" value="API 서버 실시간 연결" />
        <SummaryItem icon={<Radio size={17} />} label="구독 토픽" value={`${connectedTopicCount}/${topics.length} 정상`} />
        <SummaryItem icon={<Database size={17} />} label="복구 기준" value={isTauri ? "서버 원본 + 기기 안 임시 보관" : "서버 원본"} />
        <SummaryItem icon={<Clock3 size={17} />} label="동기화" value={lastSyncedLabel} />
      </div>

      <div className={styles.topicList}>
        {topics.map((topic) => (
          <article className={styles.topicCard} key={topic.id}>
            <div className={styles.topicIcon} aria-hidden="true">
              {topic.icon ?? <Radio size={16} />}
            </div>
            <div className={styles.topicBody}>
              <div className={styles.topicHead}>
                <h3>{topic.label}</h3>
                <StatusBadge tone={stateTone[topic.state]}>{stateCopy[topic.state]}</StatusBadge>
              </div>
              <code>{topic.topic}</code>
              <div className={styles.topicMeta}>
                <Chip>{topic.sourceLabel}</Chip>
                <span>{topic.lastEventLabel}</span>
                <span>{topic.lagLabel}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.recoveryBox}>
        <div className={styles.recoveryTitle}>
          <ShieldCheck size={18} />
          <div>
            <h3>끊겼을 때 기준</h3>
            <p>화면 연결이 끊겨도 확정 데이터는 서버 원본을 기준으로 다시 맞춥니다.</p>
          </div>
        </div>
        <ul className={styles.recoveryList}>
          {recoverySteps.map((step) => (
            <li key={step.id}>
              <strong>{step.label}</strong>
              <span>{step.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className={styles.footer}>
        <span>웹은 서버 원본과 실시간 연결을 기준으로 다시 불러옵니다.</span>
        <span>Tauri는 같은 서버 원본을 쓰고, 기기 안 임시 보관은 빠른 표시와 보충용으로만 씁니다.</span>
      </footer>
    </GlassPanel>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <dl className={styles.summaryItem}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </dl>
  );
}
