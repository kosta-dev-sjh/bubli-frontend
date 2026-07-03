import {
  Activity,
  Gauge,
  MousePointer2,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-motion-policy-panel.module.css";

type MotionMode = "static" | "hover" | "signal" | "reduced";
type MotionRuleStatus = "allowed" | "limited" | "avoid";
type MotionToken = "transform" | "opacity" | "shadow" | "layout";

type MotionRule = {
  description: MessageKey;
  label: MessageKey;
  status: MotionRuleStatus;
  token: MotionToken;
};

type MotionScenario = {
  description: MessageKey;
  durationLabel: MessageKey;
  eventSource: "hover" | "notification" | "setting";
  label: MessageKey;
  mode: MotionMode;
};

export type WidgetMotionPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  activeMode?: MotionMode;
  rules: MotionRule[];
  scenarios: MotionScenario[];
  title?: string;
};

const modeMeta: Record<MotionMode, { icon: typeof PauseCircle; tone: StatusTone }> = {
  hover: { icon: MousePointer2, tone: "todo" },
  reduced: { icon: PauseCircle, tone: "personal" },
  signal: { icon: Activity, tone: "agent" },
  static: { icon: ShieldCheck, tone: "success" },
};

const statusMeta: Record<MotionRuleStatus, { label: MessageKey; tone: StatusTone }> = {
  allowed: { label: "widget.motion.status.allowed", tone: "success" },
  avoid: { label: "widget.motion.status.avoid", tone: "warning" },
  limited: { label: "widget.motion.status.limited", tone: "pending" },
};

const tokenLabel: Record<MotionToken, string> = {
  layout: "layout",
  opacity: "opacity",
  shadow: "rim/shadow",
  transform: "transform",
};

export const defaultMotionScenarios: MotionScenario[] = [
  {
    description: "widget.motion.scenario.static.description",
    durationLabel: "widget.motion.scenario.static.durationLabel",
    eventSource: "setting",
    label: "widget.motion.scenario.static.label",
    mode: "static",
  },
  {
    description: "widget.motion.scenario.hover.description",
    durationLabel: "widget.motion.scenario.hover.durationLabel",
    eventSource: "hover",
    label: "widget.motion.scenario.hover.label",
    mode: "hover",
  },
  {
    description: "widget.motion.scenario.signal.description",
    durationLabel: "widget.motion.scenario.signal.durationLabel",
    eventSource: "notification",
    label: "widget.motion.scenario.signal.label",
    mode: "signal",
  },
  {
    description: "widget.motion.scenario.reduced.description",
    durationLabel: "widget.motion.scenario.reduced.durationLabel",
    eventSource: "setting",
    label: "widget.motion.scenario.reduced.label",
    mode: "reduced",
  },
];

export const defaultMotionRules: MotionRule[] = [
  {
    description: "widget.motion.rule.transform.description",
    label: "widget.motion.rule.transform.label",
    status: "allowed",
    token: "transform",
  },
  {
    description: "widget.motion.rule.opacity.description",
    label: "widget.motion.rule.opacity.label",
    status: "limited",
    token: "opacity",
  },
  {
    description: "widget.motion.rule.shadow.description",
    label: "widget.motion.rule.shadow.label",
    status: "allowed",
    token: "shadow",
  },
  {
    description: "widget.motion.rule.layout.description",
    label: "widget.motion.rule.layout.label",
    status: "avoid",
    token: "layout",
  },
];

export function WidgetMotionPolicyPanel({
  activeMode = "static",
  className,
  rules,
  scenarios,
  title,
  ...props
}: WidgetMotionPolicyPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.motion.title");
  const activeScenario = scenarios.find((scenario) => scenario.mode === activeMode) ?? scenarios[0];
  const activeMeta = modeMeta[activeScenario.mode];
  const ActiveIcon = activeMeta.icon;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Waves size={16} strokeWidth={2.1} />}>{t("widget.motion.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.motion.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("widget.motion.currentPolicy")}</span>
          <strong>{t(activeScenario.label)}</strong>
          <StatusBadge tone={activeMeta.tone}>{t(activeScenario.durationLabel)}</StatusBadge>
        </div>
      </header>

      <section className={styles.sceneGrid} aria-label={t("widget.motion.sceneAria")}>
        <article className={styles.previewScene}>
          <div className={styles.windowBar}>
            <span />
            <b>{t("widget.motion.workScreen")}</b>
          </div>
          <div className={cn(styles.motionBubble, styles[activeScenario.mode])}>
            <div className={styles.bubbleHeader}>
              <span className={styles.bubbleIcon}>
                <ActiveIcon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <strong>{t("widget.bubble.todo")}</strong>
                <p>{t(activeScenario.label)}</p>
              </div>
            </div>
            <div className={styles.taskLine}>
              <span />
              <b>{t("widget.motion.previewTask1")}</b>
            </div>
            <div className={styles.taskLine}>
              <span />
              <b>{t("widget.motion.previewTask2")}</b>
            </div>
            <div className={styles.bubbleFooter}>
              <StatusBadge tone={activeMeta.tone}>{t(activeScenario.durationLabel)}</StatusBadge>
              <span>{activeScenario.eventSource}</span>
            </div>
          </div>
        </article>

        <aside className={styles.scenarioList} aria-label={t("widget.motion.scenarioListAria")}>
          {scenarios.map((scenario) => {
            const meta = modeMeta[scenario.mode];
            const Icon = meta.icon;
            const selected = scenario.mode === activeMode;

            return (
              <button
                aria-pressed={selected}
                className={cn(styles.scenarioCard, selected && styles.selected)}
                key={scenario.mode}
                type="button"
              >
                <span className={styles.scenarioIcon}>
                  <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.scenarioCopy}>
                  <b>{t(scenario.label)}</b>
                  <span>{t(scenario.description)}</span>
                </span>
                <StatusBadge tone={meta.tone}>{t(scenario.durationLabel)}</StatusBadge>
              </button>
            );
          })}
        </aside>
      </section>

      <section className={styles.ruleGrid} aria-label={t("widget.motion.ruleGridAria")}>
        {rules.map((rule) => {
          const status = statusMeta[rule.status];

          return (
            <article className={styles.ruleCard} key={`${rule.token}-${rule.label}`}>
              <div className={styles.ruleTop}>
                <span>{tokenLabel[rule.token]}</span>
                <StatusBadge tone={status.tone}>{t(status.label)}</StatusBadge>
              </div>
              <strong>{t(rule.label)}</strong>
              <p>{t(rule.description)}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.boundaryGrid} aria-label={t("widget.motion.boundaryAria")}>
        <article>
          <Gauge size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.motion.perfTitle")}</strong>
            <p>{t("widget.motion.perfBody")}</p>
          </div>
        </article>
        <article>
          <PauseCircle size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.motion.a11yTitle")}</strong>
            <p>{t("widget.motion.a11yBody")}</p>
          </div>
        </article>
        <article>
          <Sparkles size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.motion.storageTitle")}</strong>
            <p>{t("widget.motion.storageBody")}</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<MousePointer2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.motion.hoverButton")}
        </Button>
        <Button icon={<PauseCircle size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.motion.offButton")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
