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
          "프로젝트룸 초대를 친구 목록과 로그인 사용자용 초대 링크 중심으로 구성해 보여주는 패널입니다.",
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
    inviteLinkStatus: "ACTIVE",
    inviteLinkTitle: "초대 링크",
    roomName: "신규 웹사이트 프로젝트룸",
    rules: defaultInviteRules,
  },
};

export const PausedLink: Story = {
  args: {
    friends: defaultInviteFriends.map((friend) => ({
      ...friend,
      status: friend.status === "FRIEND" ? "INVITED" : friend.status,
    })),
    inviteLinkStatus: "PAUSED",
    inviteLinkTitle: "초대 링크 중지",
    roomName: "번역 검토 프로젝트룸",
    rules: defaultInviteRules,
  },
};

export const LinkInviteReview: Story = {
  args: {
    friends: defaultInviteFriends.slice(0, 2),
    inviteLinkStatus: "ACTIVE",
    inviteLinkTitle: "로그인 사용자 초대 링크",
    roomName: "디자인 피드백 프로젝트룸",
    rules: defaultInviteRules,
    title: "초대 링크 확인",
  },
};
