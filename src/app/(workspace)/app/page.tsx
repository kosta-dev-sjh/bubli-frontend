"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { DailySummaryPanel, DashboardOverviewPanel } from "@/features/dashboard/components";
import { MemoListPanel } from "@/features/memo/components";
import { TimerControlPanel } from "@/features/timer/components";
import { TodoListPanel } from "@/features/todo/components";

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        title="대시보드"
        description="여러 프로젝트룸에서 내가 맡은 TODO, 일정, 확인 필요 항목을 모아 보는 사용자 기준 화면입니다."
      />
      <div className="page-grid">
        <DashboardOverviewPanel />
        <TodoListPanel />
        <TimerControlPanel />
        <MemoListPanel />
        <DailySummaryPanel />
      </div>
    </>
  );
}
