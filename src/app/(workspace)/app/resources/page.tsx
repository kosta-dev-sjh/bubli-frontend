import { PageHeading } from "@/components/ui/page-heading";
import { ResourceBoard } from "@/features/resources/components/resource-board";

export default function ResourcesPage() {
  return (
    <>
      <PageHeading
        title="자료보드"
        description="개인 자료와 프로젝트룸 자료를 찾고, 분석 결과와 관련 문서를 확인합니다."
      />
      <div className="page-grid">
        <ResourceBoard />
      </div>
    </>
  );
}
