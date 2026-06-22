import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function SignupPage() {
  return (
    <main className="shell">
      <PageHeading title="회원가입" description="이메일, 비밀번호, Bubli ID 기준 폼을 준비합니다." />
      <div className="page-grid">
        <PlaceholderPanel
          title="회원가입 API 대기"
          description="백엔드 인증 DTO가 확정되면 폼 검증과 API client를 연결합니다."
        />
      </div>
    </main>
  );
}
