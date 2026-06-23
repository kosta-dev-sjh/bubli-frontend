import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentJobStatusPanel } from "./agent-job-status-panel";

const meta = {
  component: AgentJobStatusPanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 분석, WBS 후보, TODO 후보처럼 시간이 걸리는 에이전트 작업의 상태를 보여주는 패널입니다. agent_jobs 기반 비동기 처리와 후보 승인 전 확정 금지 원칙을 화면에 반영합니다.",
      },
    },
  },
  title: "Features/Agent/AgentJobStatusPanel",
} satisfies Meta<typeof AgentJobStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: {
    jobId: "agent_jobs:8f42",
    jobTypeLabel: "자료 분석 · WBS/TODO 후보",
    modelLabel: "gpt-4.1-mini · prompt v3",
    progress: 62,
    schemaLabel: "schema v1.0",
    startedAtLabel: "시작 1분 전",
    status: "RUNNING",
  },
};

export const FailedRetry: Story = {
  args: {
    eventLabel: "실패 내용은 알림으로 남기고 같은 요청을 다시 시도할 수 있습니다.",
    jobId: "agent_jobs:91ac",
    jobTypeLabel: "확인 질문 후보",
    modelLabel: "model timeout · retry 1회 남음",
    progress: 38,
    schemaLabel: "schema v1.0",
    startedAtLabel: "시작 4분 전",
    status: "FAILED",
    steps: [
      {
        description: "API 서버가 요청자 권한과 자료 접근 범위를 확인했습니다.",
        id: "created",
        label: "agent_jobs 생성",
        status: "SUCCEEDED",
      },
      {
        description: "모델 응답 시간이 길어져 실패 이벤트를 남겼습니다.",
        id: "failed",
        label: "모델 호출",
        status: "FAILED",
      },
      {
        description: "재시도하면 기존 job 기록과 모델 호출 로그를 함께 남깁니다.",
        id: "retry",
        label: "재시도 대기",
        status: "PENDING",
      },
    ],
    suggestionGroups: [
      {
        count: 0,
        id: "questions",
        label: "확인 질문",
        status: "DRAFT",
      },
    ],
  },
};
