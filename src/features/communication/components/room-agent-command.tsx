"use client";

import { Bot, Database, FileText, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./room-agent-command.module.css";

const commands: { commandKey: MessageKey; titleKey: MessageKey; bodyKey: MessageKey; selected: boolean }[] = [
  {
    commandKey: "chat.agentCommand.cmd1Command",
    titleKey: "chat.agentCommand.cmd1Title",
    bodyKey: "chat.agentCommand.cmd1Body",
    selected: true,
  },
  {
    commandKey: "chat.agentCommand.cmd2Command",
    titleKey: "chat.agentCommand.cmd2Title",
    bodyKey: "chat.agentCommand.cmd2Body",
    selected: false,
  },
  {
    commandKey: "chat.agentCommand.cmd3Command",
    titleKey: "chat.agentCommand.cmd3Title",
    bodyKey: "chat.agentCommand.cmd3Body",
    selected: false,
  },
];

const flowRows: { labelKey: MessageKey; valueKey: MessageKey }[] = [
  { labelKey: "chat.agentCommand.flow1Label", valueKey: "chat.agentCommand.flow1Value" },
  { labelKey: "chat.agentCommand.flow2Label", valueKey: "chat.agentCommand.flow2Value" },
  { labelKey: "chat.agentCommand.flow3Label", valueKey: "chat.agentCommand.flow3Value" },
  { labelKey: "chat.agentCommand.flow4Label", valueKey: "chat.agentCommand.flow4Value" },
];

const chatPreview: { id: string; senderKey: MessageKey; bodyKey: MessageKey; isAgent: boolean }[] = [
  { id: "me", senderKey: "chat.senderMe", bodyKey: "chat.agentCommand.previewMeBody", isAgent: false },
  { id: "friend", senderKey: "chat.commPanel.directExampleTitle", bodyKey: "chat.agentCommand.previewFriendBody", isAgent: false },
  { id: "agent", senderKey: "chat.commPanel.msg2Author", bodyKey: "chat.agentCommand.previewAgentBody", isAgent: true },
];

export function RoomAgentCommand() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <MessageCircle size={16} aria-hidden="true" />
          {t("chat.agentCommand.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("chat.agentCommand.title")}</h2>
            <p className={styles.summary}>
              {t("chat.agentCommand.summary")}
            </p>
          </div>
          <StatusBadge tone="room">{t("chat.agentCommand.memberBadge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.commandComposer} aria-label={t("chat.agentCommand.composerAria")}>
        <div className={styles.composerTop}>
          <Chip selected icon={<Bot size={14} aria-hidden="true" />}>
            {t("chat.agentCommand.agentChip")}
          </Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>{t("chat.agentCommand.excludeChip")}</Chip>
        </div>
        <div className={styles.inputLine}>
          <span>{t("chat.agentCommand.inputCommand")}</span>
          <small>{t("chat.agentCommand.inputHint")}</small>
          <button type="button" aria-label={t("chat.agentCommand.sendAria")}>
            <Send size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className={styles.contentGrid} aria-label={t("chat.agentCommand.contentAria")}>
        <div className={styles.commandList}>
          {commands.map((item) => (
            <article className={item.selected ? styles.commandSelected : styles.commandCard} key={item.commandKey}>
              <strong>{t(item.commandKey)}</strong>
              <h3>{t(item.titleKey)}</h3>
              <p>{t(item.bodyKey)}</p>
            </article>
          ))}
        </div>

        <div className={styles.chatPanel} aria-label={t("chat.agentCommand.chatPreviewAria")}>
          <div className={styles.chatHeader}>
            <div>
              <h3>{t("chat.agentCommand.chatTitle")}</h3>
              <p>{t("chat.agentCommand.chatSource")}</p>
            </div>
            <StatusBadge tone="agent">{t("chat.agentCommand.responseBadge")}</StatusBadge>
          </div>
          <div className={styles.chatList}>
            {chatPreview.map((item) => (
              <div className={item.isAgent ? styles.agentMessage : styles.chatMessage} key={item.id}>
                <span>{t(item.senderKey)}</span>
                <p>{t(item.bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.flowGrid} aria-label={t("chat.agentCommand.flowAria")}>
        {flowRows.map((row) => (
          <article className={styles.flowCard} key={row.labelKey}>
            <span>{t(row.labelKey)}</span>
            <strong>{t(row.valueKey)}</strong>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <span>
          <Database size={14} aria-hidden="true" />
          {t("chat.agentCommand.footer1")}
        </span>
        <span>
          <FileText size={14} aria-hidden="true" />
          {t("chat.agentCommand.footer2")}
        </span>
        <span>
          <Sparkles size={14} aria-hidden="true" />
          {t("chat.agentCommand.footer3")}
        </span>
      </footer>
    </GlassPanel>
  );
}
