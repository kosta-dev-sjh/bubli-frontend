import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentJobEventTimelinePanel } from "./agent-job-event-timeline-panel";

const meta = {
  component: AgentJobEventTimelinePanel,
  parameters: {
    docs: {
      description: {
        component:
          "agent_jobs와 agent_job_events를 기준으로 에이전트 작업 상태 전이, 실패 사유, 재시도 이력을 보여주는 패널입니다.",
      },
    },
  },
  title: "Agent/AgentJobEventTimelinePanel",
} satisfies Meta<typeof AgentJobEventTimelinePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RunningAnalysis: Story = {
  args: {
    events: [
      {
        eventType: "created",
        message: "API 서버가 권한을 확인하고 자료 분석 작업을 만들었습니다.",
        timeLabel: "10:12",
      },
      {
        eventType: "started",
        message: "에이전트 모듈이 문서 본문과 분류값을 읽어 분석을 시작했습니다.",
        timeLabel: "10:13",
      },
    ],
    jobId: "job_82a1",
    jobType: "ANALYZE_RESOURCE",
    retryCount: 0,
    status: "running",
    targetLabel: "웹사이트 구축 계약서_v2.pdf",
  },
};

export const FailedWithRetry: Story = {
  args: {
    errorMessage: "요구사항 문서 일부 페이지에서 텍스트 추출 결과가 비어 있습니다.",
    events: [
      {
        eventType: "created",
        message: "요구사항 후보 생성 작업이 생성됐습니다.",
        timeLabel: "13:02",
      },
      {
        eventType: "started",
        message: "에이전트 모듈이 요구사항 후보 생성을 시작했습니다.",
        timeLabel: "13:03",
      },
      {
        eventType: "failed",
        message: "필수 입력으로 필요한 본문 일부가 비어 있어 실패했습니다.",
        timeLabel: "13:04",
      },
      {
        eventType: "retried",
        message: "사용자가 다시 시도했고, 같은 job 계열에 재시도 횟수를 남겼습니다.",
        timeLabel: "13:06",
      },
    ],
    jobId: "job_f31c",
    jobType: "GENERATE_REQUIREMENTS",
    retryCount: 1,
    status: "failed",
    targetLabel: "요구사항 정리서_v1.3.docx",
  },
};

export const CompletedSuggestionJob: Story = {
  args: {
    events: [
      {
        eventType: "created",
        message: "WBS 후보 생성 요청을 접수했습니다.",
        timeLabel: "15:20",
      },
      {
        eventType: "started",
        message: "에이전트 모듈이 계약 문서와 회의록을 읽어 후보 구조를 만들었습니다.",
        timeLabel: "15:21",
      },
      {
        eventType: "succeeded",
        message: "결과를 DRAFT 후보로 저장했습니다. 확정 반영은 사용자 승인 후 진행됩니다.",
        timeLabel: "15:23",
      },
    ],
    jobId: "job_7dd0",
    jobType: "GENERATE_WBS",
    retryCount: 0,
    status: "succeeded",
    targetLabel: "신축 사옥 이전 프로젝트",
    title: "완료된 에이전트 작업",
  },
};
