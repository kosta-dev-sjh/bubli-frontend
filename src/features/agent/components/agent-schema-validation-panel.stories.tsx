import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentSchemaValidationPanel } from "./agent-schema-validation-panel";

const meta = {
  component: AgentSchemaValidationPanel,
  parameters: {
    docs: {
      description: {
        component:
          "에이전트가 만든 Structured Output 결과를 schema_version 기준으로 검증하고, prompt_version, model_name, job_id를 함께 추적하는 패널입니다.",
      },
    },
  },
  title: "Agent/AgentSchemaValidationPanel",
} satisfies Meta<typeof AgentSchemaValidationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PassedValidation: Story = {
  args: {
    metrics: [
      {
        description: "결과 JSON 검증 기준입니다.",
        icon: "schema",
        label: "schema_version",
        value: "resource-analysis.v2",
      },
      {
        description: "프롬프트 변경 전후 결과 비교 기준입니다.",
        icon: "prompt",
        label: "prompt_version",
        value: "contract-review.2026-06",
      },
      {
        description: "분석에 사용한 모델명을 남깁니다.",
        icon: "model",
        label: "model_name",
        value: "Claude Haiku 4.5",
      },
      {
        description: "agent job과 결과를 연결합니다.",
        icon: "job",
        label: "job_id",
        value: "job_8f2c",
      },
    ],
    validationResults: [
      {
        description: "summary_json이 현재 구조와 맞습니다.",
        field: "summary_json",
        status: "passed",
        value: "title, summary, source_range",
      },
      {
        description: "확인 질문 후보가 DRAFT 상태로 저장됩니다.",
        field: "agent_suggestions.status",
        status: "passed",
        value: "DRAFT",
      },
      {
        description: "사용자 승인 전 확정 테이블에 반영하지 않습니다.",
        field: "confirmed_write",
        status: "passed",
        value: "blocked before approval",
      },
    ],
  },
};

export const SchemaNeedsReview: Story = {
  args: {
    metrics: [
      {
        description: "요구사항 후보 생성 결과를 검증합니다.",
        icon: "schema",
        label: "schema_version",
        value: "requirement-candidate.v1",
      },
      {
        description: "프롬프트 버전이 결과에 남아야 합니다.",
        icon: "prompt",
        label: "prompt_version",
        value: "requirements.2026-06",
      },
      {
        description: "호출 로그의 모델명과 결과의 모델명이 같아야 합니다.",
        icon: "model",
        label: "model_name",
        value: "Claude Haiku 4.5",
      },
      {
        description: "실패 이벤트는 agent_job_events에 남깁니다.",
        icon: "job",
        label: "event_type",
        value: "FAILED",
      },
    ],
    validationResults: [
      {
        description: "필수 필드인 source_text가 비어 있어 사용자에게 바로 확정할 수 없습니다.",
        field: "requirement_candidates.source_text",
        status: "failed",
        value: "missing",
      },
      {
        description: "마감일 후보가 원문 근거와 함께 들어왔는지 확인해야 합니다.",
        field: "due_date_candidate",
        status: "needsReview",
        value: "source needed",
      },
      {
        description: "재시도 전 job 상태 전이를 기다립니다.",
        field: "agent_jobs.status",
        status: "pending",
        value: "RUNNING",
      },
    ],
  },
};
