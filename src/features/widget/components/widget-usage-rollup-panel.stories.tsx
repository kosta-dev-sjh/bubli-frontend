import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetUsageRollupPanel } from "./widget-usage-rollup-panel";

const meta = {
  component: WidgetUsageRollupPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Widget/WidgetUsageRollupPanel",
} satisfies Meta<typeof WidgetUsageRollupPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
