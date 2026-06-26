import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetEightBubbleSetPanel } from "./widget-eight-bubble-set-panel";

const meta = {
  component: WidgetEightBubbleSetPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Widget/WidgetEightBubbleSetPanel",
} satisfies Meta<typeof WidgetEightBubbleSetPanel>;

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
