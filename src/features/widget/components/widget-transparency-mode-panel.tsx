"use client";

import { Eye, EyeOff, Layers3, MousePointer2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-transparency-mode-panel.module.css";

type TransparencyMode = "normal" | "translucent" | "ghost";
type BackgroundCheck = "bright" | "dark" | "busy";

type TransparencyOption = {
  description: MessageKey;
  ghostMode: boolean;
  label: MessageKey;
  mode: TransparencyMode;
  opacity: number;
  pointerPolicy: MessageKey;
};

type BackgroundReadabilityCheck = {
  background: BackgroundCheck;
  label: MessageKey;
  result: "pass" | "watch";
};

export type WidgetTransparencyModePanelProps = HTMLAttributes<HTMLElement> & {
  activeMode: TransparencyMode;
  backgroundChecks: BackgroundReadabilityCheck[];
  options: TransparencyOption[];
  title?: string;
};

const modeMeta: Record<TransparencyMode, { icon: typeof Eye; tone: StatusTone }> = {
  ghost: { icon: EyeOff, tone: "pending" },
  normal: { icon: Eye, tone: "personal" },
  translucent: { icon: Layers3, tone: "todo" },
};

const backgroundMeta: Record<BackgroundCheck, { className: string; tone: StatusTone }> = {
  bright: { className: styles.bright, tone: "personal" },
  busy: { className: styles.busy, tone: "warning" },
  dark: { className: styles.dark, tone: "room" },
};

const resultTone: Record<BackgroundReadabilityCheck["result"], StatusTone> = {
  pass: "success",
  watch: "pending",
};

export const defaultTransparencyOptions: TransparencyOption[] = [
  {
    description: "widget.transparency.normal.description",
    ghostMode: false,
    label: "widget.transparency.normal.label",
    mode: "normal",
    opacity: 92,
    pointerPolicy: "widget.transparency.normal.pointerPolicy",
  },
  {
    description: "widget.transparency.translucent.description",
    ghostMode: false,
    label: "widget.transparency.translucent.label",
    mode: "translucent",
    opacity: 58,
    pointerPolicy: "widget.transparency.translucent.pointerPolicy",
  },
  {
    description: "widget.transparency.ghost.description",
    ghostMode: true,
    label: "widget.transparency.ghost.label",
    mode: "ghost",
    opacity: 18,
    pointerPolicy: "widget.transparency.ghost.pointerPolicy",
  },
];

export const defaultBackgroundChecks: BackgroundReadabilityCheck[] = [
  { background: "bright", label: "widget.transparency.check.bright", result: "pass" },
  { background: "dark", label: "widget.transparency.check.dark", result: "pass" },
  { background: "busy", label: "widget.transparency.check.busy", result: "watch" },
];

export function WidgetTransparencyModePanel({
  activeMode,
  backgroundChecks,
  className,
  options,
  title,
  ...props
}: WidgetTransparencyModePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.transparency.title");
  const activeOption = options.find((option) => option.mode === activeMode) ?? options[0];
  const activeMeta = modeMeta[activeOption.mode];
  const ActiveIcon = activeMeta.icon;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<SlidersHorizontal size={16} strokeWidth={2.1} />}>{t("widget.transparency.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.transparency.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("widget.transparency.currentStep")}</span>
          <strong>{t(activeOption.label)}</strong>
          <StatusBadge tone={activeMeta.tone}>{activeOption.opacity}%</StatusBadge>
        </div>
      </header>

      <section className={styles.optionGrid} aria-label={t("widget.transparency.optionGridAria")}>
        {options.map((option) => {
          const meta = modeMeta[option.mode];
          const Icon = meta.icon;
          const selected = option.mode === activeMode;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.optionCard, selected && styles.selected)}
              key={option.mode}
              type="button"
            >
              <span className={styles.optionIcon}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className={styles.optionTitle}>{t(option.label)}</span>
              <span className={styles.optionDescription}>{t(option.description)}</span>
              <span className={styles.optionFooter}>
                <StatusBadge tone={meta.tone}>{t(option.pointerPolicy)}</StatusBadge>
                <b>{option.opacity}%</b>
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.previewArea} aria-label={t("widget.transparency.previewAria")}>
        <article className={styles.desktopScene}>
          <div className={styles.desktopWindow}>
            <span />
            <b>{t("widget.transparency.workScreen")}</b>
          </div>
          <div className={cn(styles.widgetPreview, styles[activeOption.mode])}>
            <div className={styles.widgetHeader}>
              <strong>{t("widget.bubble.todo")}</strong>
              <ActiveIcon size={15} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <p>{t("widget.transparency.previewFile")}</p>
            <b>42:18</b>
            <span>{t(activeOption.pointerPolicy)}</span>
          </div>
        </article>

        <aside className={styles.policyStack} aria-label={t("widget.transparency.policyAria")}>
          <article>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t("widget.transparency.saveTitle")}</strong>
              <p>{t("widget.transparency.saveBody")}</p>
            </div>
          </article>
          <article>
            <MousePointer2 size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t("widget.transparency.pointerTitle")}</strong>
              <p>{t("widget.transparency.pointerBody")}</p>
            </div>
          </article>
          <article>
            <Layers3 size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t("widget.transparency.stateTitle")}</strong>
              <p>{t("widget.transparency.stateBody")}</p>
            </div>
          </article>
        </aside>
      </section>

      <section className={styles.checkGrid} aria-label={t("widget.transparency.checkGridAria")}>
        {backgroundChecks.map((check) => {
          const meta = backgroundMeta[check.background];

          return (
            <article className={cn(styles.checkCard, meta.className)} key={check.background}>
              <span>{t(check.label)}</span>
              <StatusBadge tone={resultTone[check.result]}>{check.result === "pass" ? t("widget.transparency.readable") : t("widget.transparency.watch")}</StatusBadge>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <Button icon={<EyeOff size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.transparency.previewButton")}
        </Button>
        <Button icon={<SlidersHorizontal size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.transparency.saveOption")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
