import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  DashboardCardLibraryPanel,
  defaultDashboardCards,
  defaultDashboardRules,
} from "./dashboard-card-library-panel";

const meta = {
  component: DashboardCardLibraryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 사용자 기준 대시보드와 버블 연결 정책을 바탕으로, 대시보드에 올릴 카드 후보를 고르는 보관함 패널입니다. 프로젝트룸 데이터는 권한이 있는 범위에서만 개인 화면에 표시합니다.",
      },
    },
  },
  title: "Dashboard/DashboardCardLibraryPanel",
} satisfies Meta<typeof DashboardCardLibraryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cards: defaultDashboardCards,
    rules: defaultDashboardRules,
  },
};

export const ProjectRoomFiltered: Story = {
  args: {
    cards: defaultDashboardCards.map((card) =>
      card.kind === "RESOURCE"
        ? {
            ...card,
            countLabel: "2건",
            status: "AVAILABLE",
          }
        : card,
    ),
    rules: defaultDashboardRules,
    selectedProjectRoomName: "Bubli 제품 개발룸",
    title: "선택 프로젝트룸 카드",
  },
};

export const MinimalCards: Story = {
  args: {
    cards: defaultDashboardCards.slice(0, 3),
    rules: defaultDashboardRules,
    title: "오늘 카드 보관함",
  },
};
