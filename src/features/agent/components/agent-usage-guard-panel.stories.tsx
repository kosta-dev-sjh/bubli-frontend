import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentUsageGuardPanel } from "@/features/agent/components/agent-usage-guard-panel";

const meta = {
  component: AgentUsageGuardPanel,
  parameters: {
    docs: {
      description: {
        component:
          "에이전트 모델 호출 제한, 같은 파일 해시 캐시, 모델 호출 로그 저장 상태를 확인합니다. 에이전트 결과는 후보로만 남고, 사용자가 승인해야 확정 데이터에 반영됩니다.",
      },
    },
  },
  title: "Features/Agent/AgentUsageGuardPanel",
} satisfies Meta<typeof AgentUsageGuardPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NormalUsage: Story = {
  args: {
    cacheHitLabel: "캐시 6건 사용",
    dailyLimit: 40,
    guards: [
      {
        description: "사용자별 하루 제한 안에서만 새 분석 작업을 만듭니다.",
        label: "호출 제한",
        status: "ready",
        value: "22 / 40",
      },
      {
        description: "같은 파일 해시가 있으면 기존 분석 결과를 먼저 확인합니다.",
        label: "분석 캐시",
        status: "ready",
        value: "적용 중",
      },
      {
        description: "프롬프트, 스키마, 모델명, 토큰 수, 응답 시간을 기록합니다.",
        label: "호출 기록",
        status: "ready",
        value: "최근 12건",
      },
    ],
    modelCalls: [
      {
        latencyLabel: "1.8초",
        modelName: "Claude Haiku 4.5",
        promptVersion: "contract-v3",
        schemaVersion: "resource-analysis-v2",
        usageLabel: "분량 보통",
      },
      {
        latencyLabel: "0.7초",
        modelName: "Amazon Titan Text Embeddings V2",
        promptVersion: "embedding-v1",
        schemaVersion: "resource-vector-v1",
        usageLabel: "분량 가벼움",
      },
    ],
    usedToday: 22,
  },
};

export const NearDailyLimit: Story = {
  args: {
    cacheHitLabel: "캐시 18건 사용",
    dailyLimit: 40,
    guards: [
      {
        description: "남은 호출이 적습니다. 새 분석보다 기존 결과 확인을 우선합니다.",
        label: "호출 제한",
        status: "watch",
        value: "37 / 40",
      },
      {
        description: "같은 파일 해시가 반복으로 들어와 새 작업 생성을 막았습니다.",
        label: "분석 캐시",
        status: "ready",
        value: "18건 절약",
      },
      {
        description: "최근 작업 1건이 스키마 확인에 실패해 재시도 대기 상태입니다.",
        label: "실패 기록",
        status: "blocked",
        value: "1건",
      },
    ],
    modelCalls: [
      {
        errorCode: "SCHEMA_MISMATCH",
        latencyLabel: "2.4초",
        modelName: "Claude Haiku 4.5",
        promptVersion: "wbs-v2",
        schemaVersion: "wbs-candidate-v3",
        usageLabel: "분량 많음",
      },
      {
        latencyLabel: "1.2초",
        modelName: "Claude Haiku 4.5",
        promptVersion: "question-v1",
        schemaVersion: "clarification-v1",
        usageLabel: "분량 보통",
      },
    ],
    usedToday: 37,
  },
};
