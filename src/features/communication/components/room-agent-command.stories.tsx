import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RoomAgentCommand } from "./room-agent-command";

const meta = {
  title: "Features/Communication/RoomAgentCommand",
  component: RoomAgentCommand,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof RoomAgentCommand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
