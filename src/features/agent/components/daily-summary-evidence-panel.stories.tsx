import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DailySummaryEvidencePanel } from "./daily-summary-evidence-panel";

const meta = {
  component: DailySummaryEvidencePanel,
  parameters: {
    docs: {
      description: {
        component:
          "개인 하루정리 생성 전 근거를 확인하는 패널입니다. 서버 원본, 위젯 집계, 개인 에이전트 로컬 요약을 구분하고 사용자가 확인한 요약만 daily_summaries에 저장하는 기준을 반영합니다.",
      },
    },
  },
  title: "Features/Agent/DailySummaryEvidencePanel",
} satisfies Meta<typeof DailySummaryEvidencePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadyToApprove: Story = {
  args: {
    approvedSourceCount: 4,
    dateLabel: "2026-06-23",
    localContextLabel: "최근 개인 에이전트 원문 100개 기준",
    status: "READY_TO_APPROVE",
  },
};

export const Draft: Story = {
  args: {
    approvedSourceCount: 2,
    dateLabel: "2026-06-23",
    localContextLabel: "개인 에이전트 로컬 요약 대기 중",
    status: "DRAFT",
  },
};

export const Approved: Story = {
  args: {
    approvedSourceCount: 5,
    dateLabel: "2026-06-22",
    localContextLabel: "승인된 요약은 서버에서 다시 조회할 수 있습니다.",
    status: "APPROVED",
  },
};
