"use client";

import {
  AlignCenter,
  EyeOff,
  Grip,
  Layers3,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Pin,
  Rows3,
  ShieldCheck,
  Type,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-window-controls-panel.module.css";

type WidgetDensity = "default" | "focus" | "compact";
type WidgetTextMode = "light" | "dark" | "auto";

type WidgetWindowControl = {
  id: string;
  description: MessageKey;
  enabled: boolean;
  icon: ReactNode;
  label: MessageKey;
};

type WidgetPersistenceRule = {
  id: string;
  description: MessageKey;
  label: MessageKey;
  tone: StatusTone;
};

export type WidgetWindowControlsPanelProps = HTMLAttributes<HTMLElement> & {
  controls: WidgetWindowControl[];
  density: WidgetDensity;
  persistenceRules: WidgetPersistenceRule[];
  textMode: WidgetTextMode;
  title?: string;
  visibleBubbleCount: number;
};

const densityMeta: Record<WidgetDensity, { label: MessageKey; tone: StatusTone }> = {
  compact: { label: "widget.window.density.compact", tone: "pending" },
  default: { label: "widget.window.density.default", tone: "personal" },
  focus: { label: "widget.window.density.focus", tone: "success" },
};

const textModeMeta: Record<WidgetTextMode, { label: MessageKey; tone: StatusTone }> = {
  auto: { label: "widget.window.textMode.auto", tone: "pending" },
  dark: { label: "widget.window.textMode.dark", tone: "neutral" },
  light: { label: "widget.window.textMode.light", tone: "room" },
};

export const defaultWidgetWindowControls: WidgetWindowControl[] = [
  {
    id: "pin",
    description: "widget.window.control.pinBody",
    enabled: true,
    icon: <Pin size={16} strokeWidth={2.1} />,
    label: "widget.window.control.pinLabel",
  },
  {
    id: "ghost",
    description: "widget.window.control.ghostBody",
    enabled: false,
    icon: <EyeOff size={16} strokeWidth={2.1} />,
    label: "widget.window.control.ghostLabel",
  },
  {
    id: "minimize",
    description: "widget.window.control.minimizeBody",
    enabled: true,
    icon: <Minimize2 size={16} strokeWidth={2.1} />,
    label: "widget.window.control.minimizeLabel",
  },
  {
    id: "autoLayout",
    description: "widget.window.control.autoLayoutBody",
    enabled: true,
    icon: <AlignCenter size={16} strokeWidth={2.1} />,
    label: "widget.window.control.autoLayoutLabel",
  },
];

export const defaultWidgetPersistenceRules: WidgetPersistenceRule[] = [
  {
    id: "position",
    description: "widget.window.rule.positionBody",
    label: "widget.window.rule.positionLabel",
    tone: "room",
  },
  {
    id: "option",
    description: "widget.window.rule.optionBody",
    label: "widget.window.rule.optionLabel",
    tone: "personal",
  },
  {
    id: "event",
    description: "widget.window.rule.eventBody",
    label: "widget.window.rule.eventLabel",
    tone: "pending",
  },
];

export function WidgetWindowControlsPanel({
  className,
  controls,
  density,
  persistenceRules,
  textMode,
  title,
  visibleBubbleCount,
  ...props
}: WidgetWindowControlsPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.window.title");
  const currentDensity = densityMeta[density];
  const currentTextMode = textModeMeta[textMode];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Layers3 size={16} strokeWidth={2.1} />}>{t("widget.window.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.window.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("widget.window.visibleBubbles")}</span>
          <strong>{t("widget.window.bubbleCount", { count: visibleBubbleCount })}</strong>
          <StatusBadge tone={currentDensity.tone}>{t(currentDensity.label)}</StatusBadge>
        </div>
      </header>

      <section className={styles.preview} aria-label={t("widget.window.previewAria")}>
        <div className={styles.previewBar}>
          <span />
          <b>{t("widget.window.previewTitle")}</b>
          <em>{t(currentTextMode.label)}</em>
        </div>
        <div className={styles.bubbleMock}>
          <div className={styles.bubbleHeader}>
            <strong>{t("widget.bubble.todo")}</strong>
            <div className={styles.iconButtons} aria-hidden="true">
              <Pin size={14} strokeWidth={2.1} />
              <EyeOff size={14} strokeWidth={2.1} />
              <Minimize2 size={14} strokeWidth={2.1} />
            </div>
          </div>
          <div className={styles.bubbleBody}>
            <span>{t("widget.window.previewTask")}</span>
            <b>{t("widget.window.previewDue")}</b>
          </div>
          <div className={styles.bubbleFooter}>
            <span>
              <Grip size={13} strokeWidth={2.1} aria-hidden="true" />
              {t("widget.window.draggable")}
            </span>
            <span>
              <Maximize2 size={13} strokeWidth={2.1} aria-hidden="true" />
              338px
            </span>
          </div>
        </div>
      </section>

      <section className={styles.controlGrid} aria-label={t("widget.window.controlGridAria")}>
        {controls.map((control) => (
          <article className={cn(styles.controlCard, control.enabled && styles.enabled)} key={control.id}>
            <span className={styles.controlIcon} aria-hidden="true">
              {control.icon}
            </span>
            <div>
              <strong>{t(control.label)}</strong>
              <p>{t(control.description)}</p>
            </div>
            <StatusBadge tone={control.enabled ? "success" : "neutral"}>{control.enabled ? t("widget.window.on") : t("widget.window.off")}</StatusBadge>
          </article>
        ))}
      </section>

      <section className={styles.optionStrip} aria-label={t("widget.window.optionAria")}>
        <article>
          <Rows3 size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("widget.window.displayDensity")}</span>
          <StatusBadge tone={currentDensity.tone}>{t(currentDensity.label)}</StatusBadge>
        </article>
        <article>
          <Type size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("widget.window.ghostText")}</span>
          <StatusBadge tone={currentTextMode.tone}>{t(currentTextMode.label)}</StatusBadge>
        </article>
        <article>
          <MousePointerClick size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("widget.window.eventRecord")}</span>
          <StatusBadge tone="pending">{t("widget.window.localDetail")}</StatusBadge>
        </article>
      </section>

      <section className={styles.persistenceList} aria-label={t("widget.window.persistenceAria")}>
        {persistenceRules.map((rule) => (
          <article className={styles.persistenceItem} key={rule.id}>
            <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t(rule.label)}</strong>
              <p>{t(rule.description)}</p>
            </div>
            <StatusBadge tone={rule.tone}>{t("widget.window.saveBasis")}</StatusBadge>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Button icon={<AlignCenter size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.window.autoAlign")}
        </Button>
        <Button icon={<EyeOff size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.window.ghostToggle")}
        </Button>
        <Button icon={<Minimize2 size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
          {t("widget.window.foldToDock")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
