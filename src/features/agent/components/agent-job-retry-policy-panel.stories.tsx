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
          "에이전트 정리 작업의 실패, 다시 시도, 결과 형식 확인 기준을 바탕으로 다시 시도 가능 여부를 보여주는 패널입니다.",
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
    title: "에이전트 정리 작업 정상 상태",
  },
};

export const RetryLimitReached: Story = {
  args: {
    jobs: defaultAgentRetryJobs.map((job) =>
      job.status === "FAILED"
        ? {
            ...job,
            failureReason: "같은 문서에서 3회 연속 결과 형식 확인에 실패했습니다.",
            retryCount: 3,
            retryDecision: "BLOCKED",
          }
        : job,
    ),
    maxRetryCount: 3,
    policies: defaultRetryPolicies,
    title: "다시 시도 제한 상태",
  },
};
