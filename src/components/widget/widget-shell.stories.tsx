import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetShell } from "@/components/widget/widget-shell";

const meta = {
  tags: ["uikit", "widget"],
  component: WidgetShell,
  parameters: {
    docs: {
      description: {
        component:
          "바탕화면 위에 떠 있는 Bubble Workspace. 카드가 아니다. 4상태(Default/Translucent/Ghost/Minimal)는 rim·blur·shadow·밀도·구조가 실제로 다르다. Tauri IPC·클릭 투과는 미연결(시각 상태만). 색은 rim/dot/ring/glow에만(청록 금지).",
      },
    },
  },
  title: "Widget/WidgetShell",
} satisfies Meta<typeof WidgetShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const common = {
  agentCount: 1,
  agentMessage: "기준 자료에서 요구사항 6개와 마감 3건을 찾았어요. 정리할까요?",
  projectLabel: "오늘 할 일",
  scheduleCount: 2,
  timerText: "25:00",
  todoCount: 3,
} as const;

// 데스크탑 바탕화면 무대(떠 있는 느낌 확인)
function Desk({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const bg = dark
    ? "radial-gradient(50% 40% at 16% 6%, rgba(80,120,200,.18), transparent 70%), linear-gradient(160deg,#161E2E,#10151F)"
    : "radial-gradient(50% 44% at 18% 10%, rgba(158,216,255,.32), transparent 62%), radial-gradient(46% 44% at 90% 90%, rgba(220,216,248,.3), transparent 66%), linear-gradient(160deg,#EAF2FB,#E0EAF6)";
  return (
    <div data-theme={dark ? "dark" : undefined} style={{ background: bg, borderRadius: 24, padding: 40, minHeight: 360 } as CSSProperties}>
      {children}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} breathe interactive mode="default" />
    </Desk>
  ),
};

export const Translucent: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} mode="translucent" />
    </Desk>
  ),
};

export const Ghost: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} mode="ghost" />
    </Desk>
  ),
};

export const Minimal: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} mode="minimal" />
    </Desk>
  ),
};

export const Compact: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} density="compact" mode="default" />
    </Desk>
  ),
};

export const Expanded: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} density="expanded" mode="default" />
    </Desk>
  ),
};

export const Sleep: Story = {
  render: () => (
    <Desk>
      <WidgetShell {...common} mode="default" sleep />
    </Desk>
  ),
};

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <Desk dark>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <WidgetShell {...common} mode="default" />
        <WidgetShell {...common} mode="ghost" />
        <WidgetShell {...common} mode="minimal" />
      </div>
    </Desk>
  ),
};

// 4상태를 나란히 — 실제로 다르게 보이는지
export const AllStates: Story = {
  render: () => (
    <Desk>
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
          <WidgetShell {...common} mode="default" />
          <WidgetShell {...common} mode="translucent" />
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
          <WidgetShell {...common} mode="ghost" />
          <WidgetShell {...common} mode="minimal" />
        </div>
      </div>
    </Desk>
  ),
};
