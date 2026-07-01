import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ResourceAnalysisApprovalPanel,
  defaultAnalysisSteps,
  defaultAnalysisSuggestions,
} from "./resource-analysis-approval-panel";

const meta = {
  component: ResourceAnalysisApprovalPanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 상세에서 에이전트가 만든 후보를 사용자가 승인, 수정, 보류한 뒤 WBS/TODO/일정으로 반영하는 검토 패널입니다.",
      },
    },
  },
  title: "Features/Resources/ResourceAnalysisApprovalPanel",
} satisfies Meta<typeof ResourceAnalysisApprovalPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Succeeded: Story = {
  args: {
    confidence: 86,
    jobStatus: "SUCCEEDED",
    projectRoomName: "프로젝트룸",
    resourceName: "번역 계약서_v2.pdf",
    steps: defaultAnalysisSteps,
    suggestions: defaultAnalysisSuggestions,
  },
};

export const Running: Story = {
  args: {
    confidence: 42,
    jobStatus: "RUNNING",
    projectRoomName: "웹사이트 개편 프로젝트룸",
    resourceName: "요구사항 정리.docx",
    steps: defaultAnalysisSteps,
    suggestions: defaultAnalysisSuggestions.map((suggestion) => ({
      ...suggestion,
      reviewState: "PENDING",
    })),
    title: "자료 분석 진행 중",
  },
};

export const Failed: Story = {
  args: {
    confidence: 12,
    jobStatus: "FAILED",
    projectRoomName: "신규 제품 소개 프로젝트룸",
    resourceName: "회의록_스캔본.pdf",
    steps: defaultAnalysisSteps,
    suggestions: defaultAnalysisSuggestions.slice(0, 2).map((suggestion) => ({
      ...suggestion,
      reviewState: "HELD",
    })),
    title: "분석 결과 확인",
  },
};
