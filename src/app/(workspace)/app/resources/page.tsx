"use client";

import { PageHeading } from "@/components/ui/page-heading";
import {
  ContractReviewItemResolutionPanel,
  defaultAnalysisSteps,
  defaultAnalysisSuggestions,
  defaultBoundarySteps,
  defaultMismatchItems,
  defaultMismatchMetrics,
  defaultQuotaFiles,
  defaultQuotaRules,
  defaultResourceScopes,
  defaultScopedResources,
  defaultShareResources,
  defaultStorageUsage,
  DocumentClassificationPanel,
  DocumentMismatchReviewPanel,
  PersonalResourceShareBoundaryPanel,
  PersonalResourceQuotaPanel,
  RelatedResourceEvidencePanel,
  ResourceAccessDownloadPanel,
  ResourceAnalysisApprovalPanel,
  ResourceAnalysisCachePanel,
  ResourceBoard,
  ResourceCommentThreadPanel,
  ResourceComparePanel,
  ResourceDeleteRecoveryPanel,
  ResourceDownloadAccessPanel,
  ResourceProcessingStatusPanel,
  ResourceScopeFilterPanel,
  ResourceSearchCommand,
  ResourceShareApprovalPanel,
  ResourceSharingPermissionPanel,
  ResourceUploadAnalysisPanel,
  ResourceUploadDecision,
  ResourceUploadDecisionPanel,
  ResourceUploadQueuePanel,
  ResourceUploadValidationBoundaryPanel,
  ResourceVersionDecisionPanel,
  ResourceVersionHistoryPanel,
  StorageProviderPolicyPanel,
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

const analysisCacheMetrics = [
  {
    description: "같은 파일인지 먼저 확인합니다.",
    icon: "hash" as const,
    label: "파일 지문",
    value: "같은 파일 확인",
  },
  {
    description: "기존 결과가 있으면 다시 분석하지 않습니다.",
    icon: "cache" as const,
    label: "캐시 우선",
    value: "유효 24시간",
  },
  {
    description: "새 분석이 필요할 때만 정리 작업을 만듭니다.",
    icon: "job" as const,
    label: "에이전트 정리",
    value: "필요 시 생성",
  },
  {
    description: "원본 자료와 분석 결과를 분리합니다.",
    icon: "result" as const,
    label: "분석 결과",
    value: "후보로 보관",
  },
];

const analysisCacheEntries = [
  {
    description: "문서 종류와 주요 값 후보를 기존 분석 결과에서 불러왔습니다.",
    fileName: "번역계약서_v2.pdf",
    hashLabel: "파일 지문 a91e",
    status: "hit" as const,
    updatedAtLabel: "오늘 10:22",
  },
  {
    description: "수정된 파일이라 새 분석 작업이 필요합니다.",
    fileName: "요구사항정의서_v1.4.pdf",
    hashLabel: "파일 지문 f042",
    status: "miss" as const,
    updatedAtLabel: "방금 업로드",
  },
  {
    description: "이전 결과가 오래되어 검수 기준만 다시 확인합니다.",
    fileName: "회의록_0618.md",
    hashLabel: "sha256: 7c2b",
    status: "expired" as const,
    updatedAtLabel: "3일 전",
  },
];

const deleteRecoveryItems = [
  {
    action: "restore" as const,
    description: "로컬 폴더에서 사라졌지만 서버 자료는 아직 유지되어 있습니다.",
    fileName: "회의록_0618.md",
    meta: "프로젝트룸 자료 · 오늘 감지",
    status: "deleteCandidate" as const,
  },
  {
    action: "archive" as const,
    description: "이전 버전 자료라 자료보드에서는 숨기고 기록만 남깁니다.",
    fileName: "요구사항정의서_v1.1.pdf",
    meta: "이전 버전 · 2주 전",
    status: "archived" as const,
  },
  {
    action: "confirmDelete" as const,
    description: "개인 자료함 용량 정리를 위해 서버 반영 전 최종 확인이 필요합니다.",
    fileName: "레퍼런스_압축본.zip",
    meta: "개인 자료 · 용량 초과",
    status: "blocked" as const,
  },
];

const uploadQueueItems = [
  {
    fileName: "번역계약서_v2.pdf",
    message: "권한 확인 뒤 프로젝트룸 자료로 반영됩니다.",
    progress: 100,
    scope: "room" as const,
    sizeLabel: "2.4MB",
    status: "ready" as const,
  },
  {
    fileName: "개인_검토메모.md",
    message: "개인 자료함에 저장 대기 중입니다.",
    progress: 45,
    scope: "personal" as const,
    sizeLabel: "220KB",
    status: "uploading" as const,
  },
  {
    fileName: "레퍼런스_전체.zip",
    message: "개인 자료함 용량을 넘어 서버 반영을 막았습니다.",
    progress: 0,
    scope: "personal" as const,
    sizeLabel: "260MB",
    status: "blocked" as const,
  },
];

const uploadValidationItems = [
  {
    checksumLabel: "sha256 확인",
    extensionLabel: "PDF",
    fileName: "번역계약서_v2.pdf",
    mimeLabel: "application/pdf",
    reason: "허용 형식과 용량 기준을 통과했습니다.",
    sizeLabel: "2.4MB",
    status: "ready" as const,
    targetLabel: "프로젝트룸 자료" as const,
  },
  {
    checksumLabel: "기존 hash",
    extensionLabel: "MD",
    fileName: "회의록_0618.md",
    mimeLabel: "text/markdown",
    reason: "같은 파일 분석 결과가 있어 기존 후보를 다시 보여줍니다.",
    sizeLabel: "180KB",
    status: "reused" as const,
    targetLabel: "프로젝트룸 자료" as const,
  },
  {
    checksumLabel: "검사 전",
    extensionLabel: "ZIP",
    fileName: "레퍼런스_전체.zip",
    mimeLabel: "application/zip",
    reason: "용량 제한을 넘어 서버 업로드를 시작하지 않습니다.",
    sizeLabel: "260MB",
    status: "blocked" as const,
    targetLabel: "개인 자료" as const,
  },
];

const storageSteps = [
  {
    description: "기기 안에서는 파일 이름과 상태만 빠르게 확인합니다.",
    label: "기기 안 확인",
    status: "ready" as const,
    value: "앱",
  },
  {
    description: "서버 업로드는 용량과 권한 확인 후 진행합니다.",
    label: "서버 저장",
    status: "checking" as const,
    value: "서버 저장소",
  },
  {
    description: "다운로드는 서버가 발급한 제한 주소만 사용합니다.",
    label: "다운로드",
    status: "limited" as const,
    value: "권한 확인",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHeading
        title="자료보드"
        description="개인 자료와 프로젝트룸 자료를 찾고, 분석 결과와 관련 문서를 확인합니다."
      />
      <div className="page-grid">
        <ResourceBoard />
        <ResourceSearchCommand />
        <ResourceScopeFilterPanel resources={defaultScopedResources} scopes={defaultResourceScopes} />
        <PersonalResourceQuotaPanel files={defaultQuotaFiles} rules={defaultQuotaRules} usage={defaultStorageUsage} />
        <ResourceUploadAnalysisPanel />
        <ResourceUploadDecisionPanel />
        <ResourceUploadDecision />
        <ResourceUploadQueuePanel
          items={uploadQueueItems}
          limitLabel="1GB"
          storageUsageLabel="820MB / 1GB"
          storageUsagePercent={82}
        />
        <ResourceUploadValidationBoundaryPanel
          items={uploadValidationItems}
          summary={{
            allowedFormatCount: 5,
            checkedFileCount: 3,
            maxFileSizeLabel: "100MB",
            readyFileCount: 2,
          }}
        />
        <DocumentClassificationPanel items={classificationItems} rules={classificationRules} />
        <ResourceProcessingStatusPanel />
        <ResourceAnalysisCachePanel entries={analysisCacheEntries} metrics={analysisCacheMetrics} />
        <ResourceAnalysisApprovalPanel
          confidence={86}
          jobStatus="SUCCEEDED"
          projectRoomName="신규 번역 프로젝트룸"
          resourceName="번역계약서_v2.pdf"
          steps={defaultAnalysisSteps}
          suggestions={defaultAnalysisSuggestions}
        />
        <DocumentMismatchReviewPanel items={defaultMismatchItems} metrics={defaultMismatchMetrics} />
        <ContractReviewItemResolutionPanel items={reviewItems} />
        <ResourceComparePanel />
        <RelatedResourceEvidencePanel />
        <ResourceAccessDownloadPanel />
        <ResourceDownloadAccessPanel />
        <StorageProviderPolicyPanel
          currentProviderLabel="서버 저장소"
          downloadRuleLabel="서버 권한 확인 뒤 다운로드"
          limitLabel="1GB"
          steps={storageSteps}
          usageLabel="820MB 사용"
          usagePercent={82}
        />
        <ResourceVersionHistoryPanel />
        <ResourceVersionDecisionPanel />
        <ResourceCommentThreadPanel />
        <ResourceSharingPermissionPanel />
        <ResourceShareApprovalPanel />
        <PersonalResourceShareBoundaryPanel
          resources={defaultShareResources}
          selectedCount={2}
          steps={defaultBoundarySteps}
          targetProjectRoom="신규 번역 프로젝트룸"
        />
        <ResourceDeleteRecoveryPanel items={deleteRecoveryItems} pendingCount={2} />
      </div>
    </>
  );
}
