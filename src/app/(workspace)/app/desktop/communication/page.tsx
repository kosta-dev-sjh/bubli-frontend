import { PageHeading } from "@/components/ui/page-heading";
import { TauriCommunicationModePanel } from "@/features/communication/components";

const channels = [
  {
    description: "Bubli ID 친구와 직접 대화합니다. 친구 관계가 먼저 필요합니다.",
    label: "1:1 채팅",
    tone: "todo" as const,
  },
  {
    description: "프로젝트룸 멤버 권한을 기준으로 자료와 작업 맥락을 함께 봅니다.",
    label: "프로젝트룸 채팅",
    tone: "communication" as const,
  },
  {
    description: "LiveKit 입장 토큰은 API 서버에서 발급받아 사용합니다.",
    label: "프로젝트룸 보이스",
    tone: "agent" as const,
  },
];

const sharedConnections = [
  {
    description: "웹과 Tauri 전용 창은 Spring Boot API 서버만 호출합니다.",
    label: "같은 API",
    status: "ready" as const,
  },
  {
    description: "채팅 메시지는 서버 DB 원본과 WebSocket topic을 기준으로 동기화합니다.",
    label: "같은 WebSocket",
    status: "ready" as const,
  },
  {
    description: "보이스챗은 HTTPS 회원 웹 앱 환경의 LiveKit 연결 기준을 그대로 씁니다.",
    label: "같은 LiveKit",
    status: "ready" as const,
  },
];

export default function DesktopCommunicationPage() {
  return (
    <>
      <PageHeading
        title="Tauri 소통 창과 버블"
        description="앱에서는 메인 소통 탭을 숨기고, 같은 HTTPS 회원 웹 앱 연결을 전용 창이나 소통 버블에서 사용합니다."
      />
      <div className="page-grid">
        <TauriCommunicationModePanel
          channels={channels}
          sharedConnections={sharedConnections}
          surface="bubble"
          title="회원 웹 앱의 소통을 Tauri 전용 창과 버블로 엽니다"
          webRoute="/app/chat"
        />
      </div>
    </>
  );
}
