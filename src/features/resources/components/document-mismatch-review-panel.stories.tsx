import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultMismatchItems,
  defaultMismatchMetrics,
  DocumentMismatchReviewPanel,
} from "./document-mismatch-review-panel";

const meta = {
  component: DocumentMismatchReviewPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 문서 간 비교 흐름을 바탕으로, 기준 자료·견적서·요구사항 문서 사이의 다른 값과 빠진 조건을 확인 필요 항목으로 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Resources/DocumentMismatchReviewPanel",
} satisfies Meta<typeof DocumentMismatchReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: defaultMismatchItems,
    metrics: defaultMismatchMetrics,
  },
};

export const MostlyResolved: Story = {
  args: {
    items: defaultMismatchItems.map((item) =>
      item.id === "delivery-date" || item.id === "inspection-rule" ? { ...item, status: "RESOLVED" } : item,
    ),
    metrics: [
      { label: "비교 문서", tone: "room", value: "3개" },
      { label: "확인 필요", tone: "warning", value: "2개" },
      { label: "정리됨", tone: "approved", value: "2개" },
    ],
    title: "정리 중인 문서 차이",
  },
};

export const CompactList: Story = {
  args: {
    items: defaultMismatchItems.slice(0, 2),
    metrics: defaultMismatchMetrics,
    title: "중요 항목만 보기",
  },
};
