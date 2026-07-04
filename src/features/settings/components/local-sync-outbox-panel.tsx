"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileClock,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  WifiOff,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { LOCAL_ACTIVITY_RECORDED_EVENT } from "@/lib/local/activity-client";
import { syncPersonalLocalFileEventsToServer } from "@/lib/local/managed-folder-client";
import { PERSONAL_RESOURCES_CHANGED_EVENT } from "@/lib/local/managed-folder-client";
import { getLocalSyncOutboxSummary } from "@/lib/sync/local-sync-client";
import { WIDGET_USAGE_SYNCED_EVENT } from "@/lib/widget/widget-usage-auto-sync";
import type { LocalAdapterResult, LocalSyncSummary, SyncOutboxSummaryResult } from "@/types/local";

import styles from "./local-sync-outbox-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type SummaryStatus = "FAILED" | "PENDING" | "SENT";

type SummaryRow = {
  count: number;
  descriptionKey: MessageKey;
  icon: ReactNode;
  status: SummaryStatus;
  titleKey: MessageKey;
};

const statusMeta: Record<SummaryStatus, { labelKey: MessageKey; tone: "pending" | "warning" | "success" }> = {
  FAILED: { labelKey: "settings.lso.status.failed", tone: "warning" },
  PENDING: { labelKey: "settings.lso.status.pending", tone: "pending" },
  SENT: { labelKey: "settings.lso.status.sent", tone: "success" },
};

type LocalSyncOutboxPanelProps = {
  autoLoad?: boolean;
  initialConsentGranted?: boolean;
  initialSummary?: LocalSyncSummary | null;
  limit?: number;
};

function getSummaryFromResult(result: SyncOutboxSummaryResult): LocalSyncSummary | null {
  if (result.status === "pending") return result.summary;
  if (result.status === "ready") {
    return {
      failedCount: result.data.failedCount,
      pendingCount: result.data.pendingCount,
      sentCount: result.data.sentCount,
      serverTransfer: "not_started",
      summarizedAt: result.data.flushedAt,
    };
  }
  return null;
}

function getMessageFromResult(result: LocalAdapterResult<unknown, unknown>) {
  return "message" in result ? (result.message ?? null) : null;
}

function createSummaryRows(summary: LocalSyncSummary | null): SummaryRow[] {
  return [
    {
      count: summary?.pendingCount ?? 0,
      descriptionKey: "settings.lso.pendingDesc",
      icon: <FileClock size={17} strokeWidth={2.1} />,
      status: "PENDING",
      titleKey: "settings.lso.pendingTitle",
    },
    {
      count: summary?.failedCount ?? 0,
      descriptionKey: "settings.lso.failedDesc",
      icon: <AlertCircle size={17} strokeWidth={2.1} />,
      status: "FAILED",
      titleKey: "settings.lso.failedTitle",
    },
    {
      count: summary?.sentCount ?? 0,
      descriptionKey: "settings.lso.sentDesc",
      icon: <CheckCircle2 size={17} strokeWidth={2.1} />,
      status: "SENT",
      titleKey: "settings.lso.sentTitle",
    },
  ];
}

function OutboxRow({ row, t }: { row: SummaryRow; t: TranslateFn }) {
  const status = statusMeta[row.status];

  return (
    <article className={styles.outboxRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {row.icon}
      </span>
      <div className={styles.rowBody}>
        <div className={styles.meta}>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t("settings.lso.realSQLite")}</span>
        </div>
        <h3>{t(row.titleKey)}</h3>
        <p>{t(row.descriptionKey)}</p>
      </div>
      <div className={styles.rowSide}>
        <strong>{row.count}</strong>
        <span>{t("settings.lso.items")}</span>
      </div>
    </article>
  );
}

export function LocalSyncOutboxPanel({ autoLoad = true, initialConsentGranted = false, initialSummary = null, limit = 20 }: LocalSyncOutboxPanelProps) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<LocalSyncSummary | null>(initialSummary);
  const [consentGranted, setConsentGranted] = useState(initialConsentGranted);
  const [notice, setNotice] = useState<string | null>(null);
  const [action, setAction] = useState<"load" | "send" | null>(autoLoad ? "load" : null);
  const rows = useMemo(() => createSummaryRows(summary), [summary]);
  const unsentCount = (summary?.pendingCount ?? 0) + (summary?.failedCount ?? 0);
  const hasUnsent = unsentCount > 0;

  const refreshSummary = useCallback(async (options?: { preserveNotice?: boolean }) => {
    setAction("load");
    try {
      const result = await getLocalSyncOutboxSummary();
      const nextSummary = getSummaryFromResult(result);
      if (nextSummary) setSummary(nextSummary);
      if (!options?.preserveNotice) setNotice(getMessageFromResult(result));
    } finally {
      setAction(null);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    let cancelled = false;

    async function loadInitialState() {
      const [privacyResult, summaryResult] = await Promise.allSettled([
        settingsApi.getPrivacyConsents(),
        getLocalSyncOutboxSummary(),
      ]);

      if (cancelled) return;

      if (privacyResult.status === "fulfilled") {
        setConsentGranted(privacyResult.value.localFolderEnabled);
      }

      if (summaryResult.status === "fulfilled") {
        const nextSummary = getSummaryFromResult(summaryResult.value);
        if (nextSummary) setSummary(nextSummary);
        setNotice(getMessageFromResult(summaryResult.value));
      } else {
        setNotice(t("settings.lso.loadFailed"));
      }

      setAction(null);
    }

    void loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [autoLoad, t]);

  useEffect(() => {
    if (!autoLoad) return;

    const refreshAfterLocalSync = () => {
      void refreshSummary({ preserveNotice: true });
    };

    window.addEventListener(PERSONAL_RESOURCES_CHANGED_EVENT, refreshAfterLocalSync);
    window.addEventListener(LOCAL_ACTIVITY_RECORDED_EVENT, refreshAfterLocalSync);
    window.addEventListener(WIDGET_USAGE_SYNCED_EVENT, refreshAfterLocalSync);

    return () => {
      window.removeEventListener(PERSONAL_RESOURCES_CHANGED_EVENT, refreshAfterLocalSync);
      window.removeEventListener(LOCAL_ACTIVITY_RECORDED_EVENT, refreshAfterLocalSync);
      window.removeEventListener(WIDGET_USAGE_SYNCED_EVENT, refreshAfterLocalSync);
    };
  }, [autoLoad, refreshSummary]);

  const sendQueue = async () => {
    setAction("send");
    const result = await syncPersonalLocalFileEventsToServer({ consentGranted, limit });
    if (result.status === "ready") {
      setNotice(t("settings.lso.sendResult", {
        failed: result.data.failedCount,
        sent: result.data.sentCount,
        synced: result.data.syncedCount,
      }));
      await refreshSummary({ preserveNotice: true });
      return;
    }

    setNotice(getMessageFromResult(result) ?? t("settings.lso.sendFailed"));
    await refreshSummary({ preserveNotice: true });
  };

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
          <StatusBadge tone={hasUnsent ? "warning" : "success"}>{hasUnsent ? t("settings.lso.unsent") : t("settings.lso.allSent")}</StatusBadge>
          <strong>{unsentCount}</strong>
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
            <Button disabled={action !== null || !consentGranted} icon={<RefreshCw size={15} />} loading={action === "send"} onClick={() => void sendQueue()} size="sm" variant="primary">
              {t("settings.lso.sendQueue")}
            </Button>
          </div>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          <div className={styles.list}>
            {rows.map((row) => (
              <OutboxRow key={row.status} row={row} t={t} />
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
        <Button icon={<UploadCloud size={15} />} loading={action === "load"} onClick={() => void refreshSummary()} size="sm" variant="quiet">
          {t("settings.lso.checkServer")}
        </Button>
      </GlassPanel>
    </section>
  );
}
