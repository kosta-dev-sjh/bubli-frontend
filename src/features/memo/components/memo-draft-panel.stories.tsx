import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MemoDraftPanel } from "./memo-draft-panel";

const meta = {
  component: MemoDraftPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Memo/MemoDraftPanel",
} satisfies Meta<typeof MemoDraftPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
