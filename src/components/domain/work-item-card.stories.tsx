import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WorkItemCard } from "@/components/domain/work-item-card";

const meta = {
  tags: ["uikit", "domain"],
  args: { status: "doing", title: "1차 번역본 검토" },
  component: WorkItemCard,
  parameters: {
    docs: {
      description: {
        component:
          "TODO/WBS/작업 상태 카드. 상태는 카드 배경이 아니라 chip/dot으로. Done은 과한 초록 금지(작은 ok 신호), Blocked/Overdue는 rose 신호만, 진행은 Sky/Lilac 신호 중심.",
      },
    },
  },
  title: "Domain/WorkItemCard",
} satisfies Meta<typeof WorkItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const wrap = { display: "grid", gap: 14, width: 460 } as const;

export const Todo: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard assignee="나" code="1.2.1" dueLabel="D-5" sourceLabel="요구사항_초안.docx" status="waiting" title="반응형 브레이크포인트 정리" />
    </div>
  ),
};

export const InProgress: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard assignee="나" code="1.2.1" dueLabel="D-2" sourceLabel="작업범위_v2.pdf" status="doing" title="1차 번역본 검토" />
    </div>
  ),
};

export const Review: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard assignee="나" code="1.2.2" dueLabel="6월 24일" status="review" title="검수 기준 질문 정리" />
    </div>
  ),
};

export const Done: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard assignee="나" code="1.2.3" dueLabel="완료" status="done" title="용어집 초안 작성" />
    </div>
  ),
};

// Blocked / Overdue — rose 신호만(rim) + 라벨
export const Blocked: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard className="bubli-domain-card--error" assignee="나" code="1.2.4" dueLabel="대기 중" sourceLabel="선행 작업 필요" status="waiting" title="API 연동 (블록됨)" />
    </div>
  ),
};

export const Overdue: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard className="bubli-domain-card--error" assignee="나" code="1.2.5" dueLabel="2일 지남" status="doing" title="시안 1차 마감" />
    </div>
  ),
};

export const Assigned: Story = {
  render: () => (
    <div style={wrap}>
      <WorkItemCard assignee="유진" code="1.3.1" dueLabel="D-3" sourceLabel="요구사항 6개 분해" status="waiting" title="요구사항 작업 분해" />
    </div>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 20, padding: 24, width: 480 }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <div style={{ display: "grid", gap: 12 }}>
        <WorkItemCard assignee="나" code="1.2.1" dueLabel="D-2" status="doing" title="1차 번역본 검토" />
        <WorkItemCard assignee="나" code="1.2.3" dueLabel="완료" status="done" title="용어집 초안 작성" />
      </div>
    </DarkFrame>
  ),
};
