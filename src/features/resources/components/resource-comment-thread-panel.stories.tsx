import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceCommentThreadPanel } from "./resource-comment-thread-panel";

const meta = {
  title: "Features/Resources/ResourceCommentThreadPanel",
  component: ResourceCommentThreadPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ResourceCommentThreadPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
