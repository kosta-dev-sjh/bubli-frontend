import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceBoard } from "@/features/resources/components/resource-board";

const meta = {
  component: ResourceBoard,
  parameters: {
    docs: {
      description: {
        component:
          "자료보드는 개인 자료와 프로젝트룸 자료를 한 화면에서 필터링하고, 선택한 자료의 에이전트 정리, 확인 필요 항목, 관련 문서, WBS/TODO 후보를 확인하는 회원 앱 화면입니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/Resources/ResourceBoard",
} satisfies Meta<typeof ResourceBoard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <ResourceBoard />
    </main>
  ),
};
