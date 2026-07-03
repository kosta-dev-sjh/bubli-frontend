"use client";

import { type MouseEvent, useState } from "react";
import {
  Bell,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileText,
  Ghost,
  Headphones,
  MessageSquare,
  Mic,
  Minus,
  Pause,
  PhoneOff,
  Pin,
  Play,
  Plus,
  SmilePlus,
  Search,
  Send,
  Sparkles,
  Square,
  StickyNote,
  Timer,
  Users,
  X,
} from "lucide-react";

import {
  getWidgetPreviewBubble,
  widgetNotificationSignal,
  widgetPreviewBubbles,
  type WidgetNotificationSignal,
  type WidgetPreviewBubble,
  type WidgetPreviewItem,
} from "@/features/widget/desktop-widget-preview-data";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import type { WidgetBubbleType, WidgetWindowMode, WidgetWindowState } from "@/lib/tauri/commands";

import styles from "./desktop-widget-bubble.module.css";

type BubbleMeta = {
  accent: "blue" | "lilac" | "rose" | "pearl";
  id: WidgetBubbleType;
  label: MessageKey;
  Icon: typeof CheckCircle2;
};

const bubbleMeta: BubbleMeta[] = [
  { Icon: CheckCircle2, accent: "blue", id: "todo", label: "widget.kind.todo" },
  { Icon: Sparkles, accent: "lilac", id: "agent", label: "widget.kind.agent" },
  { Icon: MessageSquare, accent: "rose", id: "chat", label: "widget.kind.chat" },
  { Icon: Timer, accent: "pearl", id: "timer", label: "widget.kind.timer" },
  { Icon: StickyNote, accent: "pearl", id: "memo", label: "widget.kind.memo" },
  { Icon: Clock3, accent: "blue", id: "schedule", label: "widget.kind.schedule" },
  { Icon: FileText, accent: "lilac", id: "resource", label: "widget.kind.resource" },
  { Icon: Bell, accent: "blue", id: "alert", label: "widget.kind.notification" },
];

const modeLabels: Record<WidgetWindowMode, MessageKey> = {
  DEFAULT: "widget.mode.default",
  GHOST: "widget.mode.ghost",
  MINIMIZED: "widget.mode.minimized",
  TRANSLUCENT: "widget.mode.translucent",
};

const modeClassNames: Record<WidgetWindowMode, string> = {
  DEFAULT: styles.defaultMode,
  GHOST: styles.ghostMode,
  MINIMIZED: styles.minimizedMode,
  TRANSLUCENT: styles.translucentMode,
};

const accentClassNames: Record<BubbleMeta["accent"], string> = {
  blue: styles.shellBlue,
  lilac: styles.shellLilac,
  pearl: styles.shellPearl,
  rose: styles.shellRose,
};

const presentationClassNames = {
  preview: styles.previewShell,
  tauri: styles.tauriShell,
} as const;

export type DesktopWidgetBubbleProps = {
  activeBubble: WidgetBubbleType;
  alwaysOnTop: boolean;
  bubble?: WidgetPreviewBubble;
  clickThrough: boolean;
  mode: WidgetWindowMode;
  onClose: () => void;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
  onLeaveVoice?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onMarkChatRead?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onModeChange: (mode: WidgetWindowMode) => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onCreateMemo?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onRestore?: () => void;
  onSendChatMessage?: (bubble: WidgetPreviewBubble, text: string) => Promise<void> | void;
  onStartVoice?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onPauseTimer?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onPrimaryTimerAction?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onToggleAlwaysOnTop: () => void;
  onToggleVoiceMic?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  presentation?: "preview" | "tauri";
  windowVisible?: boolean;
};

export const desktopWidgetBubbleTypes = widgetPreviewBubbles.map((bubble) => bubble.id);

function getBubbleMeta(bubbleType: WidgetBubbleType) {
  return bubbleMeta.find((item) => item.id === bubbleType) ?? bubbleMeta[0];
}

function WidgetControls({
  alwaysOnTop,
  mode,
  onClose,
  onMode,
  onPin,
  presentation,
}: {
  alwaysOnTop: boolean;
  mode: WidgetWindowMode;
  onClose: () => void;
  onMode: (mode: WidgetWindowMode) => void;
  onPin: () => void;
  presentation: "preview" | "tauri";
}) {
  const { t } = useI18n();
  return (
    <div className={[styles.controls, presentation === "tauri" ? styles.controlsTauri : styles.controlsPreview].join(" ")} aria-label={t("widget.control.aria")}>
      <button aria-pressed={alwaysOnTop} aria-label={t("widget.control.pin")} onClick={onPin} type="button">
        <Pin size={12} strokeWidth={2} />
      </button>
      <button aria-label={t("widget.control.minimize")} onClick={() => onMode("MINIMIZED")} type="button">
        <Minus size={13} strokeWidth={2} />
      </button>
      <button aria-pressed={mode === "GHOST"} aria-label={t("widget.control.ghost")} onClick={() => onMode(mode === "GHOST" ? "DEFAULT" : "GHOST")} type="button">
        <Ghost size={13} strokeWidth={2} />
      </button>
      {presentation === "preview" ? (
        <button aria-pressed={mode === "TRANSLUCENT"} aria-label={t("widget.control.translucent")} onClick={() => onMode(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
          <CircleDashed size={13} strokeWidth={2} />
        </button>
      ) : null}
      <button aria-label={t("widget.control.close")} onClick={onClose} type="button">
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

function ItemActions({
  item,
  onItemStateChange,
}: {
  item: WidgetPreviewItem;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
}) {
  const { t } = useI18n();
  if (!onItemStateChange) return null;

  return (
    <span className={styles.itemActions}>
      <button aria-label={t("widget.item.confirm")} onClick={() => onItemStateChange(item, "CONFIRMED")} type="button">
        <CheckCircle2 size={12} strokeWidth={2} />
      </button>
      <button aria-label={t("widget.item.pin")} onClick={() => onItemStateChange(item, "PINNED")} type="button">
        <Pin size={12} strokeWidth={2} />
      </button>
      <button aria-label={t("widget.item.hide")} onClick={() => onItemStateChange(item, "HIDDEN")} type="button">
        <X size={12} strokeWidth={2} />
      </button>
    </span>
  );
}

function ItemRows({
  bubble,
  onItemStateChange,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
}) {
  const { t } = useI18n();
  if (bubble.rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span>{t(bubble.notificationLabel as MessageKey)}</span>
      </div>
    );
  }

  return (
    <>
      {bubble.rows.map((item) => (
        <label className={styles.checkRow} key={item.label}>
          <input checked={item.checked ?? false} readOnly type="checkbox" />
          <span>{item.label}</span>
          <b>{item.status}</b>
          <ItemActions item={item} onItemStateChange={onItemStateChange} />
        </label>
      ))}
    </>
  );
}

function TodoBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  const { t } = useI18n();
  return (
    <div className={styles.body}>
      <div className={styles.progress}>
        <span>{bubble.metric}</span>
        <b>{t(bubble.metricLabel as MessageKey)}</b>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
      <button className={styles.wideAction} type="button">
        <Plus size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
    </div>
  );
}

function AgentBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  const { t } = useI18n();
  return (
    <div className={styles.body}>
      <div className={styles.agentHalo} aria-label={t("widget.agentSignal")}>
        <span className={styles.agentHaloCore} />
        <span className={styles.agentHaloRing} />
      </div>
      <div className={styles.bubbleNote}>
        <strong>{t(bubble.panelLabel as MessageKey)}</strong>
        <span>{t(bubble.panelBody as MessageKey)}</span>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
      <div className={styles.dropPanel}>
        <FileText size={16} strokeWidth={2} />
        <span>{t(bubble.notificationLabel as MessageKey)}</span>
      </div>
      <label className={styles.input}>
        <Search size={14} strokeWidth={2} />
        <input placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : undefined} />
      </label>
    </div>
  );
}

function ChatBody({
  bubble,
  onItemStateChange,
  onLeaveVoice,
  onMarkChatRead,
  onSendChatMessage,
  onStartVoice,
  onToggleVoiceMic,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onLeaveVoice?: DesktopWidgetBubbleProps["onLeaveVoice"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onSendChatMessage?: DesktopWidgetBubbleProps["onSendChatMessage"];
  onStartVoice?: DesktopWidgetBubbleProps["onStartVoice"];
  onToggleVoiceMic?: DesktopWidgetBubbleProps["onToggleVoiceMic"];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voiceSubmitting, setVoiceSubmitting] = useState(false);
  const visibleRows = bubble.rows.filter((item) => !hiddenIds.includes(item.id));
  const handoffItem = visibleRows.find((item) => item.handoffUrl);
  const agentRows = visibleRows.filter((item) => item.kind === "agent");
  const friendRows = visibleRows.filter((item) => item.kind === "friend");
  const voiceRows = visibleRows.filter((item) => item.kind === "voice");
  const signalRows = visibleRows.filter((item) => !item.handoffUrl && item.kind !== "agent" && item.kind !== "friend" && item.kind !== "voice");
  const [first, second, ...rest] = signalRows;

  const hideAfterHandoff = (id: string) => {
    setHiddenIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewBubble["rows"][number]) => {
    if (!item.handoffUrl) return;

    event.preventDefault();
    if (item.dismissOnOpen) hideAfterHandoff(item.id);
    window.open(item.handoffUrl, "_blank", "noopener,noreferrer");
  };

  const sendDraftMessage = async () => {
    const text = draft.trim();
    if (!text || !onSendChatMessage || submitting) return;

    setSubmitting(true);
    setStatusText(null);
    try {
      await onSendChatMessage(bubble, text);
      setDraft("");
      setStatusText(t("widget.chat.sent"));
    } catch {
      setStatusText(t("widget.chat.sendFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const markRead = async () => {
    if (!onMarkChatRead) return;

    setStatusText(null);
    try {
      await onMarkChatRead(bubble);
      setStatusText(t("widget.chat.markedRead"));
    } catch {
      setStatusText(t("widget.chat.markReadFailed"));
    }
  };

  const runVoiceAction = async (action: "leave" | "mic" | "start") => {
    const handler = action === "start" ? onStartVoice : action === "leave" ? onLeaveVoice : onToggleVoiceMic;
    if (!handler || voiceSubmitting) return;

    setVoiceSubmitting(true);
    setStatusText(null);
    try {
      await handler(bubble);
      setStatusText(action === "start" ? "Voice ready" : action === "leave" ? "Voice left" : "Mic updated");
    } catch {
      setStatusText(action === "start" ? "Voice failed" : action === "leave" ? "Leave failed" : "Mic failed");
    } finally {
      setVoiceSubmitting(false);
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.chatHead}>
        <span>{t(bubble.panelLabel as MessageKey)}</span>
        <b>{visibleRows.length}</b>
      </div>
      <div className={styles.chatPeople}>
        <Users size={14} strokeWidth={2} />
        <span>{friendRows[0]?.label ?? bubble.participantLabels?.join(" · ") ?? t(bubble.roomLabel as MessageKey)}</span>
        <b>{friendRows[0]?.status ?? t("widget.chat.people")}</b>
      </div>
      <div className={styles.voiceStrip}>
        <div>
          <Mic size={14} strokeWidth={2} />
          <span>{voiceRows[0]?.label ?? bubble.voiceLabel ?? t("widget.chat.voiceWaiting")}</span>
          <small>{bubble.voiceParticipants ?? t("widget.chat.noParticipants")}</small>
        </div>
        <button aria-label={t("widget.chat.micStatus")} disabled={!bubble.voiceRoomId || voiceSubmitting} onClick={() => void runVoiceAction("mic")} type="button">
          <Mic size={13} strokeWidth={2} />
        </button>
        <button aria-label={t("widget.chat.startVoice")} disabled={!bubble.roomId || voiceSubmitting} onClick={() => void runVoiceAction("start")} type="button">
          <Headphones size={13} strokeWidth={2} />
        </button>
        <button aria-label={t("widget.chat.leaveVoice")} disabled={!bubble.voiceRoomId || voiceSubmitting} onClick={() => void runVoiceAction("leave")} type="button">
          <PhoneOff size={13} strokeWidth={2} />
        </button>
      </div>
      {handoffItem ? (
        <a className={styles.handoffBubble} href={handoffItem.handoffUrl} onClick={(event) => openHandoff(event, handoffItem)} rel="noreferrer" target="_blank">
          <MessageSquare size={14} strokeWidth={2} />
          <span>{handoffItem.label}</span>
          <b>{handoffItem.handoffLabel ?? handoffItem.status}</b>
        </a>
      ) : (
        <div className={styles.handoffDone}>
          <span>{t("widget.chat.linkShared")}</span>
        </div>
      )}
      {first ? <p className={styles.message}>{first.label}</p> : null}
      {second ? <p className={[styles.message, styles.messageMine].join(" ")}>{second.label}</p> : null}
      {agentRows.map((item) => (
        <div className={styles.agentInlineRow} key={item.id}>
          <Sparkles size={14} strokeWidth={2} />
          <strong>{item.label}</strong>
          <b>{item.status}</b>
          <ItemActions item={item} onItemStateChange={onItemStateChange} />
        </div>
      ))}
      {rest.map((item) => (
        <div className={styles.alertRow} key={item.id}>
          <span />
          <strong>{item.label}</strong>
          <ItemActions item={item} onItemStateChange={onItemStateChange} />
        </div>
      ))}
      <div className={styles.reactionDock} aria-label={t("widget.chat.quickReaction")}>
        <SmilePlus size={14} strokeWidth={2} />
        {(bubble.reactionLabels ?? ["widget.data.reaction.confirm", "widget.data.reaction.like", "widget.data.reaction.later"]).map((label) => (
          <button key={label} onClick={() => void markRead()} type="button">
            {t(label as MessageKey)}
          </button>
        ))}
        {statusText ? <span>{statusText}</span> : null}
      </div>
      <div className={styles.input}>
        <SmilePlus size={14} strokeWidth={2} />
        <input
          disabled={!bubble.chatRoomId || submitting}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendDraftMessage();
            }
          }}
          placeholder={bubble.chatRoomId ? (bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : undefined) : t("widget.chat.selectRoomFirst")}
          value={draft}
        />
        <button aria-label={t("widget.chat.startVoice")} disabled={!bubble.roomId || voiceSubmitting} onClick={() => void runVoiceAction("start")} type="button">
          <Mic size={13} strokeWidth={2} />
        </button>
        <button
          aria-label={t("widget.chat.sendMessage")}
          disabled={!draft.trim() || !bubble.chatRoomId || submitting}
          onClick={() => void sendDraftMessage()}
          type="button"
        >
          <Send size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function TimerBody({
  bubble,
  onItemStateChange,
  onPauseTimer,
  onPrimaryTimerAction,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onPauseTimer?: DesktopWidgetBubbleProps["onPauseTimer"];
  onPrimaryTimerAction?: DesktopWidgetBubbleProps["onPrimaryTimerAction"];
}) {
  const { t } = useI18n();
  const timerStatus = bubble.rows[0]?.status;
  const canPause = timerStatus === "RUNNING";
  const PrimaryIcon = timerStatus === "RUNNING" ? Square : Play;

  return (
    <div className={styles.body}>
      <div className={styles.timer}>
        <strong>{bubble.metric}</strong>
        <span>{t(bubble.metricLabel as MessageKey)}</span>
      </div>
      <div className={styles.segmented}>
        <button aria-pressed="true" type="button">
          {t("widget.timer.tabClock")}
        </button>
        <button type="button">{t("widget.timer.tabWork")}</button>
        <button type="button">{t("widget.timer.tabPomodoro")}</button>
      </div>
      <div className={styles.timerActions}>
        <button disabled={!canPause} onClick={() => void onPauseTimer?.(bubble)} type="button">
          <Pause size={13} />
          {timerStatus === "PAUSED" ? t("widget.timer.paused") : t("widget.timer.pause")}
        </button>
        <button onClick={() => void onPrimaryTimerAction?.(bubble)} type="button">
          <PrimaryIcon size={13} />
          {t(bubble.actionLabel as MessageKey)}
        </button>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
    </div>
  );
}

function MemoBody({ bubble, onCreateMemo }: { bubble: WidgetPreviewBubble; onCreateMemo?: DesktopWidgetBubbleProps["onCreateMemo"] }) {
  const { t } = useI18n();
  return (
    <div className={[styles.body, styles.memoGrid].join(" ")}>
      {bubble.rows.length > 0 ? (
        bubble.rows.map((item) => (
          <article key={item.id}>
            <strong>{item.label}</strong>
            <span>{item.status}</span>
          </article>
        ))
      ) : (
        <div className={styles.emptyState}>
          <span>{t(bubble.notificationLabel as MessageKey)}</span>
        </div>
      )}
      <button className={styles.wideAction} onClick={() => void onCreateMemo?.(bubble)} type="button">
        <Plus size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
    </div>
  );
}

function ScheduleBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  const { t } = useI18n();
  return (
    <div className={styles.body}>
      <div className={styles.ring}>
        <span>{bubble.metric}</span>
        <b>{t(bubble.metricLabel as MessageKey)}</b>
      </div>
      <div className={styles.segmented}>
        <button aria-pressed="true" type="button">
          {t("widget.schedule.tabWeek")}
        </button>
        <button type="button">{t("widget.schedule.tabMonth")}</button>
        <button type="button">{t("widget.schedule.tabWbs")}</button>
      </div>
      <div className={styles.timeline}>
        {bubble.rows.length > 0 ? (
          bubble.rows.map((item) => (
            <span key={item.id}>
              {item.label} · {item.status}
              <ItemActions item={item} onItemStateChange={onItemStateChange} />
            </span>
          ))
        ) : (
          <div className={styles.emptyState}>
            <span>{t(bubble.notificationLabel as MessageKey)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  const { t } = useI18n();
  return (
    <div className={styles.body}>
      <div className={styles.bubbleNote}>
        <strong>{t(bubble.panelLabel as MessageKey)}</strong>
        <span>{t(bubble.panelBody as MessageKey)}</span>
      </div>
      {bubble.rows.map((item) => (
        <div className={styles.fileRow} key={item.id}>
          <FileText size={16} strokeWidth={2} />
          <span>{item.label}</span>
          <b>{item.status}</b>
          <ItemActions item={item} onItemStateChange={onItemStateChange} />
        </div>
      ))}
      {bubble.rows.length === 0 ? (
        <div className={styles.emptyState}>
          <span>{t(bubble.notificationLabel as MessageKey)}</span>
        </div>
      ) : null}
    </div>
  );
}

function BubbleBody({
  bubble,
  onItemStateChange,
  onCreateMemo,
  onLeaveVoice,
  onMarkChatRead,
  onPauseTimer,
  onPrimaryTimerAction,
  onSendChatMessage,
  onStartVoice,
  onToggleVoiceMic,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onCreateMemo?: DesktopWidgetBubbleProps["onCreateMemo"];
  onLeaveVoice?: DesktopWidgetBubbleProps["onLeaveVoice"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onPauseTimer?: DesktopWidgetBubbleProps["onPauseTimer"];
  onPrimaryTimerAction?: DesktopWidgetBubbleProps["onPrimaryTimerAction"];
  onSendChatMessage?: DesktopWidgetBubbleProps["onSendChatMessage"];
  onStartVoice?: DesktopWidgetBubbleProps["onStartVoice"];
  onToggleVoiceMic?: DesktopWidgetBubbleProps["onToggleVoiceMic"];
}) {
  if (bubble.id === "agent") return <AgentBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  if (bubble.id === "chat") {
    return (
      <ChatBody
        bubble={bubble}
        onItemStateChange={onItemStateChange}
        onLeaveVoice={onLeaveVoice}
        onMarkChatRead={onMarkChatRead}
        onSendChatMessage={onSendChatMessage}
        onStartVoice={onStartVoice}
        onToggleVoiceMic={onToggleVoiceMic}
      />
    );
  }
  if (bubble.id === "timer") {
    return <TimerBody bubble={bubble} onItemStateChange={onItemStateChange} onPauseTimer={onPauseTimer} onPrimaryTimerAction={onPrimaryTimerAction} />;
  }
  if (bubble.id === "memo") return <MemoBody bubble={bubble} onCreateMemo={onCreateMemo} />;
  if (bubble.id === "schedule") return <ScheduleBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  if (bubble.id === "resource") return <ResourceBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  return <TodoBody bubble={bubble} onItemStateChange={onItemStateChange} />;
}

function GhostSignal({ bubble }: { bubble: WidgetPreviewBubble }) {
  const { t } = useI18n();
  return (
    <div className={styles.ghostSignal} aria-label={t("widget.ghostAria", { label: t(bubble.label as MessageKey) })}>
      <span>{bubble.metric}</span>
      <strong>{t(bubble.compactLabel as MessageKey)}</strong>
      <small>{t(bubble.notificationLabel as MessageKey)}</small>
    </div>
  );
}

export function DesktopWidgetBubble({
  activeBubble,
  alwaysOnTop,
  bubble,
  clickThrough,
  mode,
  onClose,
  onItemStateChange,
  onLeaveVoice,
  onMarkChatRead,
  onModeChange,
  onCreateMemo,
  onPauseTimer,
  onPrimaryTimerAction,
  onRestore,
  onSendChatMessage,
  onStartVoice,
  onToggleAlwaysOnTop,
  onToggleVoiceMic,
  presentation = "tauri",
  windowVisible = true,
}: DesktopWidgetBubbleProps) {
  const { t } = useI18n();
  const active = getBubbleMeta(activeBubble);
  const activeData = bubble ?? getWidgetPreviewBubble(activeBubble);
  const Icon = active.Icon;
  const isPreview = presentation === "preview";
  const activeLabel = t(active.label);
  const rootClassName = [styles.root, modeClassNames[mode], isPreview ? styles.previewRoot : styles.tauriRoot].filter(Boolean).join(" ");
  const shellClassName = [styles.shell, accentClassNames[active.accent], presentationClassNames[presentation]].join(" ");

  return (
    <div className={rootClassName} data-bubli-desktop-widget>
      <section className={shellClassName} aria-label={t("widget.bubble.suffix", { label: activeLabel })}>
        {!windowVisible ? (
          isPreview ? (
            <button className={styles.hiddenCard} onClick={onRestore ?? (() => onModeChange("DEFAULT"))} type="button">
              <span>{t("widget.hidden")}</span>
              <b>{t("widget.restoreBubble", { label: t(activeData.label as MessageKey) })}</b>
              <small>{t(activeData.notificationLabel as MessageKey)}</small>
            </button>
          ) : null
        ) : mode === "MINIMIZED" ? (
          <button className={styles.dockOrb} onClick={() => onModeChange("DEFAULT")} type="button">
            <span className={styles.dockBubble} aria-hidden="true" />
            <div className={styles.dockCopy}>
              <b>{t(activeData.compactLabel as MessageKey)}</b>
              <small>{t(activeData.notificationLabel as MessageKey)}</small>
            </div>
          </button>
        ) : (
          <>
            <header className={styles.head} data-tauri-drag-region>
              <div className={styles.title}>
                <span className={styles.signal} aria-hidden="true" />
                <Icon size={16} strokeWidth={2} />
                <div className={styles.titleCopy}>
                  <strong>{t("widget.bubble.suffix", { label: t(activeData.label as MessageKey) })}</strong>
                  <small>{isPreview ? `${t(modeLabels[mode])} · ${t(activeData.notificationLabel as MessageKey)}` : t(activeData.roomLabel as MessageKey)}</small>
                </div>
              </div>
              <WidgetControls alwaysOnTop={alwaysOnTop} mode={mode} onClose={onClose} onMode={onModeChange} onPin={onToggleAlwaysOnTop} presentation={presentation} />
            </header>

            {isPreview ? (
              <div className={styles.dragbar} data-tauri-drag-region>
                <span>{t(modeLabels[mode])} · {alwaysOnTop ? t("widget.pinnedTop") : t("widget.normalWindow")} · {clickThrough ? t("widget.clickThrough") : t("widget.clickable")}</span>
                <button aria-pressed={mode === "TRANSLUCENT"} onClick={() => onModeChange(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
                  {t("widget.control.translucent")}
                </button>
              </div>
            ) : null}

            {mode === "GHOST" ? (
              <GhostSignal bubble={activeData} />
            ) : (
              <BubbleBody
                bubble={activeData}
                onItemStateChange={onItemStateChange}
                onLeaveVoice={onLeaveVoice}
                onMarkChatRead={onMarkChatRead}
                onCreateMemo={onCreateMemo}
                onPauseTimer={onPauseTimer}
                onPrimaryTimerAction={onPrimaryTimerAction}
                onSendChatMessage={onSendChatMessage}
                onStartVoice={onStartVoice}
                onToggleVoiceMic={onToggleVoiceMic}
              />
            )}

            {isPreview ? (
              <div className={styles.bubbleNote}>
                <strong>{t(activeData.roomLabel as MessageKey)}</strong>
                <span>{t(activeData.notificationLabel as MessageKey)}</span>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export function DesktopWidgetBubbleBar({
  bubbleDataByType,
  minimizedItems,
  notificationSignal = widgetNotificationSignal,
  onRestoreBubble,
}: {
  bubbleDataByType?: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
  minimizedItems: WidgetWindowState[];
  notificationSignal?: WidgetNotificationSignal;
  onRestoreBubble: (bubbleType: WidgetBubbleType, windowId?: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className={[styles.root, styles.barRoot].join(" ")} data-bubli-desktop-widget>
      <div className={styles.barPreview} aria-hidden="true">
        <strong>{t("widget.bar.folded")}</strong>
        <span>
          {minimizedItems.length > 0
            ? minimizedItems.map((item) => t((bubbleDataByType?.[item.activeBubble as WidgetBubbleType] ?? getWidgetPreviewBubble(item.activeBubble as WidgetBubbleType)).compactLabel as MessageKey)).join(" · ")
            : t("widget.bar.noneFolded")}
        </span>
        <small>
          {notificationSignal.rows[0]?.label ?? t(notificationSignal.notificationLabel as MessageKey)}
        </small>
      </div>
      <nav className={styles.bubbleBar} aria-label={t("widget.bar.minimizedAria")}>
        <div className={styles.barBrand} aria-label={t("widget.bar.notificationState")}>
          <i aria-hidden="true" />
          <span>Bubli</span>
        </div>
        {minimizedItems.map((item, index) => {
          if (!desktopWidgetBubbleTypes.includes(item.activeBubble as WidgetBubbleType)) return null;

          const bubbleType = item.activeBubble as WidgetBubbleType;
          const bubble = bubbleDataByType?.[bubbleType] ?? getWidgetPreviewBubble(bubbleType);
          const meta = getBubbleMeta(bubbleType);
          const Icon = meta.Icon;

          return (
            <button className={styles.barItem} key={`${bubbleType}-${item.windowId ?? index}`} onClick={() => onRestoreBubble(bubbleType, item.windowId ?? bubbleType)} type="button">
              <Icon size={12} strokeWidth={2} />
              <b>{t(bubble.compactLabel as MessageKey)}</b>
            </button>
          );
        })}
        <button className={styles.barNotice} type="button" aria-label={t(notificationSignal.notificationLabel as MessageKey)}>
          <Bell size={12} strokeWidth={2} />
          <b>{notificationSignal.metric}</b>
        </button>
      </nav>
    </div>
  );
}

export function DesktopWidgetMenuOrb({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useI18n();
  return (
    <div className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
      <button className={styles.menuOrb} onClick={onOpenMenu} type="button" aria-label={t("widget.menu.openAria")}>
        <span />
      </button>
      <div className={styles.menuPanel} aria-hidden="true">
        <strong>Bubli</strong>
        <span>{t("widget.menu.desc")}</span>
        <div>
          <span>{t("widget.kind.todo")}</span>
          <span>{t("widget.kind.schedule")}</span>
          <span>{t("widget.kind.chat")}</span>
        </div>
      </div>
    </div>
  );
}
