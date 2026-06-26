import { PageHeading } from "@/components/ui/page-heading";
import {
  defaultDesktopCapabilities,
  defaultDownloadRules,
  defaultDownloadSurfaces,
  DesktopDownloadHandoffPanel,
} from "@/features/download/components/desktop-download-handoff-panel";

export default function DownloadPage() {
  return (
    <>
      <PageHeading
        title="데스크탑 앱 다운로드"
        description="데스크탑 앱은 배포된 HTTPS 회원 웹 앱을 열고, 기기 폴더와 버블 위젯 기능을 더합니다."
      />
      <div className="page-grid">
        <DesktopDownloadHandoffPanel
          capabilities={defaultDesktopCapabilities}
          rules={defaultDownloadRules}
          surfaces={defaultDownloadSurfaces}
          title="웹 화면 그대로, 버블 기능은 데스크탑에서"
        />
      </div>
    </>
  );
}
