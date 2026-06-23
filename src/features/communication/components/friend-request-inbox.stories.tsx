import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FriendRequestInbox } from "./friend-request-inbox";

const meta = {
  component: FriendRequestInbox,
  parameters: {
    docs: {
      description: {
        component:
          "Bubli ID 기반 친구 요청을 수락, 거절, 차단하는 소통 패널입니다. 수락된 친구만 1:1 채팅과 프로젝트룸 초대 대상에 표시한다는 v14 정책을 기준으로 구성했습니다.",
      },
    },
    layout: "padded",
  },
  title: "Features/Communication/FriendRequestInbox",
} satisfies Meta<typeof FriendRequestInbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
