import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScheduleOverviewPanel } from "./schedule-overview-panel";

const storyStart = new Date("2026-07-04T10:30:00+09:00");
const storySecondStart = new Date("2026-07-04T15:00:00+09:00");
const storyCreatedAt = new Date("2026-07-04T09:00:00+09:00").toISOString();

const meta = {
  args: {
    autoLoad: false,
    initialSchedules: [
      {
        allDay: false,
        createdAt: storyCreatedAt,
        googleEventId: "google-event-story",
        id: "schedule-story-1",
        lastSyncedAt: storyCreatedAt,
        ownerUserId: "story-user",
        roomId: "room-story-1",
        startsAt: storyStart.toISOString(),
        syncStatus: "SYNCED",
        taskId: "task-story-1",
        title: "클라이언트 확인 미팅",
        updatedAt: storyCreatedAt,
        wbsItemId: null,
      },
      {
        allDay: false,
        createdAt: storyCreatedAt,
        endsAt: new Date(storySecondStart.getTime() + 60 * 60 * 1000).toISOString(),
        id: "schedule-story-2",
        lastSyncedAt: null,
        ownerUserId: "story-user",
        roomId: null,
        startsAt: storySecondStart.toISOString(),
        syncStatus: "LOCAL_ONLY",
        taskId: null,
        title: "1차 납품 마감",
        updatedAt: storyCreatedAt,
        wbsItemId: "wbs-story-2",
      },
    ],
  },
  component: ScheduleOverviewPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Calendar/ScheduleOverviewPanel",
} satisfies Meta<typeof ScheduleOverviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
