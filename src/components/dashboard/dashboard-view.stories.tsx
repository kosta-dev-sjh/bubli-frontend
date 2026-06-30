import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ThemeProvider } from "@/components/theme";

const meta = {
  tags: ["uikit", "dashboard"],
  component: DashboardView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "DashboardGrid·WidgetTile·Ring·StatusBadge로 조립한 대시보드 Storybook 상태. 실제 회원앱 라우트는 API 응답을 사용한다.",
      },
    },
  },
  title: "Dashboard/View",
} satisfies Meta<typeof DashboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = { padding: 24, maxWidth: 1080 } as const;

export const Default: Story = {
  render: () => (
    <div style={frame}>
      <DashboardView />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={frame}>
      <DashboardView loading />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={frame}>
      <DashboardView empty />
    </div>
  ),
};

function DarkPreview({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setEl} style={{ ...frame, background: "#161E2E", borderRadius: 24 }}>
      {el ? (
        <ThemeProvider attributeTarget={el} defaultTheme="dark" enableStorage={false}>
          {children}
        </ThemeProvider>
      ) : null}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkPreview>
      <DashboardView />
    </DarkPreview>
  ),
};
