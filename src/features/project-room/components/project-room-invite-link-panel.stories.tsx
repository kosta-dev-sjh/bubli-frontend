import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomInviteLinkPanel } from "./project-room-invite-link-panel";

const meta = {
  component: ProjectRoomInviteLinkPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트 리더가 생성하는 프로젝트룸 링크 초대의 생성, 만료, 수락, 취소 상태를 보여주는 패널입니다.",
      },
    },
  },
  title: "ProjectRoom/ProjectRoomInviteLinkPanel",
} satisfies Meta<typeof ProjectRoomInviteLinkPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActiveInviteLink: Story = {
  args: {
    activeLink: {
      createdByLabel: "정현 님",
      createdLabel: "오늘 10:12",
      expiresLabel: "6일 23시간 남음",
      roleLabel: "멤버",
      status: "pending",
      urlPreview: "https://app.bubli.kr/invite/prj-8f2c...",
    },
    projectRoomName: "신축 사옥 이전 프로젝트",
  },
};

export const AcceptedInviteLink: Story = {
  args: {
    activeLink: {
      acceptedByLabel: "김미연",
      createdByLabel: "정현 님",
      createdLabel: "어제 15:40",
      expiresLabel: "5일 4시간 남음",
      roleLabel: "멤버",
      status: "accepted",
      urlPreview: "https://app.bubli.kr/invite/prj-72ac...",
    },
    projectRoomName: "웹사이트 구축 계약 검토",
    title: "수락된 초대 링크",
  },
};

export const EmptyInviteLink: Story = {
  args: {
    projectRoomName: "Bubli 제품 개발룸",
  },
};

export const ExpiredInviteLink: Story = {
  args: {
    activeLink: {
      createdByLabel: "프로젝트 리더",
      createdLabel: "8일 전",
      expiresLabel: "만료됨",
      roleLabel: "멤버",
      status: "expired",
      urlPreview: "https://app.bubli.kr/invite/prj-old...",
    },
    projectRoomName: "마케팅 캠페인 2분기",
    title: "만료된 초대 링크",
  },
};
