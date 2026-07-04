import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { WidgetBubbleSettingResponse, WidgetTodayUsageSummaryResponse } from "@/types/api/widget";

import { WidgetUsageRollupPanel } from "./widget-usage-rollup-panel";

const bubbleSettings: WidgetBubbleSettingResponse[] = [
  {
    alertEnabled: true,
    bubbleType: "TODO",
    enabled: true,
    ghostMode: false,
    height: 500,
    id: "setting-todo",
    minimized: false,
    opacity: 1,
    width: 344,
    x: 120,
    y: 120,
  },
  {
    alertEnabled: true,
    bubbleType: "TIMER",
    enabled: true,
    ghostMode: false,
    height: 500,
    id: "setting-timer",
    minimized: false,
    opacity: 1,
    width: 344,
    x: 500,
    y: 120,
  },
  {
    alertEnabled: false,
    bubbleType: "CHAT",
    enabled: true,
    ghostMode: false,
    height: 500,
    id: "setting-chat",
    minimized: true,
    opacity: 1,
    width: 344,
    x: 880,
    y: 120,
  },
];

const usageSummary: WidgetTodayUsageSummaryResponse = {
  byDevice: [
    {
      bubbleSettingId: "setting-todo",
      deviceId: "windows-main",
      id: "rollup-1",
      interactionCount: 8,
      openCount: 18,
      summaryDate: "2026-07-04",
      syncedAt: "2026-07-04T09:00:00.000Z",
      visibleSeconds: 2520,
    },
    {
      bubbleSettingId: "setting-timer",
      deviceId: "windows-main",
      id: "rollup-2",
      interactionCount: 4,
      openCount: 9,
      summaryDate: "2026-07-04",
      syncedAt: "2026-07-04T09:00:00.000Z",
      visibleSeconds: 1440,
    },
    {
      bubbleSettingId: "setting-chat",
      deviceId: "windows-main",
      id: "rollup-3",
      interactionCount: 1,
      openCount: 3,
      summaryDate: "2026-07-04",
      syncedAt: "2026-07-04T09:00:00.000Z",
      visibleSeconds: 360,
    },
  ],
  date: "2026-07-04",
  totalInteractionCount: 13,
  totalOpenCount: 30,
  totalVisibleSeconds: 4320,
};

const meta = {
  component: WidgetUsageRollupPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Widget/WidgetUsageRollupPanel",
} satisfies Meta<typeof WidgetUsageRollupPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    autoLoad: false,
    bubbleSettings,
    usageSummary,
  },
};

export const Empty: Story = {
  args: {
    autoLoad: false,
    bubbleSettings,
    usageSummary: {
      byDevice: [],
      date: "2026-07-04",
      totalInteractionCount: 0,
      totalOpenCount: 0,
      totalVisibleSeconds: 0,
    },
  },
};
