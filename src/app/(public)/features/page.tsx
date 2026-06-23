import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";
import { FontStrategyPanel } from "@/features/public-site/components/font-strategy-panel";
import { HybridAppFrame } from "@/features/public-site/components/hybrid-app-frame";

export default function FeaturesPage() {
  return (
    <>
      <PageHeading
        title="기능"
        description="프로젝트룸, 자료보드, 에이전트 후보, WBS/작업판, 버블 위젯을 한 흐름으로 연결합니다."
      />
      <div className="page-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <PlaceholderPanel title="프로젝트룸" description="자료, WBS, TODO, 소통을 프로젝트 단위로 모읍니다." />
        <PlaceholderPanel title="자료보드" description="개인 자료와 프로젝트룸 자료를 분리해 찾고 열어봅니다." />
        <PlaceholderPanel title="소통" description="친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗을 다룹니다." />
        <PlaceholderPanel title="버블 위젯" description="작업 중 필요한 정보만 데스크탑 위에 띄웁니다." />
      </div>
      <div className="page-grid">
        <HybridAppFrame />
        <FontStrategyPanel />
      </div>
    </>
  );
}
