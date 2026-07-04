"use client";

import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { waitForPendingWidgetUsageEventRecords } from "@/lib/tauri/commands";
import { rollupLocalWidgetUsage, syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";

const WIDGET_USAGE_SYNC_INTERVAL_MS = 60_000;
export const WIDGET_USAGE_SYNCED_EVENT = "bubli:widget-usage-synced";

let syncIntervalId: number | null = null;
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
  if (syncIntervalId !== null) return;

  registerWidgetUsageLifecycleFlush();
  void syncWidgetUsageOnce();
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

  syncIntervalId = null;
  syncInFlight = false;
  syncInFlightPromise = null;
  unregisterWidgetUsageLifecycleFlush();
}

export async function flushWidgetUsageAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncInFlightPromise) {
    await syncInFlightPromise.catch(() => undefined);
  }
  await syncWidgetUsageOnce();
}

export function isWidgetUsageAutoSyncRunning() {
  return syncIntervalId !== null;
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
      await rollupLocalWidgetUsage();
      const result = await syncLocalWidgetUsageSummaryToServer();
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
      // Failed rollups stay retryable in SQLite and will be picked up on the next tick.
    } finally {
      syncInFlight = false;
      syncInFlightPromise = null;
    }
  })();

  return syncInFlightPromise;
}

function notifyWidgetUsageSynced(detail: WidgetUsageSyncedEventDetail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<WidgetUsageSyncedEventDetail>(WIDGET_USAGE_SYNCED_EVENT, {
      detail,
    }),
  );
}
