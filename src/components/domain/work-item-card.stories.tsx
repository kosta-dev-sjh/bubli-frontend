import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WorkItemCard } from "@/components/domain/work-item-card";

const meta = {
  component: WorkItemCard,
  parameters: {
    docs: {
      description: {
        component:
          "WBS 후보를 승인하면 하나의 TODO가 되고, 작업판, 대시보드, 버블, 캘린더에서 같은 작업을 봅니다.",
      },
    },
  },
  title: "Domain/WorkItemCard",
} satisfies Meta<typeof WorkItemCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WorkStates: Story = {
  args: {
    status: "doing",
    title: "1차 번역본 검토",
  },
  render: () => (
    <div style={{ display: "grid", gap: 14, width: 520 }}>
      <WorkItemCard
        assignee="정현"
        code="1.2.1"
        dueLabel="D-2"
        sourceLabel="번역계약서_v2.pdf에서 승인된 TODO"
        status="doing"
        title="1차 번역본 검토"
      />
      <WorkItemCard
        assignee="정현"
        code="1.2.2"
        dueLabel="6월 24일"
        sourceLabel="회의록_0618.md에서 승인된 TODO"
        status="review"
        title="검수 기준 질문 정리"
      />
      <WorkItemCard
        assignee="정현"
        code="1.2.3"
        dueLabel="완료"
        status="done"
        title="용어집 초안 작성"
      />
    </div>
  ),
};
