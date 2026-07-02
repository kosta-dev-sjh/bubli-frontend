"use client";

import { Bot, Mic2, MessageCircle, UserPlus, UsersRound } from "lucide-react";

import { BubbleCard } from "@/components/bubbles/bubble-card";
import { ChatMessage } from "@/components/domain/chat-message";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";

export function CommunicationPanel() {
  const { t } = useI18n();

  const summaryItems = [
    {
      body: t("chat.commPanel.feature.directBody"),
      icon: UserPlus,
      title: t("chat.commPanel.feature.directTitle"),
    },
    {
      body: t("chat.commPanel.feature.roomBody"),
      icon: UsersRound,
      title: t("chat.commPanel.feature.roomTitle"),
    },
    {
      body: t("chat.commPanel.feature.voiceBody"),
      icon: Mic2,
      title: t("chat.commPanel.feature.voiceTitle"),
    },
    {
      body: t("chat.commPanel.feature.agentBody"),
      icon: Bot,
      title: t("chat.commPanel.feature.agentTitle"),
    },
    {
      body: t("chat.commPanel.feature.personalBody"),
      icon: MessageCircle,
      title: t("chat.commPanel.feature.personalTitle"),
    },
  ];

  const rooms = [
    {
      badge: t("chat.roomType.room"),
      detail: t("chat.commPanel.roomExampleDetail"),
      title: t("chat.commPanel.roomExampleTitle"),
    },
    {
      badge: t("chat.roomType.direct"),
      detail: t("chat.commPanel.directExampleDetail"),
      title: t("chat.commPanel.directExampleTitle"),
    },
    {
      badge: t("chat.roomType.room"),
      detail: t("chat.commPanel.roomExample2Detail"),
      title: t("chat.commPanel.roomExample2Title"),
    },
  ];

  return (
    <section className="communication-panel" aria-label={t("chat.commPanel.aria")}>
      <div className="communication-panel__summary" aria-label={t("chat.commPanel.summaryAria")}>
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
        <aside className="communication-panel__pane" aria-label={t("chat.commPanel.roomListAria")}>
          <div className="communication-panel__head">
            <div>
              <h2>{t("chat.title")}</h2>
              <p>{t("chat.commPanel.desc")}</p>
            </div>
            <Button size="sm" variant="primary">
              {t("chat.social.addFriend")}
            </Button>
          </div>
          <div className="communication-panel__room-list">
            {rooms.map((room) => (
              <div className="communication-panel__room" key={room.title}>
                <b>{room.title}</b>
                <span>{room.detail}</span>
                <div>
                  <Chip selected={room.badge === t("chat.roomType.room")}>{room.badge}</Chip>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="communication-panel__chat" aria-label={t("chat.commPanel.chatAria")}>
          <div className="communication-panel__head">
          <div>
            <h2>{t("chat.commPanel.roomExampleTitle")}</h2>
              <p>{t("chat.commPanel.chatDesc")}</p>
            </div>
            <StatusBadge tone="communication">{t("chat.commPanel.chatBadge")}</StatusBadge>
          </div>
          <div className="communication-panel__messages">
            <ChatMessage
              author={t("chat.commPanel.msg1Author")}
              message={t("chat.commPanel.msg1Body")}
              roleLabel={t("chat.commPanel.msg1Role")}
              timeLabel="10:24"
            />
            <ChatMessage
              author={t("chat.commPanel.msg2Author")}
              message={t("chat.commPanel.msg2Body")}
              roleLabel={t("chat.commPanel.msg2Role")}
              roleTone="agent"
              timeLabel="10:25"
            />
            <ChatMessage
              author={t("chat.commPanel.msg3Author")}
              message={t("chat.commPanel.msg3Body")}
              mine
              roleLabel={t("chat.commPanel.msg3Role")}
              timeLabel="10:26"
            />
          </div>
          <div className="communication-panel__composer">
            <input aria-label={t("chat.commPanel.composerAria")} placeholder={t("chat.commPanel.composerPlaceholder")} />
            <Button variant="primary">{t("chat.commPanel.send")}</Button>
          </div>
        </section>

        <aside className="communication-panel__pane" aria-label={t("chat.commPanel.sideAria")}>
          <BubbleCard
            className="communication-panel__bubble"
            items={[t("chat.commPanel.bubble1"), t("chat.commPanel.bubble2"), t("chat.commPanel.bubble3")]}
            meta={t("chat.commPanel.bubbleMeta")}
            type="communication"
          />
          <GlassPanel className="communication-panel__side-card">
            <h3>{t("chat.commPanel.accessTitle")}</h3>
            <ul>
              <li>{t("chat.commPanel.access1")}</li>
              <li>{t("chat.commPanel.access2")}</li>
              <li>{t("chat.commPanel.access3")}</li>
            </ul>
          </GlassPanel>
          <GlassPanel className="communication-panel__side-card">
            <h3>{t("chat.commPanel.desktopTitle")}</h3>
            <p>{t("chat.commPanel.desktopBody")}</p>
          </GlassPanel>
        </aside>
      </div>
    </section>
  );
}
