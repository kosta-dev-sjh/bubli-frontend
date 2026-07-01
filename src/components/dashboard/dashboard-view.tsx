"use client";

import { Settings2 } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { widgetIcon } from "@/components/dashboard/dashboard-palette";
import { DashboardWidgetTile } from "@/components/dashboard/dashboard-widget-tile";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Ring } from "@/components/ui/ring";
import { StatusBadge } from "@/components/ui/status-badge";

/* Storybook에서 카드 조립을 확인하는 정적 데이터다. 실제 라우트는 API 데이터를 쓴다. */
export type DashboardViewData = {
  summary: { resources: number; candidates: number; todos: number; minutesFocused: number };
  todos: { id: string; title: string; tone: "todo" | "warning" | "approved"; meta: string }[];
  timeRing: { label: string; value: number; max: number; segments: { label: string; value: number }[] };
  agent: { message: string; count: number };
  approvals: { id: string; title: string; from: string }[];
  schedule: { id: string; time: string; title: string }[];
  notifications: { id: string; tone: "todo" | "agent" | "memo" | "communication"; text: string }[];
};

export const DASHBOARD_STORY_DATA: DashboardViewData = {
  summary: { resources: 3, candidates: 6, todos: 4, minutesFocused: 135 },
  todos: [
    { id: "t1", title: "시안 1차 보내기", tone: "warning", meta: "오늘 18:00" },
    { id: "t2", title: "견적서 회신 확인", tone: "todo", meta: "진행중" },
    { id: "t3", title: "WBS 구조 검토", tone: "todo", meta: "내일" },
    { id: "t4", title: "업무 범위 문서 검토 회신", tone: "approved", meta: "완료" },
  ],
  timeRing: {
    label: "오늘 집중",
    value: 135,
    max: 240,
    segments: [
      { label: "A사 리뉴얼", value: 70 },
      { label: "B사 앱", value: 45 },
      { label: "기타", value: 20 },
    ],
  },
  agent: { message: "자료 3건에서 요구사항 후보 6개를 찾았어요. 정리해 둘까요?", count: 6 },
  approvals: [
    { id: "a1", title: "요구사항 후보 6개 승인", from: "에이전트" },
    { id: "a2", title: "결과물 일정 변경 확인", from: "A사 룸" },
  ],
  schedule: [
    { id: "s1", time: "11:00", title: "A사 정기 미팅" },
    { id: "s2", time: "15:30", title: "B사 디자인 리뷰" },
  ],
  notifications: [
    { id: "n1", tone: "communication", text: "A사 룸에 새 댓글 2개" },
    { id: "n2", tone: "agent", text: "에이전트가 하루 정리를 마쳤어요" },
    { id: "n3", tone: "memo", text: "메모 '컬러 톤' 업데이트됨" },
  ],
};

function Line({ children }: { children: ReactNode }) {
  return <div className="bubli-dash-line">{children}</div>;
}

function Skeleton({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <span className="bubli-skeleton" style={{ display: "block", width: w, height: h, borderRadius: 8 }} />;
}

type DashboardViewProps = {
  data?: DashboardViewData;
  empty?: boolean;
  loading?: boolean;
  onCustomize?: () => void;
};

export function DashboardView({ data = DASHBOARD_STORY_DATA, empty = false, loading = false, onCustomize }: DashboardViewProps) {
  const hoursLabel = `${Math.floor(data.summary.minutesFocused / 60)}h ${data.summary.minutesFocused % 60}m`;

  return (
    <div className="bubli-dash-view">
      <header className="bubli-dash-view__bar">
        <div>
          <strong className="bubli-dash-view__title">대시보드</strong>
          <p className="bubli-dash-view__sub">
            여러 프로젝트룸에서 내가 맡은 할 일, 일정, 확인할 항목을 한곳에 모았다.
          </p>
        </div>
        <Button onClick={onCustomize} variant="primary">
          <Settings2 aria-hidden size={15} strokeWidth={1.8} />
          카드 편집
        </Button>
      </header>

      {empty ? (
        <DashboardGrid empty mode="edit" />
      ) : (
        <DashboardGrid mode="view">
          <DashboardWidgetTile icon={widgetIcon("today-summary")} size="L" title="오늘 요약">
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                <Skeleton w="60%" />
                <Skeleton w="80%" />
              </div>
            ) : (
              <div className="bubli-dash-summary">
                <span>자료 {data.summary.resources}</span>
                <span>후보 {data.summary.candidates}</span>
                <span>할 일 {data.summary.todos}</span>
                <span>집중 {hoursLabel}</span>
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("today-todos")} size="M" title="오늘 할 일">
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                <Skeleton />
                <Skeleton w="70%" />
                <Skeleton w="85%" />
              </div>
            ) : (
              <div className="bubli-dash-list">
                {data.todos.map((t) => (
                  <Line key={t.id}>
                    <span>{t.title}</span>
                    <StatusBadge tone={t.tone}>{t.meta}</StatusBadge>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("project-time-ring")} size="M" title="프로젝트별 시간">
            {loading ? (
              <Skeleton h={96} w={96} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Ring
                  label={data.timeRing.label}
                  max={data.timeRing.max}
                  metric={`${Math.round((data.timeRing.value / data.timeRing.max) * 100)}%`}
                  segments={data.timeRing.segments}
                  variant="time"
                />
                <div className="bubli-dash-list" style={{ flex: 1 }}>
                  {data.timeRing.segments.map((s) => (
                    <Line key={s.label}>
                      <span>{s.label}</span>
                      <span className="bubli-dash-faint">{s.value}분</span>
                    </Line>
                  ))}
                </div>
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("pending-approval")} size="M" title="확인 필요">
            {loading ? (
              <Skeleton w="90%" h={40} />
            ) : (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" className="bubli-agent-signal" />
                <div style={{ display: "grid", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 13 }}>승인 전 항목을 확인합니다.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" variant="primary">
                      확인
                    </Button>
                    <Chip>후보 {data.agent.count}</Chip>
                  </div>
                </div>
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("pending-approval")} size="M" title="승인 대기">
            {loading ? (
              <Skeleton w="80%" />
            ) : (
              <div className="bubli-dash-list">
                {data.approvals.map((a) => (
                  <Line key={a.id}>
                    <span>{a.title}</span>
                    <span className="bubli-dash-faint">{a.from}</span>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("schedule")} size="M" title="일정">
            {loading ? (
              <Skeleton w="70%" />
            ) : (
              <div className="bubli-dash-list">
                {data.schedule.map((s) => (
                  <Line key={s.id}>
                    <span className="bubli-dash-faint">{s.time}</span>
                    <span style={{ flex: 1, textAlign: "right" }}>{s.title}</span>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("notifications")} size="M" title="알림">
            {loading ? (
              <Skeleton w="85%" />
            ) : (
              <div className="bubli-dash-list">
                {data.notifications.map((n) => (
                  <Line key={n.id}>
                    <StatusBadge tone={n.tone}>·</StatusBadge>
                    <span style={{ flex: 1 }}>{n.text}</span>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>
        </DashboardGrid>
      )}
    </div>
  );
}
