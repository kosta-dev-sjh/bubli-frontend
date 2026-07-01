import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DocumentClassificationPanel } from "./document-classification-panel";

const meta = {
  component: DocumentClassificationPanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 업로드 뒤 contract_documents.doc_type 후보를 보여주고, 사용자가 확인한 분류만 추출 항목과 WBS/TODO 후보 생성에 넘기는 패널입니다.",
      },
    },
  },
  title: "Features/Resources/DocumentClassificationPanel",
} satisfies Meta<typeof DocumentClassificationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultRules = [
  {
    description: "분류값은 화면 표시와 추출 파이프라인의 시작점으로만 사용합니다.",
    label: "저장 위치",
    value: "contract_documents.doc_type",
  },
  {
    description: "신뢰도가 낮거나 문서 성격이 섞이면 사용자가 먼저 확인합니다.",
    label: "확인 기준",
    value: "detected_confidence",
  },
  {
    description: "문서 분류는 법률 판단이 아니라 확인 보조 흐름입니다.",
    label: "책임 경계",
    value: "후보 생성",
  },
];

export const ClassifiedDocuments: Story = {
  args: {
    items: [
      {
        confidenceLabel: "신뢰도 94%",
        description: "진행 기간, 납품일, 수정 범위, 지급 조건 문장이 함께 감지됐습니다.",
        detectedKind: "contract",
        fileName: "웹사이트 구축 기준 자료_v2.pdf",
        nextUse: "확인 필요 항목과 프로젝트 참고 정보 후보",
        status: "analyzed",
      },
      {
        confidenceLabel: "신뢰도 91%",
        description: "금액, 부가세 포함 여부, 납품물별 단가 항목이 중심입니다.",
        detectedKind: "quote",
        fileName: "서비스 견적서_최종.pdf",
        nextUse: "기준 자료와 같은 항목 값 차이 확인",
        status: "analyzed",
      },
      {
        confidenceLabel: "신뢰도 89%",
        description: "화면, 권한, 데이터, 연동 조건이 목록 형태로 정리돼 있습니다.",
        detectedKind: "requirements",
        fileName: "요구사항 정리서_v1.3.docx",
        nextUse: "요구사항 후보와 WBS/TODO 후보",
        status: "analyzed",
      },
      {
        confidenceLabel: "신뢰도 86%",
        description: "결정사항, 담당자, 날짜, 다음 업무 문장이 반복됩니다.",
        detectedKind: "meetingNote",
        fileName: "회의록_0618.md",
        nextUse: "확인 질문과 일정 후보",
        status: "analyzing",
      },
    ],
    rules: defaultRules,
  },
};

export const NeedsReview: Story = {
  args: {
    items: [
      {
        confidenceLabel: "신뢰도 58%",
        description: "요구사항 문장과 회의 결정 문장이 섞여 있어 분류 확인이 필요합니다.",
        detectedKind: "requirements",
        fileName: "클라이언트 전달자료_묶음.pdf",
        nextUse: "사용자 확인 후 분석 시작",
        status: "needsReview",
      },
      {
        confidenceLabel: "신뢰도 43%",
        description: "자료 조건보다 참고 링크와 이미지 설명이 많습니다.",
        detectedKind: "reference",
        fileName: "레퍼런스 화면 모음.pdf",
        nextUse: "자료 제안 후보",
        status: "needsReview",
      },
      {
        confidenceLabel: "파일 읽기 실패",
        description: "텍스트 추출에 실패해 문서 종류 후보를 만들 수 없습니다.",
        detectedKind: "reference",
        fileName: "스캔본_기준자료.png",
        nextUse: "다시 업로드 또는 직접 분류",
        status: "failed",
      },
    ],
    rules: defaultRules,
    title: "문서 종류 확인",
  },
};
