import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceComparePanel } from "./resource-compare-panel";

const meta = {
  component: ResourceComparePanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Resources/ResourceComparePanel",
} satisfies Meta<typeof ResourceComparePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
