"use client";

import { DashboardView } from "@/components/dashboard";
import { PageHeading } from "@/components/ui/page-heading";
import {
  AgentDraftSuggestionPanel,
  AgentJobStatusPanel,
  CandidateApprovalPanel,
  ClarificationQuestionComposePanel,
  ClarificationQuestionDraftPanel,
  ContractReviewPanel,
  defaultComposeRules,
  defaultQuestionDrafts,
  defaultReviewItems,
  RequirementCandidateReviewPanel,
  RoomMemorySummaryPanel,
} from "@/features/agent/components";
import {
  DailySummaryPanel,
  DashboardCardLibraryPanel,
  DashboardFiveCardPanel,
  DashboardOverviewPanel,
  defaultDashboardCards,
  defaultDashboardRules,
} from "@/features/dashboard/components";
import { MemoDraftPanel, MemoListPanel } from "@/features/memo/components";
import { TimerControlPanel } from "@/features/timer/components";
import {
  defaultAssignedTodos,
  defaultTodoSurfaces,
  TodoAssigneeReflectionPanel,
  TodoListPanel,
} from "@/features/todo/components";

// 새 UI Kit 대시보드 전환 플래그. 기본은 false라 기존 화면이 그대로 뜬다.
// 켜려면 .env에 NEXT_PUBLIC_BUBLI_NEW_DASHBOARD=true. 문제 시 끄면 기존 화면으로 즉시 복귀.
const USE_NEW_DASHBOARD = process.env.NEXT_PUBLIC_BUBLI_NEW_DASHBOARD === "true";

export default function DashboardPage() {
  if (USE_NEW_DASHBOARD) {
    return <DashboardView />;
  }
  return <LegacyDashboard />;
}

// 기존 대시보드 화면. 삭제하지 않고 플래그 off일 때 그대로 사용한다.
function LegacyDashboard() {
  return (
    <>
      <PageHeading
        title="대시보드"
        description="여러 프로젝트룸에서 내가 맡은 TODO, 일정, 확인 필요 항목을 모아 보는 사용자 기준 화면입니다."
      />
      <div className="page-grid">
        <DashboardOverviewPanel />
        <DashboardFiveCardPanel />
        <DashboardCardLibraryPanel cards={defaultDashboardCards} rules={defaultDashboardRules} />
        <TodoListPanel />
        <TodoAssigneeReflectionPanel surfaces={defaultTodoSurfaces} todos={defaultAssignedTodos} />
        <TimerControlPanel />
        <MemoListPanel />
        <MemoDraftPanel />
        <DailySummaryPanel />
        <AgentJobStatusPanel />
        <CandidateApprovalPanel />
        <RequirementCandidateReviewPanel />
        <ClarificationQuestionDraftPanel />
        <ClarificationQuestionComposePanel
          drafts={defaultQuestionDrafts}
          reviewItems={defaultReviewItems}
          rules={defaultComposeRules}
        />
        <ContractReviewPanel />
        <AgentDraftSuggestionPanel />
        <RoomMemorySummaryPanel />
      </div>
    </>
  );
}
