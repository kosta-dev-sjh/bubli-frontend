import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { blocked, pending, runTauriAdapter } from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import type {
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

export function blockDirectServerSync(): ReturnType<typeof blocked> {
  return blocked(
    "server_transfer_not_allowed",
    translate("local.sync.noDirectSend"),
  );
}
