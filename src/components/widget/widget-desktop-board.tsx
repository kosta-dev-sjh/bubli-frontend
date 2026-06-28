"use client";

import { AgentBubble } from "@/components/bubbles/agent-bubble";
import { BubbleBar } from "@/components/bubbles/bubble-bar";
import { DecorBubble } from "@/components/bubbles/decor-bubble";
import { DockOrb } from "@/components/bubbles/bubble-orb";
import { WidgetShell } from "@/components/widget/widget-shell";

/**
 * 하나의 데스크톱 캔버스(바탕화면) 위에 위젯 4상태가 동시에 떠 있는 브랜드 시연 장면.
 * Default를 대표로 크게, 나머지는 주변에 작게. 실제 Tauri 창 제어·IPC는 없다(미리보기).
 */
export function WidgetDesktopBoard() {
  return (
    <div className="bubli-desk">
      <div className="bubli-desk__bar">
        <span className="bubli-desk__brand">Bubli</span>
        <span className="bubli-desk__bar-dot" aria-hidden />
        <span>25:00</span>
        <span>할 일 4</span>
        <span>일정 2</span>
        <span className="bubli-desk__bar-note">바탕화면 위 · 작업 중에만 맑게</span>
      </div>

      <DecorBubble className="bubli-desk__bubble bubli-desk__bubble--1" floating size="lg" />
      <DecorBubble className="bubli-desk__bubble bubli-desk__bubble--2" floating size="md" />
      <DecorBubble className="bubli-desk__bubble bubli-desk__bubble--3" floating size="sm" />

      {/* 대표 위젯 — 가장 크게, 알림은 위에 조용히 */}
      <div className="bubli-desk__hero">
        <div className="bubli-desk__notif" role="status">
          <span aria-hidden className="bubli-desk__notif-dot" />
          <span>에이전트가 하루 정리를 마쳤어요</span>
          <AgentBubble label="에이전트 알림" size={20} state="suggesting" />
        </div>
        <WidgetShell
          agentCount={1}
          agentMessage="요구사항 후보 6개를 정리해 둘까요?"
          density="expanded"
          mode="default"
          projectLabel="A사 리뉴얼"
          scheduleCount={2}
          timerText="25:00"
          todoCount={4}
        />
        <span className="bubli-desk__tag">기본</span>
      </div>

      {/* 반투명 — 우상단에 가볍게 */}
      <div className="bubli-desk__float bubli-desk__float--tl">
        <WidgetShell
          agentMessage="배경이 비쳐도 핵심만 보입니다"
          density="compact"
          mode="translucent"
          projectLabel="B사 앱"
          scheduleCount={2}
          timerText="12:40"
          todoCount={2}
        />
        <span className="bubli-desk__tag">반투명</span>
      </div>

      {/* 고스트 — 신호만 */}
      <div className="bubli-desk__float bubli-desk__float--ghost">
        <WidgetShell agentCount={1} mode="ghost" scheduleCount={2} todoCount={4} />
        <span className="bubli-desk__tag">고스트 · 클릭 통과</span>
      </div>

      {/* 최소화 — 우하단 도크 */}
      <div className="bubli-desk__dock">
        <BubbleBar schedules={2} todos={4} />
        <DockOrb count={4} label="위젯 메뉴" />
        <span className="bubli-desk__tag bubli-desk__tag--dock">최소화</span>
      </div>
    </div>
  );
}
