import { PageHeading } from "@/components/ui/page-heading";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function FaqPage() {
  return (
    <>
      <PageHeading title="FAQ" description="Bubli 사용 전 자주 묻는 질문을 정리합니다." />
      <div className="page-grid">
        <PlaceholderPanel
          title="웹과 앱은 무엇이 다른가요?"
          description="웹은 회원 업무 화면을 제공하고, Tauri 앱은 같은 화면에 버블 위젯과 로컬 기능을 더합니다."
        />
      </div>
    </>
  );
}
