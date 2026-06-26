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
    description: "보이스 입장은 서버에서 발급한 연결 정보로만 진행합니다.",
    label: "프로젝트룸 보이스",
    tone: "agent" as const,
  },
];

const sharedConnections = [
  {
    description: "웹과 데스크톱 전용 창은 같은 서버 기준으로 동작합니다.",
    label: "같은 서버",
    status: "ready" as const,
  },
  {
    description: "채팅 메시지는 서버 기록과 실시간 연결 기준으로 동기화합니다.",
    label: "같은 실시간 연결",
    status: "ready" as const,
  },
  {
    description: "보이스챗은 배포된 회원 웹 앱의 보안 연결 기준을 그대로 씁니다.",
    label: "같은 보이스 연결",
    status: "ready" as const,
  },
];

export default function DesktopCommunicationPage() {
  return (
    <>
      <PageHeading
        title="데스크탑 소통 창과 버블"
        description="앱에서는 메인 소통 탭을 숨기고, 배포된 회원 웹 앱 연결을 전용 창이나 소통 버블에서 사용합니다."
      />
      <div className="page-grid">
        <TauriCommunicationModePanel
          channels={channels}
          sharedConnections={sharedConnections}
          surface="bubble"
          title="회원 웹 앱의 소통을 데스크탑 전용 창과 버블로 엽니다"
          webRoute="/app/chat"
        />
      </div>
    </>
  );
}
