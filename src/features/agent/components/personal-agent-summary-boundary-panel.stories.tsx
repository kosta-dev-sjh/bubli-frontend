import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultBoundaryItems,
  defaultSummaryInputs,
  PersonalAgentSummaryBoundaryPanel,
} from "./personal-agent-summary-boundary-panel";

const meta = {
  component: PersonalAgentSummaryBoundaryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 개인 에이전트 SQLite 전략과 하루정리 저장 정책을 바탕으로, 로컬 원문과 사용자 승인 서버 요약의 경계를 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Agent/PersonalAgentSummaryBoundaryPanel",
} satisfies Meta<typeof PersonalAgentSummaryBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: defaultBoundaryItems,
    summaryInputs: defaultSummaryInputs,
  },
};

export const BeforeApproval: Story = {
  args: {
    items: defaultBoundaryItems.map((item) =>
      item.side === "SERVER_APPROVED" ? { ...item, status: "READY" } : item,
    ),
    summaryInputs: defaultSummaryInputs,
    title: "하루정리 확인 전",
  },
};

export const SmallLocalMemory: Story = {
  args: {
    items: defaultBoundaryItems.slice(0, 2),
    localMessageLimit: 40,
    summaryInputs: defaultSummaryInputs.slice(0, 3),
    title: "로컬 대화 적게 남기기",
  },
};
