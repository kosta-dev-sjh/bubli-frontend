import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  PersonalAgentMemoryPanel,
  defaultPersonalAgentMemoryItems,
  defaultPersonalAgentMemoryRules,
} from "./personal-agent-memory-panel";

const meta = {
  component: PersonalAgentMemoryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "개인 에이전트 원문 대화는 Tauri SQLite에 두고, 사용자가 승인한 하루정리 요약만 서버에 남기는 기억 정책 패널입니다.",
      },
    },
  },
  title: "Agent/PersonalAgentMemoryPanel",
} satisfies Meta<typeof PersonalAgentMemoryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    dailySummaryTitle: "오늘 작업 정리",
    memoryItems: defaultPersonalAgentMemoryItems,
    messageLimit: 100,
    rules: defaultPersonalAgentMemoryRules,
    usedMessageCount: 64,
  },
};

export const NearLimit: Story = {
  args: {
    dailySummaryTitle: "회의 후 개인 정리",
    memoryItems: defaultPersonalAgentMemoryItems.map((item) => ({
      ...item,
      status: item.label === "local_agent_messages" ? "ROLLUP_READY" : item.status,
    })),
    messageLimit: 100,
    rules: defaultPersonalAgentMemoryRules,
    title: "단기기억 정리 필요",
    usedMessageCount: 92,
  },
};

export const ApprovedSummaryOnly: Story = {
  args: {
    dailySummaryTitle: "승인된 하루정리",
    memoryItems: defaultPersonalAgentMemoryItems.filter((item) => item.location !== "LOCAL_ONLY"),
    messageLimit: 100,
    rules: defaultPersonalAgentMemoryRules,
    title: "승인 요약 조회",
    usedMessageCount: 28,
  },
};
