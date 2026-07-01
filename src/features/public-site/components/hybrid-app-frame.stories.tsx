import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HybridAppFrame } from "@/features/public-site/components/hybrid-app-frame";

const meta = {
  component: HybridAppFrame,
  parameters: {
    docs: {
      description: {
        component:
          "공개 사이트, 회원 웹 앱, 데스크탑 앱의 역할 분리를 보여주는 구조 컴포넌트입니다. 데스크탑 앱은 회원 업무 공간을 열고 위젯과 기기 기능을 더합니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/PublicSite/HybridAppFrame",
} satisfies Meta<typeof HybridAppFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <HybridAppFrame />
    </main>
  ),
};
