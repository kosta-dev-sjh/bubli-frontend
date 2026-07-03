"use client";

import { CheckCircle2, EyeOff, Monitor, PanelTop, Type, ZoomIn } from "lucide-react";
import type { CSSProperties, HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-font-scale-panel.module.css";

type FontScale = 90 | 100 | 115 | 130;
type SurfaceKind = "dashboard" | "widget" | "ghost" | "settings";

type FontScaleOption = {
  description: MessageKey;
  label: MessageKey;
  recommendedFor: MessageKey;
  sampleSizeLabel: string;
  value: FontScale;
};

type AffectedSurface = {
  description: MessageKey;
  kind: SurfaceKind;
  label: MessageKey;
  source: "user_preferences" | "widget_preferences";
};

export type WidgetFontScalePanelProps = HTMLAttributes<HTMLElement> & {
  activeScale: FontScale;
  affectedSurfaces: AffectedSurface[];
  ghostModeBoost?: boolean;
  scaleOptions: FontScaleOption[];
  title?: string;
};

const surfaceMeta: Record<SurfaceKind, { icon: typeof Monitor; tone: StatusTone }> = {
  dashboard: { icon: PanelTop, tone: "personal" },
  ghost: { icon: EyeOff, tone: "pending" },
  settings: { icon: Type, tone: "neutral" },
  widget: { icon: Monitor, tone: "todo" },
};

export const defaultFontScaleOptions: FontScaleOption[] = [
  {
    description: "widget.font.wide.description",
    label: "widget.font.wide.label",
    recommendedFor: "widget.font.wide.recommendedFor",
    sampleSizeLabel: "90%",
    value: 90,
  },
  {
    description: "widget.font.default.description",
    label: "widget.font.default.label",
    recommendedFor: "widget.font.default.recommendedFor",
    sampleSizeLabel: "100%",
    value: 100,
  },
  {
    description: "widget.font.large.description",
    label: "widget.font.large.label",
    recommendedFor: "widget.font.large.recommendedFor",
    sampleSizeLabel: "115%",
    value: 115,
  },
  {
    description: "widget.font.xlarge.description",
    label: "widget.font.xlarge.label",
    recommendedFor: "widget.font.xlarge.recommendedFor",
    sampleSizeLabel: "130%",
    value: 130,
  },
];

export const defaultFontScaleSurfaces: AffectedSurface[] = [
  {
    description: "widget.font.surface.dashboardBody",
    kind: "dashboard",
    label: "widget.font.surface.dashboardLabel",
    source: "user_preferences",
  },
  {
    description: "widget.font.surface.widgetBody",
    kind: "widget",
    label: "widget.font.surface.widgetLabel",
    source: "user_preferences",
  },
  {
    description: "widget.font.surface.ghostBody",
    kind: "ghost",
    label: "widget.font.surface.ghostLabel",
    source: "widget_preferences",
  },
  {
    description: "widget.font.surface.settingsBody",
    kind: "settings",
    label: "widget.font.surface.settingsLabel",
    source: "user_preferences",
  },
];

export function WidgetFontScalePanel({
  activeScale,
  affectedSurfaces,
  className,
  ghostModeBoost = true,
  scaleOptions,
  title,
  ...props
}: WidgetFontScalePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.font.title");
  const activeOption = scaleOptions.find((option) => option.value === activeScale) ?? scaleOptions[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Type size={16} strokeWidth={2.1} />}>{t("widget.font.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.font.description")}</p>
          </div>
        </div>
        <div className={styles.activeCard}>
          <span>{t("widget.font.currentStep")}</span>
          <strong>{activeOption.sampleSizeLabel}</strong>
          <StatusBadge tone="personal">{t(activeOption.label)}</StatusBadge>
        </div>
      </header>

      <section className={styles.scaleGrid} aria-label={t("widget.font.scaleGridAria")}>
        {scaleOptions.map((option) => {
          const selected = option.value === activeScale;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.scaleCard, selected && styles.selected)}
              key={option.value}
              type="button"
            >
              <span className={styles.scaleValue}>{option.sampleSizeLabel}</span>
              <span className={styles.scaleName}>
                {selected ? <CheckCircle2 size={15} strokeWidth={2.1} aria-hidden="true" /> : null}
                {t(option.label)}
              </span>
              <span className={styles.scaleDescription}>{t(option.description)}</span>
              <span className={styles.recommended}>{t(option.recommendedFor)}</span>
            </button>
          );
        })}
      </section>

      <section className={styles.previewWrap} aria-label={t("widget.font.previewAria")}>
        <article className={styles.previewCard} style={{ "--font-scale": activeScale / 100 } as CSSProperties}>
          <div className={styles.previewHeader}>
            <span>{t("widget.bubble.todo")}</span>
            <StatusBadge tone="todo">{t("widget.font.previewBadge")}</StatusBadge>
          </div>
          <div className={styles.previewTask}>
            <strong>{t("widget.font.previewTask")}</strong>
            <span>{t("widget.font.previewMeta")}</span>
          </div>
          <p>{t("widget.font.previewNote")}</p>
        </article>

        <article className={cn(styles.previewCard, styles.ghostPreview)}>
          <div className={styles.previewHeader}>
            <span>{t("widget.font.ghostMode")}</span>
            <StatusBadge tone={ghostModeBoost ? "success" : "warning"}>
              {ghostModeBoost ? t("widget.font.weightBoost") : t("widget.font.boostOff")}
            </StatusBadge>
          </div>
          <div className={styles.previewTask}>
            <strong>{t("widget.font.ghostTask")}</strong>
            <span>{t("widget.font.ghostMeta")}</span>
          </div>
          <p>{t("widget.font.ghostNote")}</p>
        </article>
      </section>

      <section className={styles.surfaceGrid} aria-label={t("widget.font.surfaceGridAria")}>
        {affectedSurfaces.map((surface) => {
          const meta = surfaceMeta[surface.kind];
          const Icon = meta.icon;

          return (
            <article className={styles.surfaceCard} key={`${surface.kind}-${surface.label}`}>
              <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <div className={styles.surfaceTitle}>
                  <strong>{t(surface.label)}</strong>
                  <StatusBadge tone={meta.tone}>{surface.source}</StatusBadge>
                </div>
                <p>{t(surface.description)}</p>
              </div>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <Button icon={<ZoomIn size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.font.applyPreview")}
        </Button>
        <Button icon={<Type size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.font.saveSetting")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
