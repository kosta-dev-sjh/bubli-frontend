import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetStoragePolicyPanel } from "./widget-storage-policy-panel";

const meta = {
  component: WidgetStoragePolicyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "버블 위젯의 저장 정책 패널입니다. 서버 원본, 기기 안 캐시, 상세 사용 기록, 날짜별 집계를 나눠 보여주며 v14의 위젯 저장 기준을 반영합니다.",
      },
    },
  },
  title: "Features/Widget/WidgetStoragePolicyPanel",
} satisfies Meta<typeof WidgetStoragePolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DailyRollup: Story = {
  args: {
    rollupProgress: 72,
    summaryDateLabel: "2026-06-23",
  },
};

export const AllSynced: Story = {
  args: {
    devices: [
      {
        bubbleType: "TODO",
        deviceLabel: "MacBook Air",
        interactionCount: 22,
        openCount: 12,
        rollupKey: "2026-06-23:todo:mac",
        status: "SYNCED",
        visibleMinutes: 88,
      },
      {
        bubbleType: "TIMER",
        deviceLabel: "MacBook Air",
        interactionCount: 9,
        openCount: 5,
        rollupKey: "2026-06-23:timer:mac",
        status: "SYNCED",
        visibleMinutes: 51,
      },
      {
        bubbleType: "CHAT",
        deviceLabel: "iMac 작업실",
        interactionCount: 7,
        openCount: 4,
        rollupKey: "2026-06-23:chat:imac",
        status: "SYNCED",
        visibleMinutes: 19,
      },
    ],
    rollupProgress: 100,
    summaryDateLabel: "2026-06-23",
  },
};
