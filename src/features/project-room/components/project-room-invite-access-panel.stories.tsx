import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ProjectRoomInviteAccessPanel,
  defaultInviteFriends,
  defaultInviteRules,
} from "./project-room-invite-access-panel";

const meta = {
  component: ProjectRoomInviteAccessPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 초대를 친구 목록 중심으로 구성해 보여주는 패널입니다.",
      },
    },
  },
  title: "ProjectRoom/ProjectRoomInviteAccessPanel",
} satisfies Meta<typeof ProjectRoomInviteAccessPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    friends: defaultInviteFriends,
    roomName: "신규 웹사이트 프로젝트룸",
    rules: defaultInviteRules,
  },
};

export const PendingFriends: Story = {
  args: {
    friends: defaultInviteFriends.map((friend) => ({
      ...friend,
      status: friend.status === "FRIEND" ? "INVITED" : friend.status,
    })),
    roomName: "번역 검토 프로젝트룸",
    rules: defaultInviteRules,
  },
};

export const CompactFriendList: Story = {
  args: {
    friends: defaultInviteFriends.slice(0, 2),
    roomName: "디자인 피드백 프로젝트룸",
    rules: defaultInviteRules,
    title: "친구 초대 확인",
  },
};
