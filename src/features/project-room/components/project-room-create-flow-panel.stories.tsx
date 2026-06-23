import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomCreateFlowPanel } from "./project-room-create-flow-panel";

const meta = {
  component: ProjectRoomCreateFlowPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/ProjectRoom/ProjectRoomCreateFlowPanel",
} satisfies Meta<typeof ProjectRoomCreateFlowPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
