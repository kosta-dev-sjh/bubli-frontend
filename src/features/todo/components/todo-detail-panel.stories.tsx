import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TodoDetailPanel, type TodoDetail } from "./todo-detail-panel";

const meta = {
  component: TodoDetailPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Todo/TodoDetailPanel",
} satisfies Meta<typeof TodoDetailPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const personalTodo: TodoDetail = {
  description: "프로젝트룸에 묶기 전 개인적으로 먼저 정리해둘 질문입니다.",
  dueLabel: "내일",
  id: "todo-personal-question",
  progressPercent: 16,
  scope: "PERSONAL",
  source: "DIRECT",
  status: "TODO",
  surfaces: ["DASHBOARD", "BUBBLE"],
  title: "회의 전 확인 질문 정리",
};

const reviewTodo: TodoDetail = {
  assigneeLabel: "나",
  description: "에이전트가 문서에서 뽑은 후보를 승인해 만들어진 작업입니다. 검토가 끝나면 완료로 바꿉니다.",
  dueLabel: "D-2",
  id: "todo-review-translation",
  linkedProjectRoomLabel: "웹사이트 개편",
  progressPercent: 74,
  scope: "PROJECT_ROOM",
  source: "APPROVED_CANDIDATE",
  status: "REVIEW",
  surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE", "SCHEDULE"],
  title: "1차 번역본 검토",
};

export const Default: Story = {};

export const PersonalTodo: Story = {
  args: {
    todo: personalTodo,
  },
};

export const ReviewTodo: Story = {
  args: {
    todo: reviewTodo,
  },
};
