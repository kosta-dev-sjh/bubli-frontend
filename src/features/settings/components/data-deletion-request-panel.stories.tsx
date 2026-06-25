import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  DataDeletionRequestPanel,
  defaultDeletionChecks,
  defaultDeletionOptions,
} from "./data-deletion-request-panel";

const meta = {
  component: DataDeletionRequestPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 개인정보, Tauri SQLite, 서버 원본 데이터 분리 기준을 바탕으로 설정 화면에서 데이터 삭제와 내보내기 요청 범위를 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Settings/DataDeletionRequestPanel",
} satisfies Meta<typeof DataDeletionRequestPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checks: defaultDeletionChecks,
    options: defaultDeletionOptions,
  },
};

export const LocalOnlyCleanup: Story = {
  args: {
    checks: defaultDeletionChecks,
    options: defaultDeletionOptions.filter((option) => option.scope === "LOCAL_TAURI"),
    title: "로컬 데이터 정리",
  },
};

export const AllRequestsReady: Story = {
  args: {
    checks: defaultDeletionChecks,
    options: defaultDeletionOptions.map((option) => ({
      ...option,
      status: "READY",
    })),
    title: "삭제 요청 가능 상태",
  },
};
