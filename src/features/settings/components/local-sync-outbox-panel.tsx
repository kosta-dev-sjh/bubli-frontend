"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Timer,
  UploadCloud,
  WifiOff,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./local-sync-outbox-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type OutboxStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";
type OperationType = "TIME_LOG" | "WIDGET_ROLLUP" | "LOCAL_FILE_EVENT";

type OutboxItem = {
  createdAt: string;
  dedupeKey: MessageKey;
  idempotencyKey: string;
  lastErrorKey?: MessageKey;
  nextRetryAt?: string;
  nextRetryKey?: MessageKey;
  operationKey: MessageKey;
  operationType: OperationType;
  retryCount: number;
  status: OutboxStatus;
  targetKey: MessageKey;
  titleKey: MessageKey;
};

const outboxItems: OutboxItem[] = [
  {
    createdAt: "10:21",
    dedupeKey: "settings.lso.timerRun.dedupe",
    idempotencyKey: "time-20260622-1021-run",
    nextRetryKey: "settings.lso.timerRun.retry",
    operationKey: "settings.lso.timerRun.opLabel",
    operationType: "TIME_LOG",
    retryCount: 0,
    status: "PENDING",
    targetKey: "settings.lso.timerRun.target",
    titleKey: "settings.lso.timerRun.title",
  },
  {
    createdAt: "10:18",
    dedupeKey: "settings.lso.widget.dedupe",
    idempotencyKey: "widget-rollup-20260622-device-a",
    lastErrorKey: "settings.lso.widget.lastError",
    nextRetryAt: "10:25",
    operationKey: "settings.lso.widget.opLabel",
    operationType: "WIDGET_ROLLUP",
    retryCount: 2,
    status: "FAILED",
    targetKey: "settings.lso.widget.target",
    titleKey: "settings.lso.widget.title",
  },
  {
    createdAt: "10:14",
    dedupeKey: "settings.lso.folder.dedupe",
    idempotencyKey: "local-file-evt-9f2a",
    operationKey: "settings.lso.folder.opLabel",
    operationType: "LOCAL_FILE_EVENT",
    retryCount: 1,
    status: "SENDING",
    targetKey: "settings.lso.folder.target",
    titleKey: "settings.lso.folder.title",
  },
  {
    createdAt: "10:02",
    dedupeKey: "settings.lso.timerStop.dedupe",
    idempotencyKey: "time-20260622-1002-stop",
    operationKey: "settings.lso.timerStop.opLabel",
    operationType: "TIME_LOG",
    retryCount: 0,
    status: "SENT",
    targetKey: "settings.lso.timerStop.target",
    titleKey: "settings.lso.timerStop.title",
  },
];

const statusMeta: Record<OutboxStatus, { labelKey: MessageKey; tone: "pending" | "warning" | "success" | "todo" }> = {
  FAILED: { labelKey: "settings.lso.status.failed", tone: "warning" },
  PENDING: { labelKey: "settings.lso.status.pending", tone: "pending" },
  SENDING: { labelKey: "settings.lso.status.sending", tone: "todo" },
  SENT: { labelKey: "settings.lso.status.sent", tone: "success" },
};

const operationIcon: Record<OperationType, React.ReactNode> = {
  LOCAL_FILE_EVENT: <FileClock size={17} strokeWidth={2.1} />,
  TIME_LOG: <Timer size={17} strokeWidth={2.1} />,
  WIDGET_ROLLUP: <Database size={17} strokeWidth={2.1} />,
};

function OutboxRow({ item, t }: { item: OutboxItem; t: TranslateFn }) {
  const status = statusMeta[item.status];
  const nextRetry = item.nextRetryKey ? t(item.nextRetryKey) : item.nextRetryAt;

  return (
    <article className={styles.outboxRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {operationIcon[item.operationType]}
      </span>
      <div className={styles.rowBody}>
        <div className={styles.meta}>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(item.operationKey)}</span>
          <span>{item.createdAt}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
        <p>{t(item.targetKey)}</p>
        <div className={styles.keyLine}>
          <KeyRound size={13} strokeWidth={2.1} aria-hidden="true" />
          <code>{t(item.dedupeKey)}</code>
        </div>
        {item.lastErrorKey || nextRetry ? (
          <div className={styles.retryLine}>
            {item.lastErrorKey ? <span>{t(item.lastErrorKey)}</span> : null}
            {nextRetry ? <span>{t("settings.lso.nextRetry", { time: nextRetry })}</span> : null}
          </div>
        ) : null}
      </div>
      <div className={styles.rowSide}>
        <strong>{item.retryCount}</strong>
        <span>{t("settings.lso.retry")}</span>
      </div>
    </article>
  );
}

export function LocalSyncOutboxPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("settings.lso.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<WifiOff size={14} />} selected>
            {t("settings.lso.chip")}
          </Chip>
          <h2>{t("settings.lso.heroTitle")}</h2>
          <p>{t("settings.lso.heroBody")}</p>
        </div>
        <div className={styles.heroState}>
          <StatusBadge tone="warning">{t("settings.lso.unsent")}</StatusBadge>
          <strong>3</strong>
          <span>{t("settings.lso.pendingOrFailed")}</span>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label={t("settings.lso.flowAria")}>
        <span>{t("settings.lso.flow.record")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("settings.lso.flow.dedupe")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("settings.lso.flow.send")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("settings.lso.flow.confirm")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.queuePanel}>
          <div className={styles.toolbar}>
            <div>
              <h3>{t("settings.lso.queueTitle")}</h3>
              <p>{t("settings.lso.queueDesc")}</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="primary">
              {t("settings.lso.sendQueue")}
            </Button>
          </div>
          <div className={styles.list}>
            {outboxItems.map((item) => (
              <OutboxRow item={item} key={item.idempotencyKey} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyPanel}>
          <h3>{t("settings.lso.policyTitle")}</h3>
          <article>
            <RefreshCw size={17} strokeWidth={2.1} />
            <p>{t("settings.lso.policy1")}</p>
          </article>
          <article>
            <Clock3 size={17} strokeWidth={2.1} />
            <p>{t("settings.lso.policy2")}</p>
          </article>
          <article>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>{t("settings.lso.policy3")}</p>
          </article>
          <article>
            <AlertCircle size={17} strokeWidth={2.1} />
            <p>{t("settings.lso.policy4")}</p>
          </article>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footer}>
        <CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />
        <p>{t("settings.lso.footer")}</p>
        <Button icon={<UploadCloud size={15} />} size="sm" variant="quiet">
          {t("settings.lso.checkServer")}
        </Button>
      </GlassPanel>
    </section>
  );
}
