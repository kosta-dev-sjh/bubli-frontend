import { Download, LogIn, Plus } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";

const meta = {
  component: Button,
  parameters: {
    docs: {
      description: {
        component: "공개 사이트 CTA, 회원 앱 작업 버튼, 버블 내부 보조 버튼에 쓰는 기본 버튼입니다.",
      },
    },
  },
  title: "UI/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Button icon={<Download size={16} />} variant="primary">
        데스크탑 앱 다운로드
      </Button>
      <Button icon={<LogIn size={16} />}>웹에서 로그인</Button>
      <Button icon={<Plus size={16} />} variant="quiet">
        자료 올리기
      </Button>
      <Button variant="ghost">보류</Button>
    </div>
  ),
};
