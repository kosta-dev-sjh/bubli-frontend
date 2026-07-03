"use client";

import { Focus, LayoutGrid, Maximize2, Minimize2, PanelTop, Rows3, Settings2 } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-density-mode-panel.module.css";

type DensityMode = "default" | "focus" | "compact";
type DensitySurface = "dashboard" | "widget" | "dock";

type DensityOption = {
  description: MessageKey;
  label: MessageKey;
  maxVisibleItems: number;
  mode: DensityMode;
  recommendedFor: MessageKey;
};

type DensityPreviewItem = {
  label: MessageKey;
  source: "server" | "cache" | "local";
  value: MessageKey;
};

type DensitySurfaceRule = {
  description: MessageKey;
  label: MessageKey;
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

const sourceMeta: Record<DensityPreviewItem["source"], { label: MessageKey; tone: StatusTone }> = {
  cache: { label: "widget.density.source.cache", tone: "pending" },
  local: { label: "widget.density.source.local", tone: "timer" },
  server: { label: "widget.density.source.server", tone: "success" },
};

const surfaceMeta: Record<DensitySurface, { icon: typeof PanelTop; tone: StatusTone }> = {
  dashboard: { icon: PanelTop, tone: "personal" },
  dock: { icon: Rows3, tone: "pending" },
  widget: { icon: Maximize2, tone: "todo" },
};

export const defaultDensityOptions: DensityOption[] = [
  {
    description: "widget.density.default.description",
    label: "widget.density.default.label",
    maxVisibleItems: 4,
    mode: "default",
    recommendedFor: "widget.density.default.recommendedFor",
  },
  {
    description: "widget.density.focus.description",
    label: "widget.density.focus.label",
    maxVisibleItems: 2,
    mode: "focus",
    recommendedFor: "widget.density.focus.recommendedFor",
  },
  {
    description: "widget.density.compact.description",
    label: "widget.density.compact.label",
    maxVisibleItems: 6,
    mode: "compact",
    recommendedFor: "widget.density.compact.recommendedFor",
  },
];

export const defaultDensityPreviewItems: DensityPreviewItem[] = [
  { label: "widget.density.item.todo", source: "server", value: "widget.density.item.todoValue" },
  { label: "widget.density.item.schedule", source: "server", value: "widget.density.item.scheduleValue" },
  { label: "widget.density.item.chat", source: "cache", value: "widget.density.item.chatValue" },
  { label: "widget.density.item.timer", source: "local", value: "widget.density.item.timerValue" },
];

export const defaultDensitySurfaceRules: DensitySurfaceRule[] = [
  {
    description: "widget.density.surface.dashboardBody",
    label: "widget.density.surface.dashboardLabel",
    surface: "dashboard",
  },
  {
    description: "widget.density.surface.widgetBody",
    label: "widget.density.surface.widgetLabel",
    surface: "widget",
  },
  {
    description: "widget.density.surface.dockBody",
    label: "widget.density.surface.dockLabel",
    surface: "dock",
  },
];

export function WidgetDensityModePanel({
  activeMode,
  className,
  options,
  previewItems,
  surfaceRules,
  title,
  ...props
}: WidgetDensityModePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.density.title");
  const activeOption = options.find((option) => option.mode === activeMode) ?? options[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Settings2 size={16} strokeWidth={2.1} />}>{t("widget.density.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.density.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("widget.density.selectedMode")}</span>
          <strong>{t(activeOption.label)}</strong>
          <StatusBadge tone={modeMeta[activeOption.mode].tone}>{t("widget.density.maxVisible", { count: activeOption.maxVisibleItems })}</StatusBadge>
        </div>
      </header>

      <section className={styles.modeGrid} aria-label={t("widget.density.modeGridAria")}>
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
              <span className={styles.modeTitle}>{t(option.label)}</span>
              <span className={styles.modeDescription}>{t(option.description)}</span>
              <span className={styles.modeFooter}>
                <StatusBadge tone={meta.tone}>{t(option.recommendedFor)}</StatusBadge>
                <b>{t("widget.density.countUnit", { count: option.maxVisibleItems })}</b>
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.previewArea} aria-label={t("widget.density.previewAria")}>
        <article className={cn(styles.widgetPreview, styles[activeMode])}>
          <div className={styles.previewHeader}>
            <strong>{t("widget.density.todayBubbles")}</strong>
            <StatusBadge tone={modeMeta[activeMode].tone}>{t(activeOption.label)}</StatusBadge>
          </div>
          <div className={styles.previewList}>
            {previewItems.map((item) => {
              const source = sourceMeta[item.source];

              return (
                <div className={styles.previewRow} key={`${item.label}-${item.source}`}>
                  <span>{t(item.label)}</span>
                  <b>{t(item.value)}</b>
                  <StatusBadge tone={source.tone}>{t(source.label)}</StatusBadge>
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
                    <strong>{t(rule.label)}</strong>
                    <StatusBadge tone={meta.tone}>{t("widget.density.applied")}</StatusBadge>
                  </div>
                  <p>{t(rule.description)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <Button icon={<LayoutGrid size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.density.previewButton")}
        </Button>
        <Button icon={<Settings2 size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.density.savePersonal")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
