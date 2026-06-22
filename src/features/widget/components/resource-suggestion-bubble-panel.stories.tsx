import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceSuggestionBubblePanel } from "./resource-suggestion-bubble-panel";

const meta = {
  component: ResourceSuggestionBubblePanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Widget/ResourceSuggestionBubblePanel",
} satisfies Meta<typeof ResourceSuggestionBubblePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
