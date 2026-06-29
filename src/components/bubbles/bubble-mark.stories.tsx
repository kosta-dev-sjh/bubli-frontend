import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BubbleMark } from "@/components/bubbles/bubble-mark";

const meta = {
  tags: ["uikit", "bubbles"],
  component: BubbleMark,
  // 버블 본체는 투명 글래스라 순백 위에선 안 보인다. QA/스냅샷용으로 옅은 배경을 깐다(컴포넌트는 그대로).
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          padding: 28,
          borderRadius: 20,
          background: "radial-gradient(120% 120% at 30% 20%, #D8F0FF 0%, #F2F7FC 45%, #E6DDF8 100%)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "브랜드 마크 버블. 본체는 CSS가 아니라 투명 이미지 에셋(/assets/bubble-sky.webp). 로고·헤더·EmptyState·위젯에서 반복 사용. 색은 rim/highlight에만(청록 없음).",
      },
    },
  },
  title: "Bubbles/BubbleMark",
} satisfies Meta<typeof BubbleMark>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = { display: "flex", gap: 18, alignItems: "center" } as const;

export const Default: Story = { render: () => <BubbleMark /> };

export const Small: Story = { render: () => <BubbleMark size="sm" /> };

export const Large: Story = { render: () => <BubbleMark size="lg" /> };

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <BubbleMark size="sm" />
      <BubbleMark size="md" />
      <BubbleMark size="lg" />
    </div>
  ),
};

export const Animated: Story = { render: () => <BubbleMark animated size="lg" /> };

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
      <BubbleMark size="sm" />
      <BubbleMark size="md" />
      <BubbleMark size="lg" />
    </DarkFrame>
  ),
};
