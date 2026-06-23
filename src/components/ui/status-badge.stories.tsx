import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatusBadge } from "@/components/ui/status-badge";

const meta = {
  component: StatusBadge,
  parameters: {
    docs: {
      description: {
        component: "기획서의 후보, 확인 필요 항목, 승인 상태를 화면에서 일관되게 표시하는 배지입니다.",
      },
    },
  },
  title: "UI/StatusBadge",
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlanningStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 640 }}>
      <StatusBadge tone="room">프로젝트룸 자료</StatusBadge>
      <StatusBadge tone="personal">개인 자료</StatusBadge>
      <StatusBadge tone="warning">확인 필요</StatusBadge>
      <StatusBadge tone="pending">후보</StatusBadge>
      <StatusBadge tone="approved">승인됨</StatusBadge>
      <StatusBadge tone="agent">프로젝트룸 에이전트</StatusBadge>
      <StatusBadge tone="communication">소통</StatusBadge>
      <StatusBadge tone="timer">타이머</StatusBadge>
    </div>
  ),
};
