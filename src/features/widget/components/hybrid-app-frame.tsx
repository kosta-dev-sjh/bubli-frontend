"use client";

import { Bell, Bot, Database, FolderOpen, Globe2, LayoutDashboard, MessageCircle, Mic2, Monitor, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./hybrid-app-frame.module.css";

const webTabs: Array<{ key: MessageKey; active?: boolean }> = [
  { key: "widget.hybrid.tabDashboard" },
  { key: "widget.hybrid.tabProjectRooms", active: true },
  { key: "widget.hybrid.tabResources" },
  { key: "widget.hybrid.tabWbs" },
  { key: "widget.hybrid.tabSettings" },
];

const webCards: Array<[MessageKey, MessageKey]> = [
  ["widget.hybrid.card.todoTitle", "widget.hybrid.card.todoBody"],
  ["widget.hybrid.card.resourceTitle", "widget.hybrid.card.resourceBody"],
  ["widget.hybrid.card.agentTitle", "widget.hybrid.card.agentBody"],
  ["widget.hybrid.card.widgetTitle", "widget.hybrid.card.widgetBody"],
];

const localCards: Array<{ title: MessageKey; body: MessageKey; icon: typeof FolderOpen }> = [
  { title: "widget.hybrid.local.folderTitle", body: "widget.hybrid.local.folderBody", icon: FolderOpen },
  { title: "widget.hybrid.local.deviceTitle", body: "widget.hybrid.local.deviceBody", icon: Database },
  { title: "widget.hybrid.local.chatTitle", body: "widget.hybrid.local.chatBody", icon: MessageCircle },
  { title: "widget.hybrid.local.permissionTitle", body: "widget.hybrid.local.permissionBody", icon: ShieldCheck },
];

const connectionRows: Array<{ id: "main" | "chat" | "voice" | "device"; title: MessageKey; path: MessageKey; body: MessageKey }> = [
  { id: "main", title: "widget.hybrid.conn.mainTitle", path: "widget.hybrid.conn.mainPath", body: "widget.hybrid.conn.mainBody" },
  { id: "chat", title: "widget.hybrid.conn.chatTitle", path: "widget.hybrid.conn.chatPath", body: "widget.hybrid.conn.chatBody" },
  { id: "voice", title: "widget.hybrid.conn.voiceTitle", path: "widget.hybrid.conn.voicePath", body: "widget.hybrid.conn.voiceBody" },
  { id: "device", title: "widget.hybrid.conn.deviceTitle", path: "widget.hybrid.conn.devicePath", body: "widget.hybrid.conn.deviceBody" },
];

export function HybridAppFrame() {
  const { t } = useI18n();
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Monitor size={16} aria-hidden="true" />
          {t("widget.hybrid.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("widget.hybrid.title")}</h2>
            <p className={styles.summary}>{t("widget.hybrid.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("widget.hybrid.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("widget.hybrid.chipsAria")}>
          <Chip selected icon={<Globe2 size={14} aria-hidden="true" />}>
            {t("widget.hybrid.chipSameScreen")}
          </Chip>
          <Chip icon={<MessageCircle size={14} aria-hidden="true" />}>{t("widget.hybrid.chipChatSplit")}</Chip>
          <Chip icon={<Mic2 size={14} aria-hidden="true" />}>{t("widget.hybrid.chipVoiceServer")}</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label={t("widget.hybrid.structureAria")}>
        <div className={styles.window}>
          <div className={styles.windowBar}>
            <span />
            <span />
            <span />
            <strong>{t("widget.hybrid.windowTitle")}</strong>
          </div>
          <div className={styles.windowBody}>
            <aside className={styles.sidebar}>
              <div className={styles.brand}>Bubli</div>
              {webTabs.map((tab) => (
                <span className={tab.active ? styles.activeTab : ""} key={tab.key}>
                  {t(tab.key)}
                </span>
              ))}
            </aside>
            <main className={styles.webApp}>
              <div className={styles.webHeader}>
                <div>
                  <h3>{t("widget.hybrid.webRoomTitle")}</h3>
                  <p>{t("widget.hybrid.webRoomMeta")}</p>
                </div>
                <StatusBadge tone="room">{t("widget.hybrid.webRoomBadge")}</StatusBadge>
              </div>
              <div className={styles.cardGrid}>
                {webCards.map(([title, body]) => (
                  <article className={styles.webCard} key={title}>
                    <h4>{t(title)}</h4>
                    <p>{t(body)}</p>
                  </article>
                ))}
              </div>
            </main>
          </div>
        </div>

        <aside className={styles.appLayer} aria-label={t("widget.hybrid.appLayerAria")}>
          <div className={styles.layerHeader}>
            <Sparkles size={18} aria-hidden="true" />
            <h3>{t("widget.hybrid.appLayerTitle")}</h3>
          </div>
          <div className={styles.localList}>
            {localCards.map((card) => {
              const Icon = card.icon;

              return (
                <article className={styles.localCard} key={card.title}>
                  <span className={styles.localIcon}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h4>{t(card.title)}</h4>
                    <p>{t(card.body)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </section>

      <section className={styles.connectionGrid} aria-label={t("widget.hybrid.connGridAria")}>
        {connectionRows.map((row) => (
          <article className={styles.connectionCard} key={row.id}>
            <div className={styles.connectionTitle}>
              {row.id === "voice" ? <Mic2 size={16} aria-hidden="true" /> : row.id === "device" ? <Database size={16} aria-hidden="true" /> : <LayoutDashboard size={16} aria-hidden="true" />}
              <h3>{t(row.title)}</h3>
            </div>
            <strong>{t(row.path)}</strong>
            <p>{t(row.body)}</p>
          </article>
        ))}
      </section>

      <div className={styles.statusStrip}>
        <span>
          <Bell size={14} aria-hidden="true" />
          {t("widget.hybrid.statusServer")}
        </span>
        <span>
          <Bot size={14} aria-hidden="true" />
          {t("widget.hybrid.statusDevice")}
        </span>
      </div>
    </GlassPanel>
  );
}
