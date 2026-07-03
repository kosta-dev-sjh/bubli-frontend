"use client";

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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const surfaceMeta: Record<CommunicationSurface, { badgeKey: MessageKey; descriptionKey: MessageKey; icon: ReactNode; labelKey: MessageKey }> = {
  "web-tab": {
    badgeKey: "chat.tauriMode.surfaceWebBadge",
    descriptionKey: "chat.tauriMode.surfaceWebDesc",
    icon: <Globe2 size={20} strokeWidth={2.1} />,
    labelKey: "chat.tauriMode.surfaceWebLabel",
  },
  "tauri-window": {
    badgeKey: "chat.tauriMode.surfaceWindowBadge",
    descriptionKey: "chat.tauriMode.surfaceWindowDesc",
    icon: <MonitorUp size={20} strokeWidth={2.1} />,
    labelKey: "chat.tauriMode.surfaceWindowLabel",
  },
  bubble: {
    badgeKey: "chat.tauriMode.surfaceBubbleBadge",
    descriptionKey: "chat.tauriMode.surfaceBubbleDesc",
    icon: <MessageCircle size={20} strokeWidth={2.1} />,
    labelKey: "chat.tauriMode.surfaceBubbleLabel",
  },
};

const connectionMeta: Record<ConnectionStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  blocked: { labelKey: "chat.tauriMode.connBlocked", tone: "warning" },
  checking: { labelKey: "chat.tauriMode.connChecking", tone: "pending" },
  ready: { labelKey: "chat.tauriMode.connReady", tone: "success" },
};

export function TauriCommunicationModePanel({
  channels,
  className,
  sharedConnections,
  surface,
  title,
  webRoute,
  ...props
}: TauriCommunicationModePanelProps) {
  const { t } = useI18n();
  const currentSurface = surfaceMeta[surface];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<RadioTower size={16} strokeWidth={2.1} />}>{t("chat.tauriMode.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{title ?? t("chat.tauriMode.title")}</h2>
            <p className={styles.description}>
              {t("chat.tauriMode.description", { route: webRoute })}
            </p>
          </div>
        </div>
        <div className={styles.surfaceBadge}>
          <span>{t(currentSurface.badgeKey)}</span>
          <strong>{t(currentSurface.labelKey)}</strong>
        </div>
      </header>

      <div className={styles.flowGrid} aria-label={t("chat.tauriMode.flowAria")}>
        <article className={styles.surfaceCard}>
          <span className={styles.surfaceIcon} aria-hidden="true">
            <Globe2 size={22} strokeWidth={2.1} />
          </span>
          <div>
            <strong>{t("chat.tauriMode.webAppLabel")}</strong>
            <p>{t("chat.tauriMode.webAppDesc", { route: webRoute })}</p>
          </div>
        </article>

        <div className={styles.bridge} aria-hidden="true">
          <span />
          <b>{t("chat.tauriMode.sameConnection")}</b>
          <span />
        </div>

        <article className={cn(styles.surfaceCard, styles.activeSurface)}>
          <span className={styles.surfaceIcon} aria-hidden="true">
            {currentSurface.icon}
          </span>
          <div>
            <strong>{t(currentSurface.labelKey)}</strong>
            <p>{t(currentSurface.descriptionKey)}</p>
          </div>
        </article>
      </div>

      <section className={styles.channelGrid} aria-label={t("chat.tauriMode.channelAria")}>
        {channels.map((channel) => (
          <article className={styles.channelCard} key={channel.label}>
            <StatusBadge tone={channel.tone}>{channel.label}</StatusBadge>
            <p>{channel.description}</p>
          </article>
        ))}
      </section>

      <section className={styles.connectionList} aria-label={t("chat.tauriMode.connectionAria")}>
        {sharedConnections.map((connection) => {
          const status = connectionMeta[connection.status];

          return (
            <article className={styles.connectionItem} key={connection.label}>
              <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>{connection.label}</strong>
                <p>{connection.description}</p>
              </div>
              <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <div className={styles.guardRail}>
          <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("chat.tauriMode.guardRail")}</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<ExternalLink size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            {t("chat.tauriMode.openChat")}
          </Button>
          <Button icon={<BellRing size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("chat.tauriMode.bubbleNotice")}
          </Button>
          <Button icon={<Volume2 size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            {t("chat.tauriMode.voiceStatus")}
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
