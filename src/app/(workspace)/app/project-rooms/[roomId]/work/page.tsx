import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

type ProjectRoomWorkPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function ProjectRoomWorkPage({ params }: ProjectRoomWorkPageProps) {
  const { roomId } = await params;

  return (
    <>
      <PageHeading
        title="WBS/작업판"
        description={`프로젝트룸 ${roomId}의 WBS, TODO, 칸반, 타임라인을 같은 작업 기준으로 봅니다.`}
      />
      <div className="page-grid" style={{ gridTemplateColumns: "280px minmax(0, 1fr)" }}>
        <PlaceholderPanel title="WBS 구조" description="WBS 트리 API 연결 대기" />
        <PlaceholderPanel title="작업판" description="TODO, 후보 승인, 칸반/타임라인 보기 연결 대기" />
      </div>
    </>
  );
}
