import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatReadStatePanel } from "./chat-read-state-panel";

const meta = {
  component: ChatReadStatePanel,
  parameters: {
    docs: {
      description: {
        component:
          "채팅방 읽음 처리와 알림 상태를 함께 보여주는 소통 컴포넌트입니다. v14의 chat_room_members.last_read_at, PATCH /api/chat/rooms/{id}/read, notifications 상태값, 사용자별 알림 분리 기준을 반영했습니다.",
      },
    },
    layout: "padded",
  },
  title: "Features/Communication/ChatReadStatePanel",
} satisfies Meta<typeof ChatReadStatePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
