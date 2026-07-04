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
  RefreshCw,
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

// 버블별 셸 아이덴티티(헤더 밴드/아이콘 타일/CTA/칩이 같은 accent를 공유한다).
// todo=sky · timer=amber · chat=rose · memo=cream · schedule=blue · alert=lilac · agent=sage · resource=sand
type BubbleMeta = {
  accent: "amber" | "blue" | "cream" | "lilac" | "rose" | "sage" | "sand" | "sky";
  id: WidgetBubbleType;
  label: MessageKey;
  Icon: typeof CheckCircle2;
};

const bubbleMeta: BubbleMeta[] = [
  { Icon: CheckCircle2, accent: "sky", id: "todo", label: "widget.kind.todo" },
  { Icon: Sparkles, accent: "sage", id: "agent", label: "widget.kind.agent" },
  { Icon: MessageSquare, accent: "rose", id: "chat", label: "widget.kind.chat" },
  { Icon: Timer, accent: "amber", id: "timer", label: "widget.kind.timer" },
  { Icon: StickyNote, accent: "cream", id: "memo", label: "widget.kind.memo" },
  { Icon: Clock3, accent: "blue", id: "schedule", label: "widget.kind.schedule" },
  { Icon: FileText, accent: "sand", id: "resource", label: "widget.kind.resource" },
  { Icon: Bell, accent: "lilac", id: "alert", label: "widget.kind.notification" },
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
  amber: styles.accAmber,
  blue: styles.accBlue,
  cream: styles.accCream,
  lilac: styles.accLilac,
  rose: styles.accRose,
  sage: styles.accSage,
  sand: styles.accSand,
  sky: styles.accSky,
};

// 서버 부분 동기화 실패는 회색 웰 대신 헤더 아래 얇은 상태 한 줄로만 알린다.
function isBubbleSyncPending(bubble: WidgetPreviewBubble) {
  return bubble.notificationLabel === "widget.data.partialIssue" || bubble.panelBody === "widget.data.partialIssueBody";
}

// 동기화 상태 문구가 엠티 스테이트/노트로 중복 노출되지 않게 안전한 라벨로 치환한다.
function bubbleEmptyLabel(bubble: WidgetPreviewBubble) {
  return isBubbleSyncPending(bubble) ? "widget.data.emptyItems" : bubble.notificationLabel;
}

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
  onCreateMemo?: (bubble: WidgetPreviewBubble, body?: string) => Promise<void> | void;
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
        <span>{t(bubbleEmptyLabel(bubble) as MessageKey)}</span>
      </div>
    );
  }

  return (
    <div className={styles.rowList}>
      {bubble.rows.map((item) => (
        <label className={styles.checkRow} key={item.id}>
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
    </div>
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
      {/* 카운트 링은 중앙 부유 대신 요약 카피와 나란히 — 본문이 위에서부터 콘텐츠로 채워진다. */}
      <div className={styles.summaryRow}>
        <div className={styles.countRing}>
          <span>{bubble.metric}</span>
          <b>{t(bubble.metricLabel as MessageKey)}</b>
        </div>
        <div className={styles.summaryCopy}>
          <strong>{t(bubble.panelLabel as MessageKey)}</strong>
          <span>{t(bubbleEmptyLabel(bubble) as MessageKey)}</span>
        </div>
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
  const { t } = useI18n();
  const openAll = () => {
    if (!onOpenHandoff) return;
    void onOpenHandoff({
      handoffUrl: bubble.rows[0]?.handoffUrl ?? "/app",
      id: "alert-open-all",
      kind: "message",
      label: t(bubble.actionLabel as MessageKey),
      status: "",
    });
  };

  return (
    <div className={styles.body}>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />
      <button className={styles.wideAction} onClick={openAll} type="button">
        <Bell size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
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
      {/* 큰 할로 장식 대신 얇은 요약 라인 — 승인 대기 수가 콘텐츠 첫 줄이 된다. */}
      <div className={styles.agentSummary} aria-label={t("widget.agentSignal")}>
        <span className={styles.agentDot} aria-hidden="true" />
        <strong>{t(bubble.panelLabel as MessageKey)}</strong>
        <b>{bubble.metric}</b>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />
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
            <i className={styles.pickerAvatar} aria-hidden="true">
              <MessageSquare size={14} strokeWidth={2} />
            </i>
            <span>{t("widget.chat.openRooms")}</span>
          </button>
          {pickerFriends.slice(0, 3).map((friend) => (
            <button className={styles.chatPickerItem} key={friend.id} onClick={() => openChatPicker(friend.label)} type="button">
              <i className={styles.pickerAvatar} aria-hidden="true">
                <Users size={14} strokeWidth={2} />
              </i>
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
      {/* 모드 전환은 pill 3개가 아니라 하나의 세그먼트 바로 읽혀야 한다. */}
      <div className={styles.segmented} role="group">
        <button aria-pressed="true" type="button">
          {t("widget.timer.tabClock")}
        </button>
        <button type="button">{t("widget.timer.tabWork")}</button>
        <button type="button">{t("widget.timer.tabPomodoro")}</button>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
      <div className={styles.timerActions}>
        <button className={styles.timerPrimary} onClick={() => void onPrimaryTimerAction?.(bubble)} type="button">
          <PrimaryIcon size={13} />
          {t(bubble.actionLabel as MessageKey)}
        </button>
        <button className={styles.timerGhost} disabled={!canPause} onClick={() => void onPauseTimer?.(bubble)} type="button">
          <Pause size={13} />
          {timerStatus === "PAUSED" ? t("widget.timer.paused") : t("widget.timer.pause")}
        </button>
      </div>
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
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  // 단독 "메모 남기기" 버튼 대신 하단 인라인 컴포저(1줄 입력 + 저장)로 바로 남긴다.
  const saveDraftMemo = async () => {
    const body = draft.trim();
    if (!body || !onCreateMemo || submitting) return;

    setSubmitting(true);
    try {
      await onCreateMemo(bubble, body);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.body}>
      {bubble.rows.length > 0 ? (
        <div className={styles.rowList}>
          {bubble.rows.slice(0, 4).map((item) => (
            <div className={styles.memoRow} key={item.id}>
              {item.handoffUrl ? (
                <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
                  <strong>{item.label}</strong>
                </a>
              ) : (
                <strong>{item.label}</strong>
              )}
              <span className={styles.memoTime}>{item.status}</span>
              <span className={styles.memoActions}>
                <button aria-label={t("widget.memo.edit")} disabled={!onEditMemo} onClick={() => void onEditMemo?.(item)} type="button">
                  <Pencil size={12} strokeWidth={2.1} />
                </button>
                <button aria-label={t("widget.memo.delete")} disabled={!onDeleteMemo} onClick={() => void onDeleteMemo?.(item)} type="button">
                  <Trash2 size={12} strokeWidth={2.1} />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>{t(bubbleEmptyLabel(bubble) as MessageKey)}</span>
        </div>
      )}
      <form
        className={[styles.input, styles.composer].join(" ")}
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraftMemo();
        }}
      >
        <StickyNote size={14} strokeWidth={2} />
        <input
          aria-label={t(bubble.actionLabel as MessageKey)}
          disabled={submitting}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : t(bubble.actionLabel as MessageKey)}
          value={draft}
        />
        <button className={styles.composerSave} disabled={submitting || !draft.trim()} type="submit">
          {t("widget.memo.save")}
        </button>
      </form>
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

  const nextItem = bubble.rows[0];
  const restItems = bubble.rows.slice(1);

  return (
    <div className={styles.body}>
      {/* 부유하는 링 대신 "다음 일정" 컴팩트 카드가 첫 콘텐츠다. */}
      {nextItem ? (
        <div className={styles.nextCard}>
          <span className={styles.nextTime}>{nextItem.status}</span>
          <div className={styles.nextCopy}>
            <small>{t(bubble.metricLabel as MessageKey)}</small>
            {nextItem.handoffUrl ? (
              <a href={nextItem.handoffUrl} onClick={(event) => openHandoff(event, nextItem)} rel="noreferrer" target="_blank">
                <strong>{nextItem.label}</strong>
              </a>
            ) : (
              <strong>{nextItem.label}</strong>
            )}
          </div>
          <ItemActions item={nextItem} onItemStateChange={onItemStateChange} />
        </div>
      ) : (
        <div className={styles.nextEmpty}>
          <Clock3 size={13} strokeWidth={2} />
          <span>{t("widget.schedule.noneRemaining")}</span>
        </div>
      )}
      <div className={styles.segmented} role="group">
        <button aria-pressed="true" type="button">
          {t("widget.schedule.tabWeek")}
        </button>
        <button type="button">{t("widget.schedule.tabMonth")}</button>
        <button type="button">{t("widget.schedule.tabWbs")}</button>
      </div>
      {restItems.length > 0 ? (
        <div className={styles.rowList}>
          {restItems.map((item) => (
            <div className={styles.timelineRow} key={item.id}>
              {item.handoffUrl ? (
                <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
              <b>{item.status}</b>
              <ItemActions item={item} onItemStateChange={onItemStateChange} />
            </div>
          ))}
        </div>
      ) : null}
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

  const openAll = () => {
    if (!onOpenHandoff) return;
    void onOpenHandoff({
      handoffUrl: bubble.rows[0]?.handoffUrl ?? "/app/resources",
      id: "resource-open-all",
      kind: "resource",
      label: t(bubble.actionLabel as MessageKey),
      status: "",
    });
  };

  return (
    <div className={styles.body}>
      {bubble.rows.length > 0 ? (
        <div className={styles.rowList}>
          {bubble.rows.map((item) => (
            <div className={styles.fileRow} key={item.id}>
              <i className={styles.rowTile} aria-hidden="true">
                <FileText size={14} strokeWidth={2} />
              </i>
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
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>{t(bubbleEmptyLabel(bubble) as MessageKey)}</span>
        </div>
      )}
      <button className={styles.wideAction} onClick={openAll} type="button">
        <FileText size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
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
                {/* 28px accent 아이콘 타일이 버블 아이덴티티의 앵커다. */}
                <span className={styles.iconTile} aria-hidden="true">
                  <Icon size={15} strokeWidth={2.1} />
                </span>
                <div className={styles.titleCopy}>
                  {/* 헤더 타이틀은 "버블" 접미사 없이 종류명만 쓴다. */}
                  <strong>{t(activeData.label as MessageKey)}</strong>
                  <small>{isPreview ? `${t(modeLabels[mode])} · ${t(activeData.notificationLabel as MessageKey)}` : t(activeData.roomLabel as MessageKey)}</small>
                </div>
              </div>
              <WidgetControls alwaysOnTop={alwaysOnTop} mode={mode} onClose={onClose} onMode={onModeChange} onPin={onToggleAlwaysOnTop} presentation={presentation} />
            </header>

            {/* 부분 동기화 실패는 회색 웰 대신 얇은 상태 한 줄로만. */}
            {mode !== "GHOST" && isBubbleSyncPending(activeData) ? (
              <div className={styles.syncLine} role="status">
                <RefreshCw size={12} strokeWidth={2.2} />
                <span>{t("widget.data.syncPending")}</span>
              </div>
            ) : null}

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
        {/* 알림은 바에 고정된 요소라 맨 왼쪽에 둔다. 접힌 버블 칩과는 구분선으로 분리. */}
        <button
          aria-describedby={previewTarget === "notice" ? BAR_PREVIEW_POPOVER_ID : undefined}
          aria-label={t(notificationSignal.notificationLabel as MessageKey)}
          className={[styles.barNotice, accentClassNames.lilac].join(" ")}
          onBlur={() => hidePreview("notice")}
          onFocus={() => showPreview("notice")}
          onMouseEnter={() => showPreview("notice")}
          onMouseLeave={() => hidePreview("notice")}
          type="button"
        >
          <i className={styles.chipTile} aria-hidden="true">
            <Bell size={11} strokeWidth={2.2} />
          </i>
          <b>{notificationSignal.metric}</b>
        </button>
        <span className={styles.barDivider} aria-hidden="true" />
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
              className={[styles.barItem, accentClassNames[meta.accent]].join(" ")}
              key={`${bubbleType}-${item.windowId ?? index}`}
              onBlur={() => hidePreview(bubbleType)}
              onClick={() => onRestoreBubble(bubbleType, item.windowId ?? bubbleType)}
              onFocus={() => showPreview(bubbleType)}
              onMouseEnter={() => showPreview(bubbleType)}
              onMouseLeave={() => hidePreview(bubbleType)}
              type="button"
            >
              {/* 칩도 버블 아이덴티티를 공유 — 18px 미니 accent 타일 + tabular 카운트. */}
              <i className={styles.chipTile} aria-hidden="true">
                <Icon size={11} strokeWidth={2.2} />
              </i>
              <b>{bubble.metric}</b>
            </button>
          );
        })}
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

  // 44px 오브 바로 아래(8px 간격, 같은 왼쪽 라인)에 패널이 붙는다:
  // Bubli 그라디언트 워드마크 + 오늘 사용 요약 1줄 → accent 타일 바로가기 그리드 → hairline → 액션 rows.
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
          <div className={styles.menuHead}>
            <strong className={styles.menuWordmark}>Bubli</strong>
            {/* 서버 usage-summaries/today 롤업(기기 합산)을 사용자에게 보여주는 유일한 지점. */}
            {usageSummary ? <small className={styles.menuUsage}>{usageSummary}</small> : null}
          </div>
          <div className={styles.menuGrid} aria-label={t("widget.menu.bubbles")}>
            {bubbleMeta.map(({ Icon, accent, id, label }) => (
              <button
                className={[styles.menuShortcut, accentClassNames[accent]].join(" ")}
                key={id}
                onClick={() => onOpenBubble?.(id)}
                role="menuitem"
                type="button"
              >
                <i className={styles.menuTile} aria-hidden="true">
                  <Icon size={13} strokeWidth={2.1} />
                </i>
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
          <div className={styles.menuActions}>
            {actionItems.map(({ Icon, label, onSelect }) => (
              <button
                className={styles.menuActionRow}
                disabled={!onSelect}
                key={label}
                onClick={() => onSelect?.()}
                role="menuitem"
                type="button"
              >
                <Icon size={14} strokeWidth={2} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
