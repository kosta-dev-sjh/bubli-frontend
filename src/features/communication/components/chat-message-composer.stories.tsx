import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatMessageComposer } from "./chat-message-composer";

const meta = {
  component: ChatMessageComposer,
  parameters: {
    docs: {
      description: {
        component:
          "채팅 메시지 입력과 전송 상태를 보여주는 소통 컴포넌트입니다. v14 기준의 client_message_id 중복 방지, 서버 저장 후 SENT 확정, /bubli 명령어 응답 저장, 게스트 입력 제한을 반영했습니다.",
      },
    },
    layout: "padded",
  },
  title: "Features/Communication/ChatMessageComposer",
} satisfies Meta<typeof ChatMessageComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
