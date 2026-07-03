"use client";

import {
  CheckCircle2,
  CircleDot,
  CornerDownLeft,
  Eye,
  Keyboard,
  MousePointer2,
  PanelTopClose,
  ShieldCheck,
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

import styles from "./accessibility-keyboard-navigation-panel.module.css";

type KeyboardPriority = "required" | "important" | "watch";
type KeyboardTargetKind = "button" | "input" | "dialog" | "bubble" | "board";
type KeyboardRuleState = "ready" | "needsReview" | "blocked";

type KeyboardTarget = {
  descriptionKey: MessageKey;
  flowKey: MessageKey;
  kind: KeyboardTargetKind;
  labelKey: MessageKey;
  priority: KeyboardPriority;
};

type KeyboardRule = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  state: KeyboardRuleState;
};

export type AccessibilityKeyboardNavigationPanelProps = HTMLAttributes<HTMLElement> & {
  activeTarget?: KeyboardTargetKind;
  rules: KeyboardRule[];
  targets: KeyboardTarget[];
  title?: string;
};

const priorityMeta: Record<KeyboardPriority, { labelKey: MessageKey; tone: StatusTone }> = {
  important: { labelKey: "settings.a11y.priorityImportant", tone: "todo" },
  required: { labelKey: "settings.a11y.priorityRequired", tone: "success" },
  watch: { labelKey: "settings.a11y.priorityWatch", tone: "pending" },
};

const targetMeta: Record<KeyboardTargetKind, { icon: typeof Keyboard; tone: StatusTone }> = {
  board: { icon: CircleDot, tone: "room" },
  bubble: { icon: MousePointer2, tone: "timer" },
  button: { icon: CheckCircle2, tone: "success" },
  dialog: { icon: PanelTopClose, tone: "warning" },
  input: { icon: CornerDownLeft, tone: "todo" },
};

const ruleMeta: Record<KeyboardRuleState, { labelKey: MessageKey; tone: StatusTone }> = {
  blocked: { labelKey: "settings.a11y.ruleBlocked", tone: "warning" },
  needsReview: { labelKey: "settings.a11y.ruleNeedsReview", tone: "pending" },
  ready: { labelKey: "settings.a11y.ruleReady", tone: "success" },
};

export const defaultKeyboardTargets: KeyboardTarget[] = [
  {
    descriptionKey: "settings.a11y.targetButtonDesc",
    flowKey: "settings.a11y.flowButton",
    kind: "button",
    labelKey: "settings.a11y.targetButtonLabel",
    priority: "required",
  },
  {
    descriptionKey: "settings.a11y.targetInputDesc",
    flowKey: "settings.a11y.flowInput",
    kind: "input",
    labelKey: "settings.a11y.targetInputLabel",
    priority: "required",
  },
  {
    descriptionKey: "settings.a11y.targetDialogDesc",
    flowKey: "settings.a11y.flowDialog",
    kind: "dialog",
    labelKey: "settings.a11y.targetDialogLabel",
    priority: "important",
  },
  {
    descriptionKey: "settings.a11y.targetBubbleDesc",
    flowKey: "settings.a11y.flowBubble",
    kind: "bubble",
    labelKey: "settings.a11y.targetBubbleLabel",
    priority: "required",
  },
  {
    descriptionKey: "settings.a11y.targetBoardDesc",
    flowKey: "settings.a11y.flowBoard",
    kind: "board",
    labelKey: "settings.a11y.targetBoardLabel",
    priority: "watch",
  },
];

export const defaultKeyboardRules: KeyboardRule[] = [
  {
    descriptionKey: "settings.a11y.ruleOrderDesc",
    labelKey: "settings.a11y.ruleOrderLabel",
    state: "ready",
  },
  {
    descriptionKey: "settings.a11y.ruleVisibleDesc",
    labelKey: "settings.a11y.ruleVisibleLabel",
    state: "ready",
  },
  {
    descriptionKey: "settings.a11y.ruleEscapeDesc",
    labelKey: "settings.a11y.ruleEscapeLabel",
    state: "needsReview",
  },
  {
    descriptionKey: "settings.a11y.ruleInputDesc",
    labelKey: "settings.a11y.ruleInputLabel",
    state: "ready",
  },
];

export function AccessibilityKeyboardNavigationPanel({
  activeTarget = "bubble",
  className,
  rules,
  targets,
  title,
  ...props
}: AccessibilityKeyboardNavigationPanelProps) {
  const { t } = useI18n();
  const active = targets.find((target) => target.kind === activeTarget) ?? targets[0];
  const activeMeta = targetMeta[active.kind];
  const ActiveIcon = activeMeta.icon;
  const activePriority = priorityMeta[active.priority];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Keyboard size={16} strokeWidth={2.1} />}>{t("settings.a11y.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{title ?? t("settings.a11y.title")}</h2>
            <p className={styles.description}>{t("settings.a11y.headerDesc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("settings.a11y.summaryLabel")}</span>
          <strong>{t(active.labelKey)}</strong>
          <StatusBadge tone={activePriority.tone}>{t(activePriority.labelKey)}</StatusBadge>
        </div>
      </header>

      <section className={styles.previewGrid} aria-label={t("settings.a11y.previewAria")}>
        <article className={styles.flowPreview}>
          <div className={styles.browserBar}>
            <span />
            <b>{t("settings.a11y.browserLabel")}</b>
          </div>
          <div className={styles.focusRail}>
            <span>Tab</span>
            <span>Enter</span>
            <span>Esc</span>
          </div>
          <div className={styles.focusCard}>
            <span className={styles.focusIcon}>
              <ActiveIcon size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{t(active.labelKey)}</strong>
              <p>{t(active.descriptionKey)}</p>
            </div>
            <StatusBadge tone={activeMeta.tone}>{t(active.flowKey)}</StatusBadge>
          </div>
          <div className={styles.focusSteps}>
            <button type="button">{t("settings.a11y.stepSearch")}</button>
            <button className={styles.isFocused} type="button">
              {t("settings.a11y.stepApprove")}
            </button>
            <button type="button">{t("settings.a11y.stepClose")}</button>
          </div>
        </article>

        <aside className={styles.targetList} aria-label={t("settings.a11y.targetListAria")}>
          {targets.map((target) => {
            const meta = targetMeta[target.kind];
            const Icon = meta.icon;
            const priority = priorityMeta[target.priority];
            const selected = target.kind === active.kind;

            return (
              <button
                aria-pressed={selected}
                className={cn(styles.targetCard, selected && styles.selected)}
                key={target.kind}
                type="button"
              >
                <span className={styles.targetIcon}>
                  <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.targetCopy}>
                  <b>{t(target.labelKey)}</b>
                  <span>{t(target.flowKey)}</span>
                </span>
                <StatusBadge tone={priority.tone}>{t(priority.labelKey)}</StatusBadge>
              </button>
            );
          })}
        </aside>
      </section>

      <section className={styles.ruleGrid} aria-label={t("settings.a11y.ruleGridAria")}>
        {rules.map((rule) => {
          const meta = ruleMeta[rule.state];

          return (
            <article className={styles.ruleCard} key={rule.labelKey}>
              <div className={styles.ruleTop}>
                <Eye size={16} strokeWidth={2.1} aria-hidden="true" />
                <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
              </div>
              <strong>{t(rule.labelKey)}</strong>
              <p>{t(rule.descriptionKey)}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.boundaryCard} aria-label={t("settings.a11y.boundaryAria")}>
        <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
        <div>
          <strong>{t("settings.a11y.boundaryHeading")}</strong>
          <p>{t("settings.a11y.boundaryBody")}</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <Button icon={<Keyboard size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("settings.a11y.footerTabOrder")}
        </Button>
        <Button icon={<PanelTopClose size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("settings.a11y.footerCloseAction")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
