import { PageHeading } from "@/components/ui/page-heading";
import { AgentSuggestionInboxPanel } from "@/features/agent/components";
import { TodoDetailPanel } from "@/features/todo/components";
import { WbsTodoBoard, WbsTodoLinkagePanel } from "@/features/wbs/components";

export default function ProjectRoomWorkPage() {
  return (
    <>
      <PageHeading
        title="WBS/작업판"
        description="선택한 프로젝트룸의 WBS, TODO, 칸반, 타임라인을 같은 작업 기준으로 봅니다."
      />
      <div className="page-grid">
        <WbsTodoLinkagePanel />
        <AgentSuggestionInboxPanel />
        <WbsTodoBoard />
        <TodoDetailPanel />
      </div>
    </>
  );
}
