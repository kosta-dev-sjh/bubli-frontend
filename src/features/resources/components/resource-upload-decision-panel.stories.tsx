import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceUploadDecisionPanel } from "./resource-upload-decision-panel";

const meta = {
  component: ResourceUploadDecisionPanel,
  parameters: {
    docs: {
      description: {
        component:
          "파일을 올릴 때 개인 자료보드 저장, 프로젝트룸 자료 등록, 이번 대화에서만 분석 중 하나를 고르는 패널입니다. 개인 자료와 프로젝트룸 자료를 섞지 않고, 사용자가 선택한 범위 안에서만 에이전트 분석을 시작하는 기획 기준을 반영합니다.",
      },
    },
  },
  title: "Features/Resources/ResourceUploadDecisionPanel",
} satisfies Meta<typeof ResourceUploadDecisionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PersonalResource: Story = {
  args: {
    currentDecision: "PERSONAL_LIBRARY",
    fileKindLabel: "PDF",
    fileName: "작업범위_v2.pdf",
    fileSizeLabel: "2.4MB",
    quotaLabel: "개인 자료함 820MB / 1GB",
    quotaPercent: 82,
    roomLabel: "토모에 번역 프로젝트룸",
  },
};

export const TemporaryAnalysis: Story = {
  args: {
    currentDecision: "TEMP_ANALYSIS",
    fileKindLabel: "Markdown",
    fileName: "회의_메모_초안.md",
    fileSizeLabel: "48KB",
    quotaLabel: "개인 자료함 210MB / 1GB",
    quotaPercent: 21,
    roomLabel: "저장 전 대화",
  },
};
