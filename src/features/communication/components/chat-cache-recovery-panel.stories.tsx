import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatCacheRecoveryPanel } from "@/features/communication/components/chat-cache-recovery-panel";

const meta = {
  component: ChatCacheRecoveryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 채팅은 서버 chat_messages가 원본이고, Tauri SQLite의 local_room_message_cache는 기기별 캐시입니다. 캐시가 비거나 손상돼도 room_sequence 기준으로 서버에서 다시 보충해야 합니다.",
      },
    },
  },
  title: "Features/Communication/ChatCacheRecoveryPanel",
} satisfies Meta<typeof ChatCacheRecoveryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HealthyCache: Story = {
  args: {
    cachedCount: 100,
    cacheStatus: "valid",
    lastRoomSequence: 1280,
    roomLabel: "신축 사옥 이전 프로젝트룸",
    serverSequence: 1280,
    steps: [
      {
        description: "Tauri는 채팅방 진입 시 로컬 캐시의 최근 메시지를 먼저 보여줍니다.",
        label: "캐시 우선 표시",
        state: "valid",
      },
      {
        description: "서버의 마지막 sequence와 같아서 추가 요청할 메시지가 없습니다.",
        label: "sequence 일치",
        state: "valid",
      },
      {
        description: "새 메시지는 WebSocket으로 받고, 같은 메시지는 서버 ID 기준으로 중복 저장하지 않습니다.",
        label: "실시간 보충",
        state: "valid",
      },
    ],
  },
};

export const RebuildFromServer: Story = {
  args: {
    cachedCount: 0,
    cacheStatus: "corrupted",
    lastRoomSequence: 0,
    roomLabel: "Bubli 제품 개발룸",
    serverSequence: 942,
    steps: [
      {
        description: "캐시가 열리지 않거나 무결성 검사에 실패하면 서버 원본을 기준으로 다시 만듭니다.",
        label: "캐시 손상 감지",
        state: "corrupted",
      },
      {
        description: "서버에서 최근 100개 메시지를 다시 내려받고 local_room_cache_state를 갱신합니다.",
        label: "최근 메시지 재생성",
        state: "rebuilding",
      },
      {
        description: "복구 뒤에는 afterSequence로 빠진 구간만 요청합니다. 다른 기기의 캐시와 직접 맞추지 않습니다.",
        label: "기기별 캐시 유지",
        state: "stale",
      },
    ],
  },
};
