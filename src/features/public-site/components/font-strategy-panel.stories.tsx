import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FontStrategyPanel } from "@/features/public-site/components/font-strategy-panel";

const meta = {
  component: FontStrategyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "디자인보드 v20의 가독성 기준을 컴포넌트 단위로 확인하는 패널입니다. 히어로, 본문, 버블 내부 글자 크기와 역할을 나눕니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/PublicSite/FontStrategyPanel",
} satisfies Meta<typeof FontStrategyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 980, margin: "0 auto" }}>
      <FontStrategyPanel />
    </main>
  ),
};
