import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultAssignedTodos,
  defaultTodoSurfaces,
  TodoAssigneeReflectionPanel,
} from "./todo-assignee-reflection-panel";

const meta = {
  component: TodoAssigneeReflectionPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 프로젝트룸 TODO와 개인 TODO 관계를 바탕으로, 같은 서버 작업이 담당자 기준으로 대시보드와 버블에 표시되는 구조를 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Todo/TodoAssigneeReflectionPanel",
} satisfies Meta<typeof TodoAssigneeReflectionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    surfaces: defaultTodoSurfaces,
    todos: defaultAssignedTodos,
  },
};

export const OnlyMine: Story = {
  args: {
    surfaces: defaultTodoSurfaces.map((surface) => ({ ...surface, syncedCount: surface.surface === "WORK_BOARD" ? 2 : 2 })),
    title: "내 TODO만 모아보기",
    todos: defaultAssignedTodos.filter((todo) => todo.assigneeLabel === "정현"),
  },
};

export const LightWorkload: Story = {
  args: {
    surfaces: defaultTodoSurfaces.map((surface) => ({ ...surface, syncedCount: 1 })),
    title: "마감 여유 상태",
    todos: [
      {
        assigneeLabel: "정현",
        dueLabel: "6.30",
        id: "todo-style-check",
        priority: "LOW",
        progressPercent: 12,
        projectRoomLabel: "브랜드 소개 페이지",
        title: "문구 톤 검토",
      },
    ],
  },
};
