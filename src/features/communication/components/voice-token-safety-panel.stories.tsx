import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { VoiceTokenSafetyPanel } from "@/features/communication/components/voice-token-safety-panel";

const meta = {
  component: VoiceTokenSafetyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 보이스챗의 참여 권한 발급, 멤버 권한 확인, 내부 키 미노출, 녹음 제외 기준을 보여줍니다. 웹과 앱 보이스 버블은 같은 서버 연결을 사용합니다.",
      },
    },
  },
  title: "Features/Communication/VoiceTokenSafetyPanel",
} satisfies Meta<typeof VoiceTokenSafetyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProjectRoomVoiceToken: Story = {
  args: {
    participants: [
      {
        canJoinVoice: true,
        label: "김정현",
        roleLabel: "프로젝트 리더",
        stateLabel: "참여 가능",
      },
      {
        canJoinVoice: true,
        label: "이서연",
        roleLabel: "멤버",
        stateLabel: "참여 가능",
      },
      {
        canJoinVoice: false,
        label: "초대 미수락 사용자",
        roleLabel: "초대 대기",
        stateLabel: "참여 권한 없음",
      },
    ],
    roomLabel: "Bubli 제품 개발룸",
    rules: [
      {
        description: "보이스 내부 키는 서버에만 둡니다. 앱은 서버가 확인한 참여 정보만 받습니다.",
        label: "서버 참여 권한 발급",
        status: "safe",
      },
      {
        description: "보이스 참가 전 프로젝트룸 멤버 권한과 채팅방 접근 권한을 다시 확인합니다.",
        label: "참가 권한 확인",
        status: "safe",
      },
      {
        description: "보이스챗은 실시간 소통까지만 다룹니다. 녹음과 음성 요약은 기본 기능에 넣지 않습니다.",
        label: "녹음 제외",
        status: "blocked",
      },
    ],
    tokenEndpointLabel: "서버에서 보이스 참여 정보를 발급",
  },
};

export const PendingMemberBlocked: Story = {
  args: {
    participants: [
      {
        canJoinVoice: true,
        label: "김정현",
        roleLabel: "프로젝트 리더",
        stateLabel: "참여 가능",
      },
      {
        canJoinVoice: false,
        label: "초대 대기 사용자",
        roleLabel: "초대 수락 전",
        stateLabel: "참여 권한 없음",
      },
      {
        canJoinVoice: false,
        label: "자료보드 접근",
        roleLabel: "비멤버 제한",
        stateLabel: "차단",
      },
    ],
    roomLabel: "프로젝트룸 보이스",
    rules: [
      {
        description: "초대 대기 사용자는 아직 프로젝트룸 멤버가 아니므로 보이스 참여 권한을 발급하지 않습니다.",
        label: "멤버 권한 확인",
        status: "limited",
      },
      {
        description: "프로젝트룸 멤버가 아니면 자료, WBS, 일정, 다운로드와 보이스 참여를 차단합니다.",
        label: "접근 범위 제한",
        status: "blocked",
      },
      {
        description: "초대를 수락해 프로젝트룸 멤버가 된 뒤에만 보이스 참여 대상이 됩니다.",
        label: "수락 후 참여",
        status: "limited",
      },
    ],
    tokenEndpointLabel: "서버에서 보이스 참여 정보를 발급",
  },
};
