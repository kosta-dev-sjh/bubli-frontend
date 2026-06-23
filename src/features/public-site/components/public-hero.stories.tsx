import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PublicHero } from "@/features/public-site/components/public-hero";

const meta = {
  component: PublicHero,
  parameters: {
    docs: {
      description: {
        component:
          "공개 사이트 첫 화면입니다. 비회원에게 서비스 흐름과 다운로드/로그인 진입만 보여주고, 회원 자료나 프로젝트룸 데이터는 노출하지 않습니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/PublicSite/PublicHero",
} satisfies Meta<typeof PublicHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <PublicHero />
    </main>
  ),
};
