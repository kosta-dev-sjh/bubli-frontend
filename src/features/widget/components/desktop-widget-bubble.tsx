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
import type { WidgetBubbleType, WidgetWindowMode, WidgetWindowState } from "@/lib/tauri/commands";

import styles from "./desktop-widget-bubble.module.css";

type BubbleMeta = {
  accent: "blue" | "lilac" | "rose" | "pearl";
  id: WidgetBubbleType;
  label: string;
  Icon: typeof CheckCircle2;
};

const bubbleMeta: BubbleMeta[] = [
  { Icon: CheckCircle2, accent: "blue", id: "todo", label: "TODO" },
  { Icon: Sparkles, accent: "lilac", id: "agent", label: "에이전트" },
  { Icon: MessageSquare, accent: "rose", id: "chat", label: "소통" },
  { Icon: Timer, accent: "pearl", id: "timer", label: "타이머" },
  { Icon: StickyNote, accent: "pearl", id: "memo", label: "메모" },
  { Icon: Clock3, accent: "blue", id: "schedule", label: "일정" },
  { Icon: FileText, accent: "lilac", id: "resource", label: "자료" },
  { Icon: Bell, accent: "blue", id: "alert", label: "알림" },
];

const modeLabels: Record<WidgetWindowMode, string> = {
  DEFAULT: "기본",
  GHOST: "고스트",
  MINIMIZED: "최소화",
  TRANSLUCENT: "반투명",
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
  onMarkChatRead?: (bubble: WidgetPreviewBubble) => Promise<void> | void;
  onModeChange: (mode: WidgetWindowMode) => void;
  onOpenBubble?: (bubbleType: WidgetBubbleType) => void;
  onRestore?: () => void;
  onSendChatMessage?: (bubble: WidgetPreviewBubble, text: string) => Promise<void> | void;
  onToggleAlwaysOnTop: () => void;
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
  return (
    <div className={[styles.controls, presentation === "tauri" ? styles.controlsTauri : styles.controlsPreview].join(" ")} aria-label="위젯 조작">
      <button aria-pressed={alwaysOnTop} aria-label="상단 고정" onClick={onPin} type="button">
        <Pin size={12} strokeWidth={2} />
      </button>
      <button aria-label="최소화" onClick={() => onMode("MINIMIZED")} type="button">
        <Minus size={13} strokeWidth={2} />
      </button>
      <button aria-pressed={mode === "GHOST"} aria-label="고스트" onClick={() => onMode(mode === "GHOST" ? "DEFAULT" : "GHOST")} type="button">
        <Ghost size={13} strokeWidth={2} />
      </button>
      {presentation === "preview" ? (
        <button aria-pressed={mode === "TRANSLUCENT"} aria-label="반투명" onClick={() => onMode(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
          <CircleDashed size={13} strokeWidth={2} />
        </button>
      ) : null}
      <button aria-label="닫기" onClick={onClose} type="button">
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
  if (!onItemStateChange) return null;

  return (
    <span className={styles.itemActions}>
      <button aria-label="확인" onClick={() => onItemStateChange(item, "CONFIRMED")} type="button">
        <CheckCircle2 size={12} strokeWidth={2} />
      </button>
      <button aria-label="고정" onClick={() => onItemStateChange(item, "PINNED")} type="button">
        <Pin size={12} strokeWidth={2} />
      </button>
      <button aria-label="숨김" onClick={() => onItemStateChange(item, "HIDDEN")} type="button">
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
  if (bubble.rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span>{bubble.notificationLabel}</span>
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
  return (
    <div className={styles.body}>
      <div className={styles.progress}>
        <span>{bubble.metric}</span>
        <b>{bubble.metricLabel}</b>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
      <button className={styles.wideAction} type="button">
        <Plus size={14} strokeWidth={2} />
        {bubble.actionLabel}
      </button>
    </div>
  );
}

function AgentBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  return (
    <div className={styles.body}>
      <div className={styles.agentHalo} aria-label="에이전트 신호">
        <span className={styles.agentHaloCore} />
        <span className={styles.agentHaloRing} />
      </div>
      <div className={styles.bubbleNote}>
        <strong>{bubble.panelLabel}</strong>
        <span>{bubble.panelBody}</span>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
      <div className={styles.dropPanel}>
        <FileText size={16} strokeWidth={2} />
        <span>{bubble.notificationLabel}</span>
      </div>
      <label className={styles.input}>
        <Search size={14} strokeWidth={2} />
        <input placeholder={bubble.inputPlaceholder} />
      </label>
    </div>
  );
}

function ChatBody({
  bubble,
  onItemStateChange,
  onMarkChatRead,
  onSendChatMessage,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onSendChatMessage?: DesktopWidgetBubbleProps["onSendChatMessage"];
}) {
  const [draft, setDraft] = useState("");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      setStatusText("전송됨");
    } catch {
      setStatusText("전송 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const markRead = async () => {
    if (!onMarkChatRead) return;

    setStatusText(null);
    try {
      await onMarkChatRead(bubble);
      setStatusText("읽음 처리됨");
    } catch {
      setStatusText("읽음 처리 실패");
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.chatHead}>
        <span>{bubble.panelLabel}</span>
        <b>{visibleRows.length}</b>
      </div>
      <div className={styles.chatPeople}>
        <Users size={14} strokeWidth={2} />
        <span>{friendRows[0]?.label ?? bubble.participantLabels?.join(" · ") ?? bubble.roomLabel}</span>
        <b>{friendRows[0]?.status ?? "친구"}</b>
      </div>
      <div className={styles.voiceStrip}>
        <div>
          <Mic size={14} strokeWidth={2} />
          <span>{voiceRows[0]?.label ?? bubble.voiceLabel ?? "보이스 대기"}</span>
          <small>{bubble.voiceParticipants ?? "참여자 없음"}</small>
        </div>
        <button aria-label="마이크 상태" type="button">
          <Mic size={13} strokeWidth={2} />
        </button>
        <button aria-label="헤드셋" type="button">
          <Headphones size={13} strokeWidth={2} />
        </button>
        <button aria-label="보이스 나가기" type="button">
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
          <span>소통 링크 공유됨 · 버블에서 숨김</span>
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
      <div className={styles.reactionDock} aria-label="빠른 반응">
        <SmilePlus size={14} strokeWidth={2} />
        {(bubble.reactionLabels ?? ["확인", "좋아요", "잠시 후"]).map((label) => (
          <button key={label} onClick={() => void markRead()} type="button">
            {label}
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
          placeholder={bubble.chatRoomId ? bubble.inputPlaceholder : "채팅방을 먼저 선택하세요"}
          value={draft}
        />
        <button aria-label="보이스 시작" type="button">
          <Mic size={13} strokeWidth={2} />
        </button>
        <button
          aria-label="메시지 전송"
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

function TimerBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  return (
    <div className={styles.body}>
      <div className={styles.timer}>
        <strong>{bubble.metric}</strong>
        <span>{bubble.metricLabel}</span>
      </div>
      <div className={styles.segmented}>
        <button aria-pressed="true" type="button">
          시계
        </button>
        <button type="button">작업</button>
        <button type="button">뽀모도로</button>
      </div>
      <div className={styles.timerActions}>
        <button type="button">
          <Pause size={13} />
          일시정지
        </button>
        <button type="button">
          <Play size={13} />
          {bubble.actionLabel}
        </button>
      </div>
      <ItemRows bubble={bubble} onItemStateChange={onItemStateChange} />
    </div>
  );
}

function MemoBody({ bubble }: { bubble: WidgetPreviewBubble }) {
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
          <span>{bubble.notificationLabel}</span>
        </div>
      )}
      <button className={styles.wideAction} type="button">
        <Plus size={14} strokeWidth={2} />
        {bubble.actionLabel}
      </button>
    </div>
  );
}

function ScheduleBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  return (
    <div className={styles.body}>
      <div className={styles.ring}>
        <span>{bubble.metric}</span>
        <b>{bubble.metricLabel}</b>
      </div>
      <div className={styles.segmented}>
        <button aria-pressed="true" type="button">
          주간
        </button>
        <button type="button">월간</button>
        <button type="button">WBS</button>
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
            <span>{bubble.notificationLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceBody({ bubble, onItemStateChange }: { bubble: WidgetPreviewBubble; onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"] }) {
  return (
    <div className={styles.body}>
      <div className={styles.bubbleNote}>
        <strong>{bubble.panelLabel}</strong>
        <span>{bubble.panelBody}</span>
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
          <span>{bubble.notificationLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function BubbleBody({
  bubble,
  onItemStateChange,
  onMarkChatRead,
  onSendChatMessage,
}: {
  bubble: WidgetPreviewBubble;
  onItemStateChange?: DesktopWidgetBubbleProps["onItemStateChange"];
  onMarkChatRead?: DesktopWidgetBubbleProps["onMarkChatRead"];
  onSendChatMessage?: DesktopWidgetBubbleProps["onSendChatMessage"];
}) {
  if (bubble.id === "agent") return <AgentBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  if (bubble.id === "chat") {
    return <ChatBody bubble={bubble} onItemStateChange={onItemStateChange} onMarkChatRead={onMarkChatRead} onSendChatMessage={onSendChatMessage} />;
  }
  if (bubble.id === "timer") return <TimerBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  if (bubble.id === "memo") return <MemoBody bubble={bubble} />;
  if (bubble.id === "schedule") return <ScheduleBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  if (bubble.id === "resource") return <ResourceBody bubble={bubble} onItemStateChange={onItemStateChange} />;
  return <TodoBody bubble={bubble} onItemStateChange={onItemStateChange} />;
}

function GhostSignal({ bubble }: { bubble: WidgetPreviewBubble }) {
  return (
    <div className={styles.ghostSignal} aria-label={`${bubble.label} 고스트 상태`}>
      <span>{bubble.metric}</span>
      <strong>{bubble.compactLabel}</strong>
      <small>{bubble.notificationLabel}</small>
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
  onMarkChatRead,
  onModeChange,
  onRestore,
  onSendChatMessage,
  onToggleAlwaysOnTop,
  presentation = "tauri",
  windowVisible = true,
}: DesktopWidgetBubbleProps) {
  const active = getBubbleMeta(activeBubble);
  const activeData = bubble ?? getWidgetPreviewBubble(activeBubble);
  const Icon = active.Icon;
  const isPreview = presentation === "preview";
  const rootClassName = [styles.root, modeClassNames[mode], isPreview ? styles.previewRoot : styles.tauriRoot].filter(Boolean).join(" ");
  const shellClassName = [styles.shell, accentClassNames[active.accent], presentationClassNames[presentation]].join(" ");

  return (
    <div className={rootClassName} data-bubli-desktop-widget>
      <section className={shellClassName} aria-label={`${active.label} 버블`}>
        {!windowVisible ? (
          isPreview ? (
            <button className={styles.hiddenCard} onClick={onRestore ?? (() => onModeChange("DEFAULT"))} type="button">
              <span>숨김</span>
              <b>{activeData.label} 버블 복구</b>
              <small>{activeData.notificationLabel}</small>
            </button>
          ) : null
        ) : mode === "MINIMIZED" ? (
          <button className={styles.dockOrb} onClick={() => onModeChange("DEFAULT")} type="button">
            <span className={styles.dockBubble} aria-hidden="true" />
            <div className={styles.dockCopy}>
              <b>{activeData.compactLabel}</b>
              <small>{activeData.notificationLabel}</small>
            </div>
          </button>
        ) : (
          <>
            <header className={styles.head} data-tauri-drag-region>
              <div className={styles.title}>
                <span className={styles.signal} aria-hidden="true" />
                <Icon size={16} strokeWidth={2} />
                <div className={styles.titleCopy}>
                  <strong>{activeData.label} 버블</strong>
                  <small>{isPreview ? `${modeLabels[mode]} · ${activeData.notificationLabel}` : activeData.roomLabel}</small>
                </div>
              </div>
              <WidgetControls alwaysOnTop={alwaysOnTop} mode={mode} onClose={onClose} onMode={onModeChange} onPin={onToggleAlwaysOnTop} presentation={presentation} />
            </header>

            {isPreview ? (
              <div className={styles.dragbar} data-tauri-drag-region>
                <span>{modeLabels[mode]} · {alwaysOnTop ? "상단 고정" : "일반 창"} · {clickThrough ? "클릭 통과" : "클릭 가능"}</span>
                <button aria-pressed={mode === "TRANSLUCENT"} onClick={() => onModeChange(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
                  반투명
                </button>
              </div>
            ) : null}

            {mode === "GHOST" ? (
              <GhostSignal bubble={activeData} />
            ) : (
              <BubbleBody
                bubble={activeData}
                onItemStateChange={onItemStateChange}
                onMarkChatRead={onMarkChatRead}
                onSendChatMessage={onSendChatMessage}
              />
            )}

            {isPreview ? (
              <div className={styles.bubbleNote}>
                <strong>{activeData.roomLabel}</strong>
                <span>{activeData.notificationLabel}</span>
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
  return (
    <div className={[styles.root, styles.barRoot].join(" ")} data-bubli-desktop-widget>
      <div className={styles.barPreview} aria-hidden="true">
        <strong>접힌 버블</strong>
        <span>
          {minimizedItems.length > 0
            ? minimizedItems.map((item) => (bubbleDataByType?.[item.activeBubble as WidgetBubbleType] ?? getWidgetPreviewBubble(item.activeBubble as WidgetBubbleType)).compactLabel).join(" · ")
            : "접힌 위젯 없음"}
        </span>
        <small>
          {notificationSignal.rows[0]?.label ?? notificationSignal.notificationLabel}
        </small>
      </div>
      <nav className={styles.bubbleBar} aria-label="최소화된 버블">
        <div className={styles.barBrand} aria-label="Bubli 알림 상태">
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
            <button className={styles.barItem} key={`${bubbleType}-${index}`} onClick={() => onRestoreBubble(bubbleType, bubbleType)} type="button">
              <Icon size={12} strokeWidth={2} />
              <b>{bubble.compactLabel.replace("떠 있는 ", "").replace("타이머 ", "")}</b>
            </button>
          );
        })}
        <button className={styles.barNotice} type="button" aria-label={notificationSignal.notificationLabel}>
          <Bell size={12} strokeWidth={2} />
          <b>{notificationSignal.metric}</b>
        </button>
      </nav>
    </div>
  );
}

export function DesktopWidgetMenuOrb({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className={[styles.root, styles.menuRoot].join(" ")} data-bubli-desktop-widget>
      <button className={styles.menuOrb} onClick={onOpenMenu} type="button" aria-label="Bubli 메뉴 열기">
        <span />
      </button>
      <div className={styles.menuPanel} aria-hidden="true">
        <strong>Bubli</strong>
        <span>접힌 버블과 알림을 펼쳐봅니다</span>
        <div>
          <span>TODO</span>
          <span>일정</span>
          <span>소통</span>
        </div>
      </div>
    </div>
  );
}
