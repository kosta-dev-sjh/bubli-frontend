import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HybridAppFrame } from "./hybrid-app-frame";

const meta = {
  title: "Features/Widget/HybridAppFrame",
  component: HybridAppFrame,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof HybridAppFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
