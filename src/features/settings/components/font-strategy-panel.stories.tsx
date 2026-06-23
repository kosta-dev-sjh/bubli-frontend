import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FontStrategyPanel } from "./font-strategy-panel";

const meta = {
  title: "Features/Settings/FontStrategyPanel",
  component: FontStrategyPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof FontStrategyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
