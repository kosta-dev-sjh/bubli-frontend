import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomInviteFlow } from "./project-room-invite-flow";

const meta = {
  component: ProjectRoomInviteFlow,
  parameters: {
    layout: "padded",
  },
  title: "Features/ProjectRoom/ProjectRoomInviteFlow",
} satisfies Meta<typeof ProjectRoomInviteFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
