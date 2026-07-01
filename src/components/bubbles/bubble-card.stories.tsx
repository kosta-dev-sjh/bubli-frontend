import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BubbleCard } from "@/components/bubbles/bubble-card";
import { Button } from "@/components/ui/button";

const meta = {
  tags: ["uikit", "bubbles"],
  component: BubbleCard,
  parameters: {
    docs: {
      description: {
        component:
          "버블은 개인 위젯 단위입니다. 프로젝트룸 화면을 복제하지 않고, 사용자가 접근 가능한 서버 기록과 기기 안 상태를 짧게 보여줍니다.",
      },
    },
  },
  title: "Bubbles/BubbleCard",
} satisfies Meta<typeof BubbleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WidgetSet: Story = {
  args: {
    type: "todo",
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gap: 18,
        gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
        maxWidth: 760,
      }}
    >
      <BubbleCard
        items={["작업범위 납품일 확인", "회의록 검수 기준 정리", "용어집 초안 검토"]}
        meta="3 / 6 완료"
        progressLabel="오늘 할 일"
        progressValue={50}
        type="todo"
      />
      <BubbleCard
        items={["확인 질문 후보 3개", "WBS 후보 2개", "자료 제안 4개"]}
        meta="승인 전"
        type="agent"
      />
      <BubbleCard
        items={["프로젝트룸 채팅 새 메시지 2개", "보이스 대기방 참여 가능"]}
        meta="채팅과 보이스"
        type="communication"
      />
      <BubbleCard
        actions={<Button size="sm" variant="primary">타이머 계속</Button>}
        items={["마지막 heartbeat 기준 복구 가능"]}
        meta="42:18"
        type="timer"
      />
    </div>
  ),
};

export const DisplayModes: Story = {
  args: {
    type: "todo",
  },
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
      <BubbleCard items={["오늘 회의 전 확인"]} type="memo" />
      <BubbleCard displayMode="ghost" items={["작업 중 화면 위에 희미하게 표시"]} type="schedule" />
      <BubbleCard displayMode="minimized" meta="3개" type="notification" />
    </div>
  ),
};
