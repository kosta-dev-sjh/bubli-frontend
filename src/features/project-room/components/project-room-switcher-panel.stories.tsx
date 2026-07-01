import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectRoomSwitcherPanel, type ProjectRoomSwitcherPanelProps } from "./project-room-switcher-panel";

const demoProps: ProjectRoomSwitcherPanelProps = {
  activeRoomId: "room-brand-translation",
  items: [
    {
      alertCount: 3,
      description: "번역 계약서, 요구사항 문서, 납품 일정 확인 중",
      id: "room-brand-translation",
      myTodoCount: 8,
      name: "브랜드 상세페이지",
      nextDueLabel: "D-2",
      progress: 64,
      role: "leader",
      status: "needsReview",
    },
    {
      alertCount: 1,
      description: "회의록 기반 WBS 후보를 작업판에 반영하는 프로젝트",
      id: "room-launch-page",
      myTodoCount: 5,
      name: "신규 랜딩 페이지 제작",
      nextDueLabel: "6월 28일",
      progress: 42,
      role: "member",
      status: "active",
    },
    {
      alertCount: 0,
      description: "혼자 정리 중인 개인 의뢰 자료와 참고 문서",
      id: "room-solo-reference",
      myTodoCount: 3,
      name: "포트폴리오 정리 의뢰",
      nextDueLabel: "7월 2일",
      progress: 18,
      role: "leader",
      status: "solo",
    },
    {
      alertCount: 2,
      description: "자료보드 댓글과 소통 기록을 함께 확인하는 프로젝트",
      id: "room-content-review",
      myTodoCount: 6,
      name: "콘텐츠 검수 협업",
      nextDueLabel: "내일",
      progress: 76,
      role: "member",
      status: "active",
    },
  ],
};

const meta = {
  args: demoProps,
  component: ProjectRoomSwitcherPanel,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <main className="shell">
      <ProjectRoomSwitcherPanel {...args} />
    </main>
  ),
  title: "Features/ProjectRoom/ProjectRoomSwitcherPanel",
} satisfies Meta<typeof ProjectRoomSwitcherPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilteredBySearch: Story = {
  args: {
    activeRoomId: "room-content-review",
    searchValue: "검수",
  },
};
