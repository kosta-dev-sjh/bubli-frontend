import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        title="설정"
        description="프로필, 알림, 위젯, 개인 관리 폴더, 활동 감지 동의를 사용자 기준으로 관리합니다."
      />
      <div className="page-grid">
        <PlaceholderPanel title="사용자 설정" description="`/api/me` 계열 DTO 확정 후 연결" />
      </div>
    </>
  );
}
