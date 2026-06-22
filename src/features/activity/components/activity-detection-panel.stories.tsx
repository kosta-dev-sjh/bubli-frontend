import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ActivityDetectionPanel } from "./activity-detection-panel";

const meta = {
  component: ActivityDetectionPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Activity/ActivityDetectionPanel",
} satisfies Meta<typeof ActivityDetectionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
