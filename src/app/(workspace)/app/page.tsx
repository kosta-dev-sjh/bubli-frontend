"use client";

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

export default function DashboardPage() {
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
