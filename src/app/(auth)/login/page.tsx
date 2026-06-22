import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function LoginPage() {
  return (
    <main className="shell">
      <PageHeading title="로그인" description="인증 API 계약 확정 후 로그인 폼을 연결합니다." />
      <div className="page-grid">
        <PlaceholderPanel
          title="인증 API 대기"
          description="auth.http 또는 Swagger 기준이 나오면 request/response DTO를 맞춰 연결합니다."
        />
      </div>
    </main>
  );
}
