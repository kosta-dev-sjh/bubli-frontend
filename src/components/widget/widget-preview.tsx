"use client";

import type { ReactNode } from "react";

import { AgentBubble } from "@/components/bubbles/agent-bubble";
import { BubbleBar } from "@/components/bubbles/bubble-bar";
import { DockOrb } from "@/components/bubbles/bubble-orb";
import { WidgetShell } from "@/components/widget/widget-shell";
import type { WidgetMode } from "@/components/widget/widget-shell";

/** 데스크탑 위에 위젯이 떠 있는 모습을 시뮬레이션하는 프리뷰. 실제 Tauri IPC·click-through는 없다. */
type WidgetNotification = { id: string; tone: "todo" | "agent" | "comment" | "schedule"; text: string };

const DOT_COLOR: Record<WidgetNotification["tone"], string> = {
  todo: "var(--signal-todo)",
  agent: "var(--signal-agent)",
  comment: "var(--signal-alert)",
  schedule: "var(--signal-memo)",
};

type WidgetPreviewProps = {
  mode?: WidgetMode;
  minimized?: boolean;
  notification?: WidgetNotification | null;
  children?: ReactNode;
};

export function WidgetPreview({ mode = "default", minimized = false, notification = null }: WidgetPreviewProps) {
  return (
    <div className="bubli-widget-stage" data-mode={mode}>
      <div className="bubli-widget-stage__inner">
        {notification ? (
          <div className="bubli-widget-notif" role="status">
            <span aria-hidden className="bubli-widget-notif__dot" style={{ background: DOT_COLOR[notification.tone] }} />
            <span className="bubli-widget-notif__text">{notification.text}</span>
            {notification.tone === "agent" ? <AgentBubble label="에이전트 알림" size={20} state="suggesting" /> : null}
          </div>
        ) : null}

        <div className="bubli-widget-stage__dock">
          {minimized ? (
            <BubbleBar schedules={2} todos={4} ghost={mode === "ghost"} />
          ) : (
            <WidgetShell
              agentCount={1}
              agentMessage="요구사항 후보 6개를 정리해 둘까요?"
              mode={mode}
              projectLabel="A사 리뉴얼"
              scheduleCount={2}
              timerText="25:00"
              todoCount={4}
            />
          )}
        </div>
      </div>

      <DockOrb className="bubli-widget-stage__orb" count={4} label="위젯 메뉴" />
    </div>
  );
}
