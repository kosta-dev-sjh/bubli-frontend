import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScheduleOverviewPanel } from "./schedule-overview-panel";

const meta = {
  component: ScheduleOverviewPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Calendar/ScheduleOverviewPanel",
} satisfies Meta<typeof ScheduleOverviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
