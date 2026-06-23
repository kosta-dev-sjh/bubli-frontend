import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FriendSearchPanel } from "./friend-search-panel";

const meta = {
  component: FriendSearchPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Bubli ID로 사용자를 검색하고 친구 요청을 보내는 소통 패널입니다. 요청은 friend_requests에 남고, 수락된 friendships만 1:1 채팅과 프로젝트룸 친구 초대 대상으로 이어진다는 v14 흐름을 기준으로 했습니다.",
      },
    },
    layout: "padded",
  },
  title: "Features/Communication/FriendSearchPanel",
} satisfies Meta<typeof FriendSearchPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
