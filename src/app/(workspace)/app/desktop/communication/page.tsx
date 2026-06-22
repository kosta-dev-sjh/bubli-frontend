import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function DesktopCommunicationPage() {
  return (
    <>
      <PageHeading
        title="Tauri 소통 창"
        description="앱에서 소통 탭을 숨길 때 채팅과 보이스챗을 여는 Tauri 전용 화면입니다."
      />
      <div className="page-grid">
        <PlaceholderPanel
          title="HTTPS 회원 웹 앱 연결 기준"
          description="배포된 HTTPS 회원 웹 앱 환경에서 같은 API, WebSocket, LiveKit 연결을 재사용합니다."
        />
      </div>
    </>
  );
}
