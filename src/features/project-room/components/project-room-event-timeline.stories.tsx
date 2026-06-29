import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomEventTimeline } from "./project-room-event-timeline";

const meta = {
  title: "Features/Project Room/ProjectRoomEventTimeline",
  component: ProjectRoomEventTimeline,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ProjectRoomEventTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
