import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ContractExtractedFieldsReviewPanel } from "@/features/project-room/components/contract-extracted-fields-review-panel";

const meta = {
  component: ContractExtractedFieldsReviewPanel,
  parameters: {
    docs: {
      description: {
        component:
          "프로젝트룸 생성 시 기준 자료, 견적서, 요구사항 문서에서 뽑은 프로젝트 정보 후보를 사용자가 확인하는 패널입니다. 승인된 값만 프로젝트룸, WBS, TODO, 일정에 이어집니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/ProjectRoom/ContractExtractedFieldsReviewPanel",
} satisfies Meta<typeof ContractExtractedFieldsReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DraftReview: Story = {
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <ContractExtractedFieldsReviewPanel {...args} />
    </main>
  ),
};

export const PartlyApproved: Story = {
  args: {
    fields: [
      {
        confidence: 94,
        id: "field-project-name",
        kind: "PROJECT_NAME",
        label: "프로젝트명",
        sourceLabel: "기준 자료 1쪽",
        status: "APPROVED",
        value: "웹사이트 개편 프로젝트",
      },
      {
        confidence: 89,
        id: "field-client-name",
        kind: "CLIENT_NAME",
        label: "클라이언트명",
        sourceLabel: "견적서 상단",
        status: "APPROVED",
        value: "ABC 파트너스",
      },
      {
        confidence: 78,
        id: "field-due-date",
        kind: "DUE_DATE",
        label: "납품일",
        sourceLabel: "회의록_0618.md",
        status: "HELD",
        value: "2026.07.20",
      },
      {
        confidence: 82,
        id: "field-review-standard",
        kind: "REVIEW_STANDARD",
        label: "검수 기준",
        sourceLabel: "요구사항 문서",
        status: "DRAFT",
        value: "1차 검수 후 수정 2회",
      },
    ],
    reviewItems: [
      {
        id: "review-due-date",
        message: "납품일 후보가 기준 자료와 회의록에서 다르게 나왔습니다.",
        sourceLabel: "기준 자료 2쪽, 회의록_0618.md",
        tone: "conflict",
      },
    ],
  },
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <ContractExtractedFieldsReviewPanel {...args} />
    </main>
  ),
};
