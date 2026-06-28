import { Download, LogIn, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";

const meta = {
  tags: ["uikit", "primitive"],
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "공개 사이트 CTA, 회원 앱 작업 버튼, 버블 내부 보조 버튼에 쓰는 기본 버튼입니다. Primary CTA는 흰 유리 + Bubble Blue outline/text(채움 버튼 아님). 색은 면이 아니라 outline·text·glow·focus ring에만.",
      },
    },
  },
  title: "UI/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" };

function Variants() {
  return (
    <div style={row}>
      <Button icon={<Download size={16} />} variant="primary">
        데스크탑 앱 다운로드
      </Button>
      <Button icon={<LogIn size={16} />}>웹에서 로그인</Button>
      <Button icon={<Plus size={16} />} variant="quiet">
        자료 올리기
      </Button>
      <Button variant="ghost">보류</Button>
    </div>
  );
}

// 모든 변형 한눈에
export const AllVariants: Story = {
  render: () => <Variants />,
};

// Default: 기본 상태
export const Default: Story = {
  render: () => (
    <div style={row}>
      <Button variant="primary">워크스페이스 열기</Button>
      <Button>웹에서 로그인</Button>
      <Button variant="quiet">자료 올리기</Button>
      <Button variant="ghost">보류</Button>
    </div>
  ),
};

// Hover: 옅은 glow + lift (정적 데모용 is-hover 클래스)
export const Hover: Story = {
  render: () => (
    <div style={row}>
      <Button className="is-hover" variant="primary">
        Primary hover
      </Button>
      <Button className="is-hover">Secondary hover</Button>
    </div>
  ),
};

// Focus: Sky focus ring
export const Focus: Story = {
  render: () => (
    <div style={row}>
      <Button className="is-focus" variant="primary">
        Primary focus
      </Button>
      <Button className="is-focus">Secondary focus</Button>
    </div>
  ),
};

// Press: 미세 squish
export const Press: Story = {
  render: () => (
    <div style={row}>
      <Button className="is-press" variant="primary">
        Primary press
      </Button>
      <Button className="is-press">Secondary press</Button>
    </div>
  ),
};

// Loading: 텍스트 대신 조용한 점 3개
export const Loading: Story = {
  render: () => (
    <div style={row}>
      <Button loading variant="primary">
        업로드 중
      </Button>
      <Button loading>확인 중</Button>
    </div>
  ),
};

// Disabled: 낮은 대비 Paper Glass
export const Disabled: Story = {
  render: () => (
    <div style={row}>
      <Button disabled variant="primary">
        승인하기
      </Button>
      <Button disabled>웹에서 로그인</Button>
    </div>
  ),
};

// Dark: Night Bubble 위
function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="dark"
      style={{
        background: "#161E2E",
        borderRadius: 20,
        padding: 28,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <Button variant="primary">워크스페이스 열기</Button>
      <Button>웹에서 로그인</Button>
      <Button variant="ghost">보류</Button>
      <Button loading variant="primary">
        업로드 중
      </Button>
    </DarkFrame>
  ),
};
