import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentJobStatusPanel } from "./agent-job-status-panel";

const meta = {
  component: AgentJobStatusPanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 분석, WBS 후보, TODO 후보처럼 시간이 걸리는 에이전트 정리 작업의 상태를 보여주는 패널입니다. 후보 승인 전에는 확정 업무로 반영하지 않는 원칙을 화면에 반영합니다.",
      },
    },
  },
  title: "Features/Agent/AgentJobStatusPanel",
} satisfies Meta<typeof AgentJobStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: {
    jobId: "정리 작업 8f42",
    jobTypeLabel: "자료 분석 · WBS/TODO 후보",
    modelLabel: "질문 중심으로 정리 중",
    progress: 62,
    schemaLabel: "후보 형식 확인",
    startedAtLabel: "시작 1분 전",
    status: "RUNNING",
  },
};

export const FailedRetry: Story = {
  args: {
    eventLabel: "실패 내용은 알림으로 남기고 같은 요청을 다시 시도할 수 있습니다.",
    jobId: "정리 작업 91ac",
    jobTypeLabel: "확인 질문 후보",
    modelLabel: "응답 지연 · 다시 시도 1회 남음",
    progress: 38,
    schemaLabel: "후보 형식 확인",
    startedAtLabel: "시작 4분 전",
    status: "FAILED",
    steps: [
      {
        description: "요청한 사용자가 이 자료를 볼 수 있는지 확인했습니다.",
        id: "created",
        label: "정리 작업 시작",
        status: "SUCCEEDED",
      },
      {
        description: "정리 응답 시간이 길어져 실패 이벤트를 남겼습니다.",
        id: "failed",
        label: "정리 응답",
        status: "FAILED",
      },
      {
        description: "다시 시도하면 기존 정리 작업과 처리 기록을 함께 남깁니다.",
        id: "retry",
        label: "다시 시도 대기",
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
