"use client";

import { Eye, EyeOff, Monitor, ShieldCheck, Type, ZoomIn } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-background-readability-panel.module.css";

type BackgroundTone = "bright" | "dark" | "busy";
type ReadabilityResult = "pass" | "watch" | "fail";
type TextMode = "light" | "dark" | "auto";

type BackgroundScenario = {
  background: BackgroundTone;
  caption: MessageKey;
  fontScale: 90 | 100 | 115 | 130;
  ghostMode: boolean;
  result: ReadabilityResult;
  textMode: TextMode;
  title: MessageKey;
};

export type WidgetBackgroundReadabilityPanelProps = HTMLAttributes<HTMLElement> & {
  scenarios: BackgroundScenario[];
  title?: string;
};

const backgroundMeta: Record<BackgroundTone, { label: MessageKey; tone: StatusTone }> = {
  bright: { label: "widget.readability.bg.bright", tone: "personal" },
  busy: { label: "widget.readability.bg.busy", tone: "warning" },
  dark: { label: "widget.readability.bg.dark", tone: "room" },
};

const resultMeta: Record<ReadabilityResult, { label: MessageKey; tone: StatusTone }> = {
  fail: { label: "widget.readability.result.fail", tone: "warning" },
  pass: { label: "widget.readability.result.pass", tone: "success" },
  watch: { label: "widget.readability.result.watch", tone: "pending" },
};

const textModeMeta: Record<TextMode, { label: MessageKey; tone: StatusTone }> = {
  auto: { label: "widget.readability.text.auto", tone: "pending" },
  dark: { label: "widget.readability.text.dark", tone: "neutral" },
  light: { label: "widget.readability.text.light", tone: "room" },
};

export const defaultReadabilityScenarios: BackgroundScenario[] = [
  {
    background: "bright",
    caption: "widget.readability.scenario.bright.caption",
    fontScale: 100,
    ghostMode: false,
    result: "pass",
    textMode: "dark",
    title: "widget.readability.scenario.bright.title",
  },
  {
    background: "dark",
    caption: "widget.readability.scenario.dark.caption",
    fontScale: 115,
    ghostMode: true,
    result: "pass",
    textMode: "light",
    title: "widget.readability.scenario.dark.title",
  },
  {
    background: "busy",
    caption: "widget.readability.scenario.busy.caption",
    fontScale: 130,
    ghostMode: true,
    result: "watch",
    textMode: "auto",
    title: "widget.readability.scenario.busy.title",
  },
];

export function WidgetBackgroundReadabilityPanel({
  className,
  scenarios,
  title,
  ...props
}: WidgetBackgroundReadabilityPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.readability.title");
  const passingCount = scenarios.filter((scenario) => scenario.result === "pass").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Monitor size={16} strokeWidth={2.1} />}>{t("widget.readability.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.readability.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("widget.readability.passScenarios")}</span>
          <strong>
            {passingCount}/{scenarios.length}
          </strong>
          <StatusBadge tone={passingCount === scenarios.length ? "success" : "pending"}>{t("widget.readability.check")}</StatusBadge>
        </div>
      </header>

      <section className={styles.scenarioGrid} aria-label={t("widget.readability.gridAria")}>
        {scenarios.map((scenario) => {
          const background = backgroundMeta[scenario.background];
          const result = resultMeta[scenario.result];
          const textMode = textModeMeta[scenario.textMode];

          return (
            <article className={cn(styles.scenarioCard, styles[scenario.background])} key={scenario.title}>
              <div className={styles.desktopScene}>
                <div className={styles.windowHint}>
                  <span />
                  <b>{t(background.label)}</b>
                </div>
                <div className={cn(styles.widgetPreview, scenario.ghostMode && styles.ghost)}>
                  <div className={styles.widgetHeader}>
                    <strong>{t("widget.bubble.todo")}</strong>
                    {scenario.ghostMode ? (
                      <EyeOff size={14} strokeWidth={2.1} aria-label={t("widget.readability.ghostMode")} />
                    ) : (
                      <Eye size={14} strokeWidth={2.1} aria-label={t("widget.readability.normalDisplay")} />
                    )}
                  </div>
                  <p>{t("widget.readability.previewTask")}</p>
                  <b>{t("widget.readability.previewDue")}</b>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div>
                  <h3>{t(scenario.title)}</h3>
                  <p>{t(scenario.caption)}</p>
                </div>
                <div className={styles.badgeRow}>
                  <StatusBadge tone={background.tone}>{t(background.label)}</StatusBadge>
                  <StatusBadge tone={textMode.tone}>{t(textMode.label)}</StatusBadge>
                  <StatusBadge tone={result.tone}>{t(result.label)}</StatusBadge>
                </div>
                <dl className={styles.metricGrid}>
                  <div>
                    <dt>{t("widget.readability.fontSize")}</dt>
                    <dd>{scenario.fontScale}%</dd>
                  </div>
                  <div>
                    <dt>{t("widget.readability.ghost")}</dt>
                    <dd>{scenario.ghostMode ? t("widget.readability.on") : t("widget.readability.off")}</dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label={t("widget.readability.ruleAria")}>
        <article>
          <Type size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.readability.rule.minTitle")}</strong>
            <p>{t("widget.readability.rule.minBody")}</p>
          </div>
        </article>
        <article>
          <ZoomIn size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.readability.rule.scaleTitle")}</strong>
            <p>{t("widget.readability.rule.scaleBody")}</p>
          </div>
        </article>
        <article>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.readability.rule.focusTitle")}</strong>
            <p>{t("widget.readability.rule.focusBody")}</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<EyeOff size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.readability.ghostPreview")}
        </Button>
        <Button icon={<Type size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.readability.adjustFont")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
