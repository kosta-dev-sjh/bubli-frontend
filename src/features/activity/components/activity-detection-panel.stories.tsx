import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ActivityDetectionPanel } from "./activity-detection-panel";

const meta = {
  component: ActivityDetectionPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Activity/ActivityDetectionPanel",
} satisfies Meta<typeof ActivityDetectionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activityLogs: [
      {
        appName: "Visual Studio Code",
        createdAt: "2026-07-04T09:18:00+09:00",
        durationSeconds: 4320,
        id: "activity-1",
        roomId: "room-1",
        startedAt: "2026-07-04T08:06:00+09:00",
        userId: "user-1",
        windowTitle: "activity-detection-panel.tsx",
      },
      {
        appName: "Chrome",
        createdAt: "2026-07-04T10:04:00+09:00",
        durationSeconds: 1680,
        id: "activity-2",
        startedAt: "2026-07-04T09:36:00+09:00",
        userId: "user-1",
        windowTitle: "Bubli API docs",
      },
    ],
    consentGranted: true,
    desktopRuntime: true,
  },
};
