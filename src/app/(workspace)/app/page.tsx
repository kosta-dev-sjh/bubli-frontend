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
    description: "문서 추출 후보와 TODO 후보가 같은 스키마 버전으로 내려옵니다.",
    icon: "schema" as const,
    label: "schema_version",
    value: "agent-suggestion.v3",
  },
  {
    description: "프롬프트 버전을 남겨 결과가 달라진 이유를 추적합니다.",
    icon: "prompt" as const,
    label: "prompt_version",
    value: "contract-review.2026-06",
  },
  {
    description: "에이전트 작업은 agent_jobs 상태로 먼저 확인합니다.",
    icon: "job" as const,
    label: "agent_jobs",
    value: "SUCCEEDED",
  },
];

const schemaResults = [
  {
    description: "후보 종류가 요구사항, TODO, WBS, 확인 질문 중 하나로 들어왔습니다.",
    field: "suggestionType",
    status: "passed" as const,
    value: "TASK_CANDIDATE",
  },
  {
    description: "확정 테이블에 바로 쓰지 않고 후보 ID만 내려옵니다.",
    field: "targetWrite",
    status: "passed" as const,
    value: "agent_suggestions",
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
    description: "같은 자료 해시가 있으면 새 모델 호출 전에 캐시를 확인합니다.",
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
    modelName: "document-agent",
    promptVersion: "contract-review.2026-06",
    schemaVersion: "agent-suggestion.v3",
    tokenLabel: "4.2k tokens",
  },
  {
    latencyLabel: "1.4s",
    modelName: "summary-agent",
    promptVersion: "daily-summary.2026-06",
    schemaVersion: "daily-summary.v2",
    tokenLabel: "2.8k tokens",
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
