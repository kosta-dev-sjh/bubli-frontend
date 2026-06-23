import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RoomMemorySummaryPanel } from "./room-memory-summary-panel";

const meta = {
  component: RoomMemorySummaryPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/RoomMemorySummaryPanel",
} satisfies Meta<typeof RoomMemorySummaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
