import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomRetentionPolicyPanel } from "./project-room-retention-policy-panel";

const meta = {
  component: ProjectRoomRetentionPolicyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 활성 기간, 읽기 전용 보관, 프로젝트 리더 0명 방지, 삭제 검토 흐름을 한 화면에서 확인하는 정책 패널입니다.",
      },
    },
  },
  title: "Features/ProjectRoom/ProjectRoomRetentionPolicyPanel",
} satisfies Meta<typeof ProjectRoomRetentionPolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActiveRoomPolicy: Story = {
  args: {
    activeUntilLabel: "2026.12.23까지",
    leaderCount: 1,
    memberCount: 4,
    retentionActions: [
      {
        description: "프로젝트룸을 읽기 전용으로 두고 자료, 채팅, WBS 기록을 보존합니다.",
        icon: "archive",
        label: "보관으로 전환",
      },
      {
        description: "마지막 리더가 나가기 전 다른 활성 멤버에게 리더 권한을 넘깁니다.",
        icon: "leader",
        label: "리더 권한 넘기기",
      },
      {
        description: "자료와 작업 기록에 영향을 주기 때문에 삭제 전 확인 단계를 둡니다.",
        icon: "delete",
        label: "삭제 검토",
      },
    ],
    retentionRules: [
      {
        description: "프로젝트룸은 기본 6개월 동안 활성 상태로 관리합니다.",
        label: "활성 기간",
        status: "active",
        value: "6개월",
      },
      {
        description: "기간이 지나면 자료와 대화 기록을 유지한 채 읽기 전용으로 둘 수 있습니다.",
        label: "만료 후 처리",
        status: "readonly",
        value: "보관",
      },
      {
        description: "활성 프로젝트룸에는 최소 1명의 프로젝트 리더가 있어야 합니다.",
        label: "리더 보호",
        status: "active",
        value: "1명 이상",
      },
      {
        description: "보관 기간이 끝나기 전까지 프로젝트룸 자료를 즉시 지우지 않습니다.",
        label: "자료 보존",
        status: "active",
        value: "유지",
      },
    ],
    roomName: "Bubli 제품 개발룸",
  },
};

export const LastLeaderNeedsTransfer: Story = {
  args: {
    activeUntilLabel: "읽기 전용 전환 필요",
    leaderCount: 0,
    memberCount: 3,
    retentionActions: [
      {
        description: "활성 멤버 중 한 명에게 프로젝트 리더 권한을 먼저 넘겨야 합니다.",
        icon: "leader",
        label: "리더 지정 필요",
      },
      {
        description: "리더가 지정될 때까지 나가기와 역할 변경을 막습니다.",
        icon: "archive",
        label: "설정 잠금",
      },
      {
        description: "혼자 남은 리더라면 보관 또는 삭제 검토를 선택할 수 있습니다.",
        icon: "delete",
        label: "삭제 검토",
      },
    ],
    retentionRules: [
      {
        description: "리더가 없으면 초대, 역할 변경, 보관 설정을 안전하게 확정할 수 없습니다.",
        label: "리더 보호",
        status: "needsLeader",
        value: "필요",
      },
      {
        description: "읽기 전용 전환은 자료와 대화 기록을 남기는 방향으로 처리합니다.",
        label: "만료 후 처리",
        status: "readonly",
        value: "읽기 전용",
      },
      {
        description: "삭제 검토는 프로젝트룸 자료와 작업 기록에 영향을 주므로 별도 확인이 필요합니다.",
        label: "위험 작업",
        status: "blocked",
        value: "확인",
      },
      {
        description: "활성 기간이 끝나도 자료를 즉시 지우지 않습니다.",
        label: "자료 보존",
        status: "readonly",
        value: "유지",
      },
    ],
    roomName: "신규 홈페이지 리뉴얼",
  },
};
