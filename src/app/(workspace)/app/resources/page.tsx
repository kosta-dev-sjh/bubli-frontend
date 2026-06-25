import { PageHeading } from "@/components/ui/page-heading";
import {
  defaultAnalysisSteps,
  defaultAnalysisSuggestions,
  defaultBoundarySteps,
  defaultShareResources,
  PersonalResourceShareBoundaryPanel,
  ResourceAnalysisApprovalPanel,
  ResourceBoard,
  ResourceCommentThreadPanel,
  ResourceProcessingStatusPanel,
  ResourceUploadAnalysisPanel,
  ResourceVersionHistoryPanel,
} from "@/features/resources/components";

export default function ResourcesPage() {
  return (
    <>
      <PageHeading
        title="자료보드"
        description="개인 자료와 프로젝트룸 자료를 찾고, 분석 결과와 관련 문서를 확인합니다."
      />
      <div className="page-grid">
        <ResourceBoard />
        <ResourceUploadAnalysisPanel />
        <ResourceProcessingStatusPanel />
        <ResourceAnalysisApprovalPanel
          confidence={86}
          jobStatus="SUCCEEDED"
          projectRoomName="신규 번역 프로젝트룸"
          resourceName="번역계약서_v2.pdf"
          steps={defaultAnalysisSteps}
          suggestions={defaultAnalysisSuggestions}
        />
        <ResourceVersionHistoryPanel />
        <ResourceCommentThreadPanel />
        <PersonalResourceShareBoundaryPanel
          resources={defaultShareResources}
          selectedCount={2}
          steps={defaultBoundarySteps}
          targetProjectRoom="신규 번역 프로젝트룸"
        />
      </div>
    </>
  );
}
