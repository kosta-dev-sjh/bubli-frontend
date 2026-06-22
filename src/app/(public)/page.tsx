import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Bubli"
        title={siteConfig.tagline}
        description={siteConfig.description}
      />
      <div className="page-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <PlaceholderPanel
          title="자료를 프로젝트룸으로"
          description="계약서, 요구사항, 회의록을 프로젝트 단위로 모아 같은 맥락에서 확인합니다."
        />
        <PlaceholderPanel
          title="후보를 확인하고 승인"
          description="에이전트는 WBS와 TODO 후보를 만들고, 사용자가 승인한 항목만 업무에 반영합니다."
        />
        <PlaceholderPanel
          title="버블로 빠르게 확인"
          description="작업 중에는 TODO, 일정, 알림, 타이머를 개인 버블로 짧게 확인합니다."
        />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Link className="glass-panel" href="/download" style={{ padding: "12px 18px" }}>
          데스크탑 앱 다운로드
        </Link>
        <Link className="glass-panel" href="/login" style={{ padding: "12px 18px" }}>
          웹에서 로그인
        </Link>
      </div>
    </>
  );
}
