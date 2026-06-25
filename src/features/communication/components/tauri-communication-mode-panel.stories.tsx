import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TauriCommunicationModePanel } from "./tauri-communication-mode-panel";

const meta = {
  component: TauriCommunicationModePanel,
  parameters: {
    docs: {
      description: {
        component:
          "회원 웹 앱의 소통 탭과 Tauri 앱의 별도 소통 창, 소통 버블이 같은 서버 연결을 쓰는 기준을 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Communication/TauriCommunicationModePanel",
} satisfies Meta<typeof TauriCommunicationModePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const channels = [
  {
    description: "친구 목록에서 시작하는 대화입니다. 서버 채팅 원본을 기준으로 읽음 상태를 맞춥니다.",
    label: "1:1 채팅",
    tone: "communication" as const,
  },
  {
    description: "프로젝트룸 안에서 자료와 작업 맥락을 함께 보는 채팅입니다.",
    label: "프로젝트룸 채팅",
    tone: "room" as const,
  },
  {
    description: "프로젝트룸 안에서 빠르게 맥락을 맞추는 보이스입니다.",
    label: "프로젝트룸 보이스",
    tone: "agent" as const,
  },
];

const sharedConnections = [
  {
    description: "메시지 전송, 읽음 상태, 보이스 입장은 같은 서버 기준을 씁니다.",
    label: "같은 서버",
    status: "ready" as const,
  },
  {
    description: "채팅 메시지와 알림은 같은 실시간 연결을 쓰고, Tauri는 필요한 메시지만 캐시합니다.",
    label: "같은 실시간 연결",
    status: "ready" as const,
  },
  {
    description: "배포된 회원 웹 앱 연결에서 서버가 내려준 보이스 연결 정보만 사용합니다.",
    label: "같은 보이스 연결",
    status: "ready" as const,
  },
];

export const WebChatTab: Story = {
  args: {
    channels,
    sharedConnections,
    surface: "web-tab",
    webRoute: "/app/chat",
  },
};

export const TauriCommunicationWindow: Story = {
  args: {
    channels,
    sharedConnections,
    surface: "tauri-window",
    webRoute: "/app/chat",
  },
};

export const CommunicationBubble: Story = {
  args: {
    channels,
    sharedConnections: [
      ...sharedConnections,
      {
        description: "최근 메시지와 알림 표시만 로컬 캐시에 남깁니다. 원본은 서버 채팅 기록입니다.",
        label: "기기 안 채팅 캐시",
        status: "checking" as const,
      },
    ],
    surface: "bubble",
    webRoute: "/app/chat",
  },
};
