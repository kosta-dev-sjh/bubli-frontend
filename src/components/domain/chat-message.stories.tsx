import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatMessage } from "@/components/domain/chat-message";

const meta = {
  tags: ["uikit", "domain"],
  args: { author: "나", message: "메시지 예시" },
  component: ChatMessage,
  parameters: {
    docs: {
      description: {
        component:
          "소통 메시지 단위. 말풍선도 Paper Glass 계열(거의 흰색). 에이전트 메시지는 Opal Lilac rim, 실패는 rose 작은 신호. 채팅 전체를 색으로 칠하지 않는다.",
      },
    },
  },
  title: "Domain/ChatMessage",
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const wrap = { display: "grid", gap: 12, width: 480 } as const;

export const User: Story = {
  render: () => (
    <div style={wrap}>
      <ChatMessage author="김미연" message="검수 기준은 기준 자료 기준으로 다시 확인해볼게요." roleLabel="프리랜서 사용자" timeLabel="10:24" />
    </div>
  ),
};

export const Mine: Story = {
  render: () => (
    <div style={wrap}>
      <ChatMessage author="나" message="질문 후보로 정리해줘." mine roleLabel="프리랜서 사용자" timeLabel="10:26" />
    </div>
  ),
};

export const Agent: Story = {
  render: () => (
    <div style={wrap}>
      <ChatMessage
        author="Bubli"
        className="bubli-chat-message--agent"
        message="기준 자료와 회의록의 납품일 표현이 다릅니다. 확인 질문 후보를 만들 수 있어요."
        roleLabel="프로젝트룸 에이전트"
        timeLabel="10:25"
      />
    </div>
  ),
};

export const System: Story = {
  render: () => (
    <div style={wrap}>
      <ChatMessage author="시스템" className="bubli-chat-message--system" message="나님이 프로젝트룸에 참여했습니다." timeLabel="10:20" />
    </div>
  ),
};

export const Pending: Story = {
  render: () => (
    <div style={wrap}>
      <ChatMessage author="나" className="bubli-chat-message--pending" message="전송 중…" mine timeLabel="방금" />
    </div>
  ),
};

export const Failed: Story = {
  render: () => (
    <div style={wrap}>
      <ChatMessage author="나" className="bubli-chat-message--failed" message="전송에 실패했어요. 다시 시도해주세요." mine timeLabel="방금" />
    </div>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 20, padding: 24, width: 500 }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <div style={{ display: "grid", gap: 12 }}>
        <ChatMessage author="김미연" message="검수 기준은 기준 자료 기준으로 확인할게요." roleLabel="프리랜서 사용자" timeLabel="10:24" />
        <ChatMessage author="Bubli" className="bubli-chat-message--agent" message="확인 질문 후보를 만들 수 있어요." roleLabel="프로젝트룸 에이전트" timeLabel="10:25" />
        <ChatMessage author="나" message="좋아, 정리해줘." mine timeLabel="10:26" />
      </div>
    </DarkFrame>
  ),
};
