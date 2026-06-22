import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceSearchCommand } from "./resource-search-command";

const meta = {
  title: "Features/Resources/ResourceSearchCommand",
  component: ResourceSearchCommand,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ResourceSearchCommand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
