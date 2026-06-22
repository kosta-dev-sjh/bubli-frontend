import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function ProjectsPage() {
  return (
    <>
      <PageHeading
        title="프로젝트룸"
        description="프로젝트와 프로젝트룸을 만들고, 친구 초대와 초대 링크를 관리합니다."
      />
      <div className="page-grid">
        <PlaceholderPanel title="프로젝트룸 목록" description="`project.http` 기준 API client 연결 대기" />
      </div>
    </>
  );
}
