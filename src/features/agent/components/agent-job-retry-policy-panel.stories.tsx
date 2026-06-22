import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  AgentJobRetryPolicyPanel,
  defaultAgentRetryJobs,
  defaultRetryPolicies,
} from "./agent-job-retry-policy-panel";

const meta = {
  component: AgentJobRetryPolicyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 agent_jobs 기반 비동기 처리, 실패/재시도, JSON schema 검증 정책을 바탕으로 에이전트 작업의 재시도 가능 여부를 보여주는 패널입니다.",
      },
    },
  },
  title: "Agent/AgentJobRetryPolicyPanel",
} satisfies Meta<typeof AgentJobRetryPolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    jobs: defaultAgentRetryJobs,
    policies: defaultRetryPolicies,
  },
};

export const AllHealthy: Story = {
  args: {
    jobs: defaultAgentRetryJobs.map((job) => ({
      ...job,
      failureReason: undefined,
      retryDecision: "BLOCKED",
      status: "SUCCEEDED",
    })),
    policies: defaultRetryPolicies,
    title: "에이전트 작업 정상 상태",
  },
};

export const RetryLimitReached: Story = {
  args: {
    jobs: defaultAgentRetryJobs.map((job) =>
      job.status === "FAILED"
        ? {
            ...job,
            failureReason: "같은 문서에서 3회 연속 구조 검증에 실패했습니다.",
            retryCount: 3,
            retryDecision: "BLOCKED",
          }
        : job,
    ),
    maxRetryCount: 3,
    policies: defaultRetryPolicies,
    title: "재시도 제한 상태",
  },
};
