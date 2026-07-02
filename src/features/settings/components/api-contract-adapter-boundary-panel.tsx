"use client";

import {
  ArrowRight,
  Braces,
  CheckCircle2,
  FileJson2,
  GitBranch,
  Layers3,
  MonitorCheck,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./api-contract-adapter-boundary-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type BoundaryStep = {
  descriptionKey: MessageKey;
  icon: typeof FileJson2;
  label: string;
  owner: string;
  status: "fixed" | "replaceable" | "stable";
};

type ChangeCase = {
  after: string;
  before: string;
  impactKey: MessageKey;
  labelKey: MessageKey;
  target: string;
};

const boundarySteps: BoundaryStep[] = [
  {
    descriptionKey: "settings.acab.step.responseDesc",
    icon: FileJson2,
    label: "Response DTO",
    owner: "src/types/api",
    status: "replaceable",
  },
  {
    descriptionKey: "settings.acab.step.mapperDesc",
    icon: GitBranch,
    label: "mapper",
    owner: "features/*/api",
    status: "replaceable",
  },
  {
    descriptionKey: "settings.acab.step.viewModelDesc",
    icon: Layers3,
    label: "view model",
    owner: "features/*/components",
    status: "stable",
  },
  {
    descriptionKey: "settings.acab.step.uiDesc",
    icon: MonitorCheck,
    label: "UI component",
    owner: "Storybook",
    status: "fixed",
  },
];

const changeCases: ChangeCase[] = [
  {
    after: "expiresAt",
    before: "expires_at",
    impactKey: "settings.acab.impact.auth",
    labelKey: "settings.acab.label.auth",
    target: "authApi",
  },
  {
    after: "nextCursor",
    before: "nextSequence",
    impactKey: "settings.acab.impact.chat",
    labelKey: "settings.acab.label.chat",
    target: "chatApi",
  },
  {
    after: "jobStatus",
    before: "status",
    impactKey: "settings.acab.impact.agent",
    labelKey: "settings.acab.label.agent",
    target: "agentApi",
  },
  {
    after: "rollupKey",
    before: "summaryKey",
    impactKey: "settings.acab.impact.widget",
    labelKey: "settings.acab.label.widget",
    target: "widget boundary",
  },
];

const statusMeta: Record<BoundaryStep["status"], { labelKey: MessageKey; tone: "approved" | "pending" | "warning" }> = {
  fixed: { labelKey: "settings.acab.status.fixed", tone: "approved" },
  replaceable: { labelKey: "settings.acab.status.replaceable", tone: "warning" },
  stable: { labelKey: "settings.acab.status.stable", tone: "pending" },
};

function BoundaryCard({ step, t }: { step: BoundaryStep; t: TranslateFn }) {
  const Icon = step.icon;
  const meta = statusMeta[step.status];

  return (
    <article className={styles.boundaryCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.cardHeader}>
          <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
          <StatusBadge tone="neutral">{step.owner}</StatusBadge>
        </div>
        <h3>{step.label}</h3>
        <p>{t(step.descriptionKey)}</p>
      </div>
    </article>
  );
}

function ChangeCaseRow({ item, t }: { item: ChangeCase; t: TranslateFn }) {
  return (
    <article className={styles.changeRow}>
      <div className={styles.changeLabel}>
        <StatusBadge tone="room">{t(item.labelKey)}</StatusBadge>
        <strong>{item.target}</strong>
      </div>
      <div className={styles.fieldSwap} aria-label={t("settings.acab.fieldSwapAria", { before: item.before, after: item.after })}>
        <code>{item.before}</code>
        <ArrowRight size={14} strokeWidth={2.1} />
        <code>{item.after}</code>
      </div>
      <p>{t(item.impactKey)}</p>
    </article>
  );
}

export function ApiContractAdapterBoundaryPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("settings.acab.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            {t("settings.acab.chip")}
          </Chip>
          <h2>{t("settings.acab.heroTitle")}</h2>
          <p>{t("settings.acab.heroBody")}</p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">{t("settings.acab.componentProtect")}</StatusBadge>
          <strong>{t("settings.acab.onePlace")}</strong>
          <span>{t("settings.acab.convertAtBoundary")}</span>
          <ProgressBar label={t("settings.acab.absorbReadiness")} value={84} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>{t("settings.acab.flowTitle")}</h3>
          <p>{t("settings.acab.flowDesc")}</p>
        </div>
        <div className={styles.boundaryGrid}>
          {boundarySteps.map((step, index) => (
            <div className={styles.boundarySlot} key={step.label}>
              <BoundaryCard step={step} t={t} />
              {index < boundarySteps.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.changePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("settings.acab.changeTitle")}</h3>
            <p>{t("settings.acab.changeDesc")}</p>
          </div>
          <div className={styles.changeList}>
            {changeCases.map((item) => (
              <ChangeCaseRow item={item} key={item.labelKey} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("settings.acab.ruleTitle")}</h3>
            <p>{t("settings.acab.ruleDesc")}</p>
          </div>
          <ul className={styles.ruleList}>
            <li>
              <CheckCircle2 size={15} strokeWidth={2.1} />
              <span>{t("settings.acab.rule1")}</span>
            </li>
            <li>
              <Braces size={15} strokeWidth={2.1} />
              <span>{t("settings.acab.rule2")}</span>
            </li>
            <li>
              <RefreshCcw size={15} strokeWidth={2.1} />
              <span>{t("settings.acab.rule3")}</span>
            </li>
            <li>
              <SlidersHorizontal size={15} strokeWidth={2.1} />
              <span>{t("settings.acab.rule4")}</span>
            </li>
          </ul>
        </GlassPanel>
      </div>
    </section>
  );
}
