import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function ChatPage() {
  return (
    <>
      <PageHeading
        title="소통"
        description="친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗을 다루는 회원 웹 앱 화면입니다."
      />
      <div className="page-grid" style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}>
        <PlaceholderPanel title="채팅방" description="chat DTO와 WebSocket payload 확정 후 연결" />
        <PlaceholderPanel title="대화와 보이스" description="LiveKit token 응답 DTO 확정 후 연결" />
      </div>
    </>
  );
}
