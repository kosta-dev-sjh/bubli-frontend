import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        title="대시보드"
        description="여러 프로젝트룸에서 내가 맡은 TODO, 일정, 확인 필요 항목을 모아 보는 사용자 기준 화면입니다."
      />
      <div className="page-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <PlaceholderPanel title="오늘 할 일" description="백엔드 `dashboard`와 `work.task` API 연결 대기" />
        <PlaceholderPanel title="버블 미리보기" description="위젯 표시 데이터와 항목 상태 API 연결 대기" />
      </div>
    </>
  );
}
