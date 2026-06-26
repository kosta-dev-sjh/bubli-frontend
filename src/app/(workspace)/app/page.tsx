"use client";

import { PageHeading } from "@/components/ui/page-heading";
import {
  AgentDraftSuggestionPanel,
  AgentJobEventTimelinePanel,
  AgentJobRetryPolicyPanel,
  AgentJobStatusPanel,
  AgentModelCallLogPanel,
  AgentSchemaValidationPanel,
  AgentUsageGuardPanel,
  CandidateApprovalPanel,
  ClarificationQuestionComposePanel,
  ClarificationQuestionDraftPanel,
  ContractReviewPanel,
  DailySummaryEvidencePanel,
  defaultAgentRetryJobs,
  defaultBoundaryItems,
  defaultComposeRules,
  defaultPersonalAgentMemoryItems,
  defaultPersonalAgentMemoryRules,
  defaultQuestionDrafts,
  defaultRetryPolicies,
  defaultReviewItems,
  defaultSummaryInputs,
  LocalAgentMemoryPanel,
  PersonalAgentMemoryPanel,
  PersonalAgentSummaryBoundaryPanel,
  RequirementCandidateReviewPanel,
  RoomMemorySummaryPanel,
} from "@/features/agent/components";
import {
  DailySummaryPanel,
  DashboardCardLibraryPanel,
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

const agentJobEvents = [
  {
    eventType: "created" as const,
    message: "계약서와 요구사항 문서를 기준으로 분석 작업을 만들었습니다.",
    timeLabel: "10:12",
  },
  {
    eventType: "started" as const,
    message: "문서 종류와 추출 대상 필드를 확인하고 있습니다.",
    timeLabel: "10:13",
  },
  {
    eventType: "succeeded" as const,
    message: "확인 질문, WBS, TODO 후보가 생성됐습니다.",
    timeLabel: "10:15",
  },
];

const schemaMetrics = [
  {
    description: "문서 추출 후보와 TODO 후보가 같은 형식으로 정리됩니다.",
    icon: "schema" as const,
    label: "후보 형식",
    value: "자료 분석 기준",
  },
  {
    description: "질문 방식이 바뀌면 정리 결과도 함께 비교합니다.",
    icon: "prompt" as const,
    label: "질문 방식",
    value: "계약 검토 기준",
  },
  {
    description: "에이전트 정리 작업은 승인 전 상태로 먼저 확인합니다.",
    icon: "job" as const,
    label: "정리 상태",
    value: "후보 생성 완료",
  },
];

const schemaResults = [
  {
    description: "후보 종류가 요구사항, TODO, WBS, 확인 질문 중 하나로 들어왔습니다.",
    field: "후보 종류",
    status: "passed" as const,
    value: "TODO 후보",
  },
  {
    description: "확정 테이블에 바로 쓰지 않고 후보 ID만 내려옵니다.",
    field: "확정 반영",
    status: "passed" as const,
    value: "승인 전 대기",
  },
  {
    description: "사용자가 확인해야 하는 문서 근거가 함께 포함됐습니다.",
    field: "evidence",
    status: "needsReview" as const,
    value: "계약서 4p, 회의록 0618",
  },
];

const usageGuards = [
  {
    description: "같은 자료 해시가 있으면 새 정리 작업 전에 캐시를 확인합니다.",
    label: "분석 캐시",
    status: "ready" as const,
    value: "사용 가능",
  },
  {
    description: "후보 생성은 하루 제한 안에서만 실행합니다.",
    label: "일일 호출 제한",
    status: "watch" as const,
    value: "18/25",
  },
  {
    description: "확정 데이터 변경은 사용자 승인 뒤 API가 처리합니다.",
    label: "확정 쓰기 제한",
    status: "ready" as const,
    value: "직접 쓰기 없음",
  },
];

const modelCalls = [
  {
    latencyLabel: "2.1s",
    modelName: "문서 정리",
    promptVersion: "계약 검토 기준",
    schemaVersion: "후보 형식 확인",
    usageLabel: "보통",
  },
  {
    latencyLabel: "1.4s",
    modelName: "하루 정리",
    promptVersion: "작업 요약 기준",
    schemaVersion: "하루정리 형식",
    usageLabel: "가벼움",
  },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        title="대시보드"
        description="여러 프로젝트룸에서 내가 맡은 TODO, 일정, 확인 필요 항목을 모아 보는 사용자 기준 화면입니다."
      />
      <div className="page-grid">
        <DashboardOverviewPanel />
        <DashboardCardLibraryPanel cards={defaultDashboardCards} rules={defaultDashboardRules} />
        <TodoListPanel />
        <TodoAssigneeReflectionPanel surfaces={defaultTodoSurfaces} todos={defaultAssignedTodos} />
        <TimerControlPanel />
        <MemoListPanel />
        <MemoDraftPanel />
        <DailySummaryPanel />
        <AgentJobStatusPanel />
        <AgentJobEventTimelinePanel
          events={agentJobEvents}
          jobId="job_20260626_001"
          jobType="계약 문서 분석"
          retryCount={0}
          status="succeeded"
          targetLabel="K-Stay 번역 프로젝트룸"
        />
        <AgentJobRetryPolicyPanel jobs={defaultAgentRetryJobs} policies={defaultRetryPolicies} />
        <AgentSchemaValidationPanel metrics={schemaMetrics} validationResults={schemaResults} />
        <AgentUsageGuardPanel
          cacheHitLabel="캐시 확인 후 실행"
          dailyLimit={25}
          guards={usageGuards}
          modelCalls={modelCalls}
          usedToday={18}
        />
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
        <AgentModelCallLogPanel />
        <RoomMemorySummaryPanel />
        <LocalAgentMemoryPanel />
        <PersonalAgentMemoryPanel
          dailySummaryTitle="오늘 작업 정리"
          memoryItems={defaultPersonalAgentMemoryItems}
          messageLimit={100}
          rules={defaultPersonalAgentMemoryRules}
          usedMessageCount={72}
        />
        <PersonalAgentSummaryBoundaryPanel
          items={defaultBoundaryItems}
          summaryInputs={defaultSummaryInputs}
        />
        <DailySummaryEvidencePanel />
      </div>
    </>
  );
}
