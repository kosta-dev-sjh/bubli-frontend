import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceShareApprovalPanel } from "@/features/resources/components/resource-share-approval-panel";

const meta = {
  argTypes: {
    onApproveShare: { action: "approve share" },
    onCancel: { action: "cancel" },
    onOpenResource: { action: "open personal resource" },
    onSelectRoom: { action: "select project room" },
  },
  component: ResourceShareApprovalPanel,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1120 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "개인 자료를 프로젝트룸 자료로 공유하기 전, 대상 프로젝트룸과 권한을 확인하는 승인 패널입니다. 공유 전에는 멤버와 프로젝트룸 에이전트가 개인 자료를 볼 수 없다는 기획 기준을 UI에 반영합니다.",
      },
    },
  },
  title: "Features/Resources/ResourceShareApprovalPanel",
} satisfies Meta<typeof ResourceShareApprovalPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadyToShare: Story = {
  args: {
    readiness: "READY",
    resourceTitle: "개인_계약검토_메모.md",
    targetRoom: {
      memberCountLabel: "멤버 4명",
      name: "신축 홈페이지 리뉴얼",
      roleLabel: "프로젝트 리더",
    },
  },
};

export const PermissionBlocked: Story = {
  args: {
    auditItems: [
      {
        description: "현재 자료는 본인만 볼 수 있는 개인 자료입니다.",
        id: "personal-visibility",
        label: "개인 자료 기준 확인",
        status: "PASSED",
      },
      {
        description: "선택한 프로젝트룸에서 나간 상태라 자료를 공유할 수 없습니다.",
        id: "room-member",
        label: "프로젝트룸 접근 권한",
        status: "BLOCKED",
      },
      {
        description: "권한 문제가 해결되면 공유 이력을 남길 수 있습니다.",
        id: "share-event",
        label: "공유 이력 기록",
        status: "PENDING",
      },
    ],
    readiness: "NO_PERMISSION",
    resourceTitle: "개인_참고자료_번역가이드.pdf",
    targetRoom: {
      memberCountLabel: "멤버 상태 확인 필요",
      name: "일본어 번역 캠페인",
      roleLabel: "멤버",
    },
  },
};
