import { PageHeading } from "@/components/ui/page-heading";
import { CommunicationPanel } from "@/features/communication/components/communication-panel";

export default function ChatPage() {
  return (
    <>
      <PageHeading
        title="소통"
        description="친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗을 다루는 회원 웹 앱 화면입니다."
      />
      <div className="page-grid">
        <CommunicationPanel />
      </div>
    </>
  );
}
