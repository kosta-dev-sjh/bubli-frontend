"use client";

import { AlertCircle, CheckCircle2, Database, HardDrive, RefreshCw, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import { getLocalSyncOutboxSummary } from "@/lib/sync/local-sync-client";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { LocalSyncSummary, SyncOutboxSummaryResult } from "@/types/local";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type SyncQueueItem = {
  count: number;
  labelKey: MessageKey;
  sourceKey: MessageKey;
  status: "queued" | "retrying" | "synced";
  targetKey: MessageKey;
};

const emptySummary: LocalSyncSummary = {
  failedCount: 0,
  pendingCount: 0,
  sentCount: 0,
  serverTransfer: "not_started",
  summarizedAt: "",
};

const statusMeta: Record<SyncQueueItem["status"], { labelKey: MessageKey; tone: "warning" | "pending" | "success" }> = {
  queued: { labelKey: "settings.tss.status.queued", tone: "pending" },
  retrying: { labelKey: "settings.tss.status.retrying", tone: "warning" },
  synced: { labelKey: "settings.tss.status.synced", tone: "success" },
};

function SyncQueueRow({ item, t }: { item: SyncQueueItem; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className="tauri-sync-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <UploadCloud size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="tauri-sync-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t("settings.tss.count", { count: item.count })}</span>
        </div>
        <h3>{t(item.labelKey)}</h3>
        <p>
          {t(item.sourceKey)} → {t(item.targetKey)}
        </p>
      </div>
    </article>
  );
}

export function TauriSyncStatusPanel() {
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
  const pendingCount = summary.pendingCount ?? 0;
  const sentCount = summary.sentCount ?? 0;
  const unsentCount = pendingCount + summary.failedCount;
  const totalCount = unsentCount + sentCount;
  const syncedPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;
  const queueItems = useMemo<SyncQueueItem[]>(
    () => [
      {
        count: pendingCount,
        labelKey: "settings.tss.timer.label",
        sourceKey: "settings.tss.timer.source",
        status: "queued",
        targetKey: "settings.tss.timer.target",
      },
      {
        count: summary.failedCount,
        labelKey: "settings.tss.widget.label",
        sourceKey: "settings.tss.widget.source",
        status: "retrying",
        targetKey: "settings.tss.widget.target",
      },
      {
        count: sentCount,
        labelKey: "settings.tss.recent.label",
        sourceKey: "settings.tss.recent.source",
        status: "synced",
        targetKey: "settings.tss.recent.target",
      },
    ],
    [pendingCount, sentCount, summary.failedCount],
  );

  return (
    <section className="tauri-sync" aria-label={t("settings.tss.panelAria")}>
      <GlassPanel className="tauri-sync__hero">
        <div className="tauri-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <HardDrive size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("settings.tss.chip")}</Chip>
            <h2>{t("settings.tss.heroTitle")}</h2>
            <p>{t("settings.tss.heroBody")}</p>
          </div>
        </div>
        <div className="tauri-sync__health">
          <StatusBadge tone={unsentCount > 0 ? "warning" : "success"}>{t("settings.tss.syncPending")}</StatusBadge>
          <strong>{t("settings.tss.count", { count: unsentCount })}</strong>
          <span>{t("settings.tss.unsent")}</span>
          <ProgressBar label={t("settings.tss.syncState")} value={syncedPercent} />
        </div>
      </GlassPanel>

      <div className="tauri-sync__grid">
        <GlassPanel className="tauri-sync__panel">
          <div className="tauri-sync__panel-header">
            <div>
              <h3>{t("settings.tss.queueTitle")}</h3>
              <p>{result?.message ?? t("settings.tss.queueDesc")}</p>
            </div>
            <Button disabled={refreshing} icon={<RefreshCw size={15} />} onClick={() => void refreshOutbox()} size="sm" type="button" variant="primary">
              {t("settings.tss.resync")}
            </Button>
          </div>

          <div className="tauri-sync__list">
            {queueItems.map((item) => (
              <SyncQueueRow item={item} key={item.labelKey} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="tauri-sync__policy">
          <h3>{t("settings.tss.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy1")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <RotateCcw size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy2")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <AlertCircle size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy3")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy4")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="tauri-sync__footer">
        <span className="bubli-icon-tile" aria-hidden="true">
          <CheckCircle2 size={16} strokeWidth={2.1} />
        </span>
        <p>{t("settings.tss.footer")}</p>
      </GlassPanel>
    </section>
  );
}
