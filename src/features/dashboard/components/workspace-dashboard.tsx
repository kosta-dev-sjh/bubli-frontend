"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Clock3, LayoutDashboard, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { dashboardApi } from "@/features/dashboard/api/dashboardApi";
import { ApiClientError } from "@/lib/api/errors";
import type { DashboardWorkResponse, ScheduleResponse, TaskResponse } from "@/types/api/work";

type DashboardState =
  | { kind: "loading" }
  | { kind: "ready"; data: DashboardWorkResponse }
  | { kind: "empty"; data: DashboardWorkResponse }
  | { kind: "auth" }
  | { kind: "error"; message: string };

const emptyDashboard: DashboardWorkResponse = {
  todaySchedules: [],
  todayTasks: [],
  upcomingDeadlines: [],
};

function formatTime(value?: string | null) {
  if (!value) {
    return "시간 미정";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "시간 미정";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDue(value?: string | null) {
  if (!value) {
    return "마감 미정";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "마감 미정";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function hasDashboardItems(data: DashboardWorkResponse) {
  return data.todayTasks.length + data.upcomingDeadlines.length + data.todaySchedules.length > 0;
}

function StatusLine({ children, meta }: { children: string; meta: string }) {
  return (
    <li className="workspace-dashboard__line">
      <span>{children}</span>
      <b>{meta}</b>
    </li>
  );
}

function TaskLine({ task }: { task: TaskResponse }) {
  return <StatusLine meta={formatDue(task.dueAt)}>{task.title}</StatusLine>;
}

function ScheduleLine({ schedule }: { schedule: ScheduleResponse }) {
  return <StatusLine meta={formatTime(schedule.startsAt)}>{schedule.title}</StatusLine>;
}

export function WorkspaceDashboard() {
  const [state, setState] = useState<DashboardState>({ kind: "loading" });

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardApi.getWork();
      setState(hasDashboardItems(data) ? { data, kind: "ready" } : { data, kind: "empty" });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "연결 대기",
      });
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    setState({ kind: "loading" });
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboard]);

  const data = state.kind === "ready" || state.kind === "empty" ? state.data : emptyDashboard;
  const todayTasks = data.todayTasks.slice(0, 4);
  const upcomingDeadlines = data.upcomingDeadlines.slice(0, 4);
  const todaySchedules = data.todaySchedules.slice(0, 4);

  return (
    <section className="workspace-dashboard" aria-label="회원 앱 대시보드">
      <GlassPanel className="workspace-dashboard__hero">
        <div className="workspace-dashboard__copy">
          <h1>대시보드</h1>
        </div>
        <div className="workspace-dashboard__actions">
          <Button onClick={refreshDashboard} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            새로고침
          </Button>
          <Link className="bubli-button" href="/app/project-rooms">
            프로젝트룸
          </Link>
        </div>
      </GlassPanel>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-dashboard__state">
          <Clock3 aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>불러오는 중</h2>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-dashboard__state">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>로그인이 필요합니다</h2>
            <Link className="bubli-button bubli-button--primary" href="/login">
              로그인
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-dashboard__state">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{state.message}</h2>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "empty" ? (
        <GlassPanel className="workspace-dashboard__state">
          <CheckCircle2 aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>오늘 바로 처리할 일이 없습니다</h2>
          </div>
        </GlassPanel>
      ) : null}

      <div className="workspace-dashboard__grid">
        <GlassPanel className="workspace-dashboard__card workspace-dashboard__card--main">
          <div className="workspace-dashboard__card-head">
            <LayoutDashboard aria-hidden size={18} strokeWidth={2} />
            <div>
              <h2>오늘 할 일</h2>
            </div>
            <StatusBadge tone="todo">{todayTasks.length ? `${todayTasks.length}건` : "대기"}</StatusBadge>
          </div>
          <ul className="workspace-dashboard__list">
            {todayTasks.length ? (
              todayTasks.map((task) => <TaskLine key={task.id} task={task} />)
            ) : (
              <StatusLine meta="대기">항목 없음</StatusLine>
            )}
          </ul>
        </GlassPanel>

        <GlassPanel className="workspace-dashboard__card">
          <div className="workspace-dashboard__card-head">
            <CalendarDays aria-hidden size={18} strokeWidth={2} />
            <div>
              <h2>가까운 마감</h2>
            </div>
            <StatusBadge tone="warning">{upcomingDeadlines.length ? `${upcomingDeadlines.length}건` : "대기"}</StatusBadge>
          </div>
          <ul className="workspace-dashboard__list">
            {upcomingDeadlines.length ? (
              upcomingDeadlines.map((task) => <TaskLine key={task.id} task={task} />)
            ) : (
              <StatusLine meta="7일">항목 없음</StatusLine>
            )}
          </ul>
        </GlassPanel>

        <GlassPanel className="workspace-dashboard__card">
          <div className="workspace-dashboard__card-head">
            <Clock3 aria-hidden size={18} strokeWidth={2} />
            <div>
              <h2>오늘 일정</h2>
            </div>
            <StatusBadge tone="timer">{todaySchedules.length ? `${todaySchedules.length}건` : "대기"}</StatusBadge>
          </div>
          <ul className="workspace-dashboard__list">
            {todaySchedules.length ? (
              todaySchedules.map((schedule) => <ScheduleLine key={schedule.id} schedule={schedule} />)
            ) : (
              <StatusLine meta="일정">항목 없음</StatusLine>
            )}
          </ul>
        </GlassPanel>
      </div>
    </section>
  );
}
