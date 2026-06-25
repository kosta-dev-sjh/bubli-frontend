import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatRoomListPanel } from "./chat-room-list-panel";

const meta = {
  component: ChatRoomListPanel,
  parameters: {
    docs: {
      description: {
        component:
          "1:1 채팅과 프로젝트룸 채팅을 한 목록에서 구분하는 소통 패널입니다. 서버 채팅 원본, 기기 안 캐시, 멤버 권한 기준을 반영했습니다.",
      },
    },
    layout: "padded",
  },
  title: "Features/Communication/ChatRoomListPanel",
} satisfies Meta<typeof ChatRoomListPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
