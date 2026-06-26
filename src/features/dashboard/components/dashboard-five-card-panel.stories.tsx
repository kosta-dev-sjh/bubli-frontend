import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardFiveCardPanel } from "./dashboard-five-card-panel";

const meta = {
  component: DashboardFiveCardPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Dashboard/DashboardFiveCardPanel",
} satisfies Meta<typeof DashboardFiveCardPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Empty: Story = {
  args: { state: "empty" },
};

export const Loading: Story = {
  args: { state: "loading" },
};

export const Error: Story = {
  args: { state: "error" },
};
