import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultDockItems, WidgetMinimizedDockPanel } from "./widget-minimized-dock-panel";

const meta = {
  component: WidgetMinimizedDockPanel,
  parameters: {
    docs: {
      description: {
        component:
          "최소화된 버블이 현재 값, 알림, 서버 기록과 기기 안 임시 표시 기준을 짧게 보여주는 데스크탑 도크 패널입니다.",
      },
    },
  },
  title: "Features/Widget/WidgetMinimizedDockPanel",
} satisfies Meta<typeof WidgetMinimizedDockPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultDock: Story = {
  args: {
    dockItems: defaultDockItems,
    lastSyncedLabel: "방금 갱신",
  },
};

export const CommunicationHeavyDock: Story = {
  args: {
    dockItems: [
      ...defaultDockItems,
      {
        badge: "2건",
        description: "새 댓글과 검토 요청 알림",
        label: "알림 버블",
        source: "server",
        tone: "notification",
        value: "확인 필요 항목",
      },
      {
        badge: "로컬",
        description: "작성 중인 개인 메모 초안",
        label: "메모 버블",
        source: "local",
        tone: "memo",
        value: "공유 전 문장 정리",
      },
    ],
    lastSyncedLabel: "1분 전",
    title: "소통과 알림 중심 도크",
  },
};

export const OfflineCacheDock: Story = {
  args: {
    dockItems: defaultDockItems.map((item) =>
      item.tone === "communication" || item.tone === "agent" ? { ...item, source: "cache" as const } : item,
    ),
    lastSyncedLabel: "재연결 대기",
    title: "캐시 표시 상태",
  },
};
