import { PageHeading } from "@/components/ui/page-heading";
import {
  defaultBackgroundChecks,
  defaultDensityOptions,
  defaultDensityPreviewItems,
  defaultDensitySurfaceRules,
  defaultDockItems,
  defaultFontScaleOptions,
  defaultFontScaleSurfaces,
  defaultMotionRules,
  defaultMotionScenarios,
  defaultReadabilityScenarios,
  defaultTransparencyOptions,
  defaultWidgetPersistenceRules,
  defaultWidgetWindowControls,
  ResourceSuggestionBubblePanel,
  TauriWidgetLayer,
  WidgetBackgroundReadabilityPanel,
  WidgetDensityModePanel,
  WidgetDesktopPreview,
  WidgetFontScalePanel,
  WidgetItemStatePanel,
  WidgetMinimizedDockPanel,
  WidgetMotionPolicyPanel,
  WidgetSettingsPanel,
  WidgetStoragePolicyPanel,
  WidgetTransparencyModePanel,
  WidgetUsageRollupPanel,
  WidgetWindowControlsPanel,
} from "@/features/widget/components";

const widgetItems = [
  {
    bubbleType: "todo" as const,
    itemId: "task-1",
    itemType: "TASK",
    meta: "오늘 18:00 · K-Stay 프로젝트룸",
    sourceLabel: "서버 원본",
    state: "visible" as const,
    title: "계약서 수정 조항 회신",
    updatedAt: "방금 전",
  },
  {
    bubbleType: "agent" as const,
    itemId: "suggestion-1",
    itemType: "AGENT_SUGGESTION",
    meta: "확인 질문 후보 3개",
    sourceLabel: "서버 원본",
    state: "pinned" as const,
    title: "납품일 확인 질문",
    updatedAt: "10분 전",
  },
  {
    bubbleType: "chat" as const,
    itemId: "message-1",
    itemType: "CHAT_MESSAGE",
    meta: "김미연 님의 프로젝트룸 메시지",
    sourceLabel: "최근 캐시",
    state: "confirmed" as const,
    title: "검수 기준 확인 요청",
    updatedAt: "22분 전",
  },
  {
    bubbleType: "resource" as const,
    itemId: "resource-1",
    itemType: "RESOURCE_RELATION",
    meta: "현재 TODO와 관련된 자료",
    sourceLabel: "권한 확인됨",
    state: "snoozed" as const,
    title: "번역계약서_최종본_v2.1.pdf",
    updatedAt: "오늘",
  },
];

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
        <WidgetSettingsPanel />
        <ResourceSuggestionBubblePanel />
        <WidgetItemStatePanel items={widgetItems} />
        <WidgetMinimizedDockPanel dockItems={defaultDockItems} lastSyncedLabel="최근 동기화 12초 전" />
        <WidgetDensityModePanel
          activeMode="default"
          options={defaultDensityOptions}
          previewItems={defaultDensityPreviewItems}
          surfaceRules={defaultDensitySurfaceRules}
        />
        <WidgetTransparencyModePanel
          activeMode="translucent"
          backgroundChecks={defaultBackgroundChecks}
          options={defaultTransparencyOptions}
        />
        <WidgetFontScalePanel
          activeScale={100}
          affectedSurfaces={defaultFontScaleSurfaces}
          scaleOptions={defaultFontScaleOptions}
        />
        <WidgetBackgroundReadabilityPanel scenarios={defaultReadabilityScenarios} />
        <WidgetMotionPolicyPanel activeMode="static" rules={defaultMotionRules} scenarios={defaultMotionScenarios} />
      </div>
    </>
  );
}
