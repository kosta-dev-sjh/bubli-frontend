import { CalendarClock, Sparkles } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Chip } from "@/components/ui/chip";

const meta = {
  tags: ["uikit", "primitive"],
  component: Chip,
  parameters: {
    docs: {
      description: {
        component:
          "작은 정보 조각을 담는 Paper Glass pill입니다. 면 채움은 거의 흰색, 색은 작은 dot·얇은 border·텍스트 accent·focus ring에만 사용합니다.",
      },
    },
  },
  title: "UI/Chip",
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" };

export const Default: Story = {
  render: () => (
    <div style={row}>
      <Chip>마감 D-3</Chip>
      <Chip icon={<Sparkles size={14} />}>후보 4</Chip>
      <Chip icon={<CalendarClock size={14} />}>오늘 일정 2</Chip>
    </div>
  ),
};

export const Hover: Story = {
  render: () => (
    <div style={row}>
      <Chip className="is-hover">마감 D-3</Chip>
      <Chip className="is-hover" icon={<Sparkles size={14} />}>
        후보 4
      </Chip>
    </div>
  ),
};

export const Focus: Story = {
  render: () => (
    <div style={row}>
      <Chip className="is-focus">마감 D-3</Chip>
    </div>
  ),
};

// Active / Selected
export const Selected: Story = {
  render: () => (
    <div style={row}>
      <Chip selected>자료</Chip>
      <Chip>작업</Chip>
      <Chip className="is-selected">시간</Chip>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={row}>
      <Chip disabled>마감 D-3</Chip>
      <Chip disabled icon={<Sparkles size={14} />}>
        후보 4
      </Chip>
    </div>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="dark"
      style={{ background: "#161E2E", borderRadius: 20, padding: 28, display: "flex", flexWrap: "wrap", gap: 8 }}
    >
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <Chip>마감 D-3</Chip>
      <Chip selected>자료</Chip>
      <Chip icon={<Sparkles size={14} />}>후보 4</Chip>
    </DarkFrame>
  ),
};
