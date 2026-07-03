"use client";

import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { rollupLocalWidgetUsage, syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";

const WIDGET_USAGE_SYNC_INTERVAL_MS = 60_000;

let syncIntervalId: number | null = null;
let syncInFlight = false;
let syncInFlightPromise: Promise<void> | null = null;

type WidgetUsageAutoSyncStopInput = {
  flush?: boolean;
};

export function startWidgetUsageAutoSync() {
  if (!isTauriRuntime()) return;
  if (syncIntervalId !== null) return;

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

async function syncWidgetUsageOnce() {
  if (syncInFlight) {
    return syncInFlightPromise ?? Promise.resolve();
  }

  syncInFlight = true;
  syncInFlightPromise = (async () => {
    try {
      await rollupLocalWidgetUsage();
      await syncLocalWidgetUsageSummaryToServer();
    } catch {
      // Failed rollups stay retryable in SQLite and will be picked up on the next tick.
    } finally {
      syncInFlight = false;
      syncInFlightPromise = null;
    }
  })();

  return syncInFlightPromise;
}
