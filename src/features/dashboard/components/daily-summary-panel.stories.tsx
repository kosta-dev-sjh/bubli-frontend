import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DailySummaryPanel } from "./daily-summary-panel";

const meta = {
  component: DailySummaryPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Dashboard/DailySummaryPanel",
} satisfies Meta<typeof DailySummaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
