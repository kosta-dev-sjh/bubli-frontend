import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ContractReviewItemResolutionPanel } from "./contract-review-item-resolution-panel";

const meta = {
  component: ContractReviewItemResolutionPanel,
  parameters: {
    docs: {
      description: {
        component:
          "contract_review_items에 저장된 확인 필요 항목을 사용자가 반영, 수정, 보류, 제외로 처리하는 패널입니다.",
      },
    },
  },
  title: "Features/Resources/ContractReviewItemResolutionPanel",
} satisfies Meta<typeof ContractReviewItemResolutionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReviewQueue: Story = {
  args: {
    items: [
      {
        comparedDocuments: [
          { documentName: "계약서", value: "2026.07.10" },
          { documentName: "견적서", value: "2026.07.05" },
          { documentName: "요구사항 문서", value: "별도 기재 없음" },
        ],
        description: "납품일 후보가 문서마다 다르게 감지됐습니다. 작업 일정에 반영하기 전 날짜 확인이 필요합니다.",
        fieldLabel: "납품일",
        id: "review-001",
        severity: "high",
        sourceHint: "계약서 2쪽, 견적서 1쪽",
        status: "draft",
        title: "납품일 값 차이",
        type: "valueMismatch",
      },
      {
        comparedDocuments: [
          { documentName: "계약서", value: "수정 2회 포함" },
          { documentName: "견적서", value: "수정 범위 없음" },
          { documentName: "요구사항 문서", value: "검수 후 피드백 반영" },
        ],
        description: "수정 범위가 한 문서에만 명확히 적혀 있습니다. WBS와 TODO를 만들기 전에 기준을 맞춰야 합니다.",
        fieldLabel: "수정 범위",
        id: "review-002",
        severity: "medium",
        sourceHint: "계약서 4쪽",
        status: "held",
        title: "수정 조건 확인",
        type: "missingCondition",
      },
      {
        comparedDocuments: [
          { documentName: "계약서", value: "개발 범위 중심" },
          { documentName: "견적서", value: "관리자 페이지 포함" },
          { documentName: "요구사항 문서", value: "관리자 권한 3종" },
        ],
        description: "관리자 페이지 범위가 문서마다 다르게 표현돼 클라이언트에게 확인할 질문 후보가 생성됐습니다.",
        fieldLabel: "납품물",
        id: "review-003",
        severity: "high",
        sourceHint: "견적서 2쪽, 요구사항 문서 3쪽",
        status: "draft",
        title: "관리자 페이지 범위 질문",
        type: "questionDraft",
      },
    ],
  },
};

export const ResolvedItems: Story = {
  args: {
    items: [
      {
        comparedDocuments: [
          { documentName: "계약서", value: "최종 검수 1회" },
          { documentName: "견적서", value: "검수 1회" },
          { documentName: "요구사항 문서", value: "최종 검수 후 오픈" },
        ],
        description: "검수 기준이 같은 의미로 확인되어 프로젝트 참고 정보에 반영했습니다.",
        fieldLabel: "검수 기준",
        id: "review-004",
        severity: "low",
        sourceHint: "계약서 5쪽, 요구사항 문서 6쪽",
        status: "approved",
        title: "검수 조건 반영",
        type: "valueMismatch",
      },
      {
        comparedDocuments: [
          { documentName: "계약서", value: "별도 기재 없음" },
          { documentName: "견적서", value: "참고 디자인 제공" },
          { documentName: "요구사항 문서", value: "디자인 시스템 별도 협의" },
        ],
        description: "현재 프로젝트 관리 기준에 넣지 않기로 제외 처리했습니다.",
        fieldLabel: "디자인 참고 조건",
        id: "review-005",
        severity: "low",
        sourceHint: "견적서 3쪽",
        status: "rejected",
        title: "참고 조건 제외",
        type: "missingCondition",
      },
    ],
    title: "처리한 확인 필요 항목",
  },
};
