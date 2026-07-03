"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { getLocalSyncOutboxSummary } from "@/lib/sync/local-sync-client";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { LocalSyncSummary, SyncOutboxSummaryResult } from "@/types/local";

import styles from "./local-sync-outbox-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type OutboxItem = {
  count: number;
  id: string;
  message?: string;
  retryCount: number;
  status: "PENDING" | "FAILED" | "SENT";
  titleKey: MessageKey;
};

const emptySummary: LocalSyncSummary = {
  failedCount: 0,
  pendingCount: 0,
  sentCount: 0,
  serverTransfer: "not_started",
  summarizedAt: "",
};

const statusMeta: Record<OutboxItem["status"], { labelKey: MessageKey; tone: "pending" | "warning" | "success" }> = {
  FAILED: { labelKey: "settings.lso.status.failed", tone: "warning" },
  PENDING: { labelKey: "settings.lso.status.pending", tone: "pending" },
  SENT: { labelKey: "settings.lso.status.sent", tone: "success" },
};

function OutboxRow({ item, t }: { item: OutboxItem; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className={styles.outboxRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Database size={17} strokeWidth={2.1} />
      </span>
      <div className={styles.rowBody}>
        <div className={styles.meta}>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t("settings.lso.queueTitle")}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
        {item.message ? <p>{item.message}</p> : null}
      </div>
      <div className={styles.rowSide}>
        <strong>{item.count}</strong>
        <span>{item.status === "FAILED" ? t("settings.lso.retry") : t(status.labelKey)}</span>
      </div>
    </article>
  );
}

export function LocalSyncOutboxPanel() {
  const { t } = useI18n();
  const [result, setResult] = useState<SyncOutboxSummaryResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshOutbox = useCallback(async () => {
    setRefreshing(true);
    try {
      setResult(await getLocalSyncOutboxSummary());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshOutbox();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [refreshOutbox]);

  const summary = result?.status === "pending" ? result.summary : result?.status === "ready" ? result.data : emptySummary;
  const pendingOrFailed = (summary.pendingCount ?? 0) + summary.failedCount;
  const items = useMemo<OutboxItem[]>(
    () => [
      {
        count: summary.pendingCount ?? 0,
        id: "pending",
        message: result?.message,
        retryCount: 0,
        status: "PENDING",
        titleKey: "settings.lso.status.pending",
      },
      {
        count: summary.failedCount,
        id: "failed",
        message: result?.status === "failed" ? result.message : undefined,
        retryCount: summary.failedCount,
        status: "FAILED",
        titleKey: "settings.lso.status.failed",
      },
      {
        count: summary.sentCount ?? 0,
        id: "sent",
        retryCount: 0,
        status: "SENT",
        titleKey: "settings.lso.status.sent",
      },
    ],
    [result, summary.failedCount, summary.pendingCount, summary.sentCount],
  );

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
          <StatusBadge tone={pendingOrFailed > 0 ? "warning" : "success"}>{t("settings.lso.unsent")}</StatusBadge>
          <strong>{pendingOrFailed}</strong>
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
              <p>{result?.message ?? t("settings.lso.queueDesc")}</p>
            </div>
            <Button disabled={refreshing} icon={<RefreshCw size={15} />} onClick={() => void refreshOutbox()} size="sm" type="button" variant="primary">
              {t("settings.lso.checkServer")}
            </Button>
          </div>
          <div className={styles.list}>
            {items.map((item) => (
              <OutboxRow item={item} key={item.id} t={t} />
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
