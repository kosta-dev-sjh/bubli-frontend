"use client";

import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { waitForPendingWidgetUsageEventRecords } from "@/lib/tauri/commands";
import { rollupLocalWidgetUsage, syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";

const WIDGET_USAGE_SYNC_INTERVAL_MS = 60_000;
const WIDGET_USAGE_INITIAL_SYNC_DELAY_MS = 10_000;
export const WIDGET_USAGE_SYNCED_EVENT = "bubli:widget-usage-synced";
const widgetUsageAutoSyncEnabled =
  process.env.NEXT_PUBLIC_BUBLI_WIDGET_USAGE_AUTO_SYNC === "true" ||
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";

let syncIntervalId: number | null = null;
let syncTimeoutId: number | null = null;
let syncInFlight = false;
let syncInFlightPromise: Promise<void> | null = null;
let lifecycleListenersRegistered = false;

type WidgetUsageAutoSyncStopInput = {
  flush?: boolean;
};

export type WidgetUsageSyncedEventDetail = {
  failedCount?: number;
  markedSyncedCount?: number;
  sentCount?: number;
  stagedCount?: number;
  status: "ready" | "failed" | "blocked" | "pending" | "unavailable";
  syncedAt?: string;
};

export function startWidgetUsageAutoSync() {
  if (!isTauriRuntime()) return;
  if (!widgetUsageAutoSyncEnabled) return;
  if (syncIntervalId !== null) return;

  registerWidgetUsageLifecycleFlush();
  syncTimeoutId = window.setTimeout(() => {
    syncTimeoutId = null;
    void syncWidgetUsageOnce();
  }, WIDGET_USAGE_INITIAL_SYNC_DELAY_MS);
  syncIntervalId = window.setInterval(() => {
    void syncWidgetUsageOnce();
  }, WIDGET_USAGE_SYNC_INTERVAL_MS);
}

export async function stopWidgetUsageAutoSync(input?: WidgetUsageAutoSyncStopInput) {
  if (input?.flush) {
    await flushWidgetUsageAutoSync();
  }

  if (syncIntervalId !== null) {
    window.clearInterval(syncIntervalId);
  }
  if (syncTimeoutId !== null) {
    window.clearTimeout(syncTimeoutId);
  }

  syncIntervalId = null;
  syncTimeoutId = null;
  syncInFlight = false;
  syncInFlightPromise = null;
  unregisterWidgetUsageLifecycleFlush();
}

export async function flushWidgetUsageAutoSync() {
  if (!isTauriRuntime()) return;
  if (!widgetUsageAutoSyncEnabled) return;
  if (syncInFlightPromise) {
    await syncInFlightPromise.catch(() => undefined);
  }
  await syncWidgetUsageOnce();
}

export function isWidgetUsageAutoSyncRunning() {
  return widgetUsageAutoSyncEnabled && syncIntervalId !== null;
}

function registerWidgetUsageLifecycleFlush() {
  if (lifecycleListenersRegistered || typeof window === "undefined" || typeof document === "undefined") return;

  window.addEventListener("pagehide", handleWidgetUsagePageHide);
  document.addEventListener("visibilitychange", handleWidgetUsageVisibilityChange);
  lifecycleListenersRegistered = true;
}

function unregisterWidgetUsageLifecycleFlush() {
  if (!lifecycleListenersRegistered || typeof window === "undefined" || typeof document === "undefined") return;

  window.removeEventListener("pagehide", handleWidgetUsagePageHide);
  document.removeEventListener("visibilitychange", handleWidgetUsageVisibilityChange);
  lifecycleListenersRegistered = false;
}

function handleWidgetUsagePageHide() {
  void flushWidgetUsageAutoSync();
}

function handleWidgetUsageVisibilityChange() {
  if (document.visibilityState !== "hidden") return;
  void flushWidgetUsageAutoSync();
}

async function syncWidgetUsageOnce() {
  if (syncInFlight) {
    return syncInFlightPromise ?? Promise.resolve();
  }

  syncInFlight = true;
  syncInFlightPromise = (async () => {
    try {
      await waitForPendingWidgetUsageEventRecords();
      const rollupResult = await rollupLocalWidgetUsage({ summaryDate: getLocalSummaryDate() });
      if (rollupResult.status !== "ready") {
        notifyWidgetUsageSynced({ status: rollupResult.status });
        return;
      }

      const rollupKeys = rollupResult.data.map((rollup) => rollup.rollupKey);
      if (rollupKeys.length === 0) {
        notifyWidgetUsageSynced({
          failedCount: 0,
          markedSyncedCount: 0,
          sentCount: 0,
          stagedCount: 0,
          status: "ready",
          syncedAt: new Date().toISOString(),
        });
        return;
      }

      const result = await syncLocalWidgetUsageSummaryToServer({ rollupKeys });
      notifyWidgetUsageSynced(
        result.status === "ready"
          ? {
              failedCount: result.data.failedCount,
              markedSyncedCount: result.data.markedSyncedCount,
              sentCount: result.data.sentCount,
              stagedCount: result.data.stagedCount,
              status: result.status,
              syncedAt: result.data.syncedAt,
            }
          : { status: result.status },
      );
    } catch {
      notifyWidgetUsageSynced({
        failedCount: 1,
        status: "failed",
        syncedAt: new Date().toISOString(),
      });
      // Failed rollups stay retryable in SQLite and will be picked up on the next tick.
    } finally {
      syncInFlight = false;
      syncInFlightPromise = null;
    }
  })();

  return syncInFlightPromise;
}

function getLocalSummaryDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function notifyWidgetUsageSynced(detail: WidgetUsageSyncedEventDetail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<WidgetUsageSyncedEventDetail>(WIDGET_USAGE_SYNCED_EVENT, {
      detail,
    }),
  );
}
