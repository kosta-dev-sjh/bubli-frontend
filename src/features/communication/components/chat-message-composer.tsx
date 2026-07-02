"use client";

import { Bot, CheckCircle2, Clock3, FilePlus2, Mic, RefreshCcw, Send, Smile, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./chat-message-composer.module.css";

type SendState = "PENDING_SEND" | "SENT" | "FAILED";

type MessageStateItem = {
  detailKey: MessageKey;
  icon: ReactNode;
  labelKey: MessageKey;
  state: SendState;
};

const messageStates: MessageStateItem[] = [
  {
    detailKey: "chat.composerPanel.state.pendingDetail",
    icon: <Clock3 size={16} />,
    labelKey: "chat.composerPanel.state.pendingLabel",
    state: "PENDING_SEND",
  },
  {
    detailKey: "chat.composerPanel.state.sentDetail",
    icon: <CheckCircle2 size={16} />,
    labelKey: "chat.composerPanel.state.sentLabel",
    state: "SENT",
  },
  {
    detailKey: "chat.composerPanel.state.failedDetail",
    icon: <XCircle size={16} />,
    labelKey: "chat.composerPanel.state.failedLabel",
    state: "FAILED",
  },
];

const commandHints: { commandKey: MessageKey; labelKey: MessageKey }[] = [
  { commandKey: "chat.composerPanel.hint.summaryCommand", labelKey: "chat.composerPanel.hint.summaryLabel" },
  { commandKey: "chat.composerPanel.hint.todoCommand", labelKey: "chat.composerPanel.hint.todoLabel" },
  { commandKey: "chat.composerPanel.hint.questionCommand", labelKey: "chat.composerPanel.hint.questionLabel" },
];

export function ChatMessageComposer() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>{t("chat.composerPanel.chip")}</Chip>
          <h2 className={styles.title}>{t("chat.composerPanel.title")}</h2>
          <p className={styles.description}>
            {t("chat.composerPanel.description")}
          </p>
        </div>
        <StatusBadge tone="communication">{t("chat.composerPanel.badge")}</StatusBadge>
      </header>

      <section className={styles.composeCard} aria-labelledby="member-composer-title">
        <div className={styles.composeHeader}>
          <div>
            <h3 id="member-composer-title">{t("chat.composerPanel.boxTitle")}</h3>
            <span>{t("chat.composerPanel.boxSubtitle")}</span>
          </div>
          <StatusBadge tone="success">{t("chat.composerPanel.memberBadge")}</StatusBadge>
        </div>

        <div className={styles.commandRail} aria-label={t("chat.composerPanel.commandRailAria")}>
          {commandHints.map((hint) => (
            <button key={hint.commandKey} type="button">
              <Bot size={14} />
              <strong>{t(hint.commandKey)}</strong>
              <span>{t(hint.labelKey)}</span>
            </button>
          ))}
        </div>

        <ComposerBox />
      </section>

      <section className={styles.stateSection} aria-labelledby="message-state-title">
        <div className={styles.sectionHeader}>
          <h3 id="message-state-title">{t("chat.composerPanel.stateTitle")}</h3>
          <span>{t("chat.composerPanel.stateSubtitle")}</span>
        </div>
        <div className={styles.stateList}>
          {messageStates.map((item) => (
            <MessageStateCard item={item} key={item.state} />
          ))}
        </div>
      </section>
    </GlassPanel>
  );
}

function ComposerBox() {
  const { t } = useI18n();

  return (
    <div className={styles.composerBox}>
      <div className={styles.textareaWrap}>
        <textarea
          aria-label={t("chat.composerPanel.textareaAria")}
          defaultValue={t("chat.composerPanel.textareaDefault")}
          rows={3}
        />
      </div>
      <div className={styles.toolBar}>
        <div className={styles.leftTools}>
          <ToolButton icon={<Smile size={16} />} label={t("chat.composerPanel.tool.reaction")} />
          <ToolButton icon={<FilePlus2 size={16} />} label={t("chat.composerPanel.tool.attach")} />
          <ToolButton icon={<Mic size={16} />} label={t("chat.composerPanel.tool.voice")} />
        </div>
        <Button icon={<Send size={15} />} size="sm" variant="primary">
          {t("chat.composerPanel.send")}
        </Button>
      </div>
    </div>
  );
}

function ToolButton({ disabled = false, icon, label }: { disabled?: boolean; icon: ReactNode; label: string }) {
  return (
    <button className={styles.toolButton} disabled={disabled} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MessageStateCard({ item }: { item: MessageStateItem }) {
  const { t } = useI18n();
  const tone = item.state === "SENT" ? "success" : item.state === "FAILED" ? "warning" : "pending";
  const label =
    item.state === "SENT"
      ? t("chat.composerPanel.card.doneLabel")
      : item.state === "FAILED"
        ? t("chat.composerPanel.card.retryLabel")
        : t("chat.composerPanel.card.waitLabel");

  return (
    <article className={styles.stateCard}>
      <span className={styles.stateIcon} aria-hidden="true">
        {item.state === "FAILED" ? <RefreshCcw size={16} /> : item.icon}
      </span>
      <div>
        <strong>{t(item.labelKey)}</strong>
        <p>{t(item.detailKey)}</p>
      </div>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </article>
  );
}
