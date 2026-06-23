import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GuestVoiceAccessPanel } from "./guest-voice-access-panel";

const meta = {
  component: GuestVoiceAccessPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 소통의 게스트 접근과 LiveKit 보이스 연결 경계를 보여주는 패널입니다. 게스트는 프로젝트룸 멤버가 아니며 채팅과 보이스에만 임시 참여합니다.",
      },
    },
  },
  title: "Features/Communication/GuestVoiceAccessPanel",
} satisfies Meta<typeof GuestVoiceAccessPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActiveGuest: Story = {
  args: {
    accessStatus: "ACTIVE",
    activeGuestCount: 2,
    expiresInMinutes: 84,
    roomLabel: "K-Stay 프로젝트룸",
    tauriMode: "desktop-bubble",
  },
};

export const WebCommunicationTab: Story = {
  args: {
    accessStatus: "WAITING",
    activeGuestCount: 0,
    expiresInMinutes: 120,
    roomLabel: "번역 검수 프로젝트룸",
    tauriMode: "web-tab",
  },
};

export const ExpiredGuest: Story = {
  args: {
    accessStatus: "EXPIRED",
    activeGuestCount: 0,
    expiresInMinutes: 0,
    roomLabel: "자료 정리 프로젝트룸",
    tauriMode: "desktop-bubble",
  },
};
