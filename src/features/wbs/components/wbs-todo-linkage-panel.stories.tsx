import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WbsTodoLinkagePanel } from "@/features/wbs/components/wbs-todo-linkage-panel";

const meta = {
  component: WbsTodoLinkagePanel,
  parameters: {
    docs: {
      description: {
        component:
          "WBS 후보를 사용자가 승인하면 하나의 TODO가 되고, 같은 작업이 WBS/작업판, 대시보드, TODO 버블, 일정에 연결되는 구조를 보여줍니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/WBS/WbsTodoLinkagePanel",
} satisfies Meta<typeof WbsTodoLinkagePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LinkOneTaskAcrossSurfaces: Story = {
  args: {
    candidate: {
      code: "1.2.1",
      confidence: 91,
      sourceLabel: "번역계약서_v2.pdf, 회의록_0618.md",
      status: "DRAFT",
      title: "1차 번역본 검토",
    },
    task: {
      assigneeLabel: "담당자 나",
      dueLabel: "D-2",
      idLabel: "같은 TODO로 연결",
      progress: 46,
      status: "IN_PROGRESS",
      title: "1차 번역본 검토",
    },
  },
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <WbsTodoLinkagePanel {...args} />
    </main>
  ),
};

export const ApprovedTask: Story = {
  args: {
    candidate: {
      code: "2.1.3",
      confidence: 87,
      sourceLabel: "요구사항정의서_v1.3.pdf",
      status: "APPROVED",
      title: "검수 기준 질문 정리",
    },
    task: {
      assigneeLabel: "담당자 나",
      dueLabel: "6월 24일",
      idLabel: "같은 TODO로 연결",
      progress: 68,
      status: "REVIEW",
      title: "검수 기준 질문 정리",
    },
  },
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <WbsTodoLinkagePanel {...args} />
    </main>
  ),
};
