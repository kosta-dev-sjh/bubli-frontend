import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomBoard } from "./project-room-board";

const meta = {
  component: ProjectRoomBoard,
  parameters: {
    layout: "padded",
  },
  title: "Features/ProjectRoom/ProjectRoomBoard",
} satisfies Meta<typeof ProjectRoomBoard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
