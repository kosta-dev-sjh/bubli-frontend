"use client";

import { type MouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  Bell,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileText,
  Ghost,
  Headphones,
  LayoutGrid,
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
// 웹앱과 같은 브랜드 버블 마크(읽기 전용 import) — 바 Bubli 칩(28px)과 메뉴 오브(48px)가 공유한다.
import { BubbleMark } from "@/components/bubbles";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { startWidgetWindowDragging, tauriCommands, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";

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
  // Tauri 창 식별자(리사이즈 커맨드 타깃). 프리뷰에서는 불필요.
  windowId?: string;
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

// ---------- 바/메뉴 모션 사양(motion/react) ----------
// 메뉴 morph(PopoverForm 문법): 바 Bubli 칩 → 위 패널로 layoutId 스프링 morph.
const menuMorphSpring = { damping: 17, mass: 0.85, stiffness: 220, type: "spring" as const };
// 바 칩 등장/퇴장·레이아웃 이동(OverflowActions 문법): 살짝 단단한 스프링.
const barChipSpring = { damping: 22, mass: 0.9, stiffness: 320, type: "spring" as const };
// 알림 구이(gooey) 팝: 칩에서 위로 솟는 말랑 스프링.
const gooPopSpring = { damping: 15, mass: 0.7, stiffness: 260, type: "spring" as const };

// hover 가능한 포인터(데스크톱 마우스/트랙패드)에서만 hover 확대·틸트를 켠다.
function useHoverCapablePointer() {
  const [capable] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  return capable;
}

// 구이(gooey) 필터: blur + 알파 대비로 인접 블롭이 물방울처럼 붙었다 떨어진다.
// 알림 칩 + 팝 버블 "배경 블롭" 그룹에만 적용한다(텍스트/아이콘은 필터 밖에서 또렷하게).
function GooeyFilter({ id = "bubli-goo", strength = 6 }: { id?: string; strength?: number }) {
  return (
    <svg aria-hidden="true" className={styles.gooDefs} focusable="false">
      <defs>
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={strength} />
          <feColorMatrix
            in="blur"
            mode="matrix"
            result="goo"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
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

// 리사이즈 중 말랑(jelly) 오버슈트 스케일의 스텝당 최대치. CSS --jelly-sx/--jelly-sy로 전달되고
// prefers-reduced-motion: reduce에서는 CSS가 transform 자체를 끈다.
const JELLY_MAX_OVERSHOOT = 0.03;
const JELLY_DAMPING = 0.0015;

type BubbleResizeDragState = {
  frame: number | null;
  lastSent: { height: number; width: number } | null;
  pending: { height: number; width: number } | null;
  pointerId: number;
  startHeight: number;
  startWidth: number;
  startX: number;
  startY: number;
};

// 우하단 16px 코너 핸들 드래그로 창 크기를 라이브 조절한다(논리 px = CSS px).
// rAF당 1회만 resize_widget_window를 호출하고(min/max 클램프는 Rust), 드래그 종료 시
// commit=true로 최종 크기를 SQLite에 저장한다. 드래그 델타를 감쇠시킨 미세 스케일을
// CSS 변수로 흘려 말랑한 스퀴시를 만들고, 놓으면 스프링 트랜지션으로 복귀한다.
function useBubbleWindowResize(
  activeBubble: WidgetBubbleType,
  windowId: string | undefined,
  shellRef: { current: HTMLElement | null },
) {
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<BubbleResizeDragState | null>(null);

  const flushResize = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.frame = null;
    const pending = drag.pending;
    if (!pending) return;
    drag.pending = null;
    drag.lastSent = pending;
    void tauriCommands
      .resizeWidgetWindow({ bubbleType: activeBubble, height: pending.height, width: pending.width, windowId })
      .catch(() => undefined);
  }, [activeBubble, windowId]);

  const clearJelly = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.style.removeProperty("--jelly-sx");
    shell.style.removeProperty("--jelly-sy");
  }, [shellRef]);

  const onResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      frame: null,
      lastSent: null,
      pending: null,
      pointerId: event.pointerId,
      startHeight: window.innerHeight,
      startWidth: window.innerWidth,
      // 창 자체가 커지므로 client 좌표 대신 screen 좌표로 델타를 계산한다.
      startX: event.screenX,
      startY: event.screenY,
    };
    setResizing(true);
  }, []);

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const width = drag.startWidth + (event.screenX - drag.startX);
      const height = drag.startHeight + (event.screenY - drag.startY);
      const referenceWidth = drag.lastSent?.width ?? drag.startWidth;
      const referenceHeight = drag.lastSent?.height ?? drag.startHeight;
      drag.pending = { height, width };

      const shell = shellRef.current;
      if (shell) {
        const sx = 1 + Math.max(-JELLY_MAX_OVERSHOOT, Math.min(JELLY_MAX_OVERSHOOT, (width - referenceWidth) * JELLY_DAMPING));
        const sy = 1 + Math.max(-JELLY_MAX_OVERSHOOT, Math.min(JELLY_MAX_OVERSHOOT, (height - referenceHeight) * JELLY_DAMPING));
        shell.style.setProperty("--jelly-sx", sx.toFixed(4));
        shell.style.setProperty("--jelly-sy", sy.toFixed(4));
      }

      if (drag.frame === null) {
        drag.frame = window.requestAnimationFrame(flushResize);
      }
    },
    [flushResize, shellRef],
  );

  const onResizePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      if (drag.frame !== null) window.cancelAnimationFrame(drag.frame);
      clearJelly();
      setResizing(false);

      const finalSize = drag.pending ?? drag.lastSent;
      if (!finalSize) return;
      void tauriCommands
        .resizeWidgetWindow({
          bubbleType: activeBubble,
          commit: true,
          height: finalSize.height,
          width: finalSize.width,
          windowId,
        })
        .catch(() => undefined);
    },
    [activeBubble, clearJelly, windowId],
  );

  useEffect(() => {
    return () => {
      const drag = dragRef.current;
      if (drag?.frame != null) window.cancelAnimationFrame(drag.frame);
      dragRef.current = null;
    };
  }, []);

  return { onResizePointerDown, onResizePointerEnd, onResizePointerMove, resizing };
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
  windowId,
  windowVisible = true,
}: DesktopWidgetBubbleProps) {
  const { t } = useI18n();
  const active = getBubbleMeta(activeBubble);
  const activeData = bubble ?? getWidgetPreviewBubble(activeBubble);
  const Icon = active.Icon;
  const isPreview = presentation === "preview";
  const activeLabel = t(active.label);
  const shellRef = useRef<HTMLElement | null>(null);
  const { onResizePointerDown, onResizePointerEnd, onResizePointerMove, resizing } = useBubbleWindowResize(
    activeBubble,
    windowId,
    shellRef,
  );
  // 버블 셸 미세 틸트(InteractiveCard-lite): 포인터 추적 최대 ±2.5°, DEFAULT 모드 +
  // hover 가능 포인터 + reduced-motion 아님일 때만. 젤리 hover scale(1.01)과 싸우지 않도록
  // CSS 변수(--tilt-rx/--tilt-ry)로만 흘리고 transform은 CSS 한 곳에서 합성한다.
  // 복귀는 기존 오버슈트 트랜지션(스프링 감성)이 담당한다.
  const hoverCapable = useHoverCapablePointer();
  const prefersReducedMotion = useReducedMotion();
  const tiltFrameRef = useRef<number | null>(null);
  const tiltPendingRef = useRef<{ rx: number; ry: number } | null>(null);
  const tiltEnabled =
    presentation === "tauri" && windowVisible && mode === "DEFAULT" && hoverCapable && !prefersReducedMotion && !resizing;

  // 틸트는 React 상태 없이 DOM(CSS 변수 + data-bubli-tilting)만 만진다 — 포인터마다 리렌더 금지.
  const clearShellTilt = useCallback(() => {
    if (tiltFrameRef.current !== null) {
      window.cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }
    tiltPendingRef.current = null;
    const shell = shellRef.current;
    if (shell) {
      shell.style.removeProperty("--tilt-rx");
      shell.style.removeProperty("--tilt-ry");
      delete shell.dataset.bubliTilting;
    }
  }, []);

  const handleShellTiltMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!tiltEnabled) return;
      const shell = shellRef.current;
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const TILT_MAX_DEG = 2.5;
      const nx = Math.min(0.5, Math.max(-0.5, (event.clientX - rect.left) / rect.width - 0.5));
      const ny = Math.min(0.5, Math.max(-0.5, (event.clientY - rect.top) / rect.height - 0.5));
      tiltPendingRef.current = { rx: -ny * 2 * TILT_MAX_DEG, ry: nx * 2 * TILT_MAX_DEG };
      if (tiltFrameRef.current !== null) return;
      tiltFrameRef.current = window.requestAnimationFrame(() => {
        tiltFrameRef.current = null;
        const pending = tiltPendingRef.current;
        const target = shellRef.current;
        if (!pending || !target) return;
        target.style.setProperty("--tilt-rx", `${pending.rx.toFixed(2)}deg`);
        target.style.setProperty("--tilt-ry", `${pending.ry.toFixed(2)}deg`);
        target.dataset.bubliTilting = "true";
      });
    },
    [tiltEnabled],
  );

  // 리사이즈 시작·모드 전환으로 틸트 조건이 꺼지면 잔여 기울기를 즉시 정리한다.
  useEffect(() => {
    if (!tiltEnabled) clearShellTilt();
  }, [clearShellTilt, tiltEnabled]);
  useEffect(() => clearShellTilt, [clearShellTilt]);
  // 드래그 시작 스쿼시: 헤더 mousedown이 실제 창 드래그로 이어질 때만 잠깐 눌린 느낌을 준다.
  const [dragSquash, setDragSquash] = useState(false);
  const squashTimeoutRef = useRef<number | null>(null);
  const handleHeaderMouseDown = (event: MouseEvent<HTMLElement>) => {
    handleWidgetDragMouseDown(event);
    if (!event.defaultPrevented || isPreview) return;
    setDragSquash(true);
    if (squashTimeoutRef.current !== null) window.clearTimeout(squashTimeoutRef.current);
    squashTimeoutRef.current = window.setTimeout(() => setDragSquash(false), 320);
  };
  useEffect(() => {
    return () => {
      if (squashTimeoutRef.current !== null) window.clearTimeout(squashTimeoutRef.current);
    };
  }, []);
  const resizable = !isPreview && windowVisible && mode !== "MINIMIZED" && mode !== "GHOST";
  const rootClassName = [styles.root, modeClassNames[mode], isPreview ? styles.previewRoot : styles.tauriRoot].filter(Boolean).join(" ");
  const shellClassName = [
    styles.shell,
    accentClassNames[active.accent],
    presentationClassNames[presentation],
    resizing ? styles.shellResizing : "",
    dragSquash && !resizing ? styles.shellSquash : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} data-bubli-desktop-widget>
      <section
        className={shellClassName}
        aria-label={t("widget.bubble.suffix", { label: activeLabel })}
        data-bubli-interactive="true"
        onPointerLeave={tiltEnabled ? clearShellTilt : undefined}
        onPointerMove={tiltEnabled ? handleShellTiltMove : undefined}
        ref={shellRef}
      >
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
            <header className={styles.head} onMouseDown={handleHeaderMouseDown}>
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

            {/* 우하단 16px 커스텀 리사이즈 핸들 — hover 시에만 보인다(바/메뉴/고스트/최소화 제외). */}
            {resizable ? (
              <button
                aria-label={t("widget.resize.handleAria")}
                className={styles.resizeHandle}
                onPointerCancel={onResizePointerEnd}
                onPointerDown={onResizePointerDown}
                onPointerMove={onResizePointerMove}
                onPointerUp={onResizePointerEnd}
                type="button"
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

const BAR_PREVIEW_POPOVER_ID = "bubli-bar-preview";

// 아무 상호작용 없이 이 시간이 지나면 바가 옅어진다(hover 시 즉시 복귀 — CSS 200ms).
const BAR_IDLE_FADE_MS = 8000;

// 접힌 칩은 전부 바에 노출한다 — "+N" 접기·잘림 없음. 칩이 아이콘 전용 36px 타일이라
// 최악 조합(7개 + 타이머 시간 텍스트)도 Rust WIDGET_BAR_WIDTH(640 고정)를 넘지 않는다.
// 알림 버블 칩은 바 맨 왼쪽의 고정 알림 칩과 완전히 중복(같은 종·같은 카운트)이라 제외하고,
// 알림 버블 복원은 Bubli 메뉴의 바로가기 그리드가 담당한다.
function collectBarFoldedItems(minimizedItems: WidgetWindowState[]) {
  // 버블 타입별로 칩 하나만 남긴다. 레거시 레이아웃이 같은 버블을 여러 windowId로 들고 있어도
  // 같은 버블 칩이 두 개 뜨거나, 두 칩이 같은 버블 창을 중복 복원하는 일이 없어야 한다.
  const seenBubbles = new Set<string>();
  return minimizedItems.filter((item) => {
    if (!desktopWidgetBubbleTypes.includes(item.activeBubble as WidgetBubbleType) || item.activeBubble === "alert") {
      return false;
    }
    if (seenBubbles.has(item.activeBubble)) return false;
    seenBubbles.add(item.activeBubble);
    return true;
  });
}

// 아이콘 전용 칩의 카운트 배지(16px, 우상단). 0/비숫자면 배지를 그리지 않는다.
function barChipBadge(metric: string) {
  const count = Number.parseInt(metric, 10);
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

// Bubli 메뉴 패널 본문: 바 인라인 패널(기본)과 (deprecated) 메뉴 오브 창이 같은 내용을 공유한다.
// 버블 바로가기 그리드 + 자동 정렬/룸 전환/메인 앱/설정/종료 + 오늘 사용 요약 한 줄.
type WidgetMenuContentProps = {
  hasRoomContext?: boolean;
  onArrangeBubbles?: () => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onOpenMainApp?: () => void;
  onOpenSettings?: () => void;
  onQuit?: () => void;
  onToggleRoomContext?: () => void;
  usageSummary?: string | null;
};

function WidgetMenuPanelContent({
  hasRoomContext = false,
  onArrangeBubbles,
  onOpenBubble,
  onOpenMainApp,
  onOpenSettings,
  onQuit,
  onToggleRoomContext,
  usageSummary,
}: WidgetMenuContentProps) {
  const { t } = useI18n();
  const actionItems: Array<{ Icon: typeof Repeat; label: string; onSelect?: () => void }> = [
    // 열린 버블 창들을 우상단 그리드로 정리하는 arrange_widget_windows 바로가기.
    { Icon: LayoutGrid, label: t("widget.menu.arrange"), onSelect: onArrangeBubbles },
    {
      Icon: Repeat,
      label: t(hasRoomContext ? "widget.menu.switchToPersonal" : "widget.menu.switchToRoom"),
      onSelect: onToggleRoomContext,
    },
    { Icon: ExternalLink, label: t("widget.menu.openMainApp"), onSelect: onOpenMainApp },
    { Icon: Settings, label: t("widget.menu.openSettings"), onSelect: onOpenSettings },
    { Icon: Power, label: t("widget.menu.quit"), onSelect: onQuit },
  ];

  return (
    <>
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
    </>
  );
}

// 바 Bubli 칩 ↔ 위 패널이 공유하는 morph layoutId(PopoverForm 문법).
const BAR_MENU_MORPH_ID = "bubli-bar-menu-morph";

export function DesktopWidgetBubbleBar({
  bubbleDataByType,
  hasRoomContext = false,
  minimizedItems,
  notificationSignal = widgetNotificationSignal,
  onArrangeBubbles,
  onOpenBubble,
  onOpenMainApp,
  onOpenSettings,
  onQuit,
  onRestoreBubble,
  onToggleRoomContext,
  usageSummary,
}: {
  bubbleDataByType?: Partial<Record<WidgetBubbleType, WidgetPreviewBubble>>;
  hasRoomContext?: boolean;
  minimizedItems: WidgetWindowState[];
  notificationSignal?: WidgetNotificationSignal;
  onArrangeBubbles?: () => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onOpenMainApp?: () => void;
  onOpenSettings?: () => void;
  onQuit?: () => void;
  onRestoreBubble: (bubbleType: WidgetBubbleType) => void;
  onToggleRoomContext?: () => void;
  usageSummary?: string | null;
}) {
  const { t } = useI18n();
  const hoverCapable = useHoverCapablePointer();
  const prefersReducedMotion = useReducedMotion();
  // 접힌 칩에 hover/포커스하면 pill 위 투명 영역에 요약 팝오버를 띄운다.
  const [previewTarget, setPreviewTarget] = useState<WidgetBubbleType | "notice" | null>(null);
  // 알림 버블 칩만 제외(고정 알림 칩과 중복)하고 접힌 칩은 전부 노출한다.
  const visibleItems = collectBarFoldedItems(minimizedItems);

  // Bubli 메뉴는 별도 오브 창이 아니라 바 창 안 인라인 패널이다: 브랜드 칩이 앵커,
  // 클릭하면 pill 위 투명 영역으로 layoutId morph(스프링) — 바깥 클릭/ESC로 닫힌다.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuPanelRef.current?.contains(target) || menuAnchorRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);
  const closeMenuAnd = (action?: () => void) => {
    setMenuOpen(false);
    action?.();
  };

  // 알림 구이(gooey) 팝: 미확인 알림 수가 "증가"할 때만 알림 칩에서 제목 버블이 솟는다.
  // 첫 데이터 수신(baseline)은 팝하지 않고, 3초 유지 후 칩으로 다시 흡수된다.
  const parsedUnread = Number.parseInt(notificationSignal.metric, 10);
  const unreadCount = Number.isFinite(parsedUnread) ? parsedUnread : null;
  const latestNotificationTitle = notificationSignal.rows[0]?.label ?? null;
  const previousUnreadRef = useRef<number | null>(null);
  const [gooPop, setGooPop] = useState<{ id: number; title: string } | null>(null);
  useEffect(() => {
    if (unreadCount === null) return;
    const previous = previousUnreadRef.current;
    previousUnreadRef.current = unreadCount;
    if (previous === null || unreadCount <= previous) return;
    setGooPop({ id: Date.now(), title: latestNotificationTitle ?? "" });
  }, [latestNotificationTitle, unreadCount]);
  useEffect(() => {
    if (!gooPop) return;
    const timeoutId = window.setTimeout(() => setGooPop(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [gooPop]);
  const gooPopVisible = Boolean(gooPop && gooPop.title.trim());

  // idle 페이드: 8초 무상호작용 → 옅게(0.55), hover/포커스 → 즉시 1.0(CSS).
  const [barIdle, setBarIdle] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const armIdleTimer = useCallback(() => {
    setBarIdle(false);
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setBarIdle(true), BAR_IDLE_FADE_MS);
  }, []);
  useEffect(() => {
    // 마운트 직후 첫 idle 카운트다운만 시작한다(동기 setState 금지 — 이후 재무장은 이벤트 핸들러가 한다).
    idleTimerRef.current = window.setTimeout(() => setBarIdle(true), BAR_IDLE_FADE_MS);
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

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

  // 칩 등장/퇴장(OverflowActions 문법): blur+opacity+scale 스프링, reduced-motion은 페이드만.
  const chipEnterExit = prefersReducedMotion
    ? { animate: { opacity: 1 }, exit: { opacity: 0 }, initial: { opacity: 0 } }
    : {
        animate: { filter: "blur(0px)", opacity: 1, scale: 1 },
        exit: { filter: "blur(4px)", opacity: 0, scale: 0.6 },
        initial: { filter: "blur(4px)", opacity: 0, scale: 0.6 },
      };
  const chipWhileHover = hoverCapable && !prefersReducedMotion ? { scale: 1.04 } : undefined;
  const chipWhileTap = prefersReducedMotion ? undefined : { scale: 0.96 };
  const gooEnter = prefersReducedMotion ? { opacity: 0 } : { opacity: 1, scale: 0, y: 12 };
  const gooShown = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 };
  const gooExit = prefersReducedMotion ? { opacity: 0 } : { opacity: 1, scale: 0, y: 10 };

  // 바 창은 pill 하나만 시각적으로 유지한다(접힘 상시 미리보기 카드 없음).
  // 창 너비는 Rust(WIDGET_BAR_WIDTH)가 640 고정이고 칩이 아이콘 전용 36px 타일이라
  // 접힌 칩 전부(알림 버블 제외 최대 7개)가 어떤 조합에서도 창을 넘지 않는다 — "+N" 없음.
  // pill 위 투명 영역에는 hover 팝오버와 Bubli 메뉴 morph 패널이 뜬다(absolute라 pill이 밀리지 않는다).
  // 창 높이는 Rust WIDGET_BAR_HEIGHT(430)가 패널(≈352px)을 수용한다.
  return (
    <MotionConfig reducedMotion="user">
      <div className={[styles.root, styles.barRoot].join(" ")} data-bubli-desktop-widget>
        <GooeyFilter />
        {preview && PreviewIcon && !menuOpen ? (
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
        {/* Bubli 메뉴: 브랜드 칩에서 pill 위 280px 패널로 morph(스프링 220/17/0.85). 본문은 blur 페이드 인. */}
        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              aria-label={t("widget.menu.title")}
              className={styles.barMenuPanel}
              data-bubli-interactive="true"
              key="bubli-bar-menu"
              layoutId={BAR_MENU_MORPH_ID}
              onMouseDown={handleWidgetDragMouseDown}
              ref={menuPanelRef}
              role="menu"
              style={{ borderRadius: 20 }}
              transition={menuMorphSpring}
            >
              <motion.div
                animate={prefersReducedMotion ? { opacity: 1 } : { filter: "blur(0px)", opacity: 1, y: 0 }}
                className={styles.barMenuInner}
                exit={prefersReducedMotion ? { opacity: 0 } : { filter: "blur(4px)", opacity: 0, y: 6 }}
                initial={prefersReducedMotion ? { opacity: 0 } : { filter: "blur(6px)", opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <WidgetMenuPanelContent
                  hasRoomContext={hasRoomContext}
                  onArrangeBubbles={onArrangeBubbles ? () => closeMenuAnd(onArrangeBubbles) : undefined}
                  onOpenBubble={onOpenBubble ? (bubbleType) => closeMenuAnd(() => onOpenBubble(bubbleType)) : undefined}
                  onOpenMainApp={onOpenMainApp ? () => closeMenuAnd(onOpenMainApp) : undefined}
                  onOpenSettings={onOpenSettings ? () => closeMenuAnd(onOpenSettings) : undefined}
                  onQuit={onQuit ? () => closeMenuAnd(onQuit) : undefined}
                  onToggleRoomContext={onToggleRoomContext ? () => closeMenuAnd(onToggleRoomContext) : undefined}
                  usageSummary={usageSummary}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <nav
          aria-label={t("widget.bar.minimizedAria")}
          className={[styles.bubbleBar, barIdle ? styles.barIdle : ""].filter(Boolean).join(" ")}
          data-bubli-interactive="true"
          onFocusCapture={armIdleTimer}
          onMouseDownCapture={handleWidgetDragMouseDownDeferred}
          onMouseDown={handleWidgetDragMouseDown}
          onMouseEnter={armIdleTimer}
          onMouseLeave={armIdleTimer}
        >
          {/* 알림은 바에 고정된 요소라 맨 왼쪽에 둔다. 접힌 버블 칩과는 구분선으로 분리.
              새 알림이 늘면 칩 위로 goo 버블(제목 1줄)이 솟았다가 3초 뒤 흡수된다. */}
          <span className={styles.noticeWrap}>
            <span aria-hidden="true" className={styles.gooGroup}>
              <span className={styles.gooSeed} />
              <AnimatePresence>
                {gooPopVisible && gooPop ? (
                  <motion.span
                    animate={gooShown}
                    className={styles.gooBlob}
                    exit={gooExit}
                    initial={gooEnter}
                    key={gooPop.id}
                    transition={gooPopSpring}
                  >
                    {gooPop.title}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </span>
            <motion.button
              aria-describedby={previewTarget === "notice" ? BAR_PREVIEW_POPOVER_ID : undefined}
              aria-label={t(notificationSignal.notificationLabel as MessageKey)}
              className={[styles.barChip, accentClassNames.lilac].join(" ")}
              onBlur={() => hidePreview("notice")}
              onFocus={() => showPreview("notice")}
              onMouseEnter={() => showPreview("notice")}
              onMouseLeave={() => hidePreview("notice")}
              type="button"
              whileHover={chipWhileHover}
              whileTap={chipWhileTap}
            >
              <Bell size={15} strokeWidth={2.1} aria-hidden="true" />
              {barChipBadge(notificationSignal.metric) ? (
                <i className={styles.chipBadge} aria-hidden="true">
                  {barChipBadge(notificationSignal.metric)}
                </i>
              ) : null}
            </motion.button>
            <AnimatePresence>
              {gooPopVisible && gooPop ? (
                <motion.button
                  animate={gooShown}
                  aria-label={t("widget.bar.notificationPopAria")}
                  className={styles.gooLabel}
                  data-bubli-interactive="true"
                  exit={gooExit}
                  initial={gooEnter}
                  key={gooPop.id}
                  onClick={() => {
                    setGooPop(null);
                    onRestoreBubble("alert");
                  }}
                  transition={gooPopSpring}
                  type="button"
                >
                  {gooPop.title}
                </motion.button>
              ) : null}
            </AnimatePresence>
          </span>
          <span className={styles.barDivider} aria-hidden="true" data-bubli-interactive="true" data-tauri-drag-region />
          {/* Bubli 브랜드 칩: 웹앱과 같은 28px 버블 마크 + 메뉴 morph 앵커(layoutId 공유). */}
          <motion.button
            className={styles.barBrand}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t("widget.menu.openAria")}
            layoutId={BAR_MENU_MORPH_ID}
            onClick={() => setMenuOpen((current) => !current)}
            ref={menuAnchorRef}
            style={{ borderRadius: 12 }}
            title={t("widget.menu.openAria")}
            transition={menuMorphSpring}
            type="button"
            whileHover={chipWhileHover}
            whileTap={chipWhileTap}
          >
            <BubbleMark size="md" />
          </motion.button>
          <AnimatePresence initial={false} mode="popLayout">
            {visibleItems.map((item) => {
              const bubbleType = item.activeBubble as WidgetBubbleType;
              const bubble = bubbleDataByType?.[bubbleType] ?? getWidgetPreviewBubble(bubbleType);
              const meta = getBubbleMeta(bubbleType);
              const Icon = meta.Icon;
              // 칩은 아이콘 전용 36px 타일 + 우상단 16px 카운트 배지(>0일 때만).
              // 타이머만 배지 대신 컴팩트 시간 텍스트를 보여준다. 전체 라벨은 aria/hover 팝오버 담당.
              const isTimerChip = bubbleType === "timer";
              const badge = isTimerChip ? null : barChipBadge(bubble.metric);

              return (
                <motion.button
                  layout
                  {...chipEnterExit}
                  aria-describedby={previewTarget === bubbleType ? BAR_PREVIEW_POPOVER_ID : undefined}
                  aria-label={t(bubble.compactLabel as MessageKey)}
                  className={[styles.barChip, isTimerChip ? styles.barTimerChip : "", accentClassNames[meta.accent]]
                    .filter(Boolean)
                    .join(" ")}
                  key={bubbleType}
                  onBlur={() => hidePreview(bubbleType)}
                  onClick={() => onRestoreBubble(bubbleType)}
                  onFocus={() => showPreview(bubbleType)}
                  onMouseEnter={() => showPreview(bubbleType)}
                  onMouseLeave={() => hidePreview(bubbleType)}
                  transition={barChipSpring}
                  type="button"
                  whileHover={chipWhileHover}
                  whileTap={chipWhileTap}
                >
                  <Icon size={15} strokeWidth={2.1} aria-hidden="true" />
                  {isTimerChip ? <b className={styles.chipTime}>{bubble.metric}</b> : null}
                  {badge ? (
                    <i className={styles.chipBadge} aria-hidden="true">
                      {badge}
                    </i>
                  ) : null}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </nav>
      </div>
    </MotionConfig>
  );
}

/**
 * @deprecated 별도 메뉴(오브) 창 UI. Bubli 메뉴가 바 창 인라인 morph 패널로 통합되면서
 * 로그인 자동 실행 목록(src/lib/tauri/authenticated-surfaces.ts)에서 빠졌다.
 * `?bubble=menu` 창 경로(page.tsx isMenuOrb)와 Rust "menu" 창 상태는 그대로 동작하므로
 * 수동으로 열면 여전히 쓸 수 있다 — 다음 정리 사이클에서 제거 후보.
 */
export function DesktopWidgetMenuOrb({
  hasRoomContext = false,
  onArrangeBubbles,
  onOpenBubble,
  onOpenMainApp,
  onOpenSettings,
  onQuit,
  onToggleRoomContext,
  panelOpenSignal = 0,
  usageSummary,
}: {
  hasRoomContext?: boolean;
  onArrangeBubbles?: () => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onOpenMainApp?: () => void;
  onOpenSettings?: () => void;
  onQuit?: () => void;
  onToggleRoomContext?: () => void;
  panelOpenSignal?: number;
  usageSummary?: string | null;
}) {
  const { t } = useI18n();
  // 오브 클릭 또는 바 Bubli 버튼(panelOpenSignal, 레거시 이벤트)으로 패널을 연다.
  const [open, setOpen] = useState(false);
  // 바 Bubli 버튼의 열기 요청은 렌더 중 상태 보정 패턴으로 반영한다(effect 내 setState 금지 규칙).
  const [seenPanelSignal, setSeenPanelSignal] = useState(panelOpenSignal);
  if (panelOpenSignal !== seenPanelSignal) {
    setSeenPanelSignal(panelOpenSignal);
    if (panelOpenSignal > 0 && !open) setOpen(true);
  }

  // 48px 오브 바로 아래(8px 간격, 같은 왼쪽 라인)에 패널이 붙는다:
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
        title={t("widget.menu.openAria")}
        type="button"
      >
        {/* 미니 앱 아이콘 오브(44px, radius 14): 유리 버블 단독은 '사탕'처럼 읽혀서,
            하이브리드 앱 브랜드 톤(sky→lilac 그라디언트 타일) 위에 버블 마크를 얹은
            앱 아이콘 구성으로 바꿨다 — 잔잔한 bob 부유 + hover 워블(reduced-motion 존중). */}
        <span aria-hidden="true" className={styles.menuOrbTile}>
          <BubbleMark className={styles.menuOrbMark} />
        </span>
      </button>
      {open ? (
        <div
          aria-label={t("widget.menu.title")}
          className={styles.menuPanel}
          data-bubli-interactive="true"
          onMouseDown={handleWidgetDragMouseDown}
          role="menu"
        >
          <WidgetMenuPanelContent
            hasRoomContext={hasRoomContext}
            onArrangeBubbles={onArrangeBubbles}
            onOpenBubble={onOpenBubble}
            onOpenMainApp={onOpenMainApp}
            onOpenSettings={onOpenSettings}
            onQuit={onQuit}
            onToggleRoomContext={onToggleRoomContext}
            usageSummary={usageSummary}
          />
        </div>
      ) : null}
    </div>
  );
}
