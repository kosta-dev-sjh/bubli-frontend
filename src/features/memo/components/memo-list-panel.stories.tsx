import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MemoListPanel, type MemoListItem } from "./memo-list-panel";

const meta = {
  component: MemoListPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Memo/MemoListPanel",
} satisfies Meta<typeof MemoListPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const personalOnly: MemoListItem[] = [
  {
    body: "개인적으로 정리한 질문입니다. 공유하기 전까지 프로젝트룸 자료에는 보이지 않습니다.",
    id: "personal-memo-only",
    scope: "PERSONAL",
    status: "LOCAL_DRAFT",
    title: "개인 질문 초안",
    updatedLabel: "로컬 초안 방금 전",
  },
];

export const Default: Story = {};

export const PersonalOnly: Story = {
  args: {
    memos: personalOnly,
  },
};

export const Empty: Story = {
  args: {
    memos: [],
  },
};
