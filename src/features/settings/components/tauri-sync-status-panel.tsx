"use client";

import { HardDrive, RefreshCw, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import { LOCAL_ACTIVITY_RECORDED_EVENT, LOCAL_ACTIVITY_SYNCED_EVENT } from "@/lib/local/activity-client";
import {
  PERSONAL_RESOURCES_CHANGED_EVENT,
  type PersonalLocalFileEventsSyncResult,
} from "@/lib/local/managed-folder-client";
import { getLocalSyncOutboxSummary } from "@/lib/sync/local-sync-client";
import { WIDGET_USAGE_SYNCED_EVENT, type WidgetUsageSyncedEventDetail } from "@/lib/widget/widget-usage-auto-sync";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { ActivityBufferSyncResult, LocalSyncSummary, SyncOutboxSummaryResult } from "@/types/local";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type SyncQueueItem = {
  count: number;
  labelKey: MessageKey;
  sourceKey: MessageKey;
  status: "queued" | "retrying" | "synced";
  targetKey: MessageKey;
};

type RecentAutoSyncSource = "activity" | "file" | "widget";

type RecentAutoSyncItem = {
  confirmedCount: number;
  failedCount: number;
  labelKey: MessageKey;
  sentCount: number;
  source: RecentAutoSyncSource;
  stagedCount: number;
  syncedAt: string;
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
  const [recentAutoSync, setRecentAutoSync] = useState<Partial<Record<RecentAutoSyncSource, RecentAutoSyncItem>>>({});

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

  useEffect(() => {
    const refreshAfterLocalSync = () => void refreshOutbox();
    const updateRecentAutoSync = (item: RecentAutoSyncItem) => {
      setRecentAutoSync((current) => ({
        ...current,
        [item.source]: item,
      }));
    };
    const handleActivitySync = (event: Event) => {
      const detail = (event as CustomEvent<ActivityBufferSyncResult>).detail;
      updateRecentAutoSync({
        confirmedCount: detail.sentCount,
        failedCount: detail.failedCount,
        labelKey: "settings.tss.recent.activity",
        sentCount: detail.sentCount,
        source: "activity",
        stagedCount: detail.stagedCount,
        syncedAt: detail.syncedAt,
      });
      refreshAfterLocalSync();
    };
    const handleFileSync = (event: Event) => {
      const detail = (event as CustomEvent<PersonalLocalFileEventsSyncResult>).detail;
      updateRecentAutoSync({
        confirmedCount: detail.syncedCount + detail.analysisRequestedCount,
        failedCount: detail.failedCount + detail.analysisFailedCount,
        labelKey: "settings.tss.recent.file",
        sentCount: detail.sentCount,
        source: "file",
        stagedCount: detail.sentCount,
        syncedAt: detail.syncedAt,
      });
      refreshAfterLocalSync();
    };
    const handleWidgetSync = (event: Event) => {
      const detail = (event as CustomEvent<WidgetUsageSyncedEventDetail>).detail;
      updateRecentAutoSync({
        confirmedCount: detail.markedSyncedCount ?? 0,
        failedCount: detail.failedCount ?? (detail.status === "failed" ? 1 : 0),
        labelKey: "settings.tss.recent.widget",
        sentCount: detail.sentCount ?? 0,
        source: "widget",
        stagedCount: detail.stagedCount ?? 0,
        syncedAt: detail.syncedAt ?? new Date().toISOString(),
      });
      refreshAfterLocalSync();
    };

    window.addEventListener(PERSONAL_RESOURCES_CHANGED_EVENT, handleFileSync);
    window.addEventListener(LOCAL_ACTIVITY_RECORDED_EVENT, refreshAfterLocalSync);
    window.addEventListener(LOCAL_ACTIVITY_SYNCED_EVENT, handleActivitySync);
    window.addEventListener(WIDGET_USAGE_SYNCED_EVENT, handleWidgetSync);

    return () => {
      window.removeEventListener(PERSONAL_RESOURCES_CHANGED_EVENT, handleFileSync);
      window.removeEventListener(LOCAL_ACTIVITY_RECORDED_EVENT, refreshAfterLocalSync);
      window.removeEventListener(LOCAL_ACTIVITY_SYNCED_EVENT, handleActivitySync);
      window.removeEventListener(WIDGET_USAGE_SYNCED_EVENT, handleWidgetSync);
    };
  }, [refreshOutbox]);

  const hasAdapterIssue = Boolean(result && result.status !== "pending" && result.status !== "ready");
  const summary = result?.status === "pending" ? result.summary : result?.status === "ready" ? result.data : emptySummary;
  const pendingCount = summary.pendingCount ?? 0;
  const failedCount = (summary.failedCount ?? 0) + (hasAdapterIssue ? 1 : 0);
  const sentCount = summary.sentCount ?? 0;
  const unsentCount = pendingCount + failedCount;
  const totalCount = unsentCount + sentCount;
  const syncedPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;
  const queueItems = useMemo<SyncQueueItem[]>(
    () => [
      {
        count: pendingCount,
        labelKey: "settings.tss.pending.label",
        sourceKey: "settings.tss.pending.source",
        status: "queued",
        targetKey: "settings.tss.pending.target",
      },
      {
        count: failedCount,
        labelKey: "settings.tss.failed.label",
        sourceKey: "settings.tss.failed.source",
        status: "retrying",
        targetKey: "settings.tss.failed.target",
      },
      {
        count: sentCount,
        labelKey: "settings.tss.sent.label",
        sourceKey: "settings.tss.sent.source",
        status: "synced",
        targetKey: "settings.tss.sent.target",
      },
    ],
    [failedCount, pendingCount, sentCount],
  );
  const recentAutoSyncItems = useMemo(
    () =>
      (["activity", "file", "widget"] as const)
        .map((source) => recentAutoSync[source])
        .filter((item): item is RecentAutoSyncItem => item !== undefined),
    [recentAutoSync],
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
          <StatusBadge tone={hasAdapterIssue || unsentCount > 0 ? "warning" : "success"}>{t("settings.tss.syncPending")}</StatusBadge>
          <strong>{t("settings.tss.count", { count: unsentCount })}</strong>
          <span>{hasAdapterIssue ? (result?.message ?? t("settings.tss.unsent")) : t("settings.tss.unsent")}</span>
          <ProgressBar label={t("settings.tss.syncState")} value={syncedPercent} />
        </div>
      </GlassPanel>

      <div className="tauri-sync__body">
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

          {recentAutoSyncItems.length > 0 ? (
            <div className="tauri-sync__recent" aria-label={t("settings.tss.recent.aria")}>
              <h4>{t("settings.tss.recent.title")}</h4>
              {recentAutoSyncItems.map((item) => (
                <article className="tauri-sync__recent-row" key={item.source}>
                  <StatusBadge tone={item.failedCount > 0 ? "warning" : "success"}>
                    {item.failedCount > 0 ? t("settings.tss.status.retrying") : t("settings.tss.status.synced")}
                  </StatusBadge>
                  <strong>{t(item.labelKey)}</strong>
                  <span>
                    {t("settings.tss.recent.detail", {
                      confirmed: item.confirmedCount,
                      failed: item.failedCount,
                      sent: item.sentCount,
                      staged: item.stagedCount,
                    })}
                  </span>
                </article>
              ))}
            </div>
          ) : null}
        </GlassPanel>
      </div>
    </section>
  );
}
