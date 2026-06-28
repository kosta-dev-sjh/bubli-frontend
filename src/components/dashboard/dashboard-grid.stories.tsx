import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { widgetIcon } from "@/components/dashboard/dashboard-palette";
import { DashboardWidgetTile } from "@/components/dashboard/dashboard-widget-tile";

const meta = {
  tags: ["uikit", "dashboard"],
  component: DashboardGrid,
  parameters: {
    docs: { description: { component: "대시보드 위젯들이 놓이는 12-col 그리드. view/edit/empty/dense 지원. 위젯 카드를 색으로 칠하지 않는다." } },
  },
  title: "Dashboard/Grid",
} satisfies Meta<typeof DashboardGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

function Sample({ editMode = false }: { editMode?: boolean }) {
  return (
    <>
      <DashboardWidgetTile editMode={editMode} icon={widgetIcon("today-todos")} size="M" title="오늘 할 일">
        시안 1차 보내기 외 2건
      </DashboardWidgetTile>
      <DashboardWidgetTile editMode={editMode} icon={widgetIcon("project-time-ring")} size="M" title="프로젝트별 시간">
        2h15m
      </DashboardWidgetTile>
      <DashboardWidgetTile editMode={editMode} icon={widgetIcon("agent-suggestions")} size="M" title="에이전트 제안">
        요구사항 6개 정리할까요?
      </DashboardWidgetTile>
      <DashboardWidgetTile editMode={editMode} icon={widgetIcon("timer")} size="S" title="타이머">
        25:00
      </DashboardWidgetTile>
      <DashboardWidgetTile editMode={editMode} icon={widgetIcon("today-summary")} size="S" title="오늘 요약">
        자료 3 · 후보 6
      </DashboardWidgetTile>
      <DashboardWidgetTile editMode={editMode} icon={widgetIcon("activity-timeline")} size="L" title="활동 타임라인">
        09:00 → 지금 · 프로젝트 귀속
      </DashboardWidgetTile>
    </>
  );
}

export const View: Story = {
  render: () => (
    <DashboardGrid mode="view">
      <Sample />
    </DashboardGrid>
  ),
};

export const Edit: Story = {
  render: () => (
    <DashboardGrid mode="edit">
      <Sample editMode />
    </DashboardGrid>
  ),
};

export const Empty: Story = {
  render: () => <DashboardGrid empty mode="edit" />,
};

export const Dense: Story = {
  render: () => (
    <DashboardGrid dense mode="view">
      <Sample />
    </DashboardGrid>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 22, padding: 24 }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <DashboardGrid mode="view">
        <Sample />
      </DashboardGrid>
    </DarkFrame>
  ),
};
