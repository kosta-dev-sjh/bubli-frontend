import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentSchemaValidationPanel } from "./agent-schema-validation-panel";

const meta = {
  component: AgentSchemaValidationPanel,
  parameters: {
    docs: {
      description: {
        component:
          "에이전트가 만든 결과를 정해진 형식 기준으로 확인하고, 질문 방식과 정리 작업 상태를 함께 추적하는 패널입니다.",
      },
    },
  },
  title: "Features/Agent/AgentSchemaValidationPanel",
} satisfies Meta<typeof AgentSchemaValidationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PassedValidation: Story = {
  args: {
    metrics: [
      {
        description: "에이전트 결과를 확인하는 기준입니다.",
        icon: "schema",
        label: "결과 형식",
        value: "자료 분석 기준",
      },
      {
        description: "질문 방식 변경 전후 결과 비교 기준입니다.",
        icon: "prompt",
        label: "질문 방식",
        value: "계약 검토 기준",
      },
      {
        description: "정리 방식이 바뀌면 결과를 비교할 수 있게 남깁니다.",
        icon: "model",
        label: "정리 방식",
        value: "가벼운 문서 정리",
      },
      {
        description: "정리 작업과 결과를 연결합니다.",
        icon: "job",
        label: "정리 작업",
        value: "후보 생성 완료",
      },
    ],
    validationResults: [
      {
        description: "요약 결과가 현재 구조와 맞습니다.",
        field: "요약 결과",
        status: "passed",
        value: "제목, 요약, 원문 근거",
      },
      {
        description: "확인 질문 후보가 승인 전 상태로 저장됩니다.",
        field: "확인 질문 후보",
        status: "passed",
        value: "승인 전",
      },
      {
        description: "사용자 승인 전 확정 테이블에 반영하지 않습니다.",
        field: "확정 반영",
        status: "passed",
        value: "승인 전 차단",
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
        label: "결과 형식",
        value: "요구사항 후보 기준",
      },
      {
        description: "질문 방식 버전이 결과에 남아야 합니다.",
        icon: "prompt",
        label: "질문 방식",
        value: "요구사항 정리 기준",
      },
      {
        description: "처리 기록과 결과에 남은 정리 방식이 같아야 합니다.",
        icon: "model",
        label: "정리 방식",
        value: "요구사항 정리",
      },
      {
        description: "실패 내용은 처리 흐름에 남깁니다.",
        icon: "job",
        label: "처리 흐름",
        value: "실패",
      },
    ],
    validationResults: [
      {
        description: "필수 근거 문장이 비어 있어 사용자에게 바로 확정할 수 없습니다.",
        field: "요구사항 원문 근거",
        status: "failed",
        value: "비어 있음",
      },
      {
        description: "마감일 후보가 원문 근거와 함께 들어왔는지 확인해야 합니다.",
        field: "마감일 후보",
        status: "needsReview",
        value: "근거 확인 필요",
      },
      {
        description: "다시 시도 전 정리 작업 상태가 바뀌는지 기다립니다.",
        field: "정리 작업 상태",
        status: "pending",
        value: "진행 중",
      },
    ],
  },
};
