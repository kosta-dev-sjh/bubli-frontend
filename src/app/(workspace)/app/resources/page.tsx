"use client";

import { PageHeading } from "@/components/ui/page-heading";
import {
  ContractReviewItemResolutionPanel,
  defaultAnalysisSteps,
  defaultAnalysisSuggestions,
  defaultMismatchItems,
  defaultMismatchMetrics,
  DocumentClassificationPanel,
  DocumentMismatchReviewPanel,
  RelatedResourceEvidencePanel,
  ResourceAnalysisApprovalPanel,
  ResourceBoard,
  ResourceCommentThreadPanel,
  ResourceSearchCommand,
  ResourceShareApprovalPanel,
  ResourceUploadAnalysisPanel,
  ResourceVersionHistoryPanel,
} from "@/features/resources/components";

const classificationItems = [
  {
    confidenceLabel: "신뢰도 94%",
    description: "금액, 납기, 지급 조건이 포함되어 계약서 후보로 분류했습니다.",
    detectedKind: "contract" as const,
    fileName: "번역계약서_v2.pdf",
    nextUse: "계약 정보와 확인 필요 항목 추출",
    status: "analyzed" as const,
  },
  {
    confidenceLabel: "신뢰도 89%",
    description: "납품물과 세부 기능 범위가 많아 요구사항 문서 후보로 분류했습니다.",
    detectedKind: "requirements" as const,
    fileName: "요구사항정의서_v1.3.pdf",
    nextUse: "WBS/TODO 후보 생성",
    status: "needsReview" as const,
  },
  {
    confidenceLabel: "신뢰도 83%",
    description: "회의 결정사항과 질문 후보가 포함된 문서입니다.",
    detectedKind: "meetingNote" as const,
    fileName: "회의록_0618.md",
    nextUse: "확인 질문 후보와 관련 자료 연결",
    status: "analyzed" as const,
  },
];

const classificationRules = [
  {
    description: "금액, 납품일, 검수, 지급 조건이 보이면 계약서/견적서 후보로 둡니다.",
    label: "계약 문서",
    value: "금액·납기·조건",
  },
  {
    description: "기능 범위, 산출물, 화면, 작업 항목이 많으면 요구사항 문서 후보로 둡니다.",
    label: "요구사항",
    value: "범위·산출물",
  },
  {
    description: "결정사항, 질문, 참석자, 날짜가 중심이면 회의록 후보로 둡니다.",
    label: "회의록",
    value: "결정·질문",
  },
];

const reviewItems = [
  {
    comparedDocuments: [
      { documentName: "계약서", value: "납품일 07.15" },
      { documentName: "요구사항 문서", value: "1차 검수 07.12" },
    ],
    description: "마감과 검수 기준 날짜가 서로 달라 사용자 확인이 필요합니다.",
    fieldLabel: "납품일/검수일",
    id: "review-due-date",
    severity: "high" as const,
    sourceHint: "계약서 2쪽, 요구사항 문서 일정표",
    status: "draft" as const,
    title: "납품일과 검수일 차이",
    type: "valueMismatch" as const,
  },
  {
    comparedDocuments: [
      { documentName: "견적서", value: "수정 2회 포함" },
      { documentName: "요구사항 문서", value: "수정 범위 없음" },
    ],
    description: "수정 횟수는 보이지만 수정 범위와 검수 기준이 빠져 있습니다.",
    fieldLabel: "수정 범위",
    id: "review-revision-scope",
    severity: "medium" as const,
    sourceHint: "견적서 하단 조건",
    status: "draft" as const,
    title: "수정 범위 조건 누락",
    type: "missingCondition" as const,
  },
  {
    comparedDocuments: [
      { documentName: "회의록", value: "추가 화면은 추후 협의" },
      { documentName: "계약서", value: "추가 개발 조건 없음" },
    ],
    description: "클라이언트에게 추가 화면 범위가 계약 금액에 포함되는지 확인할 질문 후보입니다.",
    fieldLabel: "추가 화면 범위",
    id: "review-question-draft",
    severity: "high" as const,
    sourceHint: "회의록 결정사항",
    status: "held" as const,
    title: "추가 화면 범위 질문",
    type: "questionDraft" as const,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHeading
        title="자료보드"
        description="개인 자료와 프로젝트룸 자료를 찾고, 분석 결과와 관련 문서를 확인합니다."
      />
      <div className="resources-workspace">
        <section className="resources-workspace__primary" aria-label="자료보드 기본 화면">
          <ResourceBoard />
        </section>

        <section className="resources-workspace__analysis" aria-label="자료 검색과 에이전트 정리 흐름">
          <ResourceSearchCommand />
          <ResourceUploadAnalysisPanel />
          <DocumentClassificationPanel items={classificationItems} rules={classificationRules} />
          <ResourceAnalysisApprovalPanel
            confidence={86}
            jobStatus="SUCCEEDED"
            projectRoomName="신규 번역 프로젝트룸"
            resourceName="번역계약서_v2.pdf"
            steps={defaultAnalysisSteps}
            suggestions={defaultAnalysisSuggestions}
          />
        </section>

        <section className="resources-workspace__review" aria-label="확인 필요 항목">
          <DocumentMismatchReviewPanel items={defaultMismatchItems} metrics={defaultMismatchMetrics} />
          <ContractReviewItemResolutionPanel items={reviewItems} />
        </section>

        <section className="resources-workspace__library" aria-label="관련 자료와 공유">
          <RelatedResourceEvidencePanel />
          <ResourceVersionHistoryPanel />
          <ResourceCommentThreadPanel />
          <ResourceShareApprovalPanel />
        </section>
      </div>
    </>
  );
}
