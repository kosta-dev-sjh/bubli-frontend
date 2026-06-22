import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ClarificationQuestionDraftPanel } from "@/features/agent/components/clarification-question-draft-panel";

const meta = {
  component: ClarificationQuestionDraftPanel,
  parameters: {
    docs: {
      description: {
        component:
          "문서에서 발견한 값 차이, 빠진 조건, 모호한 표현을 클라이언트나 팀원에게 확인할 질문 후보로 정리하는 패널입니다. 질문은 사용자가 확인한 뒤 복사하거나 초안으로 저장합니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/Agent/ClarificationQuestionDraftPanel",
} satisfies Meta<typeof ClarificationQuestionDraftPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DraftQueue: Story = {
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <ClarificationQuestionDraftPanel {...args} />
    </main>
  ),
};

export const SelectedQuestion: Story = {
  args: {
    drafts: [
      {
        confidence: 91,
        id: "question-due-date",
        question: "최종 납품일은 7월 5일과 7월 10일 중 어느 날짜가 맞을까요?",
        sourceLabel: "계약서 2쪽, 견적서 1쪽",
        status: "APPROVED",
        tone: "conflict",
        triggerLabel: "납품일 후보가 문서마다 다름",
      },
      {
        confidence: 86,
        id: "question-review-standard",
        question: "검수 기준과 수정 가능 횟수를 문서에 맞춰 한 번 더 확인해 주실 수 있을까요?",
        sourceLabel: "요구사항정의서_v1.3.pdf",
        status: "DRAFT",
        tone: "missing",
        triggerLabel: "검수 기준이 계약서에 없음",
      },
      {
        confidence: 79,
        id: "question-copyright",
        question: "완료된 번역본의 사용 범위와 저작권 표기 방식은 어떤 기준으로 진행하면 될까요?",
        sourceLabel: "계약서 4쪽",
        status: "HELD",
        tone: "unclear",
        triggerLabel: "사용 범위 표현이 모호함",
      },
    ],
    selectedDraftId: "question-review-standard",
  },
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <ClarificationQuestionDraftPanel {...args} />
    </main>
  ),
};
