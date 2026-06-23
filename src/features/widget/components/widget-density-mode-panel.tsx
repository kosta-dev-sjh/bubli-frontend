import { Focus, LayoutGrid, Maximize2, Minimize2, PanelTop, Rows3, Settings2 } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-density-mode-panel.module.css";

type DensityMode = "default" | "focus" | "compact";
type DensitySurface = "dashboard" | "widget" | "dock";

type DensityOption = {
  description: string;
  label: string;
  maxVisibleItems: number;
  mode: DensityMode;
  recommendedFor: string;
};

type DensityPreviewItem = {
  label: string;
  source: "server" | "cache" | "local";
  value: string;
};

type DensitySurfaceRule = {
  description: string;
  label: string;
  surface: DensitySurface;
};

export type WidgetDensityModePanelProps = HTMLAttributes<HTMLElement> & {
  activeMode: DensityMode;
  options: DensityOption[];
  previewItems: DensityPreviewItem[];
  surfaceRules: DensitySurfaceRule[];
  title?: string;
};

const modeMeta: Record<DensityMode, { icon: typeof LayoutGrid; tone: StatusTone }> = {
  compact: { icon: Minimize2, tone: "pending" },
  default: { icon: LayoutGrid, tone: "personal" },
  focus: { icon: Focus, tone: "todo" },
};

const sourceMeta: Record<DensityPreviewItem["source"], { label: string; tone: StatusTone }> = {
  cache: { label: "캐시", tone: "pending" },
  local: { label: "로컬", tone: "timer" },
  server: { label: "서버 원본", tone: "success" },
};

const surfaceMeta: Record<DensitySurface, { icon: typeof PanelTop; tone: StatusTone }> = {
  dashboard: { icon: PanelTop, tone: "personal" },
  dock: { icon: Rows3, tone: "pending" },
  widget: { icon: Maximize2, tone: "todo" },
};

export const defaultDensityOptions: DensityOption[] = [
  {
    description: "정보량과 여백을 균형 있게 보여주는 기본 표시입니다.",
    label: "기본",
    maxVisibleItems: 4,
    mode: "default",
    recommendedFor: "일반 작업",
  },
  {
    description: "선택한 버블을 더 크게 보여주고 나머지는 줄여 집중을 돕습니다.",
    label: "집중",
    maxVisibleItems: 2,
    mode: "focus",
    recommendedFor: "타이머, TODO 집중",
  },
  {
    description: "여러 버블을 한 화면에 작게 두고 상태를 빠르게 훑습니다.",
    label: "컴팩트",
    maxVisibleItems: 6,
    mode: "compact",
    recommendedFor: "작은 화면, 빠른 확인",
  },
];

export const defaultDensityPreviewItems: DensityPreviewItem[] = [
  { label: "내 TODO", source: "server", value: "8건" },
  { label: "오늘 일정", source: "server", value: "3개" },
  { label: "채팅 알림", source: "cache", value: "2건" },
  { label: "타이머", source: "local", value: "42:18" },
];

export const defaultDensitySurfaceRules: DensitySurfaceRule[] = [
  {
    description: "카드 밀도만 참고하고, 개인 대시보드의 최종 배치는 별도 결정으로 남깁니다.",
    label: "대시보드",
    surface: "dashboard",
  },
  {
    description: "버블 크기와 표시 항목 수를 조정하지만 원본 데이터는 서버 기준을 유지합니다.",
    label: "버블 위젯",
    surface: "widget",
  },
  {
    description: "최소화 상태에서는 핵심 숫자와 상태만 남겨 화면 점유를 줄입니다.",
    label: "미니 도크",
    surface: "dock",
  },
];

export function WidgetDensityModePanel({
  activeMode,
  className,
  options,
  previewItems,
  surfaceRules,
  title = "위젯 표시 밀도",
  ...props
}: WidgetDensityModePanelProps) {
  const activeOption = options.find((option) => option.mode === activeMode) ?? options[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Settings2 size={16} strokeWidth={2.1} />}>표시 설정</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              표시 밀도는 `user_preferences.density`에 저장되는 개인 설정입니다. 같은 원본 데이터를 복사하지 않고,
              버블 위젯과 대시보드에서 보여주는 양과 여백만 조정합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>선택 모드</span>
          <strong>{activeOption.label}</strong>
          <StatusBadge tone={modeMeta[activeOption.mode].tone}>최대 {activeOption.maxVisibleItems}개 표시</StatusBadge>
        </div>
      </header>

      <section className={styles.modeGrid} aria-label="위젯 표시 밀도 모드">
        {options.map((option) => {
          const meta = modeMeta[option.mode];
          const Icon = meta.icon;
          const selected = option.mode === activeMode;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.modeCard, selected && styles.selected)}
              key={option.mode}
              type="button"
            >
              <span className={styles.modeIcon}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className={styles.modeTitle}>{option.label}</span>
              <span className={styles.modeDescription}>{option.description}</span>
              <span className={styles.modeFooter}>
                <StatusBadge tone={meta.tone}>{option.recommendedFor}</StatusBadge>
                <b>{option.maxVisibleItems}개</b>
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.previewArea} aria-label="밀도별 버블 미리보기">
        <article className={cn(styles.widgetPreview, styles[activeMode])}>
          <div className={styles.previewHeader}>
            <strong>오늘 보는 버블</strong>
            <StatusBadge tone={modeMeta[activeMode].tone}>{activeOption.label}</StatusBadge>
          </div>
          <div className={styles.previewList}>
            {previewItems.map((item) => {
              const source = sourceMeta[item.source];

              return (
                <div className={styles.previewRow} key={`${item.label}-${item.source}`}>
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                  <StatusBadge tone={source.tone}>{source.label}</StatusBadge>
                </div>
              );
            })}
          </div>
        </article>

        <div className={styles.ruleStack}>
          {surfaceRules.map((rule) => {
            const meta = surfaceMeta[rule.surface];
            const Icon = meta.icon;

            return (
              <article className={styles.ruleCard} key={rule.surface}>
                <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                <div>
                  <div className={styles.ruleTitle}>
                    <strong>{rule.label}</strong>
                    <StatusBadge tone={meta.tone}>적용</StatusBadge>
                  </div>
                  <p>{rule.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <Button icon={<LayoutGrid size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          밀도 미리보기
        </Button>
        <Button icon={<Settings2 size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          개인 설정 저장
        </Button>
      </footer>
    </GlassPanel>
  );
}
