import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultTodos, TodoListPanel } from "./todo-list-panel";

const meta = {
  component: TodoListPanel,
  parameters: {
    docs: {
      description: {
        component:
          "개인 TODO와 프로젝트룸 TODO를 한 화면에서 보고, 담당자 기준으로 대시보드와 TODO 버블에 함께 표시되는 구조를 확인하는 1차 컴포넌트입니다.",
      },
    },
  },
  title: "Todo/TodoListPanel",
} satisfies Meta<typeof TodoListPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    todos: defaultTodos,
  },
};

export const PersonalOnly: Story = {
  args: {
    selectedFilter: "PERSONAL",
    title: "개인 TODO",
    todos: defaultTodos,
  },
};

export const ProjectRoomOnly: Story = {
  args: {
    selectedFilter: "PROJECT_ROOM",
    title: "프로젝트룸 TODO",
    todos: defaultTodos,
  },
};

export const EmptyReady: Story = {
  args: {
    title: "오늘 볼 TODO",
    todos: [],
  },
};
