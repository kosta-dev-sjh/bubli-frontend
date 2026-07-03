import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ActivityDetectionPanel } from "./activity-detection-panel";

const meta = {
  args: {
    autoLoad: false,
    initialActivities: [
      {
        appName: "Visual Studio Code",
        createdAt: "2026-07-04T00:20:00.000Z",
        durationSeconds: 4320,
        endedAt: "2026-07-04T01:32:00.000Z",
        id: "story-activity-vscode",
        roomId: "room-bubli",
        startedAt: "2026-07-04T00:20:00.000Z",
        userId: "story-user",
        windowTitle: "activity-detection-panel.tsx",
      },
      {
        appName: "Chrome",
        createdAt: "2026-07-04T01:40:00.000Z",
        durationSeconds: 1680,
        endedAt: "2026-07-04T02:08:00.000Z",
        id: "story-activity-chrome",
        roomId: null,
        startedAt: "2026-07-04T01:40:00.000Z",
        userId: "story-user",
        windowTitle: "LiveKit docs",
      },
      {
        appName: "Figma",
        createdAt: "2026-07-04T02:10:00.000Z",
        durationSeconds: 540,
        endedAt: null,
        id: "story-activity-figma",
        roomId: "room-bubli",
        startedAt: "2026-07-04T02:10:00.000Z",
        userId: "story-user",
        windowTitle: "Bubli widget polish",
      },
    ],
  },
  component: ActivityDetectionPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Activity/ActivityDetectionPanel",
} satisfies Meta<typeof ActivityDetectionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
