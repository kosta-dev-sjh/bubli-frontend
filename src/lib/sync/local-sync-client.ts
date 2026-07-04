import { tauriCommands, TAURI_COMMANDS, waitForPendingWidgetUsageEventRecords } from "@/lib/tauri/commands";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { blocked, failed, pending, ready, runTauriAdapter } from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import { syncLocalActivityBufferToServer } from "@/lib/local/activity-client";
import { syncPersonalLocalFileEventsToServer } from "@/lib/local/managed-folder-client";
import { rollupLocalWidgetUsage, syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";
import type {
  LocalOutboxServerSyncAdapterResult,
  LocalSyncSummary,
  SyncOutboxSummaryResult,
  WidgetUsageSummarySyncAdapterInput,
  WidgetUsageSummarySyncAdapterResult,
} from "@/types/local";

export async function getLocalSyncOutboxSummary(): Promise<SyncOutboxSummaryResult> {
  const commandName = TAURI_COMMANDS.flushSyncOutbox;
  const result = await runTauriAdapter(commandName, () => tauriCommands.flushSyncOutbox());

  if (result.status === "ready") {
    const summary: LocalSyncSummary = {
      failedCount: result.data.failedCount,
      pendingCount: result.data.pendingCount,
      serverTransfer: "not_started",
      summarizedAt: result.data.flushedAt,
      sentCount: result.data.sentCount,
    };

    return pending(
      summary,
      translate("local.sync.outboxChecked"),
      commandName,
    );
  }

  return result;
}

export async function stageWidgetUsageSummary(
  input?: WidgetUsageSummarySyncAdapterInput,
): Promise<WidgetUsageSummarySyncAdapterResult> {
  const commandName = TAURI_COMMANDS.syncWidgetUsageSummary;
  const result = await runTauriAdapter(commandName, () => tauriCommands.syncWidgetUsageSummary(input));

  if (result.status === "ready") {
    const summary: LocalSyncSummary = {
      failedCount: result.data.failedCount,
      queuedCount: result.data.sentCount,
      serverTransfer: "queued_only",
      summarizedAt: result.data.syncedAt,
    };

    return pending(
      summary,
      translate("local.sync.widgetQueued"),
      commandName,
    );
  }

  return result;
}

export async function syncAllLocalOutboxToServer(input?: {
  limit?: number;
}): Promise<LocalOutboxServerSyncAdapterResult> {
  const commandName = TAURI_COMMANDS.flushSyncOutbox;

  try {
    const consent = await settingsApi.getPrivacyConsents();
    const limit = input?.limit;
    const fileResult = await syncPersonalLocalFileEventsToServer({
      consentGranted: consent.localFolderEnabled,
      limit,
    });
    const activityResult = await syncLocalActivityBufferToServer({
      consentGranted: consent.activityDetectionEnabled,
      limit,
    });
    await waitForPendingWidgetUsageEventRecords().catch(() => undefined);
    await rollupLocalWidgetUsage().catch(() => undefined);
    const widgetResult = await syncLocalWidgetUsageSummaryToServer();
    const summaryResult = await getLocalSyncOutboxSummary();
    const summary =
      summaryResult.status === "pending"
        ? summaryResult.summary
        : summaryResult.status === "ready"
          ? {
              failedCount: summaryResult.data.failedCount,
              pendingCount: summaryResult.data.pendingCount,
              sentCount: summaryResult.data.sentCount,
              serverTransfer: "sent" as const,
              summarizedAt: summaryResult.data.flushedAt,
            }
          : {
              failedCount: 1,
              pendingCount: 0,
              sentCount: 0,
              serverTransfer: "sent" as const,
              summarizedAt: new Date().toISOString(),
            };

    const fileFailedCount = fileResult.status === "ready" ? fileResult.data.failedCount : 0;
    const fileSentCount = fileResult.status === "ready" ? fileResult.data.sentCount : 0;
    const fileSyncedCount = fileResult.status === "ready" ? fileResult.data.syncedCount : 0;
    const activityFailedCount = activityResult.status === "ready" ? activityResult.data.failedCount : 0;
    const activitySentCount = activityResult.status === "ready" ? activityResult.data.sentCount : 0;
    const activityStagedCount = activityResult.status === "ready" ? activityResult.data.stagedCount : 0;
    const widgetFailedCount = widgetResult.status === "ready" ? widgetResult.data.failedCount : 0;
    const widgetMarkedSyncedCount = widgetResult.status === "ready" ? widgetResult.data.markedSyncedCount : 0;
    const widgetSentCount = widgetResult.status === "ready" ? widgetResult.data.sentCount : 0;
    const widgetStagedCount = widgetResult.status === "ready" ? widgetResult.data.stagedCount : 0;
    const adapterIssueCount = [fileResult, activityResult, widgetResult, summaryResult].filter(
      (result) => result.status !== "ready" && result.status !== "pending",
    ).length;
    const serverSentCount = fileSentCount + activitySentCount + widgetSentCount;

    return ready(
      {
        activityFailedCount,
        activitySentCount,
        activityStagedCount,
        failedCount: fileFailedCount + activityFailedCount + widgetFailedCount + adapterIssueCount,
        fileFailedCount,
        fileSentCount,
        fileSyncedCount,
        pendingCount: summary.pendingCount ?? 0,
        sentCount: serverSentCount,
        syncedAt: new Date().toISOString(),
        widgetFailedCount,
        widgetMarkedSyncedCount,
        widgetSentCount,
        widgetStagedCount,
      },
      commandName,
      translate("local.sync.outboxChecked"),
    );
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error), commandName);
  }
}

export function blockDirectServerSync(): ReturnType<typeof blocked> {
  return blocked(
    "server_transfer_not_allowed",
    translate("local.sync.noDirectSend"),
  );
}
