import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function ResourcesPage() {
  return (
    <>
      <PageHeading
        title="자료보드"
        description="개인 자료와 프로젝트룸 자료를 찾고, 분석 결과와 관련 문서를 확인합니다."
      />
      <div className="page-grid">
        <PlaceholderPanel title="자료 목록" description="자료 업로드 방식과 resource DTO 확정 후 연결" />
      </div>
    </>
  );
}
