import { WidgetShell } from "@/components/widget";
import type { WidgetMode } from "@/components/widget";
import { PageHeading } from "@/components/ui/page-heading";
import {
  defaultDockItems,
  ResourceSuggestionBubblePanel,
  TauriWidgetLayer,
  WidgetDesktopPreview,
  WidgetEightBubbleSetPanel,
  WidgetMinimizedDockPanel,
  WidgetSettingsPanel,
} from "@/features/widget/components";

// 새 UI Kit 위젯 프리뷰 전환 플래그. 기본 false라 기존 데스크톱 위젯 랩이 그대로 뜬다.
// 켜려면 .env에 NEXT_PUBLIC_BUBLI_NEW_WIDGET_PREVIEW=true. 실제 Tauri 창 제어는 없다(설정/미리보기 화면).
const USE_NEW_WIDGET_PREVIEW = process.env.NEXT_PUBLIC_BUBLI_NEW_WIDGET_PREVIEW === "true";

const WIDGET_STATES: { label: string; hint: string; mode: WidgetMode }[] = [
  { label: "기본", hint: "또렷하게 작업 보조", mode: "default" },
  { label: "반투명", hint: "작업 중 방해 없이", mode: "translucent" },
  { label: "고스트", hint: "신호만, 클릭은 통과", mode: "ghost" },
  { label: "최소화", hint: "바·도크로 접힘", mode: "minimal" },
];

export default function DesktopWidgetsPage() {
  if (USE_NEW_WIDGET_PREVIEW) {
    return (
      <>
        <PageHeading
          title="데스크톱 위젯"
          description="작업 중 필요한 정보만 화면 위에 가볍게 띄웁니다. 상황에 따라 네 가지 모드로 바뀝니다."
        />
        <div className="bubli-widget-states">
          {WIDGET_STATES.map((s) => (
            <section className="bubli-widget-state" key={s.label}>
              <header className="bubli-widget-state__cap">
                <strong>{s.label}</strong>
                <span>{s.hint}</span>
              </header>
              <div className="bubli-widget-state__seat">
                <WidgetShell
                  agentCount={1}
                  agentMessage="요구사항 후보 6개를 정리해 둘까요?"
                  density="compact"
                  mode={s.mode}
                  projectLabel="A사 리뉴얼"
                  scheduleCount={2}
                  timerText="25:00"
                  todoCount={4}
                />
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }
  return <LegacyDesktopWidgets />;
}

// 기존 데스크톱 위젯 랩 화면. 삭제하지 않고 플래그 off일 때 그대로 사용한다.
function LegacyDesktopWidgets() {
  return (
    <>
      <PageHeading
        title="데스크톱 버블 위젯"
        description="Tauri 데스크탑 앱에서 개인 버블 위젯을 띄우고, 작업 중 필요한 정보만 맑게 보여줍니다."
      />
      <div className="desktop-widget-lab">
        <WidgetDesktopPreview />
        <WidgetEightBubbleSetPanel />
        <TauriWidgetLayer />
        <WidgetSettingsPanel />
        <ResourceSuggestionBubblePanel />
        <WidgetMinimizedDockPanel dockItems={defaultDockItems} lastSyncedLabel="최근 동기화 12초 전" />
      </div>
    </>
  );
}
