import { PageHeading } from "@/components/ui/page-heading";
import { WbsTodoBoard } from "@/features/wbs/components/wbs-todo-board";

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
      <div className="page-grid">
        <WbsTodoBoard />
      </div>
    </>
  );
}
