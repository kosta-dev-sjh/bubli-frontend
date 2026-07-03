import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NotificationCenterPanel } from "./notification-center-panel";

const meta = {
  args: {
    autoLoad: false,
    initialNotifications: [
      {
        body: "에이전트가 요구사항 문서에서 확인 질문 후보를 만들었습니다.",
        createdAt: "2026-07-04T02:00:00.000Z",
        id: "story-notification-agent",
        readAt: null,
        sourceId: "agent-job-42",
        sourceType: "AGENT",
        status: "UNREAD",
        title: "확인 질문 후보 2건",
      },
      {
        body: "프로젝트룸 채팅에 새 멘션이 도착했습니다.",
        createdAt: "2026-07-04T01:35:00.000Z",
        id: "story-notification-message",
        readAt: "2026-07-04T01:40:00.000Z",
        sourceId: "message-11",
        sourceType: "MESSAGE",
        status: "READ",
        title: "새 멘션",
      },
      {
        body: "업로드한 자료 분석이 완료되었습니다.",
        createdAt: "2026-07-04T00:50:00.000Z",
        id: "story-notification-resource",
        readAt: null,
        sourceId: "resource-88",
        sourceType: "RESOURCE",
        status: "ARCHIVED",
        title: "자료 분석 완료",
      },
    ],
  },
  component: NotificationCenterPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Notification/NotificationCenterPanel",
} satisfies Meta<typeof NotificationCenterPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
