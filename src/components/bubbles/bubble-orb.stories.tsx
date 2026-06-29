import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BubbleOrb } from "@/components/bubbles/bubble-orb";

const meta = {
  tags: ["uikit", "bubbles"],
  component: BubbleOrb,
  parameters: {
    docs: {
      description: {
        component:
          "위젯 메뉴 핸들 · 최소화 오브 · Dock 진입점(DockOrb 별칭). 투명 이미지 버블 + 중앙 카운트. hover 아주 약한 scale, focus Sky ring. 색은 rim/glow에만.",
      },
    },
  },
  title: "Bubbles/BubbleOrb",
} satisfies Meta<typeof BubbleOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = { display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" } as const;

export const Default: Story = { render: () => <BubbleOrb label="메뉴" /> };

export const Hover: Story = { render: () => <BubbleOrb className="is-hover" label="메뉴" /> };

export const Focus: Story = { render: () => <BubbleOrb className="is-focus" label="메뉴" /> };

export const Count: Story = { render: () => <BubbleOrb count={3} label="오늘 할 일 3" /> };

export const Active: Story = { render: () => <BubbleOrb active count={3} label="활성" /> };

export const WithBadge: Story = { render: () => <BubbleOrb badge={2} count={3} label="알림 2" /> };

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 18, padding: 28, ...row }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <BubbleOrb count={3} label="메뉴" />
      <BubbleOrb active count={3} label="활성" />
      <BubbleOrb badge={2} count={3} label="알림" />
    </DarkFrame>
  ),
};
