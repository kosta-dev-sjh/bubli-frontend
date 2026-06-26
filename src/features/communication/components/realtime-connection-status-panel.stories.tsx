import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RealtimeConnectionStatusPanel } from "./realtime-connection-status-panel";

const meta = {
  component: RealtimeConnectionStatusPanel,
  parameters: {
    docs: {
      description: {
        component:
          "회원 웹 앱과 데스크탑 앱의 채팅, 알림, 프로젝트룸 이벤트 연결 상태를 보여주는 패널입니다. 서버 원본을 기준으로 두고, 데스크탑 앱은 기기 안 임시 보관을 빠른 표시와 보충용으로 쓰는 기획 기준을 반영합니다.",
      },
    },
  },
  title: "Features/Communication/RealtimeConnectionStatusPanel",
} satisfies Meta<typeof RealtimeConnectionStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TauriRecovered: Story = {
  args: {
    appMode: "tauri",
    connectionState: "CONNECTED",
    lastSyncedLabel: "최근 동기화 12초 전",
  },
};

export const WebReconnecting: Story = {
  args: {
    appMode: "web",
    connectionState: "RECONNECTING",
    lastSyncedLabel: "재연결 시도 중",
    topics: [
      {
        id: "chat",
        label: "채팅 메시지",
        lastEventLabel: "최근 메시지 100개 조회 완료",
        lagLabel: "3초 전",
        sourceLabel: "서버 채팅 원본",
        state: "RECONNECTING",
        topic: "/topic/chat/{chatRoomId}",
      },
      {
        id: "room-events",
        label: "프로젝트룸 이벤트",
        lastEventLabel: "에이전트 완료 이벤트 대기",
        lagLabel: "연결 확인 중",
        sourceLabel: "에이전트 정리와 자료",
        state: "DEGRADED",
        topic: "/topic/project-rooms/{roomId}/events",
      },
      {
        id: "notifications",
        label: "개인 알림",
        lastEventLabel: "알림 조회 가능",
        lagLabel: "방금 전",
        sourceLabel: "알림 원본",
        state: "CONNECTED",
        topic: "/user/queue/notifications",
      },
    ],
  },
};
