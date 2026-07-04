"use client";

import { Fragment, memo, type MouseEvent, type PointerEvent as ReactPointerEvent, type Ref, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
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

// 엠티 스테이트는 "다음 행동"을 한 줄로 가르친다(버블별 고정 카피).
// 동기화 대기 중에는 행동 유도 대신 안전한 "새 항목 없음"으로 대체한다.
const emptyHintKeys: Record<WidgetBubbleType, MessageKey> = {
  agent: "widget.empty.agent",
  alert: "widget.empty.alert",
  chat: "widget.empty.chat",
  memo: "widget.empty.memo",
  resource: "widget.empty.resource",
  schedule: "widget.empty.schedule",
  timer: "widget.empty.timer",
  todo: "widget.empty.todo",
};

// 공통 엠티 스테이트 해부: 20px accent 아이콘 + 14px 한 줄 + 12px 패딩(모든 버블 동일).
function BubbleEmptyState({ bubble }: { bubble: WidgetPreviewBubble }) {
  const { t } = useI18n();
  const { Icon } = getBubbleMeta(bubble.id);
  const hintKey = isBubbleSyncPending(bubble) ? "widget.data.emptyItems" : (emptyHintKeys[bubble.id] ?? bubbleEmptyLabel(bubble));
  return (
    <div className={styles.emptyState}>
      <i aria-hidden="true" className={styles.emptyIcon}>
        <Icon size={20} strokeWidth={2} />
      </i>
      <span>{t(hintKey as MessageKey)}</span>
    </div>
  );
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
export function handleWidgetDragMouseDown(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(widgetDragIgnoreSelector)) return;

  event.preventDefault();
  void startWidgetWindowDragging().catch(() => undefined);
}

// 메뉴 오브처럼 "클릭 동작이 있는 표면"용: 실제로 커서가 움직이기 시작한 경우에만
// 드래그로 전환해 클릭(토글)을 깨지 않는다.
export function handleWidgetDragMouseDownDeferred(event: MouseEvent<HTMLElement>) {
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

// 세그먼트 컨트롤: 등폭(1fr) 버튼 위를 layoutId 썸이 스프링 translate로 미끄러진다
// (배경 스왑 아님). reduced-motion에서는 즉시 점프(duration 0).
function SegmentedControl({ defaultIndex = 0, labels }: { defaultIndex?: number; labels: string[] }) {
  const prefersReducedMotion = useReducedMotion();
  const thumbId = useId();
  const [index, setIndex] = useState(defaultIndex);

  return (
    <div className={styles.segmented} role="group">
      {labels.map((label, itemIndex) => (
        <button aria-pressed={itemIndex === index} key={label} onClick={() => setIndex(itemIndex)} type="button">
          {itemIndex === index ? (
            <motion.span
              aria-hidden="true"
              className={styles.segThumb}
              layoutId={thumbId}
              transition={prefersReducedMotion ? { duration: 0 } : barChipSpring}
            />
          ) : null}
          <span className={styles.segLabel}>{label}</span>
        </button>
      ))}
    </div>
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
  showConfirm = true,
}: {
  item: WidgetPreviewItem;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
  /** TODO 행처럼 별도 체크 어포던스가 확인을 담당하면 확인 버튼을 숨긴다. */
  showConfirm?: boolean;
}) {
  const { t } = useI18n();
  if (!onItemStateChange) return null;

  return (
    <span className={styles.itemActions}>
      {showConfirm ? (
        <button aria-label={t("widget.item.confirm")} onClick={() => onItemStateChange(item, "CONFIRMED")} type="button">
          <CheckCircle2 size={12} strokeWidth={2} />
        </button>
      ) : null}
      <button aria-label={t("widget.item.pin")} onClick={() => onItemStateChange(item, "PINNED")} type="button">
        <Pin size={12} strokeWidth={2} />
      </button>
      <button aria-label={t("widget.item.hide")} onClick={() => onItemStateChange(item, "HIDDEN")} type="button">
        <X size={12} strokeWidth={2} />
      </button>
    </span>
  );
}

// 조용한 재조회 때 버블 데이터 참조가 유지되면(페이지의 deep-equal setState) 행 목록은
// 리렌더하지 않는다 — 배경 갱신이 행 DOM을 다시 만들며 생기는 미세 깜빡임 방지.
const ItemRows = memo(function ItemRows({
  bubble,
  onItemStateChange,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  if (bubble.rows.length === 0) {
    return <BubbleEmptyState bubble={bubble} />;
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
});

// TODO 마감 칩 톤 클래스(지남/오늘/내일/이후) — 개인 TODO와 룸 태스크 공통.
const todoDueToneClassNames: Record<NonNullable<WidgetPreviewItem["dueTone"]>, string> = {
  later: styles.dueLater,
  overdue: styles.dueOverdue,
  today: styles.dueToday,
  tomorrow: styles.dueTomorrow,
};

// TODO 전용 행 목록: [체크 어포던스][제목 1줄][룸 칩(있으면)][마감 칩] + 고정/숨김.
// 개인 TODO(sourceKind=personal)와 나에게 할당된 룸 태스크(sourceKind=room)가 함께 있으면
// "내 할 일" / "룸에서 할당됨" 그룹 헤더로 나눈다(그룹 순서는 rows 배열 순서를 따른다).
const TodoRows = memo(function TodoRows({
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
    return <BubbleEmptyState bubble={bubble} />;
  }

  const personalRows = bubble.rows.filter((item) => item.sourceKind !== "room");
  const roomRows = bubble.rows.filter((item) => item.sourceKind === "room");
  const showGroupHeads = personalRows.length > 0 && roomRows.length > 0;
  // 룸 컨텍스트면 룸 태스크 그룹을 먼저 — 고정(PINNED)으로 행 순서가 섞여도 그룹 순서는 유지한다.
  const roomFirst = Boolean(bubble.roomId);
  const groups: Array<{ key: string; labelKey: MessageKey; rows: WidgetPreviewItem[] }> = [
    { key: "personal", labelKey: "widget.todo.groupMine", rows: personalRows },
    { key: "room", labelKey: "widget.todo.groupRoom", rows: roomRows },
  ];
  if (roomFirst) groups.reverse();

  const renderRow = (item: WidgetPreviewItem) => (
    <div className={styles.todoRow} key={item.id}>
      <button
        aria-label={t("widget.todo.markDone", { label: item.label })}
        aria-pressed={item.checked ?? false}
        className={styles.todoCheck}
        onClick={() => onItemStateChange?.(item, "CONFIRMED")}
        type="button"
      >
        {item.checked ? <CheckCircle2 size={13} strokeWidth={2.4} /> : null}
      </button>
      {item.handoffUrl ? (
        <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
          {item.label}
        </a>
      ) : (
        <span>{item.label}</span>
      )}
      {item.roomName ? <i className={styles.roomChip}>{item.roomName}</i> : null}
      <b className={item.dueTone ? [styles.dueChip, todoDueToneClassNames[item.dueTone]].join(" ") : styles.dueChip}>
        {item.status}
      </b>
      <ItemActions item={item} onItemStateChange={onItemStateChange} showConfirm={false} />
    </div>
  );

  return (
    <div className={styles.rowList}>
      {groups.map((group) =>
        group.rows.length > 0 ? (
          <Fragment key={group.key}>
            {showGroupHeads ? <span className={styles.todoGroupHead}>{t(group.labelKey)}</span> : null}
            {group.rows.map(renderRow)}
          </Fragment>
        ) : null,
      )}
    </div>
  );
});

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
      {/* 카운트 링은 중앙 부유 대신 요약 카피와 나란히 — 본문이 위에서부터 콘텐츠로 채워진다.
          링 숫자는 표시 행이 아니라 병합된(개인 + 룸 할당) 남은 개수 전체를 가리킨다. */}
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
      <TodoRows bubble={bubble} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />
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
      {visibleRows.length === 0 ? <BubbleEmptyState bubble={bubble} /> : null}
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
      <SegmentedControl labels={[t("widget.timer.tabClock"), t("widget.timer.tabWork"), t("widget.timer.tabPomodoro")]} />
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
        <BubbleEmptyState bubble={bubble} />
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
        <BubbleEmptyState bubble={bubble} />
      )}
      <SegmentedControl labels={[t("widget.schedule.tabWeek"), t("widget.schedule.tabMonth"), t("widget.schedule.tabWbs")]} />
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
        <BubbleEmptyState bubble={bubble} />
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

// 버블 창 셸 전체를 memo로 감싼다 — page의 revision 카운터가 올라가도(조용한 재조회 트리거)
// 버블 데이터/핸들러 참조가 그대로면 셸·행 DOM을 다시 그리지 않는다(무깜빡임 보증의 마지막 층).
export const DesktopWidgetBubble = memo(function DesktopWidgetBubble({
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
});

const BAR_PREVIEW_POPOVER_ID = "bubli-bar-preview";

// 아무 상호작용 없이 이 시간이 지나면 pill만 옅어진다(0.85 — hover/상호작용 시 즉시 복귀, CSS 200ms).
// 메뉴 패널·hover 프리뷰·goo 팝이 떠 있는 동안에는 페이드를 아예 정지한다.
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
export type WidgetMenuContentProps = {
  hasRoomContext?: boolean;
  onArrangeBubbles?: () => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onOpenMainApp?: () => void;
  onOpenSettings?: () => void;
  onQuit?: () => void;
  onToggleRoomContext?: () => void;
  usageSummary?: string | null;
};

export function WidgetMenuPanelContent({
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

// 모션 프리셋은 모듈 상수로 둔다 — 렌더마다 새 객체가 만들어져 memo 칩의 props 안정성을
// 깨뜨리지 않게 하고, reduced-motion 여부에 따라 참조만 골라 쓴다.
const chipEnterExitFull = {
  animate: { filter: "blur(0px)", opacity: 1, scale: 1 },
  exit: { filter: "blur(4px)", opacity: 0, scale: 0.6 },
  initial: { filter: "blur(4px)", opacity: 0, scale: 0.6 },
};
const chipEnterExitReduced = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
};
const popoverEnterExitFull = {
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 6 },
  initial: { opacity: 0, scale: 0.86, y: 10 },
};
const popoverEnterExitReduced = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
};
const chipWhileHoverPreset = { scale: 1.04 };
const chipWhileTapPreset = { scale: 0.96 };
const gooEnterFull = { opacity: 1, scale: 0, y: 12 };
const gooShownFull = { opacity: 1, scale: 1, y: 0 };
const gooExitFull = { opacity: 1, scale: 0, y: 10 };
const gooEnterReduced = { opacity: 0 };
const gooShownReduced = { opacity: 1 };
const gooExitReduced = { opacity: 0 };

type BarChipEnterExit = typeof chipEnterExitFull | typeof chipEnterExitReduced;

// 접힌 버블 칩 버튼(36px 타일). props가 전부 참조-안정이라 memo가 실제로 작동한다 —
// 2→4초 폴링·hover 프리뷰·idle 페이드 등 바의 다른 상태 변화에 칩 DOM이 다시 그려지지 않는다.
// AnimatePresence popLayout이 붙이는 ref는 React 19 함수형 ref prop으로 받아 motion.button에 넘긴다.
const BarChipButton = memo(function BarChipButton({
  bubble,
  bubbleType,
  chipEnterExit,
  describedBy,
  onHidePreview,
  onRestoreBubble,
  onShowPreview,
  ref,
  whileHover,
  whileTap,
}: {
  bubble: WidgetPreviewBubble;
  bubbleType: WidgetBubbleType;
  chipEnterExit: BarChipEnterExit;
  describedBy?: string;
  onHidePreview: (target: WidgetBubbleType) => void;
  onRestoreBubble: (bubbleType: WidgetBubbleType) => void;
  onShowPreview: (target: WidgetBubbleType) => void;
  ref?: Ref<HTMLButtonElement>;
  whileHover?: typeof chipWhileHoverPreset;
  whileTap?: typeof chipWhileTapPreset;
}) {
  const { t } = useI18n();
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
      aria-describedby={describedBy}
      aria-label={t(bubble.compactLabel as MessageKey)}
      className={[styles.barChip, isTimerChip ? styles.barTimerChip : "", accentClassNames[meta.accent]]
        .filter(Boolean)
        .join(" ")}
      onBlur={() => onHidePreview(bubbleType)}
      onClick={() => onRestoreBubble(bubbleType)}
      onFocus={() => onShowPreview(bubbleType)}
      onMouseEnter={() => onShowPreview(bubbleType)}
      onMouseLeave={() => onHidePreview(bubbleType)}
      ref={ref}
      transition={barChipSpring}
      type="button"
      whileHover={whileHover}
      whileTap={whileTap}
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
});

// 바 pill 전체도 memo — page의 폴링/revision 상태 변화에서 props(deep-equal로 참조 유지되는
// bubbleDataByType/minimizedItems/notificationSignal + useCallback 핸들러)가 그대로면 리렌더하지 않는다.
export const DesktopWidgetBubbleBar = memo(function DesktopWidgetBubbleBar({
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
  // 4초 폴링이 같은 목록을 유지하면(참조 동일) 필터 결과도 재사용한다.
  const visibleItems = useMemo(() => collectBarFoldedItems(minimizedItems), [minimizedItems]);

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

  // idle 페이드: 8초 무상호작용 → pill(nav)만 옅게(0.85), 상호작용 → 즉시 1.0(CSS 200ms).
  // 메뉴 패널/hover 프리뷰/goo 팝이 하나라도 떠 있으면 페이드를 완전히 정지한다(즉시 불투명) —
  // goo 팝은 nav 안에 살아서 pill 페이드에 같이 씻겨 나가면 안 되고, 패널/팝오버 내용도 마찬가지다.
  const [barIdle, setBarIdle] = useState(false);
  // 현재 idle 여부의 ref 미러 — pointermove마다 도는 armIdleTimer가 이미 non-idle일 때는
  // setState 자체를 건너뛰어(타이머 재무장만) 리렌더 경로를 아예 타지 않게 한다.
  // 렌더 중 ref 쓰기는 금지라 커밋 후 동기화 effect가 미러를 맞춘다(핸들러/타임아웃 쓰기는 허용).
  const barIdleRef = useRef(false);
  useEffect(() => {
    barIdleRef.current = barIdle;
  }, [barIdle]);
  const idleTimerRef = useRef<number | null>(null);
  const armIdleTimer = useCallback(() => {
    if (barIdleRef.current) {
      barIdleRef.current = false;
      setBarIdle(false);
    }
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      barIdleRef.current = true;
      setBarIdle(true);
    }, BAR_IDLE_FADE_MS);
  }, []);
  const barFadeSuspended = menuOpen || previewTarget !== null || gooPopVisible;
  // 정지 상태가 바뀌는 순간(특히 해제 직후) stale barIdle을 지운다 — effect 내 동기 setState 금지
  // 규칙이 있어 렌더 중 상태 보정 패턴(seenPanelSignal과 동일)으로 처리한다.
  const [seenFadeSuspended, setSeenFadeSuspended] = useState(barFadeSuspended);
  if (seenFadeSuspended !== barFadeSuspended) {
    setSeenFadeSuspended(barFadeSuspended);
    // 렌더 중이라 ref 미러는 건드리지 않는다 — 커밋 후 동기화 effect가 맞춘다.
    if (!barFadeSuspended) setBarIdle(false);
  }
  useEffect(() => {
    // 마운트 직후 첫 카운트다운을 시작하고, 패널/프리뷰/팝 상태가 바뀔 때마다 재무장한다
    // (패널 열기도 상호작용이므로 리셋 — 닫히면 그 시점부터 8초를 다시 센다).
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      barIdleRef.current = true;
      setBarIdle(true);
    }, BAR_IDLE_FADE_MS);
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, [barFadeSuspended]);
  // 바 창 안의 어떤 상호작용(포인터 이동/다운·포커스 이동·키 입력)이든 타이머를 재무장한다.
  // pill 밖 투명 영역(팝오버/패널 포함)까지 들어야 하므로 nav가 아니라 바 루트에서 듣는다.
  const barRootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const rootElement = barRootRef.current;
    if (!rootElement) return;
    const eventNames = ["pointermove", "pointerdown", "focusin", "keydown"] as const;
    for (const name of eventNames) rootElement.addEventListener(name, armIdleTimer);
    return () => {
      for (const name of eventNames) rootElement.removeEventListener(name, armIdleTimer);
    };
  }, [armIdleTimer]);

  // memo 칩에 그대로 내려가는 콜백 — 참조가 안정해야 칩 memo가 작동한다.
  const showPreview = useCallback((target: WidgetBubbleType | "notice") => setPreviewTarget(target), []);
  const hidePreview = useCallback(
    (target: WidgetBubbleType | "notice") => setPreviewTarget((current) => (current === target ? null : current)),
    [],
  );

  // 팝오버는 최대 3행 + 초과분 "…" 한 줄로 잘라 보여준다(전체는 버블 복원이 담당).
  // hover 대상·데이터가 그대로면 파생 객체도 재사용한다(팝오버 리렌더 억제).
  const preview = useMemo(() => {
    if (!previewTarget) return null;
    if (previewTarget === "notice") {
      return {
        accent: "lilac" as const,
        headline: t(notificationSignal.compactLabel as MessageKey),
        Icon: Bell,
        label: t("widget.kind.notification"),
        rows: notificationSignal.rows.slice(0, 3),
        sub: t(notificationSignal.notificationLabel as MessageKey),
        truncated: notificationSignal.rows.length > 3,
      };
    }
    const bubble = bubbleDataByType?.[previewTarget] ?? getWidgetPreviewBubble(previewTarget);
    const meta = getBubbleMeta(previewTarget);
    return {
      accent: meta.accent,
      headline: t(bubble.compactLabel as MessageKey),
      Icon: meta.Icon,
      label: t(meta.label),
      rows: bubble.rows.slice(0, 3),
      sub: t(bubble.notificationLabel as MessageKey),
      truncated: bubble.rows.length > 3,
    };
  }, [bubbleDataByType, notificationSignal, previewTarget, t]);
  const PreviewIcon = preview?.Icon;

  // 팝오버 등장: 칩(아래 중앙)을 앵커로 스프링 스케일 인 — reduced-motion은 페이드만.
  // 모든 모션 프리셋은 모듈 상수의 참조만 고른다(렌더마다 새 객체 금지 — memo 칩 props 안정).
  const popoverEnterExit = prefersReducedMotion ? popoverEnterExitReduced : popoverEnterExitFull;
  // 칩 등장/퇴장(OverflowActions 문법): blur+opacity+scale 스프링, reduced-motion은 페이드만.
  const chipEnterExit = prefersReducedMotion ? chipEnterExitReduced : chipEnterExitFull;
  const chipWhileHover = hoverCapable && !prefersReducedMotion ? chipWhileHoverPreset : undefined;
  const chipWhileTap = prefersReducedMotion ? undefined : chipWhileTapPreset;
  const gooEnter = prefersReducedMotion ? gooEnterReduced : gooEnterFull;
  const gooShown = prefersReducedMotion ? gooShownReduced : gooShownFull;
  const gooExit = prefersReducedMotion ? gooExitReduced : gooExitFull;

  // 바 창은 pill 하나만 시각적으로 유지한다(접힘 상시 미리보기 카드 없음).
  // 창 너비는 Rust(WIDGET_BAR_WIDTH)가 640 고정이고 칩이 아이콘 전용 36px 타일이라
  // 접힌 칩 전부(알림 버블 제외 최대 7개)가 어떤 조합에서도 창을 넘지 않는다 — "+N" 없음.
  // pill 위 투명 영역에는 hover 팝오버와 Bubli 메뉴 morph 패널이 뜬다(absolute라 pill이 밀리지 않는다).
  // 창 높이는 Rust WIDGET_BAR_HEIGHT(430)가 패널(≈352px)을 수용한다.
  return (
    <MotionConfig reducedMotion="user">
      {/* memo된 형제(칩)들 사이에서 layoutId 프로젝션이 함께 갱신되도록 LayoutGroup으로 묶는다. */}
      <LayoutGroup>
      <div className={[styles.root, styles.barRoot].join(" ")} data-bubli-desktop-widget ref={barRootRef}>
        <GooeyFilter />
        {/* hover 프리뷰 팝오버: 칩 accent를 물려받고 pill 위에서 스프링 스케일 인(하단 앵커). */}
        <AnimatePresence>
          {preview && PreviewIcon && !menuOpen ? (
            <motion.div
              // key는 반드시 spread 앞에 둔다: key가 spread 뒤면 SWC가 jsxDEV 대신
              // createElement(config.children) 폴백으로 컴파일해 정적 자식이 "동적 배열"로 취급되고,
              // motion이 그 배열을 host 요소에 그대로 넘기면서 React 19가 자식마다 key를 요구한다
              // (콘솔 "Each child in a list should have a unique key" 경고의 실제 원인).
              key="bubli-bar-preview"
              {...popoverEnterExit}
              aria-label={t("widget.bar.previewAria")}
              className={[styles.barPopover, accentClassNames[preview.accent]].join(" ")}
              data-bubli-interactive="true"
              id={BAR_PREVIEW_POPOVER_ID}
              role="status"
              transition={barChipSpring}
            >
              <div className={styles.barPopoverHead}>
                <i aria-hidden="true" className={styles.barPopoverTile}>
                  <PreviewIcon size={14} strokeWidth={2.1} />
                </i>
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
                  {preview.truncated ? (
                    <li aria-hidden="true" className={styles.barPopoverMore}>
                      …
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
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
        {/* idle 페이드는 이 nav(pill)에만 적용된다 — 패널/팝오버는 nav 밖 형제 레이어라 영향이 없고,
            페이드 재무장은 바 루트의 pointermove/pointerdown/focusin/keydown 리스너가 담당한다. */}
        <nav
          aria-label={t("widget.bar.minimizedAria")}
          className={[styles.bubbleBar, barIdle && !barFadeSuspended ? styles.barIdle : ""].filter(Boolean).join(" ")}
          data-bubli-interactive="true"
          // 창 드래그는 pill 빈 영역/구분선의 non-capture 핸들러만 담당한다. capture 단계의
          // deferred 드래그는 칩/브랜드 버튼 mousedown까지 가로채 4px 지터만으로 macOS 웹뷰
          // 네이티브 창 드래그를 시작시켜 click을 삼켰다(브랜드 칩 메뉴가 안 열리던 라이브 버그).
          onMouseDown={handleWidgetDragMouseDown}
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
          {/* Bubli 브랜드 칩: 웹앱과 같은 28px 버블 마크 + 메뉴 morph 앵커(layoutId 공유).
              PopoverForm 원형처럼 패널과 "동시 마운트"하지 않고 조건부로 스왑해야 morph가 진행된다
              — 둘 다 마운트하면 layoutId 크로스페이드가 opacity 0에서 얼어붙는다(라이브 버그).
              칩이 빠진 pill 틈은 형제 칩들의 layout 애니메이션이 자연스럽게 메운다. */}
          {!menuOpen ? (
            <motion.button
              className={styles.barBrand}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={t("widget.menu.openAria")}
              layout
              layoutId={BAR_MENU_MORPH_ID}
              onClick={() => setMenuOpen(true)}
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
          ) : null}
          <AnimatePresence initial={false} mode="popLayout">
            {visibleItems.map((item) => {
              const bubbleType = item.activeBubble as WidgetBubbleType;
              return (
                <BarChipButton
                  bubble={bubbleDataByType?.[bubbleType] ?? getWidgetPreviewBubble(bubbleType)}
                  bubbleType={bubbleType}
                  chipEnterExit={chipEnterExit}
                  describedBy={previewTarget === bubbleType ? BAR_PREVIEW_POPOVER_ID : undefined}
                  key={bubbleType}
                  onHidePreview={hidePreview}
                  onRestoreBubble={onRestoreBubble}
                  onShowPreview={showPreview}
                  whileHover={chipWhileHover}
                  whileTap={chipWhileTap}
                />
              );
            })}
          </AnimatePresence>
        </nav>
      </div>
      </LayoutGroup>
    </MotionConfig>
  );
});

// (deprecated) 별도 메뉴(오브) 창 UI는 desktop-widget-menu-orb.tsx로 분리했다 —
// ?bubble=menu 수동 경로에서만 쓰이므로 page.tsx가 next/dynamic으로 지연 로드한다.
