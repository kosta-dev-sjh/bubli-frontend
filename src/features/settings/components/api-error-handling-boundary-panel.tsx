"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  KeyRound,
  ListChecks,
  RefreshCcw,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./api-error-handling-boundary-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ErrorCase = {
  actionKey: MessageKey;
  code: string;
  descriptionKey: MessageKey;
  fields?: string[];
  icon: typeof ShieldAlert;
  labelKey: MessageKey;
  owner: string;
  tone: "warning" | "pending" | "approved";
};

type HandlingRule = {
  detailKey: MessageKey;
  labelKey: MessageKey;
  status: "required" | "recommended" | "watching";
};

const errorCases: ErrorCase[] = [
  {
    actionKey: "settings.aeh.authExpired.action",
    code: "AUTH_TOKEN_EXPIRED",
    descriptionKey: "settings.aeh.authExpired.desc",
    icon: KeyRound,
    labelKey: "settings.aeh.authExpired.label",
    owner: "src/lib/api",
    tone: "warning",
  },
  {
    actionKey: "settings.aeh.validation.action",
    code: "VALIDATION_ERROR",
    descriptionKey: "settings.aeh.validation.desc",
    fields: ["bubliId", "displayName", "projectRoomName"],
    icon: ListChecks,
    labelKey: "settings.aeh.validation.label",
    owner: "lib/validators",
    tone: "pending",
  },
  {
    actionKey: "settings.aeh.upload.action",
    code: "RESOURCE_UPLOAD_FAILED",
    descriptionKey: "settings.aeh.upload.desc",
    fields: ["fileSize", "mimeType"],
    icon: UploadCloud,
    labelKey: "settings.aeh.upload.label",
    owner: "features/resources",
    tone: "warning",
  },
  {
    actionKey: "settings.aeh.agent.action",
    code: "AGENT_JOB_FAILED",
    descriptionKey: "settings.aeh.agent.desc",
    icon: AlertTriangle,
    labelKey: "settings.aeh.agent.label",
    owner: "features/agent",
    tone: "pending",
  },
  {
    actionKey: "settings.aeh.offline.action",
    code: "NETWORK_OFFLINE",
    descriptionKey: "settings.aeh.offline.desc",
    icon: RefreshCcw,
    labelKey: "settings.aeh.offline.label",
    owner: "src/lib/tauri",
    tone: "approved",
  },
];

const handlingRules: HandlingRule[] = [
  {
    detailKey: "settings.aeh.rule.commonDetail",
    labelKey: "settings.aeh.rule.commonLabel",
    status: "required",
  },
  {
    detailKey: "settings.aeh.rule.fieldDetail",
    labelKey: "settings.aeh.rule.fieldLabel",
    status: "required",
  },
  {
    detailKey: "settings.aeh.rule.traceDetail",
    labelKey: "settings.aeh.rule.traceLabel",
    status: "recommended",
  },
  {
    detailKey: "settings.aeh.rule.branchDetail",
    labelKey: "settings.aeh.rule.branchLabel",
    status: "watching",
  },
];

const ruleStatusMeta: Record<HandlingRule["status"], { labelKey: MessageKey; tone: "approved" | "pending" | "warning" }> = {
  recommended: { labelKey: "settings.aeh.ruleStatus.recommended", tone: "pending" },
  required: { labelKey: "settings.aeh.ruleStatus.required", tone: "approved" },
  watching: { labelKey: "settings.aeh.ruleStatus.watching", tone: "warning" },
};

function ErrorCaseCard({ item, t }: { item: ErrorCase; t: TranslateFn }) {
  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <article className={styles.errorCard}>
      <div className={styles.errorTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={item.tone}>{label}</StatusBadge>
            <StatusBadge tone="neutral">{item.owner}</StatusBadge>
          </div>
          <h3>{item.code}</h3>
          <p>{t(item.descriptionKey)}</p>
        </div>
      </div>
      {item.fields ? (
        <div className={styles.fieldList} aria-label={t("settings.aeh.fieldErrorAria", { label })}>
          {item.fields.map((field) => (
            <code key={field}>{field}</code>
          ))}
        </div>
      ) : null}
      <div className={styles.actionRow}>
        <span>{t("settings.aeh.screenAction")}</span>
        <strong>{t(item.actionKey)}</strong>
      </div>
    </article>
  );
}

function RuleCard({ rule, t }: { rule: HandlingRule; t: TranslateFn }) {
  const meta = ruleStatusMeta[rule.status];

  return (
    <article className={styles.ruleCard}>
      <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
      <div>
        <h4>{t(rule.labelKey)}</h4>
        <p>{t(rule.detailKey)}</p>
      </div>
    </article>
  );
}

export function ApiErrorHandlingBoundaryPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("settings.aeh.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldAlert size={14} />} selected>
            {t("settings.aeh.chip")}
          </Chip>
          <h2>{t("settings.aeh.heroTitle")}</h2>
          <p>{t("settings.aeh.heroBody")}</p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">{t("settings.aeh.commonHandling")}</StatusBadge>
          <strong>{t("settings.aeh.fiveCount")}</strong>
          <span>{t("settings.aeh.initialFlow")}</span>
          <ProgressBar label={t("settings.aeh.readiness")} value={78} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.responseShape}>
        <div className={styles.sectionTitle}>
          <h3>{t("settings.aeh.responseTitle")}</h3>
          <p>{t("settings.aeh.responseDesc")}</p>
        </div>
        <div className={styles.shapeFlow}>
          <code>{"{ success: false }"}</code>
          <ArrowRight size={16} strokeWidth={2.1} />
          <code>ApiError</code>
          <ArrowRight size={16} strokeWidth={2.1} />
          <code>AppError</code>
          <ArrowRight size={16} strokeWidth={2.1} />
          <code>UI action</code>
        </div>
      </GlassPanel>

      <div className={styles.grid}>
        <GlassPanel className={styles.casePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("settings.aeh.caseTitle")}</h3>
            <p>{t("settings.aeh.caseDesc")}</p>
          </div>
          <div className={styles.caseGrid}>
            {errorCases.map((item) => (
              <ErrorCaseCard item={item} key={item.code} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("settings.aeh.ruleTitle")}</h3>
            <p>{t("settings.aeh.ruleDesc")}</p>
          </div>
          <div className={styles.ruleList}>
            {handlingRules.map((rule) => (
              <RuleCard key={rule.labelKey} rule={rule} t={t} />
            ))}
          </div>
          <div className={styles.notice}>
            <FileWarning size={16} strokeWidth={2.1} />
            <p>{t("settings.aeh.notice1")}</p>
          </div>
          <div className={styles.notice}>
            <Clock3 size={16} strokeWidth={2.1} />
            <p>{t("settings.aeh.notice2")}</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>{t("settings.aeh.chipFinal")}</Chip>
        </GlassPanel>
      </div>
    </section>
  );
}
