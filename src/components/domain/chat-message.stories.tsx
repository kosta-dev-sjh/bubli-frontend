import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatMessage } from "@/components/domain/chat-message";

const meta = {
  component: ChatMessage,
  parameters: {
    docs: {
      description: {
        component:
          "회원 웹 앱 소통 탭과 데스크탑 소통 버블에서 함께 쓰는 메시지 단위입니다. 프로젝트룸 채팅 원본은 서버 기록 기준입니다.",
      },
    },
  },
  title: "Domain/ChatMessage",
} satisfies Meta<typeof ChatMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RoomChat: Story = {
  args: {
    author: "정현",
    message: "메시지 예시",
  },
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 520 }}>
      <ChatMessage
        author="김미연"
        message="검수 기준은 계약서 기준으로 다시 확인해볼게요."
        roleLabel="프리랜서 사용자"
        timeLabel="10:24"
      />
      <ChatMessage
        author="Bubli"
        message="계약서와 회의록의 납품일 표현이 다릅니다. 확인 질문 후보를 만들 수 있습니다."
        roleLabel="프로젝트룸 에이전트"
        timeLabel="10:25"
      />
      <ChatMessage
        author="정현"
        message="질문 후보로 정리해줘."
        mine
        roleLabel="프리랜서 사용자"
        timeLabel="10:26"
      />
    </div>
  ),
};
