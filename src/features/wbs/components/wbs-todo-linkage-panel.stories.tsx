import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  WbsTodoLinkagePanel,
  defaultLinkageRules,
  defaultTodoLinks,
  defaultWbsCandidates,
} from "./wbs-todo-linkage-panel";

const meta = {
  component: WbsTodoLinkagePanel,
  parameters: {
    docs: {
      description: {
        component:
          "WBS 후보를 승인하면 하나의 TODO가 생성되고 작업판, 대시보드, 버블, 캘린더에 같은 원본으로 표시되는 구조 패널입니다.",
      },
    },
  },
  title: "WBS/WbsTodoLinkagePanel",
} satisfies Meta<typeof WbsTodoLinkagePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    candidates: defaultWbsCandidates,
    links: defaultTodoLinks,
    progress: 68,
    projectRoomName: "번역 프로젝트룸",
    rules: defaultLinkageRules,
    todoTitle: "1차 번역본 검토",
  },
};

export const ReviewHeavy: Story = {
  args: {
    candidates: defaultWbsCandidates.map((candidate) => ({
      ...candidate,
      status: candidate.code === "1.2.1" ? "APPROVED" : "PENDING",
    })),
    links: defaultTodoLinks,
    progress: 32,
    projectRoomName: "웹사이트 개편 프로젝트룸",
    rules: defaultLinkageRules,
    title: "WBS 후보 검토 중",
    todoTitle: "메인 페이지 와이어프레임",
  },
};

export const FullyLinked: Story = {
  args: {
    candidates: defaultWbsCandidates.map((candidate) => ({
      ...candidate,
      status: "APPROVED",
    })),
    links: defaultTodoLinks,
    progress: 100,
    projectRoomName: "제품 소개 프로젝트룸",
    rules: defaultLinkageRules,
    title: "TODO 연결 완료",
    todoTitle: "최종 납품 자료 확인",
  },
};
