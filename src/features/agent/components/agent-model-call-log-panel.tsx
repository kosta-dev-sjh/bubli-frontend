"use client";

import type { ReactNode } from "react";

import {
  Activity,
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  FileJson,
  Gauge,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./agent-model-call-log-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type CallStatus = "SUCCEEDED" | "FAILED" | "RETRIED";

type ModelCallLog = {
  errorCodeKey?: MessageKey;
  inputTokens: number;
  jobIdKey: MessageKey;
  latencyMs?: number;
  modelName: string;
  outputTokens: number;
  promptVersion: string;
  schemaVersion: string;
  status: CallStatus;
  targetKey: MessageKey;
  titleKey: MessageKey;
};

type TraceItem = {
  icon: ReactNode;
  labelKey: MessageKey;
  textKey: MessageKey;
};

const logs: ModelCallLog[] = [
  {
    inputTokens: 4820,
    jobIdKey: "agent.log.log1Job",
    latencyMs: 1840,
    modelName: "bedrock-claude-haiku",
    outputTokens: 924,
    promptVersion: "resource-analysis-v3",
    schemaVersion: "resource-analysis-json-v2",
    status: "SUCCEEDED",
    targetKey: "agent.log.log1Target",
    titleKey: "agent.log.log1Title",
  },
  {
    inputTokens: 2650,
    jobIdKey: "agent.log.log2Job",
    latencyMs: 1120,
    modelName: "bedrock-claude-haiku",
    outputTokens: 618,
    promptVersion: "wbs-todo-candidate-v2",
    schemaVersion: "agent-suggestion-json-v2",
    status: "SUCCEEDED",
    targetKey: "agent.log.log2Target",
    titleKey: "agent.log.log2Title",
  },
  {
    errorCodeKey: "agent.log.log3ErrorCode",
    inputTokens: 3912,
    jobIdKey: "agent.log.log3Job",
    modelName: "bedrock-claude-haiku",
    outputTokens: 204,
    promptVersion: "requirement-extract-v2",
    schemaVersion: "requirement-json-v2",
    status: "RETRIED",
    targetKey: "agent.log.log3Target",
    titleKey: "agent.log.log3Title",
  },
];

const statusMeta: Record<CallStatus, { labelKey: MessageKey; tone: "success" | "warning" | "pending"; icon: ReactNode }> = {
  FAILED: { icon: <TriangleAlert size={15} strokeWidth={2.1} />, labelKey: "agent.log.statusFailed", tone: "warning" },
  RETRIED: { icon: <RotateCcw size={15} strokeWidth={2.1} />, labelKey: "agent.log.statusRetried", tone: "pending" },
  SUCCEEDED: { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, labelKey: "agent.log.statusSucceeded", tone: "success" },
};

const traceItems: TraceItem[] = [
  {
    icon: <Bot size={16} strokeWidth={2.1} />,
    labelKey: "agent.log.traceRoleLabel",
    textKey: "agent.log.traceRoleText",
  },
  {
    icon: <FileJson size={16} strokeWidth={2.1} />,
    labelKey: "agent.log.traceSchemaLabel",
    textKey: "agent.log.traceSchemaText",
  },
  {
    icon: <Database size={16} strokeWidth={2.1} />,
    labelKey: "agent.log.traceStoreLabel",
    textKey: "agent.log.traceStoreText",
  },
  {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    labelKey: "agent.log.traceScopeLabel",
    textKey: "agent.log.traceScopeText",
  },
];

function LogRow({ log, t }: { log: ModelCallLog; t: TranslateFn }) {
  const status = statusMeta[log.status];
  const totalTokens = log.inputTokens + log.outputTokens;

  return (
    <article className={styles.logRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {status.icon}
      </span>
      <div className={styles.logBody}>
        <div className={styles.meta}>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{log.modelName}</span>
          <span>{t(log.targetKey)}</span>
        </div>
        <h3>{t(log.titleKey)}</h3>
        <p>{t(log.jobIdKey)}</p>
        <div className={styles.versionGrid}>
          <span>
            <b>{t("agent.log.promptVersion")}</b>
            {log.promptVersion}
          </span>
          <span>
            <b>{t("agent.log.schemaVersion")}</b>
            {log.schemaVersion}
          </span>
          <span>
            <b>{t("agent.log.usage")}</b>
            {totalTokens.toLocaleString("ko-KR")}
          </span>
          <span>
            <b>{t("agent.log.latency")}</b>
            {log.latencyMs ? `${log.latencyMs.toLocaleString("ko-KR")}ms` : t("agent.log.validationFailed")}
          </span>
        </div>
        {log.errorCodeKey ? (
          <div className={styles.errorLine}>
            <TriangleAlert size={14} strokeWidth={2.1} aria-hidden="true" />
            <span>{t(log.errorCodeKey)}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AgentModelCallLogPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("agent.log.aria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<Activity size={14} />} selected>
            {t("agent.log.chip")}
          </Chip>
          <h2>{t("agent.log.heroTitle")}</h2>
          <p>{t("agent.log.heroDesc")}</p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="agent">{t("agent.log.summaryBadge")}</StatusBadge>
          <strong>3</strong>
          <span>{t("agent.log.summaryLabel")}</span>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label={t("agent.log.flowAria")}>
        <span>{t("agent.log.flowJob")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("agent.log.flowModel")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("agent.log.flowSchema")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("agent.log.flowSave")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.logPanel}>
          <div className={styles.toolbar}>
            <div>
              <h3>{t("agent.log.recentTitle")}</h3>
              <p>{t("agent.log.recentDesc")}</p>
            </div>
            <Button icon={<RotateCcw size={15} />} size="sm" variant="quiet">
              {t("agent.log.refresh")}
            </Button>
          </div>
          <div className={styles.list}>
            {logs.map((log) => (
              <LogRow key={`${log.jobIdKey}-${log.promptVersion}`} log={log} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.tracePanel}>
          <h3>{t("agent.log.boundaryTitle")}</h3>
          {traceItems.map((item) => (
            <article key={item.labelKey}>
              <span aria-hidden="true">{item.icon}</span>
              <div>
                <strong>{t(item.labelKey)}</strong>
                <p>{t(item.textKey)}</p>
              </div>
            </article>
          ))}
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footer}>
        <Gauge size={17} strokeWidth={2.1} aria-hidden="true" />
        <p>{t("agent.log.footerDesc")}</p>
        <Chip icon={<Braces size={14} />}>{t("agent.log.chipSchema")}</Chip>
        <Chip icon={<Clock3 size={14} />}>{t("agent.log.chipLatency")}</Chip>
      </GlassPanel>
    </section>
  );
}
