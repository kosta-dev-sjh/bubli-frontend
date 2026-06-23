import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { VoiceTokenSafetyPanel } from "@/features/communication/components/voice-token-safety-panel";

const meta = {
  component: VoiceTokenSafetyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 보이스챗의 토큰 발급, 게스트 참여 제한, LiveKit secret 미노출, 녹음 제외 기준을 보여줍니다. 웹과 Tauri 보이스 버블은 같은 서버 API와 LiveKit 연결을 사용합니다.",
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
        label: "링크 미수락 사용자",
        roleLabel: "초대 대기",
        stateLabel: "토큰 발급 전",
      },
    ],
    roomLabel: "Bubli 제품 개발룸",
    rules: [
      {
        description: "LiveKit key와 secret은 서버에만 둡니다. 클라이언트는 serverUrl과 접속 토큰만 받습니다.",
        label: "서버 토큰 발급",
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
    tokenEndpointLabel: "POST /api/voice/rooms/{id}/token",
  },
};

export const GuestVoiceLimited: Story = {
  args: {
    participants: [
      {
        canJoinVoice: true,
        label: "게스트 민지",
        roleLabel: "게스트 세션 ACTIVE",
        stateLabel: "임시 참여",
      },
      {
        canJoinVoice: false,
        label: "만료된 게스트",
        roleLabel: "게스트 세션 EXPIRED",
        stateLabel: "참여 종료",
      },
      {
        canJoinVoice: false,
        label: "자료보드 접근",
        roleLabel: "게스트 제한",
        stateLabel: "차단",
      },
    ],
    roomLabel: "게스트 링크 보이스",
    rules: [
      {
        description: "게스트는 프로젝트룸 멤버가 아닙니다. ACTIVE 세션과 만료 시간을 확인한 뒤 토큰을 발급합니다.",
        label: "게스트 세션 확인",
        status: "limited",
      },
      {
        description: "게스트는 채팅과 보이스챗만 사용할 수 있습니다. 자료, WBS, 일정, 다운로드는 사용할 수 없습니다.",
        label: "접근 범위 제한",
        status: "blocked",
      },
      {
        description: "프로젝트 리더가 세션을 종료하거나 시간이 지나면 채팅 입력과 보이스 참가를 막습니다.",
        label: "만료 처리",
        status: "limited",
      },
    ],
    tokenEndpointLabel: "POST /api/voice/rooms/{id}/guest-token",
  },
};
