"use client";

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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const stateLabelKey: Record<RealtimeConnectionState, MessageKey> = {
  CONNECTED: "chat.realtimePanel.stateConnected",
  RECONNECTING: "chat.realtimePanel.stateReconnecting",
  DEGRADED: "chat.realtimePanel.stateDegraded",
  DISCONNECTED: "chat.realtimePanel.stateDisconnected",
};

const stateTone: Record<RealtimeConnectionState, "success" | "pending" | "warning" | "neutral"> = {
  CONNECTED: "success",
  RECONNECTING: "pending",
  DEGRADED: "warning",
  DISCONNECTED: "neutral",
};

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
  lastSyncedLabel,
  onRefreshMissingEvents,
  onReconnect,
  recoverySteps,
  topics,
  ...props
}: RealtimeConnectionStatusPanelProps) {
  const { t } = useI18n();

  const defaultTopics: RealtimeTopicHealth[] = [
    {
      icon: <MessageCircle size={16} />,
      id: "chat",
      label: t("chat.realtimePanel.topicChatLabel"),
      lastEventLabel: t("chat.realtimePanel.topicChatLastEvent"),
      lagLabel: t("chat.realtimePanel.topicChatLag"),
      sourceLabel: t("chat.realtimePanel.topicChatSource"),
      state: "CONNECTED",
      topic: "/topic/chat/{chatRoomId}",
    },
    {
      icon: <Radio size={16} />,
      id: "room-events",
      label: t("chat.realtimePanel.topicRoomLabel"),
      lastEventLabel: t("chat.realtimePanel.topicRoomLastEvent"),
      lagLabel: t("chat.realtimePanel.topicRoomLag"),
      sourceLabel: t("chat.realtimePanel.topicRoomSource"),
      state: "RECONNECTING",
      topic: "/topic/project-rooms/{roomId}/events",
    },
    {
      icon: <Bell size={16} />,
      id: "notifications",
      label: t("chat.realtimePanel.topicNotifLabel"),
      lastEventLabel: t("chat.realtimePanel.topicNotifLastEvent"),
      lagLabel: t("chat.realtimePanel.topicNotifLag"),
      sourceLabel: t("chat.realtimePanel.topicNotifSource"),
      state: "DEGRADED",
      topic: "/user/queue/notifications",
    },
  ];

  const defaultRecoverySteps: RealtimeRecoveryStep[] = [
    {
      id: "server-source",
      label: t("chat.realtimePanel.recoveryServerLabel"),
      value: t("chat.realtimePanel.recoveryServerValue"),
    },
    {
      id: "tauri-cache",
      label: t("chat.realtimePanel.recoveryCacheLabel"),
      value: t("chat.realtimePanel.recoveryCacheValue"),
    },
    {
      id: "agent-events",
      label: t("chat.realtimePanel.recoveryAgentLabel"),
      value: t("chat.realtimePanel.recoveryAgentValue"),
    },
  ];

  const resolvedTopics = topics ?? defaultTopics;
  const resolvedRecoverySteps = recoverySteps ?? defaultRecoverySteps;
  const resolvedLastSynced = lastSyncedLabel ?? t("chat.realtimePanel.lastSynced");
  const connectedTopicCount = resolvedTopics.filter((topic) => topic.state === "CONNECTED").length;
  const isTauri = appMode === "tauri";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={cn(styles.stateIcon, styles[`stateIcon${connectionState}`])} aria-hidden="true">
            {getConnectionIcon(connectionState)}
          </span>
          <div>
            <StatusBadge tone={stateTone[connectionState]}>{t(stateLabelKey[connectionState])}</StatusBadge>
            <h2>{t("chat.realtimePanel.title")}</h2>
            <p>{t("chat.realtimePanel.subtitle")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<RefreshCcw size={15} />} onClick={onRefreshMissingEvents} size="sm" variant="quiet">
            {t("chat.realtimePanel.checkMissing")}
          </Button>
          <Button icon={<PlugZap size={15} />} onClick={onReconnect} size="sm" variant="primary">
            {t("chat.realtimePanel.reconnect")}
          </Button>
        </div>
      </header>

      <div className={styles.summaryGrid} aria-label={t("chat.realtimePanel.summaryAria")}>
        <SummaryItem icon={<Server size={17} />} label={t("chat.realtimePanel.summaryBasisLabel")} value={t("chat.realtimePanel.summaryBasisValue")} />
        <SummaryItem icon={<Radio size={17} />} label={t("chat.realtimePanel.summaryTopicLabel")} value={t("chat.realtimePanel.summaryTopicValue", { connected: connectedTopicCount, total: resolvedTopics.length })} />
        <SummaryItem icon={<Database size={17} />} label={t("chat.realtimePanel.summaryRecoveryLabel")} value={isTauri ? t("chat.realtimePanel.summaryRecoveryTauri") : t("chat.realtimePanel.summaryRecoveryWeb")} />
        <SummaryItem icon={<Clock3 size={17} />} label={t("chat.realtimePanel.summarySyncLabel")} value={resolvedLastSynced} />
      </div>

      <div className={styles.topicList}>
        {resolvedTopics.map((topic) => (
          <article className={styles.topicCard} key={topic.id}>
            <div className={styles.topicIcon} aria-hidden="true">
              {topic.icon ?? <Radio size={16} />}
            </div>
            <div className={styles.topicBody}>
              <div className={styles.topicHead}>
                <h3>{topic.label}</h3>
                <StatusBadge tone={stateTone[topic.state]}>{t(stateLabelKey[topic.state])}</StatusBadge>
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
            <h3>{t("chat.realtimePanel.recoveryTitle")}</h3>
            <p>{t("chat.realtimePanel.recoveryBody")}</p>
          </div>
        </div>
        <ul className={styles.recoveryList}>
          {resolvedRecoverySteps.map((step) => (
            <li key={step.id}>
              <strong>{step.label}</strong>
              <span>{step.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className={styles.footer}>
        <span>{t("chat.realtimePanel.footerWeb")}</span>
        <span>{t("chat.realtimePanel.footerApp")}</span>
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
