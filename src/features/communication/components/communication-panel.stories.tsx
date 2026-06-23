import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CommunicationPanel } from "@/features/communication/components/communication-panel";

const meta = {
  component: CommunicationPanel,
  parameters: {
    docs: {
      description: {
        component:
          "소통 화면은 친구, 1:1 채팅, 프로젝트룸 채팅, 프로젝트룸 보이스, 게스트 임시 참여, 프로젝트룸 에이전트 호출을 구분합니다. Tauri 앱에서는 메인 탭을 숨기더라도 버블이나 전용 창에서 같은 연결을 씁니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/Communication/CommunicationPanel",
} satisfies Meta<typeof CommunicationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <CommunicationPanel />
    </main>
  ),
};
