import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ProjectRoomLeaderHandoffPanel,
  defaultHandoffCandidates,
  defaultHandoffRules,
} from "./project-room-leader-handoff-panel";

const meta = {
  component: ProjectRoomLeaderHandoffPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 프로젝트룸 역할 기준을 바탕으로, 프로젝트 리더가 나가기 전에 설정/초대/권한 변경을 관리할 리더가 남아 있는지 확인하는 패널입니다.",
      },
    },
  },
  title: "Features/ProjectRoom/ProjectRoomLeaderHandoffPanel",
} satisfies Meta<typeof ProjectRoomLeaderHandoffPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HasOtherLeader: Story = {
  args: {
    candidates: defaultHandoffCandidates,
    currentUserName: "정현",
    roomName: "Bubli 제품 개발룸",
    rules: defaultHandoffRules,
  },
};

export const NeedsHandoff: Story = {
  args: {
    candidates: defaultHandoffCandidates.map((candidate) => ({
      ...candidate,
      role: "MEMBER",
      status: candidate.displayName === "이서연" ? "NEEDS_LEADER" : "MEMBER_ONLY",
    })),
    currentUserName: "정현",
    roomName: "프로젝트룸",
    rules: defaultHandoffRules,
    title: "프로젝트 리더 위임",
  },
};

export const SmallTeam: Story = {
  args: {
    candidates: defaultHandoffCandidates.slice(0, 2),
    currentUserName: "김지현",
    roomName: "디자인 검토 프로젝트룸",
    rules: defaultHandoffRules,
  },
};
