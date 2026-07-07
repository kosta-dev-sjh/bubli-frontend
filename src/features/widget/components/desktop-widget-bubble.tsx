"use client";

import { Fragment, memo, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type Ref, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  AtSign,
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  CirclePause,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Ghost,
  Headphones,
  Inbox,
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
  Search,
  Settings,
  SmilePlus,
  Send,
  Sparkles,
  Square,
  StickyNote,
  Timer,
  Trash2,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  getWidgetPreviewBubble,
  widgetNotificationSignal,
  widgetPreviewBubbles,
  type WidgetNotificationSignal,
  type WidgetPreviewBubble,
  type WidgetPreviewItem,
} from "@/features/widget/desktop-widget-preview-data";
import { BubbleMark } from "@/components/bubbles";
// /bubli 명령 문법·자동완성은 웹 소통창과 같은 공용 모듈을 쓴다(계약 단일 출처).
import { AgentCommandAutocomplete } from "@/features/communication/components/agent-command-autocomplete";
import { stripAgentCommandPrefix } from "@/features/communication/lib/agent-commands";
import { useAgentCommandAutocomplete } from "@/features/communication/lib/use-agent-command-autocomplete";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import {
  createIdlePomodoroState,
  phaseDurationSeconds,
  POMODORO_BREAK_MAX,
  POMODORO_BREAK_MIN,
  POMODORO_FOCUS_MAX,
  POMODORO_FOCUS_MIN,
  readPomodoroState,
  readWidgetTimerKind,
  readWidgetTimerMode,
  writePomodoroState,
  writeWidgetTimerKind,
  writeWidgetTimerMode,
  type PomodoroPhase,
  type PomodoroState,
  type WidgetTimerKind,
  type WidgetTimerMode,
} from "@/lib/widget/widget-pref-client";
import { autoSizeGhostWidgetWindow, isWidgetWindowDragLocked, readCurrentTauriWindowMonitorState, startWidgetWindowDragging, tauriCommands, type WidgetArrangeLayout, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { FriendSearchApiResponse } from "@/types/api/friend";

import styles from "./desktop-widget-bubble.module.css";

// 버블별 셸 아이덴티티(헤더 밴드/아이콘 타일/CTA/칩이 같은 accent를 공유한다).
// todo=sky · timer=amber · chat=rose · memo=cream · schedule=blue · alert=lilac · agent=sage · resource=sand
// scope: 개인 전용(personal) · 프로젝트룸 귀속(room) · 둘 다(both).
// 룸 미선택(개인 모드)에서는 room 버블이 비활성으로 보이고, 룸을 골라야 활성화된다.
type BubbleScope = "personal" | "room" | "both";

type BubbleMeta = {
  accent: "amber" | "blue" | "cream" | "lilac" | "rose" | "sage" | "sand" | "sky";
  id: WidgetBubbleType;
  label: MessageKey;
  Icon: typeof CheckCircle2;
  scope: BubbleScope;
};

const bubbleMeta: BubbleMeta[] = [
  { Icon: CheckCircle2, accent: "sky", id: "todo", label: "widget.kind.todo", scope: "both" },
  { Icon: Sparkles, accent: "sage", id: "agent", label: "widget.kind.agent", scope: "both" },
  { Icon: MessageSquare, accent: "rose", id: "chat", label: "widget.kind.chat", scope: "room" },
  { Icon: Timer, accent: "amber", id: "timer", label: "widget.kind.timer", scope: "both" },
  { Icon: StickyNote, accent: "cream", id: "memo", label: "widget.kind.memo", scope: "both" },
  { Icon: Clock3, accent: "blue", id: "schedule", label: "widget.kind.schedule", scope: "both" },
  { Icon: FileText, accent: "sand", id: "resource", label: "widget.kind.resource", scope: "both" },
  { Icon: Bell, accent: "lilac", id: "alert", label: "widget.kind.notification", scope: "both" },
];
const hiddenDesktopWidgetBubbleTypes = new Set<WidgetBubbleType>(["resource"]);
const visibleBubbleMeta = bubbleMeta.filter((item) => !hiddenDesktopWidgetBubbleTypes.has(item.id));

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

// TODO 카운트 링 둘레(r=42).
const TODO_RING_CIRCUMFERENCE = 2 * Math.PI * 42;

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

const BAR_ROOT_PADDING_PX = 4;
const BAR_PREVIEW_FLIP_THRESHOLD_PX = 640;
type BarPreviewPlacement = "above" | "below";

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

function trimEmptyStateHint(copy: string) {
  return copy.replace(/\s+(?:—|-)\s+.*$/, "").trim();
}

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
      <span>{trimEmptyStateHint(t(hintKey as MessageKey))}</span>
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
  // 소통 버블 전용 — 1:1/그룹 ↔ 프로젝트룸 모드, 목록 선택, 새 대화·친구 관리 액션.
  chatScope?: "direct" | "room";
  onChatScopeChange?: (scope: "direct" | "room") => void;
  selectedPeerChatRoomId?: string | null;
  onSelectPeerChatRoom?: (chatRoomId: string | null) => void;
  onCreateDirectRoom?: (friendUserId: string) => Promise<unknown>;
  onCreateGroupRoom?: (memberUserIds: string[], name: string) => Promise<unknown>;
  onSearchFriend?: (bubliId: string) => Promise<FriendSearchApiResponse | null>;
  onSendFriendRequest?: (bubliId: string) => Promise<void>;
  onRespondFriendRequest?: (requestId: string, action: "accept" | "reject") => Promise<void>;
  onClose: () => void;
  onOpenHandoff?: (item: WidgetPreviewItem) => Promise<void> | void;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
  onReviewAgentSuggestion?: (item: WidgetPreviewItem, action: AgentSuggestionReviewAction) => Promise<void> | void;
  onLeaveVoice?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onMarkChatRead?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onModeChange: (mode: WidgetWindowMode) => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onCreateMemo?: (bubble: WidgetPreviewBubble, body?: string) => Promise<void> | void;
  onCreateSchedule?: (bubble: WidgetPreviewBubble, title?: string, startsAt?: string | null) => Promise<void> | void;
  onCreateTodo?: (bubble: WidgetPreviewBubble, title?: string, options?: { forcePersonal?: boolean }) => Promise<void> | void;
  onEditTodo?: (item: WidgetPreviewItem, title: string) => Promise<void> | void;
  onDeleteTodo?: (item: WidgetPreviewItem) => Promise<void> | void;
  onDeleteMemo?: (item: WidgetPreviewItem) => Promise<void> | void;
  onEditMemo?: (item: WidgetPreviewItem, body?: string) => Promise<void> | void;
  onAnalyzeResource?: (item: WidgetPreviewItem) => Promise<void> | void;
  onDownloadResource?: (item: WidgetPreviewItem) => Promise<void> | void;
  onRestore?: () => void;
  // 에이전트 요청 전송. 응답 본문(에이전트 답변 텍스트)을 돌려주면 버블 내 미니 대화에 그대로 붙는다.
  onSendAgentCommand?: (bubble: WidgetPreviewBubble, text: string) => Promise<string | void> | string | void;
  onSendChatMessage?: (bubble: WidgetPreviewBubble, text: string) => Promise<void> | void;
  onStartVoice?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onPauseTimer?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onPrimaryTimerAction?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onToggleAlwaysOnTop: () => void;
  onToggleVoiceMic?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  // 타이머 시작/종료 실패 안내(권한 없음·이미 실행 중 등). 타이머 바디 위에 잠깐 표시한다.
  timerActionNotice?: string | null;
  presentation?: "preview" | "tauri";
  // Tauri 창 식별자(리사이즈 커맨드 타깃). 프리뷰에서는 불필요.
  windowId?: string;
  windowVisible?: boolean;
};

export const desktopWidgetBubbleTypes = widgetPreviewBubbles
  .map((bubble) => bubble.id)
  .filter((id): id is WidgetBubbleType => !hiddenDesktopWidgetBubbleTypes.has(id));

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
  // 핀 고정(위치 잠금) 상태면 헤더/드래그 스트립을 눌러도 움직이지 않는다.
  if (isWidgetWindowDragLocked()) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(widgetDragIgnoreSelector)) return;

  event.preventDefault();
  void startWidgetWindowDragging().catch(() => undefined);
}

// 메뉴 오브처럼 "클릭 동작이 있는 표면"용: 실제로 커서가 움직이기 시작한 경우에만
// 드래그로 전환해 클릭(토글)을 깨지 않는다.
export function handleWidgetDragMouseDownDeferred(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0) return;
  // 핀 고정(위치 잠금) 상태면 드래그로 전환하지 않는다(클릭 동작은 그대로).
  if (isWidgetWindowDragLocked()) return;

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
// value/onChange를 주면 controlled로 동작하고(활성 인덱스는 부모가 소유), 안 주면
// 기존처럼 내부 상태로 동작한다 — 무인자 사용처(일정 탭 등) 호환 유지.
// 좌우 화살표 키보드 이동을 지원하고 활성 버튼만 tabbable(roving tabindex)로 둔다.
function SegmentedControl({
  ariaLabel,
  defaultIndex = 0,
  labels,
  onChange,
  value,
}: {
  ariaLabel?: string;
  defaultIndex?: number;
  labels: string[];
  onChange?: (index: number) => void;
  value?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const thumbId = useId();
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const isControlled = value !== undefined;
  const index = isControlled ? value : internalIndex;

  const select = (nextIndex: number) => {
    if (!isControlled) setInternalIndex(nextIndex);
    onChange?.(nextIndex);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    select((index + delta + labels.length) % labels.length);
  };

  return (
    <div aria-label={ariaLabel} className={styles.segmented} onKeyDown={onKeyDown} role="group">
      {labels.map((label, itemIndex) => (
        <button
          aria-pressed={itemIndex === index}
          key={label}
          onClick={() => select(itemIndex)}
          tabIndex={itemIndex === index ? 0 : -1}
          type="button"
        >
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
      {/* 반투명(투명도) 토글은 실제 앱에서도 노출한다 — 이전엔 preview 전용이라 사용자가 못 찾았다. */}
      <button aria-pressed={mode === "TRANSLUCENT"} aria-label={t("widget.control.translucent")} onClick={() => onMode(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
        <CircleDashed size={14} strokeWidth={2} />
      </button>
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
  showPin = true,
}: {
  item: WidgetPreviewItem;
  onItemStateChange?: (item: WidgetPreviewItem, state: "CONFIRMED" | "HIDDEN" | "PINNED" | "SNOOZED") => void;
  /** TODO 행처럼 별도 체크 어포던스가 확인을 담당하면 확인 버튼을 숨긴다. */
  showConfirm?: boolean;
  /** TODO 행은 항목 고정핀이 쓸모없어 숨긴다. */
  showPin?: boolean;
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
      {showPin ? (
        <button aria-label={t("widget.item.pin")} aria-pressed={item.pinned ?? false} onClick={() => onItemStateChange(item, "PINNED")} type="button">
          <Pin size={12} strokeWidth={2} />
        </button>
      ) : null}
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
  const { t } = useI18n();
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
        <div className={styles.checkRow} key={item.id}>
          <button
            aria-label={t("widget.item.confirm")}
            aria-pressed={item.checked ?? false}
            className={styles.rowCheck}
            onClick={() => onItemStateChange?.(item, "CONFIRMED")}
            type="button"
          >
            <CheckCircle2 size={13} strokeWidth={2.4} />
          </button>
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
  );
});

const agentReviewActions: Array<{
  action: AgentSuggestionReviewAction;
  Icon: LucideIcon;
  labelKey: MessageKey;
  tone: "approve" | "hold" | "reject";
}> = [
  { action: "APPROVE", Icon: CheckCircle2, labelKey: "widget.agent.reviewApprove", tone: "approve" },
  { action: "HOLD", Icon: CirclePause, labelKey: "widget.agent.reviewHold", tone: "hold" },
  { action: "REJECT", Icon: X, labelKey: "widget.agent.reviewReject", tone: "reject" },
];

const AgentCandidateRows = memo(function AgentCandidateRows({
  bubble,
  onOpenHandoff,
  onReviewAgentSuggestion,
}: {
  bubble: WidgetPreviewBubble;
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
  onReviewAgentSuggestion?: DesktopWidgetBubbleProps["onReviewAgentSuggestion"];
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

  return (
    <div className={styles.rowList}>
      {bubble.rows.map((item) => (
        <div className={styles.agentCandidateRow} key={item.id}>
          {item.handoffUrl ? (
            <a className={styles.agentCandidateTitle} href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
              {item.label}
            </a>
          ) : (
            <span className={styles.agentCandidateTitle}>{item.label}</span>
          )}
          {item.reviewable && onReviewAgentSuggestion ? (
            <span className={styles.agentReviewActions}>
              {agentReviewActions.map(({ Icon, action, labelKey, tone }) => (
                <button
                  aria-label={t(labelKey)}
                  data-tone={tone}
                  key={action}
                  onClick={() => void onReviewAgentSuggestion(item, action)}
                  title={t(labelKey)}
                  type="button"
                >
                  <Icon size={12} strokeWidth={2.2} />
                </button>
              ))}
            </span>
          ) : null}
        </div>
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
function TodoRows({
  sections,
  emptyLabel,
  onItemStateChange,
  onOpenHandoff,
  onEditTodo,
  onDeleteTodo,
}: {
  sections: Array<{ key: string; label: string; rows: WidgetPreviewItem[] }>;
  emptyLabel: string;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
  onEditTodo?: DesktopWidgetBubbleProps["onEditTodo"];
  onDeleteTodo?: DesktopWidgetBubbleProps["onDeleteTodo"];
}) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const beginEdit = (item: WidgetPreviewItem) => {
    if (!onEditTodo) return;
    setEditingId(item.id);
    setEditingValue(item.label);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };
  const commitEdit = async (item: WidgetPreviewItem) => {
    const next = editingValue.trim();
    cancelEdit();
    if (!onEditTodo || !next || next === item.label) return;
    await onEditTodo(item, next);
  };
  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  const visible = sections.filter((section) => section.rows.length > 0);
  if (visible.length === 0) {
    return <div className={styles.todoEmpty}>{emptyLabel}</div>;
  }
  // 섹션이 둘 이상일 때만 헤더를 보인다 — 한 섹션뿐이면 헤더는 군더더기.
  const showHeads = visible.length > 1;

  const renderRow = (item: WidgetPreviewItem) => (
    <div className={[styles.todoRow, item.checked ? styles.todoRowDone : ""].filter(Boolean).join(" ")} key={item.id}>
      <button
        aria-label={t("widget.todo.markDone", { label: item.label })}
        aria-pressed={item.checked ?? false}
        className={styles.todoCheck}
        onClick={() => onItemStateChange?.(item, "CONFIRMED")}
        type="button"
      >
        {item.checked ? <Check size={12} strokeWidth={3} /> : null}
      </button>
      {editingId === item.id ? (
        <input
          autoFocus
          className={styles.todoEditInput}
          maxLength={200}
          onBlur={() => void commitEdit(item)}
          onChange={(event) => setEditingValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitEdit(item);
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
            }
          }}
          value={editingValue}
        />
      ) : item.handoffUrl ? (
        <a
          href={item.handoffUrl}
          onClick={(event) => openHandoff(event, item)}
          onDoubleClick={() => beginEdit(item)}
          rel="noreferrer"
          target="_blank"
          title={onEditTodo ? t("widget.todo.editHint") : item.label}
        >
          {item.label}
        </a>
      ) : (
        <span onDoubleClick={() => beginEdit(item)} title={onEditTodo ? t("widget.todo.editHint") : item.label}>
          {item.label}
        </span>
      )}
      {item.roomName ? <i className={styles.roomChip}>{item.roomName}</i> : null}
      {/* 마감이 있는 항목만 마감칩을 보인다 — 마감 없는 항목의 "대기" 칩은 군더더기라 숨긴다. */}
      {item.dueTone ? (
        <b className={[styles.dueChip, todoDueToneClassNames[item.dueTone]].join(" ")}>{item.status}</b>
      ) : null}
      {/* 각 투두 행에 눈에 보이는 수정(연필)·삭제(휴지통) 버튼 — 더블클릭 수정은 그대로 유지. */}
      <span className={styles.itemActions}>
        {onEditTodo ? (
          <button aria-label={t("widget.todo.edit", { label: item.label })} onClick={() => beginEdit(item)} type="button">
            <Pencil size={12} strokeWidth={2} />
          </button>
        ) : null}
        {onDeleteTodo ? (
          <button aria-label={t("widget.todo.delete", { label: item.label })} onClick={() => void onDeleteTodo(item)} type="button">
            <Trash2 size={12} strokeWidth={2} />
          </button>
        ) : null}
      </span>
    </div>
  );

  return (
    <div className={styles.rowList}>
      {visible.map((section) => (
        <Fragment key={section.key}>
          {showHeads ? <span className={styles.todoGroupHead}>{section.label}</span> : null}
          {section.rows.map(renderRow)}
        </Fragment>
      ))}
    </div>
  );
}

// 내 할 일 탭: 미완료를 마감 섹션으로 나눈다(지남/오늘/내일/이후/마감 없음).
const TODO_DUE_SECTIONS: Array<{ key: string; tone: NonNullable<WidgetPreviewItem["dueTone"]> | "none"; labelKey: MessageKey }> = [
  { key: "overdue", tone: "overdue", labelKey: "widget.todo.secOverdue" },
  { key: "today", tone: "today", labelKey: "widget.todo.secToday" },
  { key: "tomorrow", tone: "tomorrow", labelKey: "widget.todo.secTomorrow" },
  { key: "later", tone: "later", labelKey: "widget.todo.secLater" },
  { key: "none", tone: "none", labelKey: "widget.todo.secNoDue" },
];
// 프로젝트룸 탭: 미완료를 칸반 상태로 나눈다(진행 중/검토/할 일/보류).
const TODO_KANBAN_SECTIONS: Array<{ key: string; labelKey: MessageKey }> = [
  { key: "IN_PROGRESS", labelKey: "widget.task.inProgress" },
  { key: "REVIEW", labelKey: "widget.task.review" },
  { key: "TODO", labelKey: "widget.task.todo" },
  { key: "BLOCKED", labelKey: "widget.task.blocked" },
];

function TodoBody({
  bubble,
  onCreateTodo,
  onEditTodo,
  onDeleteTodo,
  onItemStateChange,
  onOpenHandoff,
}: {
  bubble: WidgetPreviewBubble;
  onCreateTodo?: DesktopWidgetBubbleProps["onCreateTodo"];
  onEditTodo?: DesktopWidgetBubbleProps["onEditTodo"];
  onDeleteTodo?: DesktopWidgetBubbleProps["onDeleteTodo"];
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 활성 탭은 데이터 갱신에도 유지된다(컴포넌트가 계속 마운트되어 있음). 0=내 할 일, 1=프로젝트룸.
  const [activeTab, setActiveTab] = useState(0);

  const view = bubble.todoView ?? { hasRoom: false, mine: bubble.rows, room: [] as WidgetPreviewItem[] };
  const activeList = activeTab === 1 ? view.room : view.mine;
  const openItems = activeList.filter((item) => !item.checked);
  const doneItems = activeList.filter((item) => item.checked);

  const sections: Array<{ key: string; label: string; rows: WidgetPreviewItem[] }> = [];
  if (activeTab === 1) {
    for (const section of TODO_KANBAN_SECTIONS) {
      const rows = openItems.filter((item) => (item.kanbanTone ?? "TODO") === section.key);
      if (rows.length) sections.push({ key: section.key, label: t(section.labelKey), rows });
    }
  } else {
    for (const section of TODO_DUE_SECTIONS) {
      const rows = openItems.filter((item) => (item.dueTone ?? "none") === section.tone);
      if (rows.length) sections.push({ key: section.key, label: t(section.labelKey), rows });
    }
  }
  if (doneItems.length) sections.push({ key: "done", label: t("widget.todo.secDone"), rows: doneItems });

  const openCount = openItems.length;
  const doneCount = doneItems.length;
  const progress = openCount + doneCount > 0 ? doneCount / (openCount + doneCount) : 0;
  const mineOpen = view.mine.filter((item) => !item.checked).length;
  const roomOpen = view.room.filter((item) => !item.checked).length;
  const tabLabels = [
    mineOpen ? `${t("widget.todo.tabMine")} ${mineOpen}` : t("widget.todo.tabMine"),
    roomOpen ? `${t("widget.todo.tabRoom")} ${roomOpen}` : t("widget.todo.tabRoom"),
  ];
  const emptyLabel =
    activeTab === 1
      ? view.hasRoom
        ? t("widget.todo.roomNone")
        : t("widget.todo.roomEmpty")
      : t("widget.empty.todo");
  const summaryTitle = activeTab === 1 ? view.roomName ?? t("widget.todo.tabRoom") : t("widget.todo.tabMine");

  const saveDraftTodo = async () => {
    const title = draft.trim();
    if (!title || !onCreateTodo || submitting) return;

    setSubmitting(true);
    try {
      // "내 할 일" 탭(activeTab 0)은 위젯 룸 컨텍스트와 무관하게 항상 개인 투두로 저장한다.
      // "프로젝트룸" 탭(activeTab 1)만 선택된 룸으로 저장한다.
      await onCreateTodo(bubble, title, { forcePersonal: activeTab !== 1 });
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.body}>
      {/* 2탭: 내 할 일(개인 + 나 배정) / 프로젝트룸(선택 룸 보드, 미배정·나 배정 + 칸반 상태). */}
      <SegmentedControl
        ariaLabel={t("widget.todo.tabsAria")}
        labels={tabLabels}
        onChange={setActiveTab}
        value={activeTab}
      />
      {/* 카운트 링은 활성 탭 기준: 숫자=미완료 개수(없으면 0), 원호=완료 비율. */}
      <div className={styles.summaryRow}>
        <div className={styles.countRing}>
          <div className={styles.countRingDial}>
            <svg className={styles.countRingSvg} viewBox="0 0 96 96" aria-hidden="true">
              <circle className={styles.countRingTrack} cx="48" cy="48" r="42" />
              <circle
                className={styles.countRingArc}
                cx="48"
                cy="48"
                r="42"
                style={{ strokeDasharray: TODO_RING_CIRCUMFERENCE, strokeDashoffset: TODO_RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress))) }}
              />
            </svg>
            <span className={styles.countRingNum}>{openCount}</span>
          </div>
          <b className={styles.countRingLabel}>{t(bubble.metricLabel as MessageKey)}</b>
        </div>
        <div className={styles.summaryCopy}>
          <strong>{summaryTitle}</strong>
          <span>{t("widget.todo.remainSummary", { open: openCount, done: doneCount })}</span>
        </div>
      </div>
      {/* 목록은 창을 늘리지 않고 내부에서 스크롤한다 — 항목이 많아도 탭/요약/입력줄은 고정. */}
      <div className={styles.todoScroll}>
        <TodoRows
          emptyLabel={emptyLabel}
          onDeleteTodo={onDeleteTodo}
          onEditTodo={onEditTodo}
          onItemStateChange={onItemStateChange}
          onOpenHandoff={onOpenHandoff}
          sections={sections}
        />
      </div>
      <form
        className={styles.input}
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraftTodo();
        }}
      >
        <Plus size={14} strokeWidth={2} />
        <input
          aria-label={t(bubble.actionLabel as MessageKey)}
          disabled={submitting}
          maxLength={200}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : t(bubble.actionLabel as MessageKey)}
          value={draft}
        />
        <button aria-label={t(bubble.actionLabel as MessageKey)} disabled={submitting || !draft.trim()} type="submit">
          <Plus size={13} strokeWidth={2.1} />
        </button>
      </form>
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

  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  return (
    <div className={styles.body}>
      {bubble.rows.length > 0 ? (
        <div className={styles.rowList}>
          {bubble.rows.map((item) => (
            <div className={styles.alertRow} key={item.id}>
              <button
                aria-label={t("widget.item.confirm")}
                className={styles.alertCheck}
                onClick={() => onItemStateChange?.(item, "CONFIRMED")}
                type="button"
              >
                <CheckCircle2 size={13} strokeWidth={2.4} />
              </button>
              {item.handoffUrl ? (
                <a href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
                  {item.label}
                </a>
              ) : (
                <strong>{item.label}</strong>
              )}
              <ItemActions item={item} onItemStateChange={onItemStateChange} />
            </div>
          ))}
        </div>
      ) : (
        <BubbleEmptyState bubble={bubble} />
      )}
      <button className={styles.wideAction} onClick={openAll} type="button">
        <Bell size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
    </div>
  );
}

// 에이전트 버블 미니 대화 항목. 히스토리는 버블 내 로컬 상태로 최근 10개만 유지한다.
type AgentThreadEntry = {
  error?: boolean;
  id: string;
  role: "agent" | "me";
  text: string;
};

const AGENT_THREAD_LIMIT = 10;
const EMPTY_WIDGET_ITEMS: WidgetPreviewItem[] = [];
type AgentSuggestionReviewAction = "APPROVE" | "HOLD" | "REJECT";
type AgentTab = "ask" | "candidates" | "resources";
const agentTabs: AgentTab[] = ["ask", "candidates", "resources"];

function AgentBody({
  bubble,
  onDownloadResource,
  onItemStateChange,
  onOpenHandoff,
  onReviewAgentSuggestion,
  onSendAgentCommand,
}: {
  bubble: WidgetPreviewBubble;
  onDownloadResource?: DesktopWidgetBubbleProps["onDownloadResource"];
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
  onReviewAgentSuggestion?: DesktopWidgetBubbleProps["onReviewAgentSuggestion"];
  onSendAgentCommand?: DesktopWidgetBubbleProps["onSendAgentCommand"];
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<AgentTab>("ask");
  const [draft, setDraft] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [thread, setThread] = useState<AgentThreadEntry[]>([]);
  const [pending, setPending] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const resourceEmptyBubble = useMemo<WidgetPreviewBubble>(
    () => ({
      ...getWidgetPreviewBubble("resource"),
      roomId: bubble.roomId,
      roomLabel: bubble.roomLabel,
      rows: [],
    }),
    [bubble.roomId, bubble.roomLabel],
  );
  const activeTabIndex = Math.max(0, agentTabs.indexOf(activeTab));
  const scopedResourceRows = bubble.resourceRows ?? EMPTY_WIDGET_ITEMS;
  const scopedCandidateRows = bubble.rows;
  const scopedCandidateLabel = t(bubble.panelLabel as MessageKey);
  const scopedCandidateBubble = useMemo<WidgetPreviewBubble>(
    () => ({
      ...bubble,
      metric: String(scopedCandidateRows.length),
      notificationLabel: scopedCandidateLabel,
      panelBody: "",
      panelLabel: scopedCandidateLabel,
      rows: scopedCandidateRows,
    }),
    [bubble, scopedCandidateLabel, scopedCandidateRows],
  );

  const appendThreadEntry = (entry: AgentThreadEntry) => {
    setThread((current) => [...current, entry].slice(-AGENT_THREAD_LIMIT));
  };

  // 새 말풍선/생각 중 표시가 붙으면 히스토리를 항상 바닥으로 따라간다.
  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [thread, pending]);

  const sendAgentCommand = async () => {
    // 위젯 에이전트 버블은 명령어가 필요 없다 — 자연어를 그대로 요청으로 보내고,
    // 습관적으로 "/bubli"를 붙여도 접두어는 떼고 전송한다.
    const text = stripAgentCommandPrefix(draft);
    if (!text || pending) return;

    if (!bubble.roomId) {
      setStatusText(t("widget.chat.selectRoomFirst"));
      return;
    }

    if (!onSendAgentCommand) return;

    setStatusText(null);
    setPending(true);
    appendThreadEntry({ id: `me-${Date.now()}`, role: "me", text });
    setDraft("");
    try {
      const answer = await onSendAgentCommand(bubble, text);
      appendThreadEntry({
        id: `agent-${Date.now()}`,
        role: "agent",
        text: typeof answer === "string" && answer.trim() ? answer.trim() : t("widget.agent.replyFallback"),
      });
    } catch {
      appendThreadEntry({ error: true, id: `error-${Date.now()}`, role: "agent", text: t("widget.agent.replyFailed") });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.body}>
      <SegmentedControl
        ariaLabel={t("widget.agent.tabsAria")}
        labels={[t("widget.agent.tabAsk"), t("widget.agent.tabCandidates"), t("widget.agent.tabResources")]}
        onChange={(index) => setActiveTab(agentTabs[index] ?? "ask")}
        value={activeTabIndex}
      />
      {activeTab === "candidates" ? (
        <div className={[styles.agentTabPanel, styles.agentCandidatePanel].join(" ")}>
          {/* 승인 대기 수는 승인 전 후보 탭에서만 보여준다. */}
          <div className={styles.agentSummary} aria-label={t("widget.agentSignal")}>
            <span className={styles.agentDot} aria-hidden="true" />
            <strong>{scopedCandidateLabel}</strong>
            <b>{scopedCandidateRows.length}</b>
          </div>
          <AgentCandidateRows
            bubble={scopedCandidateBubble}
            onOpenHandoff={onOpenHandoff}
            onReviewAgentSuggestion={onReviewAgentSuggestion}
          />
        </div>
      ) : activeTab === "resources" ? (
        <div aria-label={t("widget.agent.resourcesAria")} className={styles.agentTabPanel}>
          <ResourceRows
            emptyBubble={resourceEmptyBubble}
            items={scopedResourceRows}
            onDownloadResource={onDownloadResource}
            onItemStateChange={onItemStateChange}
            onOpenHandoff={onOpenHandoff}
          />
        </div>
      ) : (
        <div className={styles.agentAskPanel}>
          {thread.length > 0 || pending ? (
            <div aria-label={t("widget.agent.threadAria")} aria-live="polite" className={styles.agentThread} ref={threadRef}>
              {thread.map((entry) => (
                <p
                  className={[
                    styles.message,
                    entry.role === "me" ? styles.messageMine : styles.agentReply,
                    entry.error ? styles.agentReplyError : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={entry.id}
                >
                  {entry.text}
                </p>
              ))}
              {pending ? (
                <span className={styles.agentThinking} role="status">
                  <span className={styles.agentThinkingDots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {t("widget.agent.thinking")}
                </span>
              ) : null}
            </div>
          ) : null}
          <form
            className={[styles.input, styles.agentInput].join(" ")}
            onSubmit={(event) => {
              event.preventDefault();
              void sendAgentCommand();
            }}
          >
            <Sparkles size={14} strokeWidth={2} />
            <input
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : undefined}
              value={draft}
            />
            <button aria-label={t("widget.chat.sendMessage")} disabled={pending || !stripAgentCommandPrefix(draft)} type="submit">
              <Send size={13} strokeWidth={2.1} />
            </button>
          </form>
          {statusText ? <span className={styles.statusText}>{statusText}</span> : null}
        </div>
      )}
    </div>
  );
}

type ChatScreen = "list" | "thread" | "newRoom" | "friends";

function ChatBody({
  bubble,
  chatScope,
  onChatScopeChange,
  selectedPeerChatRoomId,
  onSelectPeerChatRoom,
  onCreateDirectRoom,
  onCreateGroupRoom,
  onSearchFriend,
  onSendFriendRequest,
  onRespondFriendRequest,
  onItemStateChange,
  onLeaveVoice,
  onMarkChatRead,
  onOpenHandoff,
  onSendChatMessage,
  onStartVoice,
  onToggleVoiceMic,
}: {
  bubble: WidgetPreviewBubble;
  chatScope?: DesktopWidgetBubbleProps["chatScope"];
  onChatScopeChange?: DesktopWidgetBubbleProps["onChatScopeChange"];
  selectedPeerChatRoomId?: DesktopWidgetBubbleProps["selectedPeerChatRoomId"];
  onSelectPeerChatRoom?: DesktopWidgetBubbleProps["onSelectPeerChatRoom"];
  onCreateDirectRoom?: DesktopWidgetBubbleProps["onCreateDirectRoom"];
  onCreateGroupRoom?: DesktopWidgetBubbleProps["onCreateGroupRoom"];
  onSearchFriend?: DesktopWidgetBubbleProps["onSearchFriend"];
  onSendFriendRequest?: DesktopWidgetBubbleProps["onSendFriendRequest"];
  onRespondFriendRequest?: DesktopWidgetBubbleProps["onRespondFriendRequest"];
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
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  // 화면 전환(목록 ↔ 스레드 ↔ 새 대화 ↔ 친구 관리) — 위젯 창은 좁아 웹처럼 나란히 못 두고
  // 모바일 앱처럼 스택형으로 오간다. 프로젝트룸 모드는 항상 스레드 하나뿐이라 목록이 없다.
  const [chatScreen, setChatScreen] = useState<ChatScreen>(() =>
    chatScope === "room" || selectedPeerChatRoomId ? "thread" : "list",
  );
  // /bubli 자동완성 — 프로젝트룸 소통 버블에서만 연다(웹 소통창과 같은 명령 목록).
  const applyAgentCommandCompletion = useCallback((completedText: string) => {
    setDraft(completedText);
    composerInputRef.current?.focus();
  }, []);
  const agentAutocomplete = useAgentCommandAutocomplete({
    draft,
    enabled: Boolean(bubble.roomId && bubble.chatRoomId),
    onApply: applyAgentCommandCompletion,
  });
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

  const changeChatScope = (nextScope: "direct" | "room") => {
    onChatScopeChange?.(nextScope);
    if (nextScope === "room") {
      setChatScreen("thread");
    } else {
      onSelectPeerChatRoom?.(null);
      setChatScreen("list");
    }
  };

  const openPeerRoom = (chatRoomId: string) => {
    onSelectPeerChatRoom?.(chatRoomId);
    setChatScreen("thread");
  };

  const backToList = () => {
    onSelectPeerChatRoom?.(null);
    setChatScreen("list");
  };

  const modeSwitcher = (
    <div className={styles.chatModeSwitch}>
      <SegmentedControl
        ariaLabel={t("widget.chat.scope.aria")}
        labels={[t("widget.chat.scope.direct"), t("widget.chat.scope.room")]}
        onChange={(index) => changeChatScope(index === 1 ? "room" : "direct")}
        value={chatScope === "room" ? 1 : 0}
      />
    </div>
  );

  if (chatScreen === "newRoom") {
    return (
      <NewChatRoomScreen
        bubble={bubble}
        onBack={backToList}
        onCreateDirectRoom={onCreateDirectRoom}
        onCreateGroupRoom={onCreateGroupRoom}
        onOpenThread={openPeerRoom}
      />
    );
  }

  if (chatScreen === "friends") {
    return (
      <FriendsScreen
        bubble={bubble}
        onBack={backToList}
        onCreateDirectRoom={onCreateDirectRoom}
        onOpenThread={openPeerRoom}
        onRespondFriendRequest={onRespondFriendRequest}
        onSearchFriend={onSearchFriend}
        onSendFriendRequest={onSendFriendRequest}
      />
    );
  }

  if (chatScope !== "room" && chatScreen === "list") {
    const peerRooms = bubble.peerRooms ?? [];
    return (
      <div className={styles.body}>
        {modeSwitcher}
        <div className={styles.chatListActions}>
          <button className={styles.chatListActionButton} onClick={() => setChatScreen("newRoom")} type="button">
            <Plus aria-hidden size={13} strokeWidth={2.2} />
            {t("widget.chat.quick.newRoom")}
          </button>
          <button className={styles.chatListActionButton} onClick={() => setChatScreen("friends")} type="button">
            <UserPlus aria-hidden size={13} strokeWidth={2.2} />
            {t("widget.chat.quick.manageFriends")}
          </button>
        </div>
        <div className={styles.rowList}>
          {peerRooms.map((room) => (
            <button className={styles.chatPickerItem} key={room.id} onClick={() => openPeerRoom(room.id)} type="button">
              <i className={styles.pickerAvatar} aria-hidden="true">
                {room.chatType === "GROUP" ? <Users size={14} strokeWidth={2} /> : <MessageSquare size={14} strokeWidth={2} />}
              </i>
              <span>{room.name?.trim() || t("widget.chat.list.title")}</span>
            </button>
          ))}
          {peerRooms.length === 0 ? <span className={styles.statusText}>{t("widget.chat.list.empty")}</span> : null}
        </div>
      </div>
    );
  }

  if (chatScope === "room" && !bubble.hasProjectRoomScope) {
    return (
      <div className={styles.body}>
        {modeSwitcher}
        <span className={styles.statusText}>{t("widget.chat.roomScope.emptyBody")}</span>
      </div>
    );
  }

  const roomSelected = Boolean(bubble.chatRoomId);
  const voiceOpen = Boolean(bubble.voiceRoomId);

  if (!roomSelected) {
    return (
      <div className={styles.body}>
        {modeSwitcher}
        <span className={styles.statusText}>{t("widget.chat.pickHint")}</span>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      {modeSwitcher}
      <div className={styles.chatHead}>
        {chatScope !== "room" ? (
          <button aria-label={t("widget.chat.back")} className={styles.chatBackButton} onClick={backToList} type="button">
            <ChevronLeft aria-hidden size={14} strokeWidth={2.4} />
          </button>
        ) : null}
        <span>{t(bubble.panelLabel as MessageKey)}</span>
        <b>{visibleRows.length}</b>
        {!voiceOpen ? (
          <button
            aria-label={t("widget.chat.startVoice")}
            disabled={(!bubble.roomId && !bubble.chatRoomId) || voiceSubmitting}
            onClick={() => void runVoiceAction("start")}
            type="button"
          >
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
      <div className={styles.composerWrap}>
        {agentAutocomplete.open ? (
          <AgentCommandAutocomplete
            activeIndex={agentAutocomplete.activeIndex}
            items={agentAutocomplete.items}
            onHoverItem={agentAutocomplete.setActiveIndex}
            onPick={agentAutocomplete.pick}
            tone="bubble"
          />
        ) : null}
        <div className={styles.input}>
          <SmilePlus size={14} strokeWidth={2} />
          <input
            disabled={!bubble.chatRoomId || submitting}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // 자동완성이 열려 있으면 ↑/↓/Tab/Enter/Esc는 팝오버가 먼저 소비한다.
              if (agentAutocomplete.handleKeyDown(event)) return;
              if (event.key === "Enter") {
                event.preventDefault();
                void sendDraftMessage();
              }
            }}
            placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : undefined}
            ref={composerInputRef}
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
    </div>
  );
}

const MIN_WIDGET_GROUP_MEMBER_COUNT = 2;

// 새 대화(1:1 시작 / 그룹 생성) — 친구를 고르면 바로 1:1을 열거나, 여럿 고르면 그룹을 만든다.
// 웹 소통창의 새 채팅방 만들기 패널과 같은 로직을 위젯 폭에 맞게 옮겼다.
function NewChatRoomScreen({
  bubble,
  onBack,
  onCreateDirectRoom,
  onCreateGroupRoom,
  onOpenThread,
}: {
  bubble: WidgetPreviewBubble;
  onBack: () => void;
  onCreateDirectRoom?: DesktopWidgetBubbleProps["onCreateDirectRoom"];
  onCreateGroupRoom?: DesktopWidgetBubbleProps["onCreateGroupRoom"];
  onOpenThread: (chatRoomId: string) => void;
}) {
  const { t } = useI18n();
  const friends = useMemo(() => bubble.friends ?? [], [bubble.friends]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const toggleMember = (userId: string) => {
    setSelectedIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  };

  const startDirect = async (userId: string) => {
    if (!onCreateDirectRoom || busy) return;
    setBusy(true);
    setErrorText(null);
    try {
      const room = (await onCreateDirectRoom(userId)) as { id?: string } | undefined;
      if (room?.id) onOpenThread(room.id);
    } catch {
      setErrorText(t("widget.chat.newRoom.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  const createGroup = async () => {
    if (!onCreateGroupRoom || busy || selectedIds.length < MIN_WIDGET_GROUP_MEMBER_COUNT) return;
    setBusy(true);
    setErrorText(null);
    try {
      const fallbackName = friends
        .filter((friend) => selectedIds.includes(friend.userId))
        .map((friend) => friend.name)
        .slice(0, 3)
        .join(", ");
      const room = (await onCreateGroupRoom(selectedIds, groupName.trim() || fallbackName)) as { id?: string } | undefined;
      if (room?.id) onOpenThread(room.id);
    } catch {
      setErrorText(t("widget.chat.newRoom.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.chatScreenHead}>
        <button aria-label={t("widget.chat.back")} className={styles.chatBackButton} onClick={onBack} type="button">
          <ChevronLeft aria-hidden size={14} strokeWidth={2.4} />
        </button>
        <span>{t("widget.chat.newRoom.title")}</span>
      </div>
      <label className={styles.groupNameField} htmlFor="widget-group-room-name">
        <span>{t("widget.chat.newRoom.groupName")}</span>
        <input
          id="widget-group-room-name"
          onChange={(event) => setGroupName(event.target.value)}
          placeholder={t("widget.chat.newRoom.groupNamePlaceholder")}
          value={groupName}
        />
      </label>
      <div className={styles.rowList}>
        {friends.map((friend) => {
          const selected = selectedIds.includes(friend.userId);
          return (
            <div className={styles.chatFriendRow} key={friend.userId}>
              <i className={styles.pickerAvatar} aria-hidden="true">
                {selected ? <Check size={14} strokeWidth={2.2} /> : friend.name.slice(0, 1)}
              </i>
              <span>{friend.name}</span>
              <span className={styles.itemActions}>
                <button aria-label={t("widget.chat.newRoom.direct")} disabled={busy} onClick={() => void startDirect(friend.userId)} type="button">
                  <MessageSquare aria-hidden size={12} strokeWidth={2} />
                </button>
                <button
                  aria-label={selected ? t("widget.chat.newRoom.deselect") : t("widget.chat.newRoom.selectForGroup")}
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => toggleMember(friend.userId)}
                  type="button"
                >
                  <UserPlus aria-hidden size={12} strokeWidth={2} />
                </button>
              </span>
            </div>
          );
        })}
        {friends.length === 0 ? <span className={styles.statusText}>{t("widget.chat.newRoom.friendsEmpty")}</span> : null}
      </div>
      <div className={styles.chatListActions}>
        <span className={styles.statusText}>
          {t("widget.chat.newRoom.selectedCount", { count: selectedIds.length })}
          {selectedIds.length < MIN_WIDGET_GROUP_MEMBER_COUNT ? ` · ${t("widget.chat.newRoom.minGroupSelection")}` : ""}
        </span>
        <button
          className={styles.chatListActionButton}
          disabled={busy || selectedIds.length < MIN_WIDGET_GROUP_MEMBER_COUNT}
          onClick={() => void createGroup()}
          type="button"
        >
          {busy ? t("widget.chat.newRoom.creating") : t("widget.chat.newRoom.createGroup")}
        </button>
      </div>
      {errorText ? <span className={styles.statusText}>{errorText}</span> : null}
    </div>
  );
}

type FriendSearchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "empty" }
  | { kind: "ready"; result: FriendSearchApiResponse };

// 친구 관리 — 내 ID 복사, 검색+요청, 친구 목록(1:1 시작만), 받은/보낸 요청.
// 삭제·룸 초대 등은 위젯 스코프 밖(웹에서만) — 좁은 창에서 액션이 너무 많아지는 걸 막는다.
function FriendsScreen({
  bubble,
  onBack,
  onCreateDirectRoom,
  onOpenThread,
  onRespondFriendRequest,
  onSearchFriend,
  onSendFriendRequest,
}: {
  bubble: WidgetPreviewBubble;
  onBack: () => void;
  onCreateDirectRoom?: DesktopWidgetBubbleProps["onCreateDirectRoom"];
  onOpenThread: (chatRoomId: string) => void;
  onRespondFriendRequest?: DesktopWidgetBubbleProps["onRespondFriendRequest"];
  onSearchFriend?: DesktopWidgetBubbleProps["onSearchFriend"];
  onSendFriendRequest?: DesktopWidgetBubbleProps["onSendFriendRequest"];
}) {
  const { t } = useI18n();
  const friends = bubble.friends ?? [];
  const requests = bubble.friendRequests ?? [];
  const currentUserId = bubble.currentUserId;
  const receivedRequests = requests.filter((request) => request.requesterId !== currentUserId);
  const sentRequests = requests.filter((request) => request.requesterId === currentUserId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<FriendSearchState>({ kind: "idle" });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [directBusyId, setDirectBusyId] = useState<string | null>(null);

  const runSearch = async () => {
    const bubliId = searchQuery.trim().replace(/^@/, "");
    if (!bubliId || !onSearchFriend) return;
    setSearchState({ kind: "searching" });
    setSentTo(null);
    try {
      const result = await onSearchFriend(bubliId);
      setSearchState(result ? { kind: "ready", result } : { kind: "empty" });
    } catch {
      setSearchState({ kind: "empty" });
    }
  };

  const sendRequest = async (targetBubliId: string) => {
    if (!onSendFriendRequest) return;
    try {
      await onSendFriendRequest(targetBubliId);
      setSentTo(targetBubliId);
    } catch {
      // 실패는 조용히 무시 — 검색 결과의 버튼이 그대로 다시 시도 가능한 상태로 남는다.
    }
  };

  const respond = async (requestId: string, action: "accept" | "reject") => {
    if (!onRespondFriendRequest || busyRequestId) return;
    setBusyRequestId(requestId);
    try {
      await onRespondFriendRequest(requestId, action);
    } finally {
      setBusyRequestId(null);
    }
  };

  const startDirect = async (userId: string) => {
    if (!onCreateDirectRoom || directBusyId) return;
    setDirectBusyId(userId);
    try {
      const room = (await onCreateDirectRoom(userId)) as { id?: string } | undefined;
      if (room?.id) onOpenThread(room.id);
    } finally {
      setDirectBusyId(null);
    }
  };

  const copyMyId = async () => {
    if (!bubble.myBubliId) return;
    try {
      await navigator.clipboard.writeText(bubble.myBubliId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 조용히 무시.
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.chatScreenHead}>
        <button aria-label={t("widget.chat.back")} className={styles.chatBackButton} onClick={onBack} type="button">
          <ChevronLeft aria-hidden size={14} strokeWidth={2.4} />
        </button>
        <span>{t("widget.chat.social.title")}</span>
      </div>

      <div className={styles.socialCard}>
        <span className={styles.socialKicker}>
          <AtSign aria-hidden size={12} strokeWidth={2} />
          {t("widget.chat.social.myBubliId")}
        </span>
        <div className={styles.chatFriendRow}>
          <span aria-hidden="true" />
          <strong>{bubble.myBubliId ?? ""}</strong>
          <button aria-label={t("widget.chat.social.copy")} onClick={() => void copyMyId()} type="button">
            <Copy aria-hidden size={13} strokeWidth={2} />
          </button>
        </div>
        {copied ? <span className={styles.statusText}>{t("widget.chat.social.copied")}</span> : null}
      </div>

      <div className={styles.socialCard}>
        <span className={styles.socialKicker}>
          <Search aria-hidden size={12} strokeWidth={2} />
          {t("widget.chat.social.searchLabel")}
        </span>
        <div className={styles.groupNameField}>
          <input
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch();
              }
            }}
            placeholder={t("widget.chat.social.searchPlaceholder")}
            value={searchQuery}
          />
          <button onClick={() => void runSearch()} type="button">
            {t("widget.chat.social.searchCta")}
          </button>
        </div>
        {searchState.kind === "searching" ? <span className={styles.statusText}>{t("widget.chat.search.searching")}</span> : null}
        {searchState.kind === "empty" ? <span className={styles.statusText}>{t("widget.chat.search.empty")}</span> : null}
        {searchState.kind === "ready" ? (
          <div className={styles.chatFriendRow}>
            <i className={styles.pickerAvatar} aria-hidden="true">
              {searchState.result.name.slice(0, 1)}
            </i>
            <span>{searchState.result.name}</span>
            <button
              disabled={sentTo === searchState.result.bubliId}
              onClick={() => void sendRequest(searchState.result.bubliId)}
              type="button"
            >
              {sentTo === searchState.result.bubliId ? t("widget.chat.search.sent") : t("widget.chat.search.sendRequest")}
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.socialCard}>
        <span className={styles.socialKicker}>
          <Users aria-hidden size={12} strokeWidth={2} />
          {t("widget.chat.friends.title")}
        </span>
        <div className={styles.rowList}>
          {friends.map((friend) => (
            <button
              className={styles.chatPickerItem}
              disabled={directBusyId === friend.userId}
              key={friend.userId}
              onClick={() => void startDirect(friend.userId)}
              type="button"
            >
              <i className={styles.pickerAvatar} aria-hidden="true">
                {friend.name.slice(0, 1)}
              </i>
              <span>{directBusyId === friend.userId ? t("widget.chat.newRoom.creating") : friend.name}</span>
            </button>
          ))}
          {friends.length === 0 ? <span className={styles.statusText}>{t("widget.chat.friends.empty")}</span> : null}
        </div>
      </div>

      {receivedRequests.length > 0 || sentRequests.length > 0 ? (
        <div className={styles.socialCard}>
          <span className={styles.socialKicker}>
            <Inbox aria-hidden size={12} strokeWidth={2} />
            {t("widget.chat.requests.title")}
          </span>
          {receivedRequests.map((request) => (
            <div className={styles.chatFriendRow} key={request.id}>
              <i className={styles.pickerAvatar} aria-hidden="true">
                {request.requesterName.slice(0, 1)}
              </i>
              <span>{request.requesterName}</span>
              <span className={styles.itemActions}>
                <button
                  aria-label={t("widget.chat.requests.accept")}
                  disabled={busyRequestId === request.id}
                  onClick={() => void respond(request.id, "accept")}
                  type="button"
                >
                  <Check aria-hidden size={12} strokeWidth={2.2} />
                </button>
                <button
                  aria-label={t("widget.chat.requests.reject")}
                  disabled={busyRequestId === request.id}
                  onClick={() => void respond(request.id, "reject")}
                  type="button"
                >
                  <X aria-hidden size={12} strokeWidth={2.2} />
                </button>
              </span>
            </div>
          ))}
          {sentRequests.map((request) => (
            <div className={styles.chatFriendRow} key={request.id}>
              <i className={styles.pickerAvatar} aria-hidden="true">
                {request.receiverName.slice(0, 1)}
              </i>
              <span>{request.receiverName}</span>
              <b>{t("widget.chat.requests.waiting")}</b>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const TIMER_MODE_ORDER: WidgetTimerMode[] = ["clock", "work", "pomodoro"];

function formatClock(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatMinutesSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function elapsedWidgetTimerLabel(item?: WidgetPreviewItem, fallback = "00:00") {
  if (!item) return fallback;

  const baseSeconds = item.timerDurationSeconds ?? 0;
  if (item.status !== "RUNNING") {
    return formatMinutesSeconds(baseSeconds);
  }

  const startedAt = new Date(item.timerLastStartedAt ?? item.timerStartedAt ?? "").getTime();
  if (Number.isNaN(startedAt)) return fallback;

  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  return formatMinutesSeconds(baseSeconds + Math.max(0, elapsedSeconds));
}

// 시계 모드: HH:MM:SS 라이브(1s 인터벌) + 날짜 한 줄. start/stop 컨트롤 없음.
// reduced-motion과 무관하게 텍스트만 갱신하므로 애니메이션 정책의 영향을 받지 않는다.
// 플립(스플릿-플랩) 시계 — 자리값이 바뀔 때만 위→아래로 접히는 카드 애니메이션.
// reduced-motion이면 애니메이션 없이 숫자만 즉시 교체한다.
function FlipDigit({ digit }: { digit: string }) {
  const prefersReducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(digit);
  const [previous, setPrevious] = useState(digit);
  const [flipping, setFlipping] = useState(false);

  // 렌더 중 prop 변화에 맞춰 상태를 조정 — effect에서 setState하면 불필요한 추가 렌더가
  // 발생하므로(react-hooks/set-state-in-effect), React 공식 권장 패턴대로 렌더 본문에서 처리한다.
  if (digit !== current) {
    setPrevious(current);
    setCurrent(digit);
    setFlipping(true);
  }

  if (prefersReducedMotion) {
    return (
      <span className={styles.flipDigit}>
        <span className={styles.flipStatic}>{digit}</span>
      </span>
    );
  }

  return (
    <span className={styles.flipDigit}>
      <span className={[styles.flipCard, styles.flipTop].join(" ")}>
        <span className={styles.flipCardText}>{previous}</span>
      </span>
      <span className={[styles.flipCard, styles.flipBottom].join(" ")}>
        <span className={styles.flipCardText}>{current}</span>
      </span>
      <span
        className={[styles.flipper, flipping ? styles.isFlipping : ""].filter(Boolean).join(" ")}
        onAnimationEnd={() => {
          setFlipping(false);
          setPrevious(digit);
        }}
      >
        <span className={[styles.flipCard, styles.flipTop, styles.flipperTop].join(" ")}>
          <span className={styles.flipCardText}>{previous}</span>
        </span>
        <span className={[styles.flipCard, styles.flipBottom, styles.flipperBottom].join(" ")}>
          <span className={styles.flipCardText}>{current}</span>
        </span>
      </span>
    </span>
  );
}

function FlipTime({ value, className }: { value: string; className?: string }) {
  return (
    <span className={[styles.flipTime, className].filter(Boolean).join(" ")} aria-label={value}>
      {value.split("").map((char, index) =>
        char === ":" ? (
          <span aria-hidden="true" className={styles.flipColon} key={`c-${index}`}>:</span>
        ) : (
          <FlipDigit digit={char} key={`d-${index}`} />
        ),
      )}
    </span>
  );
}

function ClockView() {
  const { locale } = useI18n();
  // 라이브 클라이언트 전용 위젯이라 lazy init으로 첫 값을 렌더 시 만든다(effect 내 동기 setState 회피).
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "short", year: "numeric" }).format(now);

  return (
    <div className={styles.clockFace} role="timer" aria-live="off">
      <strong className={styles.clockTime}>{formatClock(now)}</strong>
      <span className={styles.clockDate}>{dateLabel}</span>
    </div>
  );
}

// 작업 모드: 서버 time_logs에 기록되는 작업 타이머(start/pause/resume/stop).
// 현재 컨텍스트(개인=GENERAL / 룸=WORK)로 귀속되며 링에 서버 경과 지표를 표시한다.
function WorkView({
  bubble,
  onPauseTimer,
  onPrimaryTimerAction,
}: {
  bubble: WidgetPreviewBubble;
  onPauseTimer?: DesktopWidgetBubbleProps["onPauseTimer"];
  onPrimaryTimerAction?: DesktopWidgetBubbleProps["onPrimaryTimerAction"];
}) {
  const { t } = useI18n();
  const timerItem = bubble.rows[0];
  const timerStatus = timerItem?.status;
  const canPause = timerStatus === "RUNNING";
  const PrimaryIcon = timerStatus === "RUNNING" ? Square : Play;
  // 실행 중 타이머는 위젯 스코프와 무관하게 노출되므로, 라벨은 위젯 스코프가 아니라 타이머 자신을 기준으로 한다.
  // 타이머 행이 있으면 그 행의 라벨(작업/일반)을, 다른 룸에 걸린 타이머면 그 룸 이름을 함께 보여 준다.
  const contextLabel = timerItem
    ? timerItem.roomName
      ? `${timerItem.label} · ${timerItem.roomName}`
      : timerItem.label
    : bubble.roomId
      ? t("widget.timer.workTimer")
      : t("widget.timer.generalTimer");
  const primaryLabel =
    timerStatus === "RUNNING"
      ? t("widget.timerAction.stop")
      : timerStatus === "PAUSED"
        ? t("widget.timerAction.resume")
        : t("widget.timerAction.start");
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    if (timerStatus !== "RUNNING") return;

    const intervalId = window.setInterval(() => {
      setTimerTick((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [timerStatus]);

  const liveMetric = elapsedWidgetTimerLabel(timerItem, bubble.metric);

  return (
    <>
      <div className={styles.timerPlain}>
        <strong className={styles.timerPlainValue}>{liveMetric}</strong>
        <span className={styles.timerPlainLabel}>{t(bubble.metricLabel as MessageKey)}</span>
      </div>
      <p className={styles.timerScopeNote}>{contextLabel}</p>
      {/* 타이머 카드에는 체크/고정/숨김 같은 항목 액션(ItemRows)을 두지 않는다 — 타이머엔 의미 없음. */}
      <div className={canPause ? styles.timerActions : [styles.timerActions, styles.timerActionsSingle].join(" ")}>
        <button
          aria-label={primaryLabel}
          className={styles.timerPrimary}
          onClick={() => void onPrimaryTimerAction?.(bubble)}
          title={timerStatus === "RUNNING" ? t("widget.timer.stopHint") : undefined}
          type="button"
        >
          <PrimaryIcon size={13} />
          {primaryLabel}
        </button>
        {canPause ? (
          <button className={styles.timerGhost} onClick={() => void onPauseTimer?.(bubble)} title={t("widget.timer.pauseHint")} type="button">
            <Pause size={13} />
            {t("widget.timer.pause")}
          </button>
        ) : null}
      </div>
    </>
  );
}

// 뽀모도로 모드: 로컬 전용 25/5 사이클. 서버 기록 없음. 진행 상태는 sqlite에 저장돼
// 창을 닫아도 복원된다(집중↔휴식 자동전환, 사이클 카운트). 완료 시 goo 팝 신호를 재사용한다.
// 집중/휴식 분 프리셋(집중·휴식). 선택 시 두 값을 함께 적용한다.
const POMODORO_PRESETS: Array<{ breakMinutes: number; focusMinutes: number; labelKey: MessageKey }> = [
  { breakMinutes: 5, focusMinutes: 25, labelKey: "widget.timer.pomodoroPreset25" },
  { breakMinutes: 10, focusMinutes: 50, labelKey: "widget.timer.pomodoroPreset50" },
  { breakMinutes: 3, focusMinutes: 15, labelKey: "widget.timer.pomodoroPreset15" },
];

// 집중/휴식 분을 직접 입력하는 필드 — 숫자만 허용, 범위로 클램프. +/− 스텝퍼와 함께 쓴다.
// 진행 링 둘레(r=54): 2πr. strokeDashoffset = 둘레 × 경과비율(시간이 지날수록 링이 줄어든다).
const POMODORO_RING_CIRCUMFERENCE = 2 * Math.PI * 54;

// 작업/개인 카운트업 타이머용 원형 링 — 뽀모도로와 같은 디자인, 색만 다르게(파랑).
// progress(0~1)는 현재 1분 내 진행(초/60)이라 매 분 한 바퀴 스윕한다.
function TimerRing({ label, progress, time }: { label: string; progress: number; time: string }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className={[styles.pomodoroCircle, styles.timerRing].join(" ")}>
      <svg className={styles.pomodoroSvg} viewBox="0 0 120 120" aria-hidden="true">
        <circle className={styles.pomodoroTrack} cx="60" cy="60" r="54" />
        <circle
          className={styles.pomodoroProgress}
          cx="60"
          cy="60"
          r="54"
          style={{ strokeDasharray: POMODORO_RING_CIRCUMFERENCE, strokeDashoffset: POMODORO_RING_CIRCUMFERENCE * (1 - clamped) }}
        />
      </svg>
      <div className={styles.pomodoroCircleContent}>
        <strong>{time}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

// "MM:SS"/"H:MM:SS" 문자열에서 총 초를 구해 현재 1분 내 진행률(0~1)을 만든다.
function minuteProgressFromLabel(label: string): number {
  const seconds = label.split(":").reduce((acc, part) => acc * 60 + (Number(part) || 0), 0);
  return (seconds % 60) / 60;
}

function PomodoroMinuteField({
  ariaLabel,
  disabled,
  max,
  min,
  onCommit,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  max: number;
  min: number;
  onCommit: (next: number) => void;
  value: number;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string>(String(value));

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <span className={styles.pomodoroMinuteField}>
      <input
        aria-label={ariaLabel}
        className={styles.pomodoroMinuteInput}
        disabled={disabled}
        inputMode="numeric"
        maxLength={2}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        pattern="[0-9]*"
        value={draft}
      />
      <span className={styles.pomodoroMinuteUnit}>{t("widget.timer.minuteUnit")}</span>
    </span>
  );
}

function PomodoroView({ selectedRoomId }: { selectedRoomId: string | null }) {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const [state, setState] = useState<PomodoroState>(() => createIdlePomodoroState());
  const [remaining, setRemaining] = useState<number>(() => createIdlePomodoroState().remainingSeconds ?? 25 * 60);
  const [popKey, setPopKey] = useState<number | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 재오픈 복원: 저장된 진행 상태를 읽어 실행 중이면 phaseEndsAt으로 남은 시간을 재계산한다.
  useEffect(() => {
    let cancelled = false;
    void readPomodoroState(selectedRoomId).then((stored) => {
      if (cancelled || !stored) return;
      setState(stored);
      if (stored.running && stored.phaseEndsAt) {
        setRemaining(Math.max(0, Math.round((stored.phaseEndsAt - Date.now()) / 1000)));
      } else {
        setRemaining(stored.remainingSeconds ?? phaseDurationSeconds(stored.phase, stored.focusMinutes, stored.breakMinutes));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRoomId]);

  const persist = useCallback(
    (next: PomodoroState) => {
      setState(next);
      void writePomodoroState(next, selectedRoomId);
    },
    [selectedRoomId],
  );

  // 실행 중 1s 틱 — phaseEndsAt에 도달하면 페이즈 자동 전환(집중→휴식은 사이클 +1).
  useEffect(() => {
    if (!state.running || !state.phaseEndsAt) return;

    const tick = () => {
      const current = stateRef.current;
      if (!current.running || !current.phaseEndsAt) return;
      const left = Math.round((current.phaseEndsAt - Date.now()) / 1000);
      if (left > 0) {
        setRemaining(left);
        return;
      }
      // 페이즈 종료 → 자동 전환.
      const nextPhase: PomodoroPhase = current.phase === "focus" ? "break" : "focus";
      const nextCycles = current.phase === "focus" ? current.cyclesCompleted + 1 : current.cyclesCompleted;
      const nextDuration = phaseDurationSeconds(nextPhase, current.focusMinutes, current.breakMinutes);
      const next: PomodoroState = {
        ...current,
        cyclesCompleted: nextCycles,
        phase: nextPhase,
        phaseEndsAt: Date.now() + nextDuration * 1000,
        remainingSeconds: null,
        running: true,
      };
      setRemaining(nextDuration);
      setPopKey(Date.now());
      persist(next);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    // 탭 전환/포커스 복귀 시 즉시 재계산해 백그라운드 스로틀로 멈춰 보이는 문제를 없앤다.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [persist, state.phaseEndsAt, state.running]);

  const start = () => {
    const duration = phaseDurationSeconds(state.phase, state.focusMinutes, state.breakMinutes);
    const base = remaining > 0 && remaining < duration ? remaining : duration;
    persist({ ...state, phaseEndsAt: Date.now() + base * 1000, remainingSeconds: null, running: true });
    setRemaining(base);
  };

  const pause = () => {
    persist({ ...state, phaseEndsAt: null, remainingSeconds: remaining, running: false });
  };

  const reset = () => {
    // 초기화는 진행/사이클만 비우고 사용자가 설정한 집중/휴식 분은 보존한다.
    const idle = createIdlePomodoroState(state.focusMinutes, state.breakMinutes);
    persist(idle);
    setRemaining(idle.remainingSeconds ?? state.focusMinutes * 60);
  };

  // 대기 중일 때만 분 설정 변경 허용 — 진행 중 변경은 링이 튀므로 막는다.
  const applyMinutes = (focusMinutes: number, breakMinutes: number) => {
    if (state.running) return;
    const focus = Math.min(POMODORO_FOCUS_MAX, Math.max(POMODORO_FOCUS_MIN, Math.round(focusMinutes)));
    const brk = Math.min(POMODORO_BREAK_MAX, Math.max(POMODORO_BREAK_MIN, Math.round(breakMinutes)));
    const next: PomodoroState = { ...state, focusMinutes: focus, breakMinutes: brk };
    persist(next);
    setRemaining(phaseDurationSeconds(next.phase, focus, brk));
  };

  const totalPhase = phaseDurationSeconds(state.phase, state.focusMinutes, state.breakMinutes);
  const settingsDisabled = state.running;
  const progress = totalPhase > 0 ? 1 - remaining / totalPhase : 0;
  const phaseClass = state.phase === "focus" ? styles.pomodoroFocus : styles.pomodoroBreak;
  const phaseLabel = state.phase === "focus" ? t("widget.timer.pomodoroFocus") : t("widget.timer.pomodoroBreak");

  return (
    <>
      {/* 깔끔한 원형 SVG 진행 링 — 남은 시간만큼 링이 차고, 시간이 지날수록 줄어든다(집중=coral / 휴식=sky). */}
      <div className={[styles.pomodoroCircle, phaseClass].join(" ")}>
        <svg className={styles.pomodoroSvg} viewBox="0 0 120 120" aria-hidden="true">
          <circle className={styles.pomodoroTrack} cx="60" cy="60" r="54" />
          <circle
            className={styles.pomodoroProgress}
            cx="60"
            cy="60"
            r="54"
            style={{ strokeDasharray: POMODORO_RING_CIRCUMFERENCE, strokeDashoffset: POMODORO_RING_CIRCUMFERENCE * progress }}
          />
        </svg>
        <div className={styles.pomodoroCircleContent}>
          <strong>{formatMinutesSeconds(remaining)}</strong>
          <span>{phaseLabel}</span>
        </div>
        {popKey !== null ? (
          <motion.span
            key={popKey}
            className={styles.pomodoroPop}
            aria-hidden="true"
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
            onAnimationComplete={() => setPopKey(null)}
          />
        ) : null}
      </div>
      <p className={styles.timerScopeNote}>{t("widget.timer.pomodoroCycles", { value: state.cyclesCompleted })}</p>
      {/* 분 설정 — 대기 중에만 조작 가능. 프리셋 + 집중/휴식 스텝퍼. */}
      <div className={styles.pomodoroSettings} aria-disabled={settingsDisabled}>
        {/* 프리셋 제거 — 사용자가 직접 분을 입력/조절한다(저장값은 유지). */}
        <div className={styles.pomodoroStepperRow}>
          <div className={styles.pomodoroStepper}>
            <span className={styles.pomodoroStepperLabel}>{t("widget.timer.pomodoroFocus")}</span>
            <button aria-label={t("widget.timer.pomodoroFocusDown")} disabled={settingsDisabled || state.focusMinutes <= POMODORO_FOCUS_MIN} onClick={() => applyMinutes(state.focusMinutes - 5, state.breakMinutes)} type="button">−</button>
            <PomodoroMinuteField ariaLabel={t("widget.timer.pomodoroFocus")} disabled={settingsDisabled} key={`focus-${state.focusMinutes}`} max={POMODORO_FOCUS_MAX} min={POMODORO_FOCUS_MIN} onCommit={(next) => applyMinutes(next, state.breakMinutes)} value={state.focusMinutes} />
            <button aria-label={t("widget.timer.pomodoroFocusUp")} disabled={settingsDisabled || state.focusMinutes >= POMODORO_FOCUS_MAX} onClick={() => applyMinutes(state.focusMinutes + 5, state.breakMinutes)} type="button">+</button>
          </div>
          <div className={styles.pomodoroStepper}>
            <span className={styles.pomodoroStepperLabel}>{t("widget.timer.pomodoroBreak")}</span>
            <button aria-label={t("widget.timer.pomodoroBreakDown")} disabled={settingsDisabled || state.breakMinutes <= POMODORO_BREAK_MIN} onClick={() => applyMinutes(state.focusMinutes, state.breakMinutes - 1)} type="button">−</button>
            <PomodoroMinuteField ariaLabel={t("widget.timer.pomodoroBreak")} disabled={settingsDisabled} key={`break-${state.breakMinutes}`} max={POMODORO_BREAK_MAX} min={POMODORO_BREAK_MIN} onCommit={(next) => applyMinutes(state.focusMinutes, next)} value={state.breakMinutes} />
            <button aria-label={t("widget.timer.pomodoroBreakUp")} disabled={settingsDisabled || state.breakMinutes >= POMODORO_BREAK_MAX} onClick={() => applyMinutes(state.focusMinutes, state.breakMinutes + 1)} type="button">+</button>
          </div>
        </div>
      </div>
      <div className={styles.timerActions}>
        {state.running ? (
          <button className={styles.timerPrimary} onClick={pause} type="button">
            <Pause size={13} />
            {t("widget.timer.pause")}
          </button>
        ) : (
          <button className={styles.timerPrimary} onClick={start} type="button">
            <Play size={13} />
            {t("widget.timerAction.start")}
          </button>
        )}
        <button className={styles.timerGhost} onClick={reset} type="button">
          <RefreshCw size={13} />
          {t("widget.timer.pomodoroReset")}
        </button>
      </div>
    </>
  );
}

// 개인 모드: 어디에도 저장하지 않는 로컬 임시 스톱워치(잠깐 쓰는 용도).
// 서버/sqlite 모두 미기록 — 창을 닫으면 사라진다. 화면은 딱 시작/정지/초기화만.
function PersonalTimerView() {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const startedAtRef = useRef<number | null>(null);
  const baseRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;

    startedAtRef.current = Date.now();
    const tick = () => {
      const startedAt = startedAtRef.current;
      if (startedAt == null) return;
      setElapsed(baseRef.current + Math.floor((Date.now() - startedAt) / 1000));
    };
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [running]);

  const toggle = () => {
    if (running) {
      // 정지: 누적 경과를 확정한다.
      baseRef.current = elapsed;
      startedAtRef.current = null;
      setRunning(false);
    } else {
      setRunning(true);
    }
  };
  const reset = () => {
    setRunning(false);
    startedAtRef.current = null;
    baseRef.current = 0;
    setElapsed(0);
  };

  return (
    <>
      <div className={styles.timerPlain}>
        <strong className={styles.timerPlainValue}>{formatMinutesSeconds(elapsed)}</strong>
        <span className={styles.timerPlainLabel}>{running ? t("widget.timer.recording") : t("widget.timer.waiting")}</span>
      </div>
      <div className={elapsed > 0 || running ? styles.timerActions : [styles.timerActions, styles.timerActionsSingle].join(" ")}>
        <button className={styles.timerPrimary} onClick={toggle} type="button">
          {running ? <Pause size={13} /> : <Play size={13} />}
          {running ? t("widget.timer.pause") : t("widget.timerAction.start")}
        </button>
        {elapsed > 0 || running ? (
          <button className={styles.timerGhost} onClick={reset} type="button">
            <RefreshCw size={13} />
            {t("widget.timer.pomodoroReset")}
          </button>
        ) : null}
      </div>
    </>
  );
}

function TimerBody({
  bubble,
  initialMode,
  actionNotice,
  onTimerModeChange,
  onPauseTimer,
  onPrimaryTimerAction,
}: {
  bubble: WidgetPreviewBubble;
  initialMode?: WidgetTimerMode | null;
  actionNotice?: string | null;
  onTimerModeChange?: (mode: WidgetTimerMode) => void;
  onPauseTimer?: DesktopWidgetBubbleProps["onPauseTimer"];
  onPrimaryTimerAction?: DesktopWidgetBubbleProps["onPrimaryTimerAction"];
}) {
  const { t } = useI18n();
  const selectedRoomId = bubble.roomId?.trim() || null;
  const [mode, setMode] = useState<WidgetTimerMode>(initialMode ?? "work");
  // 타이머 탭 하위 종류(작업=프로젝트룸용 서버 누적 / 개인=로컬 임시 스톱워치).
  // 룸이 있으면 작업, 없으면 개인이 기본. 사용자가 자유롭게 전환할 수 있다(강제 고정 없음).
  const [timerKind, setTimerKind] = useState<WidgetTimerKind>(selectedRoomId ? "work" : "personal");

  // 선택 모드/종류 복원(재오픈).
  useEffect(() => {
    let cancelled = false;
    void readWidgetTimerMode(selectedRoomId).then((stored) => {
      if (cancelled) return;
      if (stored) {
        setMode(stored);
        onTimerModeChange?.(stored);
      }
    });
    void readWidgetTimerKind(selectedRoomId).then((stored) => {
      if (cancelled) return;
      if (stored) setTimerKind(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [onTimerModeChange, selectedRoomId]);

  const changeMode = (index: number) => {
    const next = TIMER_MODE_ORDER[index] ?? "work";
    setMode(next);
    onTimerModeChange?.(next);
    void writeWidgetTimerMode(next, selectedRoomId);
  };
  const changeTimerKind = (index: number) => {
    const next: WidgetTimerKind = index === 1 ? "personal" : "work";
    setTimerKind(next);
    void writeWidgetTimerKind(next, selectedRoomId);
  };
  const displayedMode: WidgetTimerMode = mode;
  // 사용자의 선택을 그대로 따른다 — 서버 타이머가 돌아도 개인 탭으로 자유롭게 전환된다(튕김 없음).
  const displayedKind: WidgetTimerKind = timerKind;

  return (
    <div className={styles.body}>
      {actionNotice ? (
        <p className={styles.timerNotice} role="status" aria-live="polite">
          {actionNotice}
        </p>
      ) : null}
      {/* 상위 탭: 시계 · 타이머 · 뽀모도로. 하나의 세그먼트 바로 읽혀야 한다(pill 3개 금지). */}
      <SegmentedControl
        ariaLabel={t("widget.timer.modeAria")}
        labels={[t("widget.timer.tabClock"), t("widget.timer.tabTimer"), t("widget.timer.tabPomodoro")]}
        onChange={changeMode}
        value={TIMER_MODE_ORDER.indexOf(displayedMode)}
      />
      {/* 탭을 바꿔도 실행 중인 타이머/뽀모도로 상태가 유지되도록 언마운트하지 않고
          display로만 감춘다(초기화 버그 수정). display:contents로 레이아웃은 그대로. */}
      <div style={{ display: displayedMode === "clock" ? "contents" : "none" }}>
        <ClockView />
      </div>
      <div style={{ display: displayedMode === "work" ? "contents" : "none" }}>
        {/* 프로젝트룸용(작업, 서버 누적) ↔ 개인용(임시 스톱워치, 저장 안 함). */}
        <SegmentedControl
          ariaLabel={t("widget.timer.kindAria")}
          labels={[t("widget.timer.kindWork"), t("widget.timer.kindPersonal")]}
          onChange={changeTimerKind}
          value={displayedKind === "personal" ? 1 : 0}
        />
        <div style={{ display: displayedKind === "work" ? "contents" : "none" }}>
          {isBubbleSyncPending(bubble) ? (
            <div className={styles.syncLine} role="status">
              <RefreshCw size={12} strokeWidth={2.2} />
              <span>{t("widget.data.syncPending")}</span>
            </div>
          ) : null}
          <WorkView bubble={bubble} onPauseTimer={onPauseTimer} onPrimaryTimerAction={onPrimaryTimerAction} />
        </div>
        <div style={{ display: displayedKind === "personal" ? "contents" : "none" }}>
          <PersonalTimerView />
        </div>
      </div>
      <div style={{ display: displayedMode === "pomodoro" ? "contents" : "none" }}>
        <PomodoroView selectedRoomId={selectedRoomId} />
      </div>
    </div>
  );
}

// 메모 컴포저 textarea 자동 확장 — 1줄에서 시작해 최대 약 5줄까지 늘고 이후 내부 스크롤.
const MEMO_COMPOSER_MAX_HEIGHT = 106;

function autoGrowTextarea(node: HTMLTextAreaElement | null, maxHeight: number) {
  if (!node) return;
  node.style.height = "auto";
  node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
  node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
}

function memoItemBody(item: WidgetPreviewItem) {
  return item.memoBody ?? item.label;
}

function MemoBody({
  bubble,
  onCreateMemo,
  onDeleteMemo,
  onEditMemo,
}: {
  bubble: WidgetPreviewBubble;
  onCreateMemo?: DesktopWidgetBubbleProps["onCreateMemo"];
  onDeleteMemo?: DesktopWidgetBubbleProps["onDeleteMemo"];
  onEditMemo?: DesktopWidgetBubbleProps["onEditMemo"];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedMemo = selectedMemoId ? bubble.rows.find((item) => item.id === selectedMemoId) ?? null : null;
  const editingMemo = editingMemoId ? bubble.rows.find((item) => item.id === editingMemoId) ?? selectedMemo : null;
  const selectedBody = selectedMemo ? memoItemBody(selectedMemo) : "";
  const isEditingSelected = Boolean(selectedMemo && editingMemoId === selectedMemo.id);

  useEffect(() => {
    autoGrowTextarea(composerRef.current, MEMO_COMPOSER_MAX_HEIGHT);
  }, [draft]);

  useEffect(() => {
    autoGrowTextarea(editRef.current, 220);
  }, [editBody, editingMemoId]);

  const openMemo = (item: WidgetPreviewItem) => {
    setSelectedMemoId(item.id);
    setEditingMemoId(null);
  };

  const closeMemo = () => {
    if (savingEdit) return;
    setSelectedMemoId(null);
    setEditingMemoId(null);
    setEditBody("");
  };

  const startEditMemo = (item: WidgetPreviewItem) => {
    setSelectedMemoId(item.id);
    setEditingMemoId(item.id);
    setEditBody(memoItemBody(item));
  };

  const cancelEditMemo = () => {
    setEditingMemoId(null);
    setEditBody("");
  };

  const saveEditMemo = async () => {
    if (!editingMemo || !onEditMemo || savingEdit) return;

    const body = editBody.trim();
    const currentBody = memoItemBody(editingMemo);
    if (!body || body === currentBody) {
      cancelEditMemo();
      return;
    }

    setSavingEdit(true);
    try {
      await onEditMemo(editingMemo, body);
      setEditingMemoId(null);
      setSelectedMemoId(null);
      setEditBody("");
    } finally {
      setSavingEdit(false);
    }
  };

  // 단독 "메모 남기기" 버튼 대신 하단 인라인 컴포저(자동 확장 + 저장)로 바로 남긴다.
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
        <div className={[styles.rowList, styles.memoPaperList].join(" ")}>
          {bubble.rows.map((item) => {
            const body = memoItemBody(item);
            return (
              <div className={[styles.memoRow, styles.memoRowStack].join(" ")} key={item.id}>
                <button
                  aria-label={t("widget.memo.expandMemo")}
                  className={[styles.memoBodyButton, styles.memoBodyClamp].join(" ")}
                  onClick={() => openMemo(item)}
                  type="button"
                >
                  {body}
                </button>
                <span className={styles.memoMetaRow}>
                  <span className={styles.memoTime}>{item.status}</span>
                  <span className={styles.memoActions}>
                    <button aria-label={t("widget.memo.edit")} disabled={!onEditMemo} onClick={() => startEditMemo(item)} type="button">
                      <Pencil size={12} strokeWidth={2.1} />
                    </button>
                    <button aria-label={t("widget.memo.delete")} disabled={!onDeleteMemo} onClick={() => void onDeleteMemo?.(item)} type="button">
                      <Trash2 size={12} strokeWidth={2.1} />
                    </button>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <BubbleEmptyState bubble={bubble} />
      )}
      {selectedMemo ? (
        <div aria-label={t("widget.memo.expandMemo")} aria-modal="true" className={styles.memoDetailLayer} role="dialog">
          <article className={styles.memoDetailPaper}>
            <span aria-hidden="true" className={styles.memoDetailTape} />
            <div className={styles.memoDetailTop}>
              <span className={styles.memoTime}>{selectedMemo.status}</span>
              <span className={styles.memoActions}>
                {isEditingSelected ? (
                  <>
                    <button aria-label={t("common.cancel" as MessageKey)} disabled={savingEdit} onClick={cancelEditMemo} type="button">
                      <X size={12} strokeWidth={2.1} />
                    </button>
                    <button aria-label={t("widget.memo.save")} disabled={savingEdit || !editBody.trim()} onClick={() => void saveEditMemo()} type="button">
                      <CheckCircle2 size={12} strokeWidth={2.1} />
                    </button>
                  </>
                ) : (
                  <>
                    <button aria-label={t("widget.memo.edit")} disabled={!onEditMemo} onClick={() => startEditMemo(selectedMemo)} type="button">
                      <Pencil size={12} strokeWidth={2.1} />
                    </button>
                    <button aria-label={t("common.close" as MessageKey)} onClick={closeMemo} type="button">
                      <X size={12} strokeWidth={2.1} />
                    </button>
                  </>
                )}
              </span>
            </div>
            {isEditingSelected ? (
              <textarea
                aria-label={t("widget.memo.edit")}
                className={styles.memoEditField}
                disabled={savingEdit}
                onChange={(event) => setEditBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void saveEditMemo();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEditMemo();
                  }
                }}
                ref={editRef}
                value={editBody}
              />
            ) : (
              <div className={styles.memoDetailBody}>{selectedBody}</div>
            )}
          </article>
        </div>
      ) : null}
      <form
        className={[styles.input, styles.memoComposer].join(" ")}
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraftMemo();
        }}
      >
        <StickyNote size={14} strokeWidth={2} />
        <textarea
          aria-label={t(bubble.actionLabel as MessageKey)}
          className={styles.memoComposerField}
          disabled={submitting}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter는 줄바꿈, Cmd/Ctrl+Enter는 저장(아래 힌트와 동일 계약).
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void saveDraftMemo();
            }
          }}
          placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : t(bubble.actionLabel as MessageKey)}
          ref={composerRef}
          rows={1}
          value={draft}
        />
        <button className={styles.composerSave} disabled={submitting || !draft.trim()} type="submit">
          {t("widget.memo.save")}
        </button>
      </form>
      <span className={styles.composerHint}>{t("widget.memo.composerHint")}</span>
    </div>
  );
}

// ---------- 일정: 실제 캘린더(목록/주간/월간/WBS) ----------
// 위젯이 오래 "다음 일정 + 평평한 목록 + 아무 동작 없는 세그먼트"였다.
// 이제 startsAt/endsAt를 받아 실제 달력(월 그리드/주 아젠다/WBS 타임라인)과
// 목록을 실제로 전환한다. 좁은 위젯 폭(≈430px)에 맞춰 컴팩트하게 그린다.

type ScheduleView = "list" | "week" | "month" | "wbs";

// 세그먼트 순서 = 좌→우 탭.
const SCHEDULE_VIEW_ORDER: ScheduleView[] = ["list", "week", "month", "wbs"];

// datetime-local 입력값("YYYY-MM-DDTHH:mm", 로컬시간)으로 변환한다.
function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 기본 일정 시작 = 지금에서 다음 30분 단위로 올림(제목만 입력하고 바로 추가할 때의 기본값).
function defaultScheduleStartLocal(): string {
  const next = new Date();
  next.setMinutes(next.getMinutes() < 30 ? 30 : 60, 0, 0);
  return toDatetimeLocalValue(next);
}

type ScheduleEvent = {
  allDay: boolean;
  end: Date;
  item: WidgetPreviewItem;
  start: Date;
};

const SCHEDULE_DAY_MS = 24 * 60 * 60 * 1000;

function schedStartOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function schedAddDays(date: Date, amount: number): Date {
  const copy = schedStartOfDay(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function schedSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function schedStartOfWeek(date: Date): Date {
  const copy = schedStartOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay()); // 일요일 시작
  return copy;
}

function schedStartOfMonth(date: Date): Date {
  const copy = schedStartOfDay(date);
  copy.setDate(1);
  return copy;
}

function schedDayIndex(base: Date, target: Date): number {
  return Math.round((schedStartOfDay(target).getTime() - schedStartOfDay(base).getTime()) / SCHEDULE_DAY_MS);
}

// 이벤트(멀티데이 포함)가 특정 날짜(하루)에 걸치는지.
function schedEventCoversDay(event: ScheduleEvent, day: Date): boolean {
  const dayStart = schedStartOfDay(day).getTime();
  const dayEnd = dayStart + SCHEDULE_DAY_MS;
  return event.start.getTime() < dayEnd && event.end.getTime() >= dayStart;
}

function schedToEvent(item: WidgetPreviewItem): ScheduleEvent | null {
  if (!item.startsAt) return null;
  const start = new Date(item.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  let end = item.endsAt ? new Date(item.endsAt) : new Date(start);
  if (Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) end = new Date(start);
  return { allDay: Boolean(item.allDay), end, item, start };
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
  const { locale, t } = useI18n();
  const localeTag = String(locale);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 일정 추가 시작 시각(날짜+시간). 투두처럼 제목만 받던 걸 바꿔, 언제인지 직접 고르게 한다.
  const [draftAt, setDraftAt] = useState<string>(() => defaultScheduleStartLocal());
  // 좁은 위젯에서는 목록(제목·시간이 다 보임)이 기본이어야 일정이 바로 보인다. 월/주/WBS는 탭으로 전환.
  // (월간 기본은 오늘 일정이 없으면 빈 달력처럼 보여 "일정이 안 뜬다"는 인상을 줬다.)
  const [view, setView] = useState<ScheduleView>("list");
  const today = useMemo(() => schedStartOfDay(new Date()), []);
  const [anchor, setAnchor] = useState<Date>(() => schedStartOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => schedStartOfDay(new Date()));

  const events = useMemo(() => {
    return bubble.rows
      .map(schedToEvent)
      .filter((event): event is ScheduleEvent => event !== null)
      .sort((left, right) => left.start.getTime() - right.start.getTime());
  }, [bubble.rows]);

  const saveDraftSchedule = async () => {
    const title = draft.trim();
    if (!title || !onCreateSchedule || submitting) return;

    // datetime-local(로컬시간) → ISO. 값이 비었거나 잘못됐으면 기본 시작으로 폴백한다.
    const chosen = draftAt ? new Date(draftAt) : null;
    const startsAt = chosen && !Number.isNaN(chosen.getTime()) ? chosen.toISOString() : null;

    setSubmitting(true);
    try {
      await onCreateSchedule(bubble, title, startsAt);
      setDraft("");
      setDraftAt(defaultScheduleStartLocal());
    } finally {
      setSubmitting(false);
    }
  };

  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewItem) => {
    if (!item.handoffUrl || !onOpenHandoff) return;

    event.preventDefault();
    void onOpenHandoff(item);
  };

  const stepPeriod = (direction: 1 | -1) => {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return schedStartOfDay(next);
    });
  };

  const jumpToToday = () => {
    const now = schedStartOfDay(new Date());
    setAnchor(now);
    setSelectedDay(now);
  };

  // 한 줄 아젠다 행(제목 + 시간칩 + 액션) — 목록/주간/월간 아젠다가 공유한다.
  const renderEventRow = (item: WidgetPreviewItem) => (
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
  );

  const periodLabel = useMemo(() => {
    if (view === "month") {
      return new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }).format(anchor);
    }
    if (view === "week" || view === "wbs") {
      const weekStart = schedStartOfWeek(anchor);
      const weekEnd = schedAddDays(weekStart, 6);
      const startFmt = new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(weekStart);
      const endFmt = new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(weekEnd);
      return `${startFmt} – ${endFmt}`;
    }
    return t("widget.data.schedule.label");
  }, [anchor, localeTag, t, view]);

  const weekdayLabels = useMemo(() => {
    const base = schedStartOfWeek(today);
    const formatter = new Intl.DateTimeFormat(localeTag, { weekday: "narrow" });
    return Array.from({ length: 7 }, (_, index) => formatter.format(schedAddDays(base, index)));
  }, [localeTag, today]);

  const renderNav = () => (
    <div className={styles.schedNav}>
      <button aria-label={t("widget.schedule.prevPeriod")} className={styles.schedNavBtn} onClick={() => stepPeriod(-1)} type="button">
        <ChevronLeft size={15} strokeWidth={2.2} />
      </button>
      <strong className={styles.schedPeriod}>{periodLabel}</strong>
      <button aria-label={t("widget.schedule.nextPeriod")} className={styles.schedNavBtn} onClick={() => stepPeriod(1)} type="button">
        <ChevronRight size={15} strokeWidth={2.2} />
      </button>
      <button className={styles.schedToday} onClick={jumpToToday} type="button">
        {t("widget.schedule.today")}
      </button>
    </div>
  );

  const renderMonth = () => {
    const monthStart = schedStartOfMonth(anchor);
    const gridStart = schedStartOfWeek(monthStart);
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((monthStart.getDay() + daysInMonth) / 7);
    const cells = Array.from({ length: weeks * 7 }, (_, index) => schedAddDays(gridStart, index));
    const selectedEvents = events.filter((event) => schedEventCoversDay(event, selectedDay));
    const selectedLabel = new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", weekday: "long" }).format(selectedDay);

    return (
      <>
        {renderNav()}
        <div aria-hidden="true" className={styles.schedWeekdays}>
          {weekdayLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className={styles.schedGrid} style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}>
          {cells.map((day) => {
            const outside = day.getMonth() !== anchor.getMonth();
            const dayEvents = events.filter((event) => schedEventCoversDay(event, day));
            const className = [
              styles.schedCell,
              outside ? styles.schedCellOutside : "",
              schedSameDay(day, today) ? styles.schedCellToday : "",
              schedSameDay(day, selectedDay) ? styles.schedCellSelected : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button className={className} key={day.toISOString()} onClick={() => setSelectedDay(day)} type="button">
                <span className={styles.schedCellNum}>{day.getDate()}</span>
                {dayEvents.length > 0 ? (
                  <span aria-hidden="true" className={styles.schedDots}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <i className={styles.schedDot} key={event.item.id} />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className={styles.schedAgenda}>
          <span className={styles.schedAgendaHead}>{selectedLabel}</span>
          {selectedEvents.length > 0 ? (
            <div className={styles.rowList}>{selectedEvents.map((event) => renderEventRow(event.item))}</div>
          ) : (
            <p className={styles.schedEmpty}>{t("widget.schedule.emptyDay")}</p>
          )}
        </div>
      </>
    );
  };

  const renderWeek = () => {
    const weekStart = schedStartOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, index) => schedAddDays(weekStart, index));
    return (
      <>
        {renderNav()}
        <div className={styles.schedAgenda}>
          {days.map((day) => {
            const dayEvents = events.filter((event) => schedEventCoversDay(event, day));
            const dayLabel = new Intl.DateTimeFormat(localeTag, { day: "numeric", weekday: "short" }).format(day);
            const headClassName = [styles.schedDayHead, schedSameDay(day, today) ? styles.schedDayHeadToday : ""].filter(Boolean).join(" ");
            return (
              <div className={styles.schedDayGroup} key={day.toISOString()}>
                <span className={headClassName}>{dayLabel}</span>
                {dayEvents.length > 0 ? (
                  <div className={styles.rowList}>{dayEvents.map((event) => renderEventRow(event.item))}</div>
                ) : (
                  <p className={styles.schedEmpty}>{t("widget.schedule.emptyDay")}</p>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWbs = () => {
    const weekStart = schedStartOfWeek(anchor);
    const weekEnd = schedAddDays(weekStart, 7);
    const days = Array.from({ length: 7 }, (_, index) => schedAddDays(weekStart, index));
    const barEvents = events.filter((event) => event.start.getTime() < weekEnd.getTime() && event.end.getTime() >= weekStart.getTime());
    return (
      <>
        {renderNav()}
        <div className={styles.schedWbsAxis}>
          {days.map((day) => (
            <span className={schedSameDay(day, today) ? `${styles.schedWbsAxisCell} ${styles.schedWbsAxisToday}` : styles.schedWbsAxisCell} key={day.toISOString()}>
              {day.getDate()}
            </span>
          ))}
        </div>
        {barEvents.length > 0 ? (
          <div className={styles.schedWbsRows}>
            {barEvents.map((event) => {
              const startOffset = Math.max(0, Math.min(6, schedDayIndex(weekStart, event.start)));
              const endOffset = Math.max(0, Math.min(6, schedDayIndex(weekStart, event.end)));
              const span = Math.max(1, endOffset - startOffset + 1);
              return (
                <div className={styles.schedWbsTrack} key={event.item.id}>
                  <span className={styles.schedWbsBar} style={{ gridColumn: `${startOffset + 1} / span ${span}` }} title={event.item.label}>
                    {event.item.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.schedEmpty}>{t("widget.schedule.emptyUpcoming")}</p>
        )}
      </>
    );
  };

  const renderList = () => {
    const nextItem = bubble.rows[0];
    const restItems = bubble.rows.slice(1);
    if (!nextItem) {
      return <BubbleEmptyState bubble={bubble} />;
    }
    return (
      <>
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
        {restItems.length > 0 ? <div className={styles.rowList}>{restItems.map((item) => renderEventRow(item))}</div> : null}
      </>
    );
  };

  return (
    <div className={styles.body}>
      <SegmentedControl
        ariaLabel={t("widget.schedule.viewAria")}
        labels={[t("widget.schedule.tabList"), t("widget.schedule.tabWeek"), t("widget.schedule.tabMonth"), t("widget.schedule.tabWbs")]}
        onChange={(index) => setView(SCHEDULE_VIEW_ORDER[index] ?? "month")}
        value={SCHEDULE_VIEW_ORDER.indexOf(view)}
      />
      <div className={styles.schedCal}>
        {view === "month" ? renderMonth() : null}
        {view === "week" ? renderWeek() : null}
        {view === "wbs" ? renderWbs() : null}
        {view === "list" ? renderList() : null}
      </div>
      <form
        className={styles.input}
        style={{ flexWrap: "wrap" }}
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraftSchedule();
        }}
      >
        <Plus size={14} strokeWidth={2} />
        <input
          aria-label={t("widget.schedule.quickAdd")}
          disabled={submitting}
          maxLength={200}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={bubble.inputPlaceholder ? t(bubble.inputPlaceholder as MessageKey) : t("widget.schedule.prompt")}
          style={{ flex: "1 1 110px", minWidth: 0 }}
          value={draft}
        />
        {/* 일정은 "언제"가 핵심 — 투두식 제목만 받지 않고 시작 날짜·시간을 직접 고른다. */}
        <input
          aria-label={t("widget.schedule.quickAdd")}
          disabled={submitting}
          onChange={(event) => setDraftAt(event.target.value)}
          style={{ flex: "1 1 150px", minWidth: 0 }}
          type="datetime-local"
          value={draftAt}
        />
        <button aria-label={t("widget.schedule.quickAdd")} disabled={submitting || !draft.trim()} type="submit">
          <Plus size={13} strokeWidth={2.1} />
        </button>
      </form>
    </div>
  );
}

function ResourceRows({
  emptyBubble,
  items,
  onDownloadResource,
  onItemStateChange,
  onOpenHandoff,
}: {
  emptyBubble: WidgetPreviewBubble;
  items: WidgetPreviewItem[];
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

  if (items.length === 0) {
    return <BubbleEmptyState bubble={emptyBubble} />;
  }

  return (
    <div className={styles.rowList}>
      {items.map((item) => (
        <div className={styles.fileRow} key={item.id}>
          <i className={styles.rowTile} aria-hidden="true">
            <FileText size={14} strokeWidth={2} />
          </i>
          {item.handoffUrl ? (
            <a className={styles.resourceTitle} href={item.handoffUrl} onClick={(event) => openHandoff(event, item)} rel="noreferrer" target="_blank">
              {item.label}
            </a>
          ) : (
            <span className={styles.resourceTitle}>{item.label}</span>
          )}
          <b className={styles.resourceMeta}>{item.status}</b>
          <span className={styles.resourceControlGroup}>
            <span className={styles.resourceActions}>
              <button aria-label={t("resources.common.download")} onClick={() => void onDownloadResource?.(item)} type="button">
                <Download size={13} strokeWidth={2.1} />
              </button>
            </span>
            <ItemActions item={item} onItemStateChange={onItemStateChange} />
          </span>
        </div>
      ))}
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
      <ResourceRows
        emptyBubble={bubble}
        items={bubble.rows}
        onDownloadResource={onDownloadResource}
        onItemStateChange={onItemStateChange}
        onOpenHandoff={onOpenHandoff}
      />
      <button className={styles.wideAction} onClick={openAll} type="button">
        <FileText size={14} strokeWidth={2} />
        {t(bubble.actionLabel as MessageKey)}
      </button>
    </div>
  );
}

function BubbleBody({
  bubble,
  timerMode,
  timerActionNotice,
  chatScope,
  onChatScopeChange,
  selectedPeerChatRoomId,
  onSelectPeerChatRoom,
  onCreateDirectRoom,
  onCreateGroupRoom,
  onSearchFriend,
  onSendFriendRequest,
  onRespondFriendRequest,
  onItemStateChange,
  onCreateMemo,
  onCreateSchedule,
  onCreateTodo,
  onEditTodo,
  onDeleteTodo,
  onAnalyzeResource,
  onDeleteMemo,
  onDownloadResource,
  onEditMemo,
  onLeaveVoice,
  onMarkChatRead,
  onOpenHandoff,
  onPauseTimer,
  onPrimaryTimerAction,
  onReviewAgentSuggestion,
  onSendAgentCommand,
  onSendChatMessage,
  onStartVoice,
  onToggleVoiceMic,
  onTimerModeChange,
}: {
  bubble: WidgetPreviewBubble;
  timerMode?: WidgetTimerMode | null;
  timerActionNotice?: DesktopWidgetBubbleProps["timerActionNotice"];
  chatScope?: DesktopWidgetBubbleProps["chatScope"];
  onChatScopeChange?: DesktopWidgetBubbleProps["onChatScopeChange"];
  selectedPeerChatRoomId?: DesktopWidgetBubbleProps["selectedPeerChatRoomId"];
  onSelectPeerChatRoom?: DesktopWidgetBubbleProps["onSelectPeerChatRoom"];
  onCreateDirectRoom?: DesktopWidgetBubbleProps["onCreateDirectRoom"];
  onCreateGroupRoom?: DesktopWidgetBubbleProps["onCreateGroupRoom"];
  onSearchFriend?: DesktopWidgetBubbleProps["onSearchFriend"];
  onSendFriendRequest?: DesktopWidgetBubbleProps["onSendFriendRequest"];
  onRespondFriendRequest?: DesktopWidgetBubbleProps["onRespondFriendRequest"];
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onCreateMemo?: DesktopWidgetBubbleProps["onCreateMemo"];
  onCreateSchedule?: DesktopWidgetBubbleProps["onCreateSchedule"];
  onCreateTodo?: DesktopWidgetBubbleProps["onCreateTodo"];
  onEditTodo?: DesktopWidgetBubbleProps["onEditTodo"];
  onDeleteTodo?: DesktopWidgetBubbleProps["onDeleteTodo"];
  onAnalyzeResource?: DesktopWidgetBubbleProps["onAnalyzeResource"];
  onDeleteMemo?: DesktopWidgetBubbleProps["onDeleteMemo"];
  onDownloadResource?: DesktopWidgetBubbleProps["onDownloadResource"];
  onEditMemo?: DesktopWidgetBubbleProps["onEditMemo"];
  onLeaveVoice?: DesktopWidgetBubbleProps["onLeaveVoice"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onOpenHandoff?: DesktopWidgetBubbleProps["onOpenHandoff"];
  onPauseTimer?: DesktopWidgetBubbleProps["onPauseTimer"];
  onPrimaryTimerAction?: DesktopWidgetBubbleProps["onPrimaryTimerAction"];
  onReviewAgentSuggestion?: DesktopWidgetBubbleProps["onReviewAgentSuggestion"];
  onSendAgentCommand?: DesktopWidgetBubbleProps["onSendAgentCommand"];
  onSendChatMessage?: DesktopWidgetBubbleProps["onSendChatMessage"];
  onStartVoice?: DesktopWidgetBubbleProps["onStartVoice"];
  onToggleVoiceMic?: DesktopWidgetBubbleProps["onToggleVoiceMic"];
  onTimerModeChange?: (mode: WidgetTimerMode) => void;
}) {
  if (bubble.id === "agent") {
    return (
      <AgentBody
        bubble={bubble}
        onDownloadResource={onDownloadResource}
        onItemStateChange={onItemStateChange}
        onOpenHandoff={onOpenHandoff}
        onReviewAgentSuggestion={onReviewAgentSuggestion}
        onSendAgentCommand={onSendAgentCommand}
      />
    );
  }
  if (bubble.id === "chat") {
    return (
      <ChatBody
        bubble={bubble}
        chatScope={chatScope}
        onChatScopeChange={onChatScopeChange}
        selectedPeerChatRoomId={selectedPeerChatRoomId}
        onSelectPeerChatRoom={onSelectPeerChatRoom}
        onCreateDirectRoom={onCreateDirectRoom}
        onCreateGroupRoom={onCreateGroupRoom}
        onSearchFriend={onSearchFriend}
        onSendFriendRequest={onSendFriendRequest}
        onRespondFriendRequest={onRespondFriendRequest}
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
    return <TimerBody bubble={bubble} initialMode={timerMode} actionNotice={timerActionNotice} onTimerModeChange={onTimerModeChange} onPauseTimer={onPauseTimer} onPrimaryTimerAction={onPrimaryTimerAction} />;
  }
  if (bubble.id === "memo") {
    return <MemoBody bubble={bubble} onCreateMemo={onCreateMemo} onDeleteMemo={onDeleteMemo} onEditMemo={onEditMemo} />;
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
  return <TodoBody bubble={bubble} onCreateTodo={onCreateTodo} onEditTodo={onEditTodo} onDeleteTodo={onDeleteTodo} onItemStateChange={onItemStateChange} onOpenHandoff={onOpenHandoff} />;
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

// 고스트 시계 — 타이머 버블을 시계 모드로 쓰던 사용자는 고스트에서도 시계를 본다.
// 고스트 작업/개인 타이머 — 평소 뷰와 동일하게 실행 중이면 초 단위로 갱신되는 카운트업.
function GhostWorkTimer({ bubble }: { bubble: WidgetPreviewBubble }) {
  const { t } = useI18n();
  const timerItem = bubble.rows[0];
  const running = timerItem?.status === "RUNNING";
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const intervalId = window.setInterval(() => setTick((current) => current + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [running]);

  const live = elapsedWidgetTimerLabel(timerItem, bubble.metric);
  const label = !timerItem
    ? t("widget.timer.waiting")
    : bubble.roomId
      ? t("widget.timer.workTimer")
      : t("widget.timer.generalTimer");
  return (
    <div className={styles.ghostSignal} role="timer" aria-live="off">
      <strong className={styles.ghostClock}>{live}</strong>
      <small className={styles.ghostSub}>{label}</small>
    </div>
  );
}

function GhostClock() {
  const { locale } = useI18n();
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);
  const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", weekday: "short" }).format(now);
  return (
    <div className={styles.ghostSignal} role="timer" aria-live="off">
      <strong className={styles.ghostClock}>{formatClock(now)}</strong>
      <small>{dateLabel}</small>
    </div>
  );
}

// 고스트 뽀모도로 — 뽀모도로 탭을 쓰던 사용자는 고스트에서도 뽀모도로 남은 시간/페이즈를 본다.
function GhostPomodoro({ roomId }: { roomId: string | null }) {
  const { t } = useI18n();
  const [state, setState] = useState<PomodoroState | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  // 최신 state를 ref로 들고 있어 tick 클로저가 낡은 값을 읽지 않게 한다(고스트 정지 버그 방지).
  const stateRef = useRef<PomodoroState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persist = useCallback(
    (next: PomodoroState) => {
      setState(next);
      void writePomodoroState(next, roomId);
    },
    [roomId],
  );

  // 최초 + 창 포커스/가시성 복귀 시 저장된 뽀모도로 상태를 다시 읽어 고스트가 최신을 반영하게 한다
  // (초기 읽기 레이스나 다른 표면에서의 변경으로 고스트가 멈춰 보이는 문제 방지).
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void readPomodoroState(roomId).then((stored) => {
        if (!cancelled) setState(stored);
      });
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [roomId]);

  // 고스트에서도 뽀모도로가 계속 진행/자동전환되도록 PomodoroView와 동일한 벽시계 기반 틱을 돌린다.
  // phaseEndsAt(타임스탬프) 기준이라 탭 전환·백그라운드 스로틀에도 복귀 시 정확히 복구된다.
  useEffect(() => {
    const compute = () => {
      const current = stateRef.current;
      if (!current) return;
      if (!current.running || !current.phaseEndsAt) {
        setRemaining(current.remainingSeconds ?? phaseDurationSeconds(current.phase, current.focusMinutes, current.breakMinutes));
        return;
      }
      const left = Math.round((current.phaseEndsAt - Date.now()) / 1000);
      if (left > 0) {
        setRemaining(left);
        return;
      }
      const nextPhase: PomodoroPhase = current.phase === "focus" ? "break" : "focus";
      const nextCycles = current.phase === "focus" ? current.cyclesCompleted + 1 : current.cyclesCompleted;
      const nextDuration = phaseDurationSeconds(nextPhase, current.focusMinutes, current.breakMinutes);
      setRemaining(nextDuration);
      persist({
        ...current,
        cyclesCompleted: nextCycles,
        phase: nextPhase,
        phaseEndsAt: Date.now() + nextDuration * 1000,
        remainingSeconds: null,
        running: true,
      });
    };

    compute();
    const intervalId = window.setInterval(compute, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") compute();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [persist]);

  const label = (state?.phase ?? "focus") === "focus" ? t("widget.timer.pomodoroFocus") : t("widget.timer.pomodoroBreak");
  return (
    <div className={styles.ghostSignal} role="timer" aria-live="off">
      <span className={styles.ghostMetric}>{formatMinutesSeconds(remaining)}</span>
      <small className={styles.ghostSub}>{label}</small>
    </div>
  );
}

function GhostSignal({
  bubble,
  bubbleType,
  timerModeOverride,
}: {
  bubble: WidgetPreviewBubble;
  bubbleType: WidgetBubbleType;
  timerModeOverride?: WidgetTimerMode | null;
}) {
  const { t } = useI18n();
  const isTimer = bubbleType === "timer";
  const [timerMode, setTimerMode] = useState<WidgetTimerMode | null>(null);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const roomId = bubble.roomId?.trim() || null;
  const resolvedTimerMode = timerModeOverride ?? timerMode;

  // 타이머 버블이면 마지막으로 고른 탭(시계/타이머/뽀모도로)을 읽어 고스트에 반영한다.
  useEffect(() => {
    if (!isTimer || timerModeOverride) return;
    let cancelled = false;
    void readWidgetTimerMode(roomId).then((stored) => {
      if (!cancelled) setTimerMode(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [isTimer, roomId, timerModeOverride]);

  // 뽀모도로가 실제로 돌고 있는지 저장 상태에서 확인한다. 돌고 있으면 탭 상태와 무관하게
  // 고스트에서도 그 카운트다운 숫자를 보여준다("고스트에서 뽀모도로 숫자가 안 보인다" 방지).
  useEffect(() => {
    if (!isTimer) return;
    let cancelled = false;
    const check = () => {
      void readPomodoroState(roomId).then((stored) => {
        if (!cancelled) setPomodoroRunning(Boolean(stored?.running));
      });
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isTimer, roomId]);

  // 선택한 탭을 그대로 반영하되, 뽀모도로가 돌고 있으면 우선 뽀모도로 카운트다운을 보여준다.
  if (isTimer && (resolvedTimerMode === "pomodoro" || pomodoroRunning)) {
    return <GhostPomodoro roomId={roomId} />;
  }
  if (isTimer && resolvedTimerMode === "clock") {
    return <GhostClock />;
  }
  // 작업/개인 카운트업 타이머: 고스트에서도 평소처럼 초 단위로 살아 움직여야 한다(정적 숫자 금지).
  if (isTimer) {
    return <GhostWorkTimer bubble={bubble} />;
  }

  // TODO 고스트: 완료/남음 요약 + 상위 항목을 완료 체크 상태(✓/○)와 함께 보여준다.
  if (bubbleType === "todo") {
    const rows = bubble.rows;
    const total = rows.length;
    const remaining = rows.filter((row) => !row.checked);
    const done = rows.filter((row) => row.checked);
    const doneCount = done.length;
    const remainingCount = remaining.length;
    // 남은 항목 위주로 보여주되, 완료 항목도 최소 몇 개는 체크와 함께 항상 보이도록 슬롯을 확보한다.
    // (완료가 4개 이상이어도 체크가 화면에서 사라지지 않게 — "고스트에서 체크표시가 빠진다" 문제 방지.)
    const GHOST_TODO_MAX = 5;
    const doneShown = done.slice(0, Math.min(doneCount, 2));
    const preview = [...remaining.slice(0, GHOST_TODO_MAX - doneShown.length), ...doneShown];
    return (
      <div className={styles.ghostSignal} aria-label={t("widget.ghostAria", { label: t(bubble.label as MessageKey) })}>
        {total === 0 ? (
          <span className={styles.ghostSub}>{t("widget.todo.none")}</span>
        ) : (
          <>
            <span className={styles.ghostSub}>{t("widget.todo.ghostSummary", { done: doneCount, remaining: remainingCount })}</span>
            <ul className={styles.ghostList}>
              {preview.map((row) => (
                <li
                  className={[styles.ghostListItem, styles.ghostTodoItem, row.checked ? styles.ghostTodoDone : ""].filter(Boolean).join(" ")}
                  key={row.id}
                >
                  {row.checked ? (
                    <span aria-hidden="true" className={[styles.ghostTodoBox, styles.ghostTodoBoxDone].join(" ")}>
                      <Check size={12} strokeWidth={3.4} />
                    </span>
                  ) : (
                    <span aria-hidden="true" className={styles.ghostTodoBox} />
                  )}
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={styles.ghostSignal}
      aria-label={t("widget.ghostAria", { label: t(bubble.label as MessageKey) })}
    >
      <span className={styles.ghostMetric}>{bubble.metric}</span>
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
  chatScope,
  onChatScopeChange,
  selectedPeerChatRoomId,
  onSelectPeerChatRoom,
  onCreateDirectRoom,
  onCreateGroupRoom,
  onSearchFriend,
  onSendFriendRequest,
  onRespondFriendRequest,
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
  onEditTodo,
  onDeleteTodo,
  onOpenHandoff,
  onPauseTimer,
  onPrimaryTimerAction,
  onRestore,
  onReviewAgentSuggestion,
  onSendAgentCommand,
  onSendChatMessage,
  onStartVoice,
  onToggleAlwaysOnTop,
  onToggleVoiceMic,
  timerActionNotice,
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
  const activeRoomLabel = t(activeData.roomLabel as MessageKey);
  const showHeaderContextLabel = activeBubble !== "alert";
  const shellRef = useRef<HTMLElement | null>(null);
  // 고스트 콘텐츠를 감싸 실제 렌더 크기를 재고, 그 크기에 맞춰 창을 조절한다(줄바꿈 없이 다 보이게).
  const ghostContentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isPreview || mode !== "GHOST") return;
    const el = ghostContentRef.current;
    if (!el) return;
    const measure = () => {
      // nowrap 콘텐츠의 자연 크기(scrollWidth/Height). 숫자 외곽선·그림자 여백을 조금 더한다.
      void autoSizeGhostWidgetWindow(el.scrollWidth + 44, el.scrollHeight + 36);
    };
    const raf = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [isPreview, mode, activeBubble]);
  const [timerModeForGhost, setTimerModeForGhost] = useState<WidgetTimerMode | null>(null);
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
        data-bubli-interactive={mode === "GHOST" ? undefined : "true"}
        onPointerLeave={tiltEnabled ? clearShellTilt : undefined}
        onPointerMove={tiltEnabled ? handleShellTiltMove : undefined}
        ref={shellRef}
      >
        {!windowVisible ? (
          <button className={styles.hiddenCard} onClick={onRestore ?? (() => onModeChange("DEFAULT"))} type="button">
            <span>{t("widget.hidden")}</span>
            <b>{t("widget.restoreBubble", { label: t(activeData.label as MessageKey) })}</b>
            <small>{t(activeData.notificationLabel as MessageKey)}</small>
          </button>
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
            <header
              className={styles.head}
              data-bubli-interactive={mode === "GHOST" ? "true" : undefined}
              onMouseDown={handleHeaderMouseDown}
            >
              {/* 핀 고정(위치 잠금) 시 OS 드래그 영역을 없애 헤더를 눌러도 창이 움직이지 않게 한다. */}
              <div className={styles.title} data-tauri-drag-region={alwaysOnTop ? undefined : true}>
                {/* 28px accent 아이콘 타일이 버블 아이덴티티의 앵커다. */}
                <span className={styles.iconTile} aria-hidden="true">
                  <Icon size={15} strokeWidth={2.1} />
                </span>
                <div className={styles.titleCopy}>
                  {/* 헤더 타이틀은 "버블" 접미사 없이 종류명만 쓴다. */}
                  <strong>{t(activeData.label as MessageKey)}</strong>
                  {isPreview ? (
                    <small>{`${t(modeLabels[mode])} · ${t(activeData.notificationLabel as MessageKey)}`}</small>
                  ) : showHeaderContextLabel ? (
                    <small>{activeRoomLabel}</small>
                  ) : null}
                </div>
              </div>
              <WidgetControls alwaysOnTop={alwaysOnTop} mode={mode} onClose={onClose} onMode={onModeChange} onPin={onToggleAlwaysOnTop} presentation={presentation} />
            </header>

            {/* 부분 동기화 실패는 회색 웰 대신 얇은 상태 한 줄로만.
                타이머 버블은 시계·뽀모도로가 서버와 무관하므로 셸에서는 표시하지 않고
                작업(WORK) 모드일 때만 TimerBody 내부에서 직접 표시한다. */}
            {mode !== "GHOST" && activeBubble !== "timer" && isBubbleSyncPending(activeData) ? (
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
              <div className={styles.ghostContent} ref={ghostContentRef}>
                <GhostSignal bubble={activeData} bubbleType={activeBubble} timerModeOverride={timerModeForGhost} />
              </div>
            ) : (
              <BubbleBody
                bubble={activeData}
                timerMode={timerModeForGhost}
                timerActionNotice={timerActionNotice}
                chatScope={chatScope}
                onChatScopeChange={onChatScopeChange}
                selectedPeerChatRoomId={selectedPeerChatRoomId}
                onSelectPeerChatRoom={onSelectPeerChatRoom}
                onCreateDirectRoom={onCreateDirectRoom}
                onCreateGroupRoom={onCreateGroupRoom}
                onSearchFriend={onSearchFriend}
                onSendFriendRequest={onSendFriendRequest}
                onRespondFriendRequest={onRespondFriendRequest}
                onAnalyzeResource={onAnalyzeResource}
                onDeleteMemo={onDeleteMemo}
                onDownloadResource={onDownloadResource}
                onItemStateChange={onItemStateChange}
                onEditMemo={onEditMemo}
                onLeaveVoice={onLeaveVoice}
                onMarkChatRead={onMarkChatRead}
                onCreateMemo={onCreateMemo}
                onCreateSchedule={onCreateSchedule}
                onCreateTodo={onCreateTodo}
                onEditTodo={onEditTodo}
                onDeleteTodo={onDeleteTodo}
                onOpenHandoff={onOpenHandoff}
                onPauseTimer={onPauseTimer}
                onPrimaryTimerAction={onPrimaryTimerAction}
                onReviewAgentSuggestion={onReviewAgentSuggestion}
                onSendAgentCommand={onSendAgentCommand}
                onSendChatMessage={onSendChatMessage}
                onStartVoice={onStartVoice}
                onTimerModeChange={setTimerModeForGhost}
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

// Bubli 메뉴 패널 본문: 바와 메뉴 오브가 공유하는 동일한 바로가기 레이아웃.
// 버블 바로가기 그리드 + 자동 정렬/룸 전환/메인 앱/설정/종료 + 오늘 사용 요약 한 줄.
export type WidgetMenuContentProps = {
  hasRoomContext?: boolean;
  onArrangeBubbles?: (layout?: WidgetArrangeLayout) => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onOpenMainApp?: () => void;
  onOpenSettings?: () => void;
  onQuit?: () => void;
  onToggleRoomContext?: () => void;
  usageSummary?: string | null;
};

// 자동 정렬 프리셋: 격자(기본)/세로 한 열/가로 한 줄/계단식.
const arrangePresets: { labelKey: MessageKey; layout: WidgetArrangeLayout }[] = [
  { labelKey: "widget.menu.arrangeGrid", layout: "grid" },
  { labelKey: "widget.menu.arrangeColumn", layout: "column" },
  { labelKey: "widget.menu.arrangeRow", layout: "row" },
  { labelKey: "widget.menu.arrangeCascade", layout: "cascade" },
];

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
  // 룸 전환은 상단 컨텍스트 행으로, 자동정렬은 프리셋 행으로 분리한다.
  const actionItems: Array<{ Icon: typeof Repeat; label: string; onSelect?: () => void }> = [
    { Icon: ExternalLink, label: t("widget.menu.openMainApp"), onSelect: onOpenMainApp },
    { Icon: Settings, label: t("widget.menu.openSettings"), onSelect: onOpenSettings },
    { Icon: Power, label: t("widget.menu.quit"), onSelect: onQuit },
  ];

  return (
    <>
      <div className={styles.menuHead}>
        <strong className={styles.menuWordmark}>Bubli</strong>
        {usageSummary ? <small className={styles.menuUsage}>{usageSummary}</small> : null}
      </div>
      {/* 현재 컨텍스트(개인/프로젝트룸)를 명확히 보여주고 여기서 전환한다 — 룸 선택은 선택사항. */}
      <button
        className={styles.menuContext}
        data-room={hasRoomContext ? "true" : "false"}
        disabled={!onToggleRoomContext}
        onClick={() => onToggleRoomContext?.()}
        type="button"
      >
        <span className={styles.menuContextDot} aria-hidden="true" />
        <span className={styles.menuContextLabel}>
          {t(hasRoomContext ? "widget.menu.contextRoom" : "widget.menu.contextPersonal")}
        </span>
        <span className={styles.menuContextSwitch}>
          <Repeat size={12} strokeWidth={2.2} aria-hidden="true" />
          {t(hasRoomContext ? "widget.menu.switchToPersonal" : "widget.menu.switchToRoom")}
        </span>
      </button>
      <div className={styles.menuGrid} aria-label={t("widget.menu.bubbles")}>
        {visibleBubbleMeta.map(({ Icon, accent, id, label, scope }) => {
          // 룸 귀속(room) 버블은 개인 모드(룸 미선택)에서 비활성 — 룸을 골라야 활성화된다.
          const roomLocked = scope === "room" && !hasRoomContext;
          const scopeLabel =
            scope === "personal"
              ? "widget.menu.scopePersonal"
              : scope === "room"
                ? "widget.menu.scopeRoom"
                : "widget.menu.scopeBoth";
          return (
            <button
              className={[styles.menuShortcut, accentClassNames[accent]].join(" ")}
              data-scope={scope}
              data-locked={roomLocked ? "true" : undefined}
              disabled={roomLocked || !onOpenBubble}
              key={id}
              onClick={() => onOpenBubble?.(id)}
              role="menuitem"
              title={roomLocked ? t("widget.menu.roomNeeded") : undefined}
              type="button"
            >
              <i className={styles.menuTile} aria-hidden="true">
                <Icon size={13} strokeWidth={2.1} />
              </i>
              <span className={styles.menuShortcutLabel}>{t(label)}</span>
              {scope !== "both" || roomLocked ? (
                <span className={styles.menuScope} data-scope={scope}>
                  {t(roomLocked ? "widget.menu.roomNeeded" : (scopeLabel as MessageKey))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {/* 자동 정렬 프리셋 — 격자/세로/가로/계단 중 골라 열린 버블 창을 정돈한다. */}
      <div className={styles.menuArrange} role="group" aria-label={t("widget.menu.arrange")}>
        <span className={styles.menuArrangeLabel}>
          <LayoutGrid size={13} strokeWidth={2.1} aria-hidden="true" />
          {t("widget.menu.arrange")}
        </span>
        <div className={styles.menuArrangeRow}>
          {arrangePresets.map(({ labelKey, layout }) => (
            <button
              className={styles.menuArrangeChip}
              disabled={!onArrangeBubbles}
              key={layout}
              onClick={() => onArrangeBubbles?.(layout)}
              type="button"
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
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
  onArrangeBubbles?: (layout?: WidgetArrangeLayout) => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  // 알림 버블 칩만 제외(고정 알림 칩과 중복)하고 접힌 칩은 전부 노출한다.
  // 4초 폴링이 같은 목록을 유지하면(참조 동일) 필터 결과도 재사용한다.
  const visibleItems = useMemo(() => collectBarFoldedItems(minimizedItems), [minimizedItems]);

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
  const openNoticeBubble = useCallback(() => {
    setMenuOpen(false);
    setGooPop(null);
    onRestoreBubble("alert");
  }, [onRestoreBubble]);
  const openBubbleFromMenu = useCallback(
    (bubbleType: WidgetBubbleType) => {
      setMenuOpen(false);
      onRestoreBubble(bubbleType);
    },
    [onRestoreBubble],
  );

  // idle 페이드: 8초 무상호작용 → pill(nav)만 옅게(0.85), 상호작용 → 즉시 1.0(CSS 200ms).
  // 프리뷰/알림 구이가 떠 있으면 페이드를 완전히 정지한다(즉시 불투명) —
  // goo 팝은 nav 안에 살아서 pill 페이드에 같이 씻겨 나가면 안 되고, 패널 외부 내용도 마찬가지다.
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
  const barNavRef = useRef<HTMLElement | null>(null);
  const suppressNextBarClickRef = useRef(false);
  const [barPreviewPlacement, setBarPreviewPlacement] = useState<BarPreviewPlacement>("above");
  useEffect(() => {
    const rootElement = barRootRef.current;
    if (!rootElement) return;
    const eventNames = ["pointermove", "pointerdown", "focusin", "keydown"] as const;
    for (const name of eventNames) rootElement.addEventListener(name, armIdleTimer);
    return () => {
      for (const name of eventNames) rootElement.removeEventListener(name, armIdleTimer);
    };
  }, [armIdleTimer]);

  const syncBarPreviewPlacement = useCallback(async () => {
    // 위치 기반 above/below 플립은 Windows·macOS 모두에서 동작해야 한다(메뉴가 화면 위로
    // 뜰 때 잘리지 않도록). Rust 커맨드(set_widget_bar_preview_placement)는 크로스플랫폼이다.
    if (!isTauriRuntime()) return;
    const rootElement = barRootRef.current;
    const navElement = barNavRef.current;
    if (!rootElement || !navElement) return;

    try {
      const monitorState = await readCurrentTauriWindowMonitorState();
      if (!monitorState) return;
      const { outerPosition, monitor } = monitorState;
      const scale = monitor?.scaleFactor ?? (window.devicePixelRatio || 1);
      const originY = (monitor?.position.y ?? 0) / scale;
      const windowY = outerPosition.y / scale - originY;
      const workAreaTop = monitor ? monitor.workArea.position.y / scale - originY : 0;
      const rootRect = rootElement.getBoundingClientRect();
      const navRect = navElement.getBoundingClientRect();
      const currentOffsetTop = navRect.top - rootRect.top;
      const visibleY = windowY + currentOffsetTop;
      const nextPlacement: BarPreviewPlacement =
        visibleY < workAreaTop + BAR_PREVIEW_FLIP_THRESHOLD_PX ? "below" : "above";

      if (nextPlacement === barPreviewPlacement) return;
      setBarPreviewPlacement(nextPlacement);

      const nextOffsetTop =
        nextPlacement === "below" ? BAR_ROOT_PADDING_PX : rootRect.height - navRect.height - BAR_ROOT_PADDING_PX;
      await tauriCommands.setWidgetBarPreviewPlacement({
        currentOffsetTop,
        navHeight: navRect.height,
        nextOffsetTop,
        placement: nextPlacement,
      });
    } catch {
      // Browser preview fallback and older Tauri runtimes keep the default above placement.
    }
  }, [barPreviewPlacement]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    if (!barRootRef.current || !barNavRef.current) return;

    let cancelled = false;

    void (async () => {
      await syncBarPreviewPlacement();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [syncBarPreviewPlacement]);

  const moveBarToCursor = useCallback(
    async (
      grab: { x: number; y: number },
      metrics: { rootHeight: number; rootWidth: number; navHeight: number; navWidth: number },
    ) => {
      const result = await tauriCommands.dragWidgetBarWindow({
        grabX: grab.x,
        grabY: grab.y,
        navHeight: metrics.navHeight,
        navWidth: metrics.navWidth,
        rootHeight: metrics.rootHeight,
        rootWidth: metrics.rootWidth,
      });
      setBarPreviewPlacement((current) => (current === result.placement ? current : result.placement));
    },
    [],
  );

  const handleBarPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const rootElement = barRootRef.current;
      const navElement = barNavRef.current;
      const target = event.target as HTMLElement | null;
      if (target?.closest(widgetDragIgnoreSelector)) return;
      if (!rootElement || !navElement || !isTauriRuntime()) {
        return;
      }

      let disposed = false;
      let framePending = false;
      let dragStarted = false;
      let latestCursor: { x: number; y: number } | null = null;

      const rootRect = rootElement.getBoundingClientRect();
      const navRect = navElement.getBoundingClientRect();
      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const grabX = event.clientX - navRect.left;
      const grabY = event.clientY - navRect.top;
      const pointerId = event.pointerId;
      try {
        navElement.setPointerCapture(pointerId);
      } catch {
        // Pointer capture is best-effort; window-level listeners still handle most cases.
      }
      const metrics = {
        navHeight: navRect.height,
        navWidth: navRect.width,
        rootHeight: rootRect.height,
        rootWidth: rootRect.width,
      };

      const cleanup = () => {
        disposed = true;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
        try {
          navElement.releasePointerCapture(pointerId);
        } catch {
          // Pointer capture may already be released by the browser.
        }
      };

      const scheduleMove = () => {
        if (framePending || disposed || !latestCursor) return;
        framePending = true;
        window.requestAnimationFrame(() => {
          framePending = false;
          void (async () => {
            if (disposed || !latestCursor) return;
            try {
              void tauriCommands.notifyWidgetDragStarted().catch(() => undefined);
              await moveBarToCursor({ x: grabX, y: grabY }, metrics);
            } catch {
              cleanup();
            }
          })();
        });
      };

      const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
        if (!dragStarted) {
          const distance = Math.abs(moveEvent.clientX - startClientX) + Math.abs(moveEvent.clientY - startClientY);
          if (distance < 4) return;
          dragStarted = true;
          suppressNextBarClickRef.current = true;
          void tauriCommands.notifyWidgetDragStarted().catch(() => undefined);
        }
        latestCursor = { x: moveEvent.screenX, y: moveEvent.screenY };
        scheduleMove();
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", cleanup, { once: true });
      window.addEventListener("pointercancel", cleanup, { once: true });
    },
    [moveBarToCursor],
  );

  const handleBarClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!suppressNextBarClickRef.current) return;
    suppressNextBarClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleBarMouseDown = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(widgetDragIgnoreSelector)) return;
      if (isTauriRuntime()) return;
      handleWidgetDragMouseDown(event);
    },
    [],
  );

  // memo 칩에 그대로 내려가는 콜백 — 참조가 안정해야 칩 memo가 작동한다.
  const showPreview = useCallback(
    (target: WidgetBubbleType | "notice") => {
      void syncBarPreviewPlacement();
      setPreviewTarget(target);
    },
    [syncBarPreviewPlacement],
  );
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
  // 창 높이는 Rust WIDGET_BAR_HEIGHT(640)가 패널(≈532px)과 hover preview 여유를 수용한다.
  return (
    <MotionConfig reducedMotion="user">
      {/* memo된 형제(칩)들 사이에서 layoutId 프로젝션이 함께 갱신되도록 LayoutGroup으로 묶는다. */}
      <LayoutGroup>
      <div
        className={[styles.root, styles.barRoot, barPreviewPlacement === "below" ? styles.barRootBelow : ""]
          .filter(Boolean)
          .join(" ")}
        data-bubli-desktop-widget
        ref={barRootRef}
      >
        <GooeyFilter />
        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={styles.barMenuPanel}
              data-bubli-interactive="true"
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              key="bubli-bar-menu"
              role="menu"
              transition={prefersReducedMotion ? { duration: 0 } : barChipSpring}
            >
              <div className={styles.barMenuInner}>
                <WidgetMenuPanelContent
                  hasRoomContext={hasRoomContext}
                  onArrangeBubbles={onArrangeBubbles}
                  onOpenBubble={openBubbleFromMenu}
                  onOpenMainApp={onOpenMainApp}
                  onOpenSettings={onOpenSettings}
                  onQuit={onQuit}
                  onToggleRoomContext={onToggleRoomContext}
                  usageSummary={usageSummary}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {/* hover 프리뷰 팝오버: 칩 accent를 물려받고 pill 위에서 스프링 스케일 인(하단 앵커). */}
        <AnimatePresence>
          {preview && PreviewIcon ? (
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
        {/* idle 페이드는 이 nav(pill)에만 적용된다 — 패널/팝오버는 nav 밖 형제 레이어라 영향이 없고,
            페이드 재무장은 바 루트의 pointermove/pointerdown/focusin/keydown 리스너가 담당한다. */}
        <nav
          aria-label={t("widget.bar.minimizedAria")}
          className={[styles.bubbleBar, barIdle && !barFadeSuspended ? styles.barIdle : ""].filter(Boolean).join(" ")}
          data-bubli-interactive="true"
          // 창 드래그는 pill 빈 영역/구분선의 non-capture 핸들러만 담당한다. capture 단계의
          // deferred 드래그는 칩/브랜드 버튼 mousedown까지 가로채 4px 지터만으로 macOS 웹뷰
          // 네이티브 창 드래그를 시작시켜 click을 삼켰다(브랜드 칩 메뉴가 안 열리던 라이브 버그).
          onClickCapture={handleBarClickCapture}
          onMouseDown={handleBarMouseDown}
          onPointerDownCapture={handleBarPointerDownCapture}
          ref={barNavRef}
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
              onClick={openNoticeBubble}
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
                  onClick={openNoticeBubble}
                  transition={gooPopSpring}
                  type="button"
                >
                  {gooPop.title}
                </motion.button>
              ) : null}
            </AnimatePresence>
          </span>
          <motion.button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t("widget.menu.openAria")}
            className={styles.barBrand}
            onClick={() => {
              setGooPop(null);
              setPreviewTarget(null);
              if (menuOpen) {
                setMenuOpen(false);
                return;
              }
              void syncBarPreviewPlacement().finally(() => setMenuOpen(true));
            }}
            title={t("widget.menu.openAria")}
            type="button"
            whileHover={chipWhileHover}
            whileTap={chipWhileTap}
          >
            <BubbleMark aria-hidden="true" className={styles.menuOrbMark} />
          </motion.button>
          <span className={styles.barDivider} aria-hidden="true" data-bubli-interactive="true" />
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

// 메뉴 오브 창의 본문 렌더도 동일 타입으로 분기 없이 재사용한다.
