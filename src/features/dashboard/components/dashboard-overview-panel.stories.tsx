import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardOverviewPanel } from "./dashboard-overview-panel";

const meta = {
  component: DashboardOverviewPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Dashboard/DashboardOverviewPanel",
} satisfies Meta<typeof DashboardOverviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
