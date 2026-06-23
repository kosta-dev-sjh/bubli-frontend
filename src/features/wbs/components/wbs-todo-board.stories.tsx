import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WbsTodoBoard } from "@/features/wbs/components/wbs-todo-board";

const meta = {
  component: WbsTodoBoard,
  parameters: {
    docs: {
      description: {
        component:
          "WBS/작업판은 후보 승인 후 하나의 TODO가 작업판, 대시보드, 버블, 일정에 연결되는 구조를 보여줍니다. 에이전트 후보는 승인 전까지 확정 작업으로 다루지 않습니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/WBS/WbsTodoBoard",
} satisfies Meta<typeof WbsTodoBoard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <WbsTodoBoard />
    </main>
  ),
};
