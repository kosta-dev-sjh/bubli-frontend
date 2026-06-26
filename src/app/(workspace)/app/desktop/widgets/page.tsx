import { PageHeading } from "@/components/ui/page-heading";
import {
  defaultDockItems,
  ResourceSuggestionBubblePanel,
  TauriWidgetLayer,
  WidgetDesktopPreview,
  WidgetMinimizedDockPanel,
  WidgetSettingsPanel,
} from "@/features/widget/components";

export default function DesktopWidgetsPage() {
  return (
    <>
      <PageHeading
        title="데스크톱 버블 위젯"
        description="회원 웹 앱 위에 개인 버블 레이어를 더하고, 작업 중 필요한 정보만 맑게 띄웁니다."
      />
      <div className="desktop-widget-lab">
        <WidgetDesktopPreview />
        <TauriWidgetLayer />
        <WidgetSettingsPanel />
        <ResourceSuggestionBubblePanel />
        <WidgetMinimizedDockPanel dockItems={defaultDockItems} lastSyncedLabel="최근 동기화 12초 전" />
      </div>
    </>
  );
}
