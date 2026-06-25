import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetItemStatePanel } from "./widget-item-state-panel";

const meta = {
  component: WidgetItemStatePanel,
  parameters: {
    docs: {
      description: {
        component:
          "버블에 표시된 항목을 확인, 숨김, 고정, 나중에 보기로 처리하고 widget_item_states에 저장하는 패널입니다.",
      },
    },
  },
  title: "Features/Widget/WidgetItemStatePanel",
} satisfies Meta<typeof WidgetItemStatePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MixedBubbleItems: Story = {
  args: {
    items: [
      {
        bubbleType: "todo",
        itemId: "task-102",
        itemType: "TASK",
        meta: "오늘 마감인 작업입니다. 확인하면 TODO 버블에서는 처리된 항목으로 접힙니다.",
        sourceLabel: "신축 사옥 이전 프로젝트",
        state: "visible",
        title: "전기 공사 시방서 확인",
        updatedAt: "10분 전",
      },
      {
        bubbleType: "agent",
        itemId: "suggestion-431",
        itemType: "AGENT_SUGGESTION",
        meta: "요구사항 문서에서 관리자 권한 범위 확인 질문이 생성됐습니다.",
        sourceLabel: "에이전트 제안",
        state: "pinned",
        title: "권한 범위 질문 후보",
        updatedAt: "25분 전",
      },
      {
        bubbleType: "chat",
        itemId: "message-889",
        itemType: "MESSAGE",
        meta: "프로젝트룸 채팅에서 담당자 멘션이 들어온 메시지입니다.",
        sourceLabel: "소통 버블",
        state: "snoozed",
        title: "WBS 초안 확인 요청",
        updatedAt: "1시간 전",
      },
      {
        bubbleType: "notification",
        itemId: "notification-221",
        itemType: "NOTIFICATION",
        meta: "자료 새 버전 업로드 알림입니다. 숨기면 알림 버블에서 다시 보이지 않습니다.",
        sourceLabel: "알림",
        state: "hidden",
        title: "요구사항 정리서 새 버전",
        updatedAt: "어제",
      },
    ],
  },
};

export const ResourceSuggestionStates: Story = {
  args: {
    items: [
      {
        bubbleType: "resource",
        itemId: "resource-901",
        itemType: "RESOURCE_RELATION",
        meta: "현재 TODO와 관련 있는 회의록으로 제안된 자료입니다.",
        sourceLabel: "자료 제안",
        state: "visible",
        title: "회의록_0618.md",
        updatedAt: "방금 전",
      },
      {
        bubbleType: "resource",
        itemId: "resource-902",
        itemType: "RESOURCE_RELATION",
        meta: "이미 확인한 참고 자료입니다. 상태는 같은 항목 row를 갱신해 유지합니다.",
        sourceLabel: "자료 제안",
        state: "confirmed",
        title: "계약서_최종본.pdf",
        updatedAt: "오늘 09:42",
      },
    ],
    title: "자료 제안 버블 상태",
  },
};
