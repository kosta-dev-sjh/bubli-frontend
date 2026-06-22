import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function DownloadPage() {
  return (
    <>
      <PageHeading
        title="데스크탑 앱 다운로드"
        description="Tauri 앱은 배포된 HTTPS 회원 웹 앱을 WebView로 열고, 로컬 폴더와 버블 위젯 기능을 더합니다."
      />
      <div className="page-grid">
        <PlaceholderPanel
          title="다운로드 준비 중"
          description="배포 파일이 준비되면 macOS와 Windows 다운로드 링크를 연결합니다."
        />
      </div>
    </>
  );
}
