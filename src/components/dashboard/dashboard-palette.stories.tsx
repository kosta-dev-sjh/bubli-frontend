import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardPalette } from "@/components/dashboard/dashboard-palette";
import { WIDGET_CATALOG } from "@/components/dashboard/widget-catalog";

const meta = {
  tags: ["uikit", "dashboard"],
  args: { items: WIDGET_CATALOG },
  component: DashboardPalette,
  parameters: {
    docs: { description: { component: "추가 가능한 대시보드 카드 목록(드래그 시작점). 검색·빈 상태 지원. Paper Glass 표면, 색은 아이콘/포커스에만." } },
  },
  title: "Dashboard/Palette",
} satisfies Meta<typeof DashboardPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DashboardPalette items={WIDGET_CATALOG} />,
};

export const Search: Story = {
  render: function SearchStory() {
    const [q, setQ] = useState("시간");
    return <DashboardPalette items={WIDGET_CATALOG} onSearch={setQ} query={q} />;
  },
};

export const Empty: Story = {
  render: () => <DashboardPalette items={WIDGET_CATALOG} query="존재하지않는카드" />,
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
      <DashboardPalette items={WIDGET_CATALOG} />
    </DarkFrame>
  ),
};
