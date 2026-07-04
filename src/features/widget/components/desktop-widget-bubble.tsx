"use client";

import { type MouseEvent, useState } from "react";
import {
  Bell,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileText,
  Ghost,
  Headphones,
  MessageSquare,
  Mic,
  Minus,
  Pause,
  Pencil,
  PhoneOff,
  Pin,
  Play,
  Plus,
  Power,
  Repeat,
  Settings,
  SmilePlus,
  Search,
  Send,
  Sparkles,
  Square,
  StickyNote,
  Timer,
  Trash2,
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
import { startWidgetWindowDragging, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";

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
  onOpenHandoff?: (item: WidgetPreviewItem) => Promise<void> | void;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
  onLeaveVoice?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onMarkChatRead?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onModeChange: (mode: WidgetWindowMode) => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onCreateMemo?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onCreateSchedule?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onCreateTodo?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onDeleteMemo?: (item: WidgetPreviewItem) => Promise<void> | void;
  onEditMemo?: (item: WidgetPreviewItem) => Promise<void> | void;
  onAnalyzeResource?: (item: WidgetPreviewItem) => Promise<void> | void;
  onDownloadResource?: (item: WidgetPreviewItem) => Promise<void> | void;
  onRestore?: () => void;
  onSendAgentCommand?: (bubble: WidgetPreviewBubble, text: string) => Promise<void> | void;
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

// 위젯 창은 보이는 콘텐츠보다 큰 투명 창이다. 마우스를 받아야 하는 표면(셸/pill/팝오버/메뉴)에만
// data-bubli-interactive를 붙이고, desktop-widget page가 이 셀렉터로 rect를 수집해 Rust 폴러에 보고한다.
export const widgetInteractiveRectSelector = "[data-bubli-interactive]";

// 드래그 시작에서 제외할 조작 요소. 여기서 시작한 mousedown은 클릭/입력으로 처리한다.
const widgetDragIgnoreSelector = "button, input, a, textarea, select, [contenteditable='true']";

// 헤더/드래그 스트립/pill 빈 영역용: 조작 요소가 아니면 즉시 창 드래그를 시작한다.
// data-tauri-drag-region은 target 요소 자체에만 반응해 자식(아이콘/텍스트)에서 끊기므로
// 공식 startDragging 헬퍼를 명시적으로 호출한다(브라우저 미리보기에서는 no-op).
function handleWidgetDragMouseDown(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(widgetDragIgnoreSelector)) return;

  event.preventDefault();
  void startWidgetWindowDragging().catch(() => undefined);
}

// 메뉴 오브처럼 "클릭 동작이 있는 표면"용: 실제로 커서가 움직이기 시작한 경우에만
// 드래그로 전환해 클릭(토글)을 깨지 않는다.
function handleWidgetDragMouseDownDeferred(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0) return;

  const startX = event.clientX;
  const startY = event.clientY;
  const cleanup = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", cleanup);
  };
  const onMove = (moveEvent: globalThis.MouseEvent) => {
    if (Math.abs(moveEvent.clientX - startX) + Math.abs(moveEvent.clientY - startY) < 4) return;
    cleanup();
    void startWidgetWindowDragging().catch(() => undefined);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", cleanup);
}

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
        <Pin size={14} strokeWidth={2} />
      </button>
      <button aria-label={t("widget.control.minimize")} onClick={() => onMode("MINIMIZED")} type="button">
        <Minus size={14} strokeWidth={2} />
      </button>
      <button aria-pressed={mode === "GHOST"} aria-label={t("widget.control.ghost")} onClick={() => onMode(mode === "GHOST" ? "DEFAULT" : "GHOST")} type="button">
        <Ghost size={14} strokeWidth={2} />
      </button>
      {presentation === "preview" ? (
        <button aria-pressed={mode === "TRANSLUCENT"} aria-label={t("widget.control.translucent")} onClick={() => onMode(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
          <CircleDashed size={14} strokeWidth={2} />
        </button>
      ) : null}
      <button aria-label={t("widget.control.close")} onClick={onClose} type="button">
        <X size={14} strokeWidth={2} />
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
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const { t } = useI18n();
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

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
          {item.handoffUrl ? (
            <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
          <b>{item.status}</b>
          <ItemActions item={item} onItemStateChange={onItemStateChange} />
        </label>
      ))}
    </>
  );
}

function TodoBody({
  bubble,
  onCreateTodo,
  onItemStateChange,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onCreateTodo?: DesktopWidgetBubbleProps["onCreateTodo"];
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const { t } = useI18n();
  return (
    <div className={styles.body}>
      <div className={styles.progress}>
        <span>{bubble.metric}</span>
        <b>{t(bubble.metricLabel as MessageKey)}</b>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />
      <button className={styles.wideAction} onClick={() => void onCreateTodo?.(bubble)} type="button">
        <Plus size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
    </div>
  );
}

function AlertBody({
  bubble,
  onItemStateChange,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  return (
    <div className={styles.stack}>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />
    </div>
  );
}

function AgentBody({
  bubble,
  onItemStateChange,
  onOpenHandoff,
  onSendAgentCommand,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
  onSendAgentCommand?: DesktopWidgetBubbleProps["onSendAgentCommand"];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendAgentCommand = async () => {
    const text = draft.trim();
    if (!text || submitting) return;

    if (!bubble.roomId) {
      setStatusText(t("widget.chat.selectRoomFirst"));
      return;
    }

    if (!onSendAgentCommand) return;

    setSubmitting(true);
    setStatusText(null);
    try {
      await onSendAgentCommand(bubble, text);
      setDraft("");
      setStatusText(t("widget.chat.sent"));
    } catch {
      setStatusText(t("widget.chat.sendFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.agentHalo} aria-label={t("widget.agentSignal")}>
        <span className={styles.agentHaloCore} />
        <span className={styles.agentHaloRing} />
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />
      <div className={styles.dropPanel}>
        <FileText size={16} strokeWidth={2} />
        <span>{t(bubble.notificationLabel as MessageKey)}</span>
      </div>
      <form
        className={styles.input}
        onSubmit={(event) => {
          event.preventDefault();
          void sendAgentCommand();
        }}
      >
        <Search size={14} strokeWidth={2} />
        <input
          onChange={(event) => setDraft(event.target.value)}
          placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : undefined}
          value={draft}
        />
        <button aria-label={t("widget.chat.sendMessage")} disabled={submitting || !draft.trim()} type="submit">
          <Send size={13} strokeWidth={2.1} />
        </button>
      </form>
      {statusText ? <span className={styles.statusText}>{statusText}</span> : null}
    </div>
  );
}

function ChatBody({
  bubble,
  onItemStateChange,
  onLeaveVoice,
  onMarkChatRead,
  onOpenHandoff,
  onSendChatMessage,
  onStartVoice,
  onToggleVoiceMic,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onLeaveVoice?: DesktopWidgetBubbleProps["onLeaveVoice"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
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
    if (onOpenHandoff) {
      void onOpenHandoff(item);
      return;
    }
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

  const roomSelected = Boolean(bubble.chatRoomId);
  const voiceOpen = Boolean(bubble.voiceRoomId);

  // 방 미선택: 방/친구 선택이 먼저다. 보이스·반응·입력은 방이 선택된 뒤에만 보여준다.
  if (!roomSelected) {
    const pickerFriends =
      friendRows.length > 0
        ? friendRows.map((item) => ({ id: item.id, label: item.label }))
        : (bubble.participantLabels ?? []).map((label, index) => ({ id: `friend-${index}`, label }));

    const openChatPicker = (label: string) => {
      const pickerItem: WidgetPreviewItem = { handoffUrl: "/app/chat", id: "chat-room-picker", kind: "friend", label, status: "" };
      if (onOpenHandoff) {
        void onOpenHandoff(pickerItem);
        return;
      }
      window.open("/app/chat", "_blank", "noopener,noreferrer");
    };

    return (
      <div className={styles.body}>
        <div className={styles.chatPicker} role="group" aria-label={t("widget.chat.openRooms")}>
          <button className={styles.chatPickerItem} onClick={() => openChatPicker(t("widget.chat.openRooms"))} type="button">
            <MessageSquare size={13} strokeWidth={2} />
            <span>{t("widget.chat.openRooms")}</span>
          </button>
          {pickerFriends.slice(0, 3).map((friend) => (
            <button className={styles.chatPickerItem} key={friend.id} onClick={() => openChatPicker(friend.label)} type="button">
              <Users size={13} strokeWidth={2} />
              <span>{friend.label}</span>
            </button>
          ))}
        </div>
        <span className={styles.statusText}>{t("widget.chat.pickHint")}</span>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <div className={styles.chatHead}>
        <span>{t(bubble.panelLabel as MessageKey)}</span>
        <b>{visibleRows.length}</b>
        {!voiceOpen ? (
          <button aria-label={t("widget.chat.startVoice")} disabled={!bubble.roomId || voiceSubmitting} onClick={() => void runVoiceAction("start")} type="button">
            <Headphones size={13} strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {friendRows.length > 0 || (bubble.participantLabels?.length ?? 0) > 0 ? (
        <div className={styles.chatPeople}>
          <Users size={14} strokeWidth={2} />
          <span>{friendRows[0]?.label ?? bubble.participantLabels?.join(" · ")}</span>
          <b>{friendRows[0]?.status ?? t("widget.chat.people")}</b>
        </div>
      ) : null}
      {voiceOpen ? (
        <div className={styles.voiceStrip}>
          <div>
            <Mic size={14} strokeWidth={2} />
            <span>{voiceRows[0]?.label ?? bubble.voiceLabel ?? t("widget.chat.voiceWaiting")}</span>
            <small>{bubble.voiceParticipants ?? t("widget.chat.noParticipants")}</small>
          </div>
          <button aria-label={t("widget.chat.micStatus")} disabled={voiceSubmitting} onClick={() => void runVoiceAction("mic")} type="button">
            <Mic size={13} strokeWidth={2} />
          </button>
          <button aria-label={t("widget.chat.leaveVoice")} disabled={voiceSubmitting} onClick={() => void runVoiceAction("leave")} type="button">
            <PhoneOff size={13} strokeWidth={2} />
          </button>
        </div>
      ) : null}
      {handoffItem ? (
        <a className={styles.handoffBubble} href={handoffItem.handoffUrl} onClick={(event) => openHandoff(event, handoffItem)} rel="noreferrer" target="_blank">
          <MessageSquare size={14} strokeWidth={2} />
          <span>{handoffItem.label}</span>
          <b>{handoffItem.handoffLabel ?? handoffItem.status}</b>
        </a>
      ) : null}
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
      <div className={styles.reactionDock} aria-label={t("widget.chat.markReadAction")}>
        <CheckCircle2 size={14} strokeWidth={2} />
        <button disabled={!bubble.chatRoomId} onClick={() => void markRead()} type="button">
          {t("widget.chat.markReadAction")}
        </button>
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
          placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : undefined}
          value={draft}
        />
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
        <button onClick={() => void onPrimaryTimerAction?.(bubble)} type="button">
          <PrimaryIcon size={13} />
          {t(bubble.actionLabel as MessageKey)}
        </button>
        <button disabled={!canPause} onClick={() => void onPauseTimer?.(bubble)} type="button">
          <Pause size={13} />
          {timerStatus === "PAUSED" ? t("widget.timer.paused") : t("widget.timer.pause")}
        </button>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
    </div>
  );
}

function MemoBody({
  bubble,
  onCreateMemo,
  onDeleteMemo,
  onEditMemo,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onCreateMemo?: DesktopWidgetBubbleProps["onCreateMemo"];
  onDeleteMemo?: DesktopWidgetBubbleProps["onDeleteMemo"];
  onEditMemo?: DesktopWidgetBubbleProps["onEditMemo"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const { t } = useI18n();
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  return (
    <div className={[styles.body, styles.memoGrid].join(" ")}>
      {bubble.rows.length > 0 ? (
        bubble.rows.map((item) => (
          <article key={item.id}>
            <div className={styles.memoRowHeader}>
              {item.handoffUrl ? (
                <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
                  <strong>{item.label}</strong>
                </a>
              ) : (
                <strong>{item.label}</strong>
              )}
              <span className={styles.memoActions}>
                <button aria-label={t("widget.memo.edit")} disabled={!onEditMemo} onClick={() => void onEditMemo?.(item)} type="button">
                  <Pencil size={12} strokeWidth={2.1} />
                </button>
                <button aria-label={t("widget.memo.delete")} disabled={!onDeleteMemo} onClick={() => void onDeleteMemo?.(item)} type="button">
                  <Trash2 size={12} strokeWidth={2.1} />
                </button>
              </span>
            </div>
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

function ScheduleBody({
  bubble,
  onCreateSchedule,
  onItemStateChange,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onCreateSchedule?: DesktopWidgetBubbleProps["onCreateSchedule"];
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const { t } = useI18n();
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

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
              {item.handoffUrl ? (
                <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
                  {item.label}
                </a>
              ) : (
                item.label
              )}{" "}
              · {item.status}
              <ItemActions item={item} onItemStateChange={onItemStateChange} />
            </span>
          ))
        ) : (
          <div className={styles.emptyState}>
            <span>{t(bubble.notificationLabel as MessageKey)}</span>
          </div>
        )}
      </div>
      <button className={styles.wideAction} onClick={() => void onCreateSchedule?.(bubble)} type="button">
        <Plus size={14} strokeWidth={2} />
        {t("widget.schedule.quickAdd")}
      </button>
    </div>
  );
}

function ResourceBody({
  bubble,
  onAnalyzeResource,
  onDownloadResource,
  onItemStateChange,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onAnalyzeResource?: DesktopWidgetBubbleProps["onAnalyzeResource"];
  onDownloadResource?: DesktopWidgetBubbleProps["onDownloadResource"];
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const { t } = useI18n();
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  return (
    <div className={styles.body}>
      {bubble.rows.map((item) => (
        <div className={styles.fileRow} key={item.id}>
          <FileText size={16} strokeWidth={2} />
          {item.handoffUrl ? (
            <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
          <b>{item.status}</b>
          <span className={styles.resourceActions}>
            <button aria-label={t("resources.common.download")} onClick={() => void onDownloadResource?.(item)} type="button">
              <ExternalLink size={13} strokeWidth={2.1} />
            </button>
            <button aria-label={t("resources.common.analyzeRun")} onClick={() => void onAnalyzeResource?.(item)} type="button">
              <Sparkles size={13} strokeWidth={2.1} />
            </button>
          </span>
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
  onCreateSchedule,
  onCreateTodo,
  onAnalyzeResource,
  onDeleteMemo,
  onEditMemo,
  onDownloadResource,
  onLeaveVoice,
  onMarkChatRead,
  onOpenHandoff,
  onPauseTimer,
  onPrimaryTimerAction,
  onSendAgentCommand,
  onSendChatMessage,
  onStartVoice,
  onToggleVoiceMic,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onCreateMemo?: DesktopWidgetBubbleProps["onCreateMemo"];
  onCreateSchedule?: DesktopWidgetBubbleProps["onCreateSchedule"];
  onCreateTodo?: DesktopWidgetBubbleProps["onCreateTodo"];
  onDeleteMemo?: DesktopWidgetBubbleProps["onDeleteMemo"];
  onEditMemo?: DesktopWidgetBubbleProps["onEditMemo"];
  onAnalyzeResource?: DesktopWidgetBubbleProps["onAnalyzeResource"];
  onDownloadResource?: DesktopWidgetBubbleProps["onDownloadResource"];
  onLeaveVoice?: DesktopWidgetBubbleProps["onLeaveVoice"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
  onPauseTimer?: DesktopWidgetBubbleProps["onPauseTimer"];
  onPrimaryTimerAction?: DesktopWidgetBubbleProps["onPrimaryTimerAction"];
  onSendAgentCommand?: DesktopWidgetBubbleProps["onSendAgentCommand"];
  onSendChatMessage?: DesktopWidgetBubbleProps["onSendChatMessage"];
  onStartVoice?: DesktopWidgetBubbleProps["onStartVoice"];
  onToggleVoiceMic?: DesktopWidgetBubbleProps["onToggleVoiceMic"];
}) {
  if (bubble.id === "agent") {
    return (
      <AgentBody
        bubble={bubble}
        onItemStateChange={onItemStateChange}
        onOpenHandoff={onOpenHandoff}
        onSendAgentCommand={onSendAgentCommand}
      />
    );
  }
  if (bubble.id === "chat") {
    return (
      <ChatBody
        bubble={bubble}
        onItemStateChange={onItemStateChange}
        onLeaveVoice={onLeaveVoice}
        onMarkChatRead={onMarkChatRead}
        onOpenHandoff={onOpenHandoff}
        onSendChatMessage={onSendChatMessage}
        onStartVoice={onStartVoice}
        onToggleVoiceMic={onToggleVoiceMic}
      />
    );
  }
  if (bubble.id === "alert") {
    return <AlertBody bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />;
  }
  if (bubble.id === "timer") {
    return <TimerBody bubble={bubble} onItemStateChange={onItemStateChange} onPauseTimer={onPauseTimer} onPrimaryTimerAction={onPrimaryTimerAction} />;
  }
  if (bubble.id === "memo") {
    return <MemoBody bubble={bubble} onCreateMemo={onCreateMemo} onDeleteMemo={onDeleteMemo} onEditMemo={onEditMemo} onOpenHandoff={onOpenHandoff} />;
  }
  if (bubble.id === "schedule") {
    return <ScheduleBody bubble={bubble} onCreateSchedule={onCreateSchedule} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />;
  }
  if (bubble.id === "resource") {
    return (
      <ResourceBody
        bubble={bubble}
        onAnalyzeResource={onAnalyzeResource}
        onDownloadResource={onDownloadResource}
        onItemStateChange={onItemStateChange}
        onOpenHandoff={onOpenHandoff}
      />
    );
  }
  return <TodoBody bubble={bubble} onCreateTodo={onCreateTodo} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />;
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
  onAnalyzeResource,
  onDeleteMemo,
  onDownloadResource,
  onEditMemo,
  onItemStateChange,
  onLeaveVoice,
  onMarkChatRead,
  onModeChange,
  onCreateMemo,
  onCreateSchedule,
  onCreateTodo,
  onOpenHandoff,
  onPauseTimer,
  onPrimaryTimerAction,
  onRestore,
  onSendAgentCommand,
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
      <section className={shellClassName} aria-label={t("widget.bubble.suffix", { label: activeLabel })} data-bubli-interactive="true">
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
            <header className={styles.head} onMouseDown={handleWidgetDragMouseDown}>
              <div className={styles.title} data-tauri-drag-region>
                <span className={styles.signal} aria-hidden="true" />
                <Icon size={16} strokeWidth={2} />
                <div className={styles.titleCopy}>
                  {/* 헤더 타이틀은 "버블" 접미사 없이 종류명만 쓴다. */}
                  <strong>{t(activeData.label as MessageKey)}</strong>
                  <small>{isPreview ? `${t(modeLabels[mode])} · ${t(activeData.notificationLabel as MessageKey)}` : t(activeData.roomLabel as MessageKey)}</small>
                </div>
              </div>
              <WidgetControls alwaysOnTop={alwaysOnTop} mode={mode} onClose={onClose} onMode={onModeChange} onPin={onToggleAlwaysOnTop} presentation={presentation} />
            </header>

            {isPreview ? (
              <div className={styles.dragbar} data-tauri-drag-region onMouseDown={handleWidgetDragMouseDown}>
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
                onAnalyzeResource={onAnalyzeResource}
                onDeleteMemo={onDeleteMemo}
                onItemStateChange={onItemStateChange}
                onDownloadResource={onDownloadResource}
                onEditMemo={onEditMemo}
                onLeaveVoice={onLeaveVoice}
                onMarkChatRead={onMarkChatRead}
                onCreateMemo={onCreateMemo}
                onCreateSchedule={onCreateSchedule}
                onCreateTodo={onCreateTodo}
                onOpenHandoff={onOpenHandoff}
                onPauseTimer={onPauseTimer}
                onPrimaryTimerAction={onPrimaryTimerAction}
                onSendAgentCommand={onSendAgentCommand}
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

const BAR_PREVIEW_POPOVER_ID = "bubli-bar-preview";

export function DesktopWidgetBubbleBar({
  bubbleDataByType,
  minimizedItems,
  notificationSignal = widgetNotificationSignal,
  onOpenMenu,
  onRestoreBubble,
}: {
  bubbleDataByType?: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
  minimizedItems: WidgetWindowState[];
  notificationSignal?: WidgetNotificationSignal;
  onOpenMenu?: () => void;
  onRestoreBubble: (bubbleType: WidgetBubbleType, windowId?: string) => void;
}) {
  const { t } = useI18n();
  // 접힌 칩에 hover/포커스하면 pill 위 투명 영역에 요약 팝오버를 띄운다.
  const [previewTarget, setPreviewTarget] = useState<WidgetBubbleType | "notice" | null>(null);

  const showPreview = (target: WidgetBubbleType | "notice") => setPreviewTarget(target);
  const hidePreview = (target: WidgetBubbleType | "notice") =>
    setPreviewTarget((current) => (current === target ? null : current));

  const preview = (() => {
    if (!previewTarget) return null;
    if (previewTarget === "notice") {
      return {
        headline: t(notificationSignal.compactLabel as MessageKey),
        Icon: Bell,
        label: t("widget.kind.notification"),
        rows: notificationSignal.rows.slice(0, 2),
        sub: t(notificationSignal.notificationLabel as MessageKey),
      };
    }
    const bubble = bubbleDataByType?.[previewTarget] ?? getWidgetPreviewBubble(previewTarget);
    const meta = getBubbleMeta(previewTarget);
    return {
      headline: t(bubble.compactLabel as MessageKey),
      Icon: meta.Icon,
      label: t(meta.label),
      rows: bubble.rows.slice(0, 2),
      sub: t(bubble.notificationLabel as MessageKey),
    };
  })();
  const PreviewIcon = preview?.Icon;

  // 바 창은 pill 하나만 시각적으로 유지한다(접힘 상시 미리보기 카드 없음).
  // 창 너비는 Rust(widget_bar_window_width)가 칩 수에 맞춰 260~560으로 계산하고,
  // pill 위 남는 투명 영역에는 hover 팝오버만 띄운다.
  // Bubli 버튼은 인라인 메뉴 대신 별도 menu 창(?bubble=menu)을 연다.
  return (
    <div className={[styles.root, styles.barRoot].join(" ")} data-bubli-desktop-widget>
      {preview && PreviewIcon ? (
        <div aria-label={t("widget.bar.previewAria")} className={styles.barPopover} data-bubli-interactive="true" id={BAR_PREVIEW_POPOVER_ID} role="status">
          <div className={styles.barPopoverHead}>
            <PreviewIcon size={13} strokeWidth={2} />
            <strong>{preview.label}</strong>
            <b>{preview.headline}</b>
          </div>
          <small>{preview.sub}</small>
          {preview.rows.length > 0 ? (
            <ul>
              {preview.rows.map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span>
                  {item.detail ? <small>{item.detail}</small> : null}
                  <b>{item.status}</b>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <nav
        aria-label={t("widget.bar.minimizedAria")}
        className={styles.bubbleBar}
        data-bubli-interactive="true"
        onMouseDown={handleWidgetDragMouseDown}
      >
        <button
          className={styles.barBrand}
          aria-haspopup="menu"
          aria-label={t("widget.menu.openAria")}
          onClick={() => onOpenMenu?.()}
          type="button"
        >
          <i aria-hidden="true" />
          <span>Bubli</span>
        </button>
        {minimizedItems.map((item, index) => {
          if (!desktopWidgetBubbleTypes.includes(item.activeBubble as WidgetBubbleType)) return null;

          const bubbleType = item.activeBubble as WidgetBubbleType;
          const bubble = bubbleDataByType?.[bubbleType] ?? getWidgetPreviewBubble(bubbleType);
          const meta = getBubbleMeta(bubbleType);
          const Icon = meta.Icon;

          return (
            <button
              aria-describedby={previewTarget === bubbleType ? BAR_PREVIEW_POPOVER_ID : undefined}
              // 칩은 아이콘+숫자만 표시해 pill이 넘치지 않게 하고, 전체 라벨은 aria와 hover 팝오버가 담당한다.
              aria-label={t(bubble.compactLabel as MessageKey)}
              className={styles.barItem}
              key={`${bubbleType}-${item.windowId ?? index}`}
              onBlur={() => hidePreview(bubbleType)}
              onClick={() => onRestoreBubble(bubbleType, item.windowId ?? bubbleType)}
              onFocus={() => showPreview(bubbleType)}
              onMouseEnter={() => showPreview(bubbleType)}
              onMouseLeave={() => hidePreview(bubbleType)}
              type="button"
            >
              <Icon size={12} strokeWidth={2} />
              <b>{bubble.metric}</b>
            </button>
          );
        })}
        <button
          aria-describedby={previewTarget === "notice" ? BAR_PREVIEW_POPOVER_ID : undefined}
          aria-label={t(notificationSignal.notificationLabel as MessageKey)}
          className={styles.barNotice}
          onBlur={() => hidePreview("notice")}
          onFocus={() => showPreview("notice")}
          onMouseEnter={() => showPreview("notice")}
          onMouseLeave={() => hidePreview("notice")}
          type="button"
        >
          <Bell size={12} strokeWidth={2} />
          <b>{notificationSignal.metric}</b>
        </button>
      </nav>
    </div>
  );
}

export function DesktopWidgetMenuOrb({
  hasRoomContext = false,
  onOpenBubble,
  onOpenMainApp,
  onOpenSettings,
  onQuit,
  onToggleRoomContext,
  usageSummary,
}: {
  hasRoomContext?: boolean;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onOpenMainApp?: () => void;
  onOpenSettings?: () => void;
  onQuit?: () => void;
  onToggleRoomContext?: () => void;
  usageSummary?: string | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const actionItems: Array<{ Icon: typeof Repeat; label: string; onSelect?: () => void }> = [
    {
      Icon: Repeat,
      label: t(hasRoomContext ? "widget.menu.switchToPersonal" : "widget.menu.switchToRoom"),
      onSelect: onToggleRoomContext,
    },
    { Icon: ExternalLink, label: t("widget.menu.openMainApp"), onSelect: onOpenMainApp },
    { Icon: Settings, label: t("widget.menu.openSettings"), onSelect: onOpenSettings },
    { Icon: Power, label: t("widget.menu.quit"), onSelect: onQuit },
  ];

  // 오브에 앵커된 단일 패널: Bubli 헤더 → 전체 버블 바로가기 그리드 → 2×2 액션.
  return (
    <div className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
      <button
        className={styles.menuOrb}
        aria-expanded={open}
        data-bubli-interactive="true"
        aria-haspopup="menu"
        aria-label={t("widget.menu.openAria")}
        onClick={() => setOpen((current) => !current)}
        onMouseDown={handleWidgetDragMouseDownDeferred}
        type="button"
      >
        <span />
      </button>
      {open ? (
        <div
          aria-label={t("widget.menu.title")}
          className={styles.menuPanel}
          data-bubli-interactive="true"
          onMouseDown={handleWidgetDragMouseDown}
          role="menu"
        >
          <strong>Bubli</strong>
          <div className={styles.menuGrid} aria-label={t("widget.menu.bubbles")}>
            {bubbleMeta.map(({ Icon, id, label }) => (
              <button className={styles.barMenuItem} key={id} onClick={() => onOpenBubble?.(id)} role="menuitem" type="button">
                <Icon size={13} strokeWidth={2} />
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
          <div className={styles.menuGrid}>
            {actionItems.map(({ Icon, label, onSelect }) => (
              <button
                className={styles.barMenuItem}
                disabled={!onSelect}
                key={label}
                onClick={() => onSelect?.()}
                role="menuitem"
                type="button"
              >
                <Icon size={13} strokeWidth={2} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {/* 서버 usage-summaries/today 롤업(기기 합산)을 사용자에게 보여주는 유일한 지점. */}
          {usageSummary ? <small className={styles.menuUsage}>{usageSummary}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
