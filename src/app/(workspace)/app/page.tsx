import { PageHeading } from "@/components/ui/page-heading";
import { DashboardOverviewPanel } from "@/features/dashboard/components";

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        title="대시보드"
        description="여러 프로젝트룸에서 내가 맡은 TODO, 일정, 확인 필요 항목을 모아 보는 사용자 기준 화면입니다."
      />
      <DashboardOverviewPanel />
    </>
  );
}
