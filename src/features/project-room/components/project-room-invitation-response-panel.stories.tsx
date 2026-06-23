import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomInvitationResponsePanel } from "./project-room-invitation-response-panel";

const meta = {
  component: ProjectRoomInvitationResponsePanel,
  parameters: {
    docs: {
      description: {
        component:
          "친구 초대 또는 링크 초대를 받은 사용자가 프로젝트룸 정보를 확인하고 수락하거나 거절하는 패널입니다.",
      },
    },
  },
  title: "ProjectRoom/ProjectRoomInvitationResponsePanel",
} satisfies Meta<typeof ProjectRoomInvitationResponsePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const accessPreview = [
  {
    description: "프로젝트룸 멤버가 된 뒤 접근할 수 있습니다.",
    label: "자료보드",
  },
  {
    description: "작업판과 TODO 후보를 확인할 수 있습니다.",
    label: "WBS/TODO",
  },
  {
    description: "프로젝트룸 채팅과 보이스에 참여합니다.",
    label: "소통",
  },
  {
    description: "내 담당 TODO와 알림이 개인 화면에 이어집니다.",
    label: "대시보드/버블",
  },
];

export const FriendInvitationPending: Story = {
  args: {
    accessPreview,
    expiresLabel: "6일 18시간 남음",
    invitationType: "friend",
    inviterName: "정현",
    projectRoomName: "신축 사옥 이전 프로젝트",
    roleLabel: "멤버",
    status: "pending",
  },
};

export const LinkInvitationPending: Story = {
  args: {
    accessPreview,
    expiresLabel: "3일 4시간 남음",
    invitationType: "link",
    inviterName: "프로젝트 리더",
    projectRoomName: "웹사이트 구축 계약 검토",
    roleLabel: "멤버",
    status: "pending",
    title: "링크 초대 확인",
  },
};

export const AcceptedInvitation: Story = {
  args: {
    accessPreview,
    expiresLabel: "수락 완료",
    invitationType: "friend",
    inviterName: "김미연",
    projectRoomName: "Bubli 제품 개발룸",
    roleLabel: "멤버",
    status: "accepted",
    title: "수락한 초대",
  },
};

export const ExpiredInvitation: Story = {
  args: {
    accessPreview,
    expiresLabel: "만료됨",
    invitationType: "link",
    inviterName: "프로젝트 리더",
    projectRoomName: "마케팅 캠페인 2분기",
    roleLabel: "멤버",
    status: "expired",
    title: "만료된 초대",
  },
};
