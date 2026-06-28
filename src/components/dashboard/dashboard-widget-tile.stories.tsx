import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardWidgetTile } from "@/components/dashboard/dashboard-widget-tile";
import { widgetIcon } from "@/components/dashboard/dashboard-palette";

const meta = {
  tags: ["uikit", "dashboard"],
  args: { title: "오늘 할 일" },
  component: DashboardWidgetTile,
  parameters: {
    docs: {
      description: {
        component:
          "대시보드 위젯 블록. Paper Glass 표면, 크기 S/M/L. 핸들/숨김/삭제 버튼은 edit 모드에서만. 상태색은 dot/rim/badge에만(카드 색칠 금지). drag 중 네온 glow 없음.",
      },
    },
  },
  title: "Dashboard/WidgetTile",
} satisfies Meta<typeof DashboardWidgetTile>;

export default meta;
type Story = StoryObj<typeof meta>;

const grid = { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14, width: 760 } as const;

function Tile(props: Partial<Parameters<typeof DashboardWidgetTile>[0]>) {
  return (
    <DashboardWidgetTile icon={widgetIcon("today-todos")} size="M" title="오늘 할 일" {...props}>
      시안 1차 보내기 · 견적서 회신 확인 · WBS 구조 검토
    </DashboardWidgetTile>
  );
}

export const States: Story = {
  render: () => (
    <div style={grid}>
      <Tile />
      <Tile className="is-hover" interactive />
      <Tile className="is-focus" />
      <Tile selected />
      <Tile dragging />
      <Tile resizing />
      <Tile hidden />
      <Tile disabled />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={grid}>
      <DashboardWidgetTile icon={widgetIcon("timer")} size="S" title="타이머">
        25:00
      </DashboardWidgetTile>
      <DashboardWidgetTile icon={widgetIcon("today-todos")} size="M" title="오늘 할 일">
        3건
      </DashboardWidgetTile>
      <DashboardWidgetTile icon={widgetIcon("activity-timeline")} size="L" title="활동 타임라인">
        09:00 → 지금
      </DashboardWidgetTile>
    </div>
  ),
};

export const EditMode: Story = {
  render: () => (
    <div style={grid}>
      <Tile editMode />
    </div>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 20, padding: 24 }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <div style={grid}>
        <Tile />
        <Tile selected />
        <Tile editMode />
      </div>
    </DarkFrame>
  ),
};
