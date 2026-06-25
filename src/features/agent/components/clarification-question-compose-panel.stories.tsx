import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ClarificationQuestionComposePanel,
  defaultComposeRules,
  defaultQuestionDrafts,
  defaultReviewItems,
} from "./clarification-question-compose-panel";

const meta = {
  component: ClarificationQuestionComposePanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 확인 필요 항목과 문서 초안 제안 흐름을 바탕으로, 클라이언트에게 보낼 질문 후보를 사용자가 검토하는 패널입니다.",
      },
    },
  },
  title: "Features/Agent/ClarificationQuestionComposePanel",
} satisfies Meta<typeof ClarificationQuestionComposePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    drafts: defaultQuestionDrafts,
    reviewItems: defaultReviewItems,
    rules: defaultComposeRules,
  },
};

export const AllSelected: Story = {
  args: {
    drafts: defaultQuestionDrafts.map((draft) => ({ ...draft, status: "SELECTED" })),
    reviewItems: defaultReviewItems,
    rules: defaultComposeRules,
    title: "보낼 질문 확인",
  },
};

export const MinimalReview: Story = {
  args: {
    drafts: defaultQuestionDrafts.slice(0, 1),
    reviewItems: defaultReviewItems.slice(0, 1),
    rules: defaultComposeRules,
    title: "납품일 질문 초안",
  },
};
