import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PublicHomeFlow } from "@/features/public-site/components/public-home-flow";

const meta = {
  component: PublicHomeFlow,
  parameters: {
    docs: {
      description: {
        component:
          "공개 홈 하단의 핵심 흐름 프리뷰입니다. 기능 페이지의 구조 설명을 반복하지 않고 자료 업로드, 후보 생성, 사용자 승인, 버블 표시 흐름만 짧게 보여줍니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/PublicSite/PublicHomeFlow",
} satisfies Meta<typeof PublicHomeFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <PublicHomeFlow />
    </main>
  ),
};
