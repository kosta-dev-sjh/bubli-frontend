import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceVersionHistoryPanel } from "./resource-version-history-panel";

const meta = {
  component: ResourceVersionHistoryPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Resources/ResourceVersionHistoryPanel",
} satisfies Meta<typeof ResourceVersionHistoryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
