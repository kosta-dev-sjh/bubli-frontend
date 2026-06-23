import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  GuestSessionExpiryPanel,
  defaultGuestPermissions,
  defaultGuestSessionRules,
} from "./guest-session-expiry-panel";

const meta = {
  component: GuestSessionExpiryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 게스트 정책을 바탕으로, 초대 링크로 들어온 사용자가 채팅/보이스만 임시로 사용할 수 있고 자료/WBS/멤버 정보에는 접근하지 못한다는 범위를 보여주는 패널입니다.",
      },
    },
  },
  title: "Communication/GuestSessionExpiryPanel",
} satisfies Meta<typeof GuestSessionExpiryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    expiresAtLabel: "42분 남음",
    guestName: "김민준",
    permissions: defaultGuestPermissions,
    remainingPercent: 72,
    roomName: "번역 프로젝트룸",
    rules: defaultGuestSessionRules,
  },
};

export const ExpiringSoon: Story = {
  args: {
    expiresAtLabel: "8분 남음",
    guestName: "박서연",
    permissions: defaultGuestPermissions,
    remainingPercent: 18,
    roomName: "웹사이트 리뉴얼 프로젝트룸",
    rules: defaultGuestSessionRules,
    title: "게스트 세션 만료 임박",
  },
};

export const ChatOnly: Story = {
  args: {
    expiresAtLabel: "25분 남음",
    guestName: "이준호",
    permissions: defaultGuestPermissions.map((permission) =>
      permission.kind === "VOICE"
        ? {
            ...permission,
            description: "보이스 토큰이 아직 발급되지 않아 채팅만 가능합니다.",
            status: "BLOCKED",
          }
        : permission,
    ),
    remainingPercent: 45,
    roomName: "디자인 검토 프로젝트룸",
    rules: defaultGuestSessionRules,
    title: "채팅 전용 게스트",
  },
};
