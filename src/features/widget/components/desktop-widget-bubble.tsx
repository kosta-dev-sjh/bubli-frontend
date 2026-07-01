"use client";

import { type MouseEvent, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  Ghost,
  Grip,
  MessageSquare,
  Minus,
  Pause,
  Pin,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  StickyNote,
  Timer,
  X,
} from "lucide-react";

import { getWidgetPreviewBubble, widgetPreviewBubbles, type WidgetPreviewBubble } from "@/features/widget/desktop-widget-preview-data";
import type { WidgetBubbleType, WidgetWindowMode } from "@/lib/tauri/commands";

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
  { Icon: Bell, accent: "rose", id: "alert", label: "알림" },
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

export type DesktopWidgetBubbleProps = {
  activeBubble: WidgetBubbleType;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  mode: WidgetWindowMode;
  onClose: () => void;
  onModeChange: (mode: WidgetWindowMode) => void;
  onOpenBubble: (bubbleType: WidgetBubbleType) => void;
  onRestore?: () => void;
  onToggleAlwaysOnTop: () => void;
  presentation?: "preview" | "tauri";
  windowVisible?: boolean;
};

export const desktopWidgetBubbleTypes = widgetPreviewBubbles.map((bubble) => bubble.id);

function WidgetControls({
  alwaysOnTop,
  mode,
  onClose,
  onMode,
  onPin,
}: {
  alwaysOnTop: boolean;
  mode: WidgetWindowMode;
  onClose: () => void;
  onMode: (mode: WidgetWindowMode) => void;
  onPin: () => void;
}) {
  return (
    <div className={styles.controls} aria-label="위젯 조작">
      <button aria-pressed={alwaysOnTop} aria-label="상단 고정" onClick={onPin} type="button">
        <Pin size={12} strokeWidth={2} />
      </button>
      <button aria-label="최소화" onClick={() => onMode("MINIMIZED")} type="button">
        <Minus size={13} strokeWidth={2} />
      </button>
      <button aria-pressed={mode === "GHOST"} aria-label="고스트" onClick={() => onMode(mode === "GHOST" ? "DEFAULT" : "GHOST")} type="button">
        <Ghost size={13} strokeWidth={2} />
      </button>
      <button aria-label="닫기" onClick={onClose} type="button">
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

function ItemRows({ bubble }: { bubble: WidgetPreviewBubble }) {
  return (
    <>
      {bubble.rows.map((item) => (
        <label className={styles.checkRow} key={item.label}>
          <input checked={item.checked ?? false} readOnly type="checkbox" />
          <span>{item.label}</span>
          <b>{item.status}</b>
        </label>
      ))}
    </>
  );
}

function TodoBody({ bubble }: { bubble: WidgetPreviewBubble }) {
  return (
    <div className={styles.body}>
      <div className={styles.progress}>
        <span>{bubble.metric}</span>
        <b>{bubble.metricLabel}</b>
      </div>
      <ItemRows bubble={bubble} />
      <button className={styles.wideAction} type="button">
        <Plus size={14} strokeWidth={2} />
        {bubble.actionLabel}
      </button>
    </div>
  );
}

function AgentBody({ bubble }: { bubble: WidgetPreviewBubble }) {
  return (
    <div className={styles.body}>
      <div className={styles.agentFace} aria-label="에이전트 신호">
        <span />
        <span />
      </div>
      <div className={styles.bubbleNote}>
        <strong>{bubble.panelLabel}</strong>
        <span>{bubble.panelBody}</span>
      </div>
      <ItemRows bubble={bubble} />
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

function ChatBody({ bubble }: { bubble: WidgetPreviewBubble }) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const visibleRows = bubble.rows.filter((item) => !hiddenIds.includes(item.id));
  const handoffItem = visibleRows.find((item) => item.handoffUrl);
  const [first, second, ...rest] = visibleRows.filter((item) => !item.handoffUrl);

  const hideAfterHandoff = (id: string) => {
    setHiddenIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const openHandoff = (event: MouseEvent<HTMLAnchorElement>, item: WidgetPreviewBubble["rows"][number]) => {
    if (!item.handoffUrl) return;

    event.preventDefault();
    if (item.dismissOnOpen) hideAfterHandoff(item.id);
    window.open(item.handoffUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.body}>
      <div className={styles.chatHead}>
        <span>{bubble.panelLabel}</span>
        <b>{visibleRows.length}</b>
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
      {rest.map((item) => (
        <div className={styles.alertRow} key={item.id}>
          <span />
          <strong>{item.label}</strong>
        </div>
      ))}
      <label className={styles.input}>
        <input placeholder={bubble.inputPlaceholder} />
        <Send size={14} strokeWidth={2} />
      </label>
    </div>
  );
}

function TimerBody({ bubble }: { bubble: WidgetPreviewBubble }) {
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
      <ItemRows bubble={bubble} />
    </div>
  );
}

function MemoBody({ bubble }: { bubble: WidgetPreviewBubble }) {
  return (
    <div className={[styles.body, styles.memoGrid].join(" ")}>
      {bubble.rows.map((item) => (
        <article key={item.id}>
          <strong>{item.label}</strong>
          <span>{item.status}</span>
        </article>
      ))}
      <button className={styles.wideAction} type="button">
        <Plus size={14} strokeWidth={2} />
        {bubble.actionLabel}
      </button>
    </div>
  );
}

function ScheduleBody({ bubble }: { bubble: WidgetPreviewBubble }) {
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
        {bubble.rows.map((item) => (
          <span key={item.id}>
            {item.label} · {item.status}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResourceBody({ bubble }: { bubble: WidgetPreviewBubble }) {
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
        </div>
      ))}
    </div>
  );
}

function AlertBody({ bubble }: { bubble: WidgetPreviewBubble }) {
  return (
    <div className={styles.body}>
      <div className={styles.progress}>
        <span>{bubble.metric}</span>
        <b>{bubble.metricLabel}</b>
      </div>
      {bubble.rows.map((item) => (
        <div className={styles.alertRow} key={item.id}>
          <span />
          <strong>{item.label} · {item.status}</strong>
        </div>
      ))}
    </div>
  );
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

function BubbleBody({ bubble }: { bubble: WidgetPreviewBubble }) {
  if (bubble.id === "agent") return <AgentBody bubble={bubble} />;
  if (bubble.id === "chat") return <ChatBody bubble={bubble} />;
  if (bubble.id === "timer") return <TimerBody bubble={bubble} />;
  if (bubble.id === "memo") return <MemoBody bubble={bubble} />;
  if (bubble.id === "schedule") return <ScheduleBody bubble={bubble} />;
  if (bubble.id === "resource") return <ResourceBody bubble={bubble} />;
  if (bubble.id === "alert") return <AlertBody bubble={bubble} />;
  return <TodoBody bubble={bubble} />;
}

export function DesktopWidgetBubble({
  activeBubble,
  alwaysOnTop,
  clickThrough,
  mode,
  onClose,
  onModeChange,
  onOpenBubble,
  onRestore,
  onToggleAlwaysOnTop,
  presentation = "tauri",
  windowVisible = true,
}: DesktopWidgetBubbleProps) {
  const active = bubbleMeta.find((item) => item.id === activeBubble) ?? bubbleMeta[0];
  const activeData = getWidgetPreviewBubble(activeBubble);
  const Icon = active.Icon;
  const rootClassName = [styles.root, modeClassNames[mode], presentation === "preview" ? styles.previewRoot : ""].filter(Boolean).join(" ");
  const shellClassName = [styles.shell, accentClassNames[active.accent]].join(" ");

  return (
    <div className={rootClassName}>
      <section className={shellClassName} aria-label={`${active.label} 버블`}>
        {!windowVisible ? (
          <button className={styles.hiddenCard} onClick={onRestore ?? (() => onModeChange("DEFAULT"))} type="button">
            <span>숨김</span>
            <b>{activeData.label} 버블 복구</b>
            <small>{activeData.notificationLabel}</small>
          </button>
        ) : mode === "MINIMIZED" ? (
          <button className={styles.dockOrb} onClick={() => onModeChange("DEFAULT")} type="button">
            <span>Bubli</span>
            <b>{activeData.compactLabel}</b>
            <small>{activeData.roomLabel} · {activeData.notificationLabel}</small>
          </button>
        ) : (
          <>
            <header className={styles.head}>
              <div className={styles.title}>
                <span className={styles.signal} aria-hidden="true" />
                <Icon size={16} strokeWidth={2} />
                <strong>{activeData.label} 버블</strong>
              </div>
              <WidgetControls alwaysOnTop={alwaysOnTop} mode={mode} onClose={onClose} onMode={onModeChange} onPin={onToggleAlwaysOnTop} />
            </header>

            <div className={styles.dragbar}>
              <Grip size={14} strokeWidth={2} />
              <span>{modeLabels[mode]} · {alwaysOnTop ? "상단 고정" : "일반 창"} · {clickThrough ? "클릭 통과" : "클릭 가능"}</span>
              <button aria-pressed={mode === "TRANSLUCENT"} onClick={() => onModeChange(mode === "TRANSLUCENT" ? "DEFAULT" : "TRANSLUCENT")} type="button">
                반투명
              </button>
            </div>

            {mode === "GHOST" ? <GhostSignal bubble={activeData} /> : <BubbleBody bubble={activeData} />}

            <div className={styles.bubbleNote}>
              <strong>{activeData.roomLabel}</strong>
              <span>{activeData.notificationLabel}</span>
            </div>

            <div className={styles.modebar} aria-label="위젯 상태">
              {(["DEFAULT", "TRANSLUCENT", "GHOST", "MINIMIZED"] as WidgetWindowMode[]).map((item) => (
                <button aria-pressed={mode === item} key={item} onClick={() => onModeChange(item)} type="button">
                  {modeLabels[item]}
                </button>
              ))}
            </div>

            <div className={styles.dockbar} aria-label="독립 버블 창 열기">
              {widgetPreviewBubbles.map((bubble) => {
                const itemMeta = bubbleMeta.find((item) => item.id === bubble.id) ?? bubbleMeta[0];
                const BubbleIcon = itemMeta.Icon;

                return (
                  <button aria-label={`${bubble.label} 버블 열기`} aria-pressed={activeBubble === bubble.id} key={bubble.id} onClick={() => onOpenBubble(bubble.id)} type="button">
                    <BubbleIcon size={13} strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
