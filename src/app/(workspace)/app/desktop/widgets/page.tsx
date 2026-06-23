import { PageHeading } from "@/components/ui/page-heading";
import { TauriWidgetLayer } from "@/features/widget/components/tauri-widget-layer";
import { WidgetDesktopPreview } from "@/features/widget/components/widget-desktop-preview";
import { WidgetStoragePolicyPanel } from "@/features/widget/components/widget-storage-policy-panel";
import { WidgetUsageRollupPanel } from "@/features/widget/components/widget-usage-rollup-panel";
import {
  defaultWidgetPersistenceRules,
  defaultWidgetWindowControls,
  WidgetWindowControlsPanel,
} from "@/features/widget/components/widget-window-controls-panel";

export default function DesktopWidgetsPage() {
  return (
    <>
      <PageHeading
        title="Tauri 버블 위젯"
        description="회원 웹 앱 위에 Tauri 전용 버블 레이어를 더하고, 서버 원본과 로컬 기록의 저장 기준을 함께 확인합니다."
      />
      <div className="desktop-widget-lab">
        <WidgetDesktopPreview />
        <TauriWidgetLayer />
        <div className="desktop-widget-lab__grid">
          <WidgetWindowControlsPanel
            controls={defaultWidgetWindowControls}
            density="default"
            persistenceRules={defaultWidgetPersistenceRules}
            textMode="auto"
            title="버블 창 조작과 저장 기준"
            visibleBubbleCount={6}
          />
          <WidgetStoragePolicyPanel />
        </div>
        <WidgetUsageRollupPanel />
      </div>
    </>
  );
}
