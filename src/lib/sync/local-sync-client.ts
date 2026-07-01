import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { blocked, pending, runTauriAdapter } from "@/lib/local/adapter-result";
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
      serverTransfer: "not_started",
      summarizedAt: result.data.flushedAt,
    };

    return pending(
      summary,
      "동기화 outbox 상태만 확인했습니다. 실제 서버 전송은 아직 실행하지 않습니다.",
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
      "위젯 사용 요약을 서버 전송 대기열에 올렸습니다. 서버 전송 완료로 표시하지 않습니다.",
      commandName,
    );
  }

  return result;
}

export function blockDirectServerSync(): ReturnType<typeof blocked> {
  return blocked(
    "server_transfer_not_allowed",
    "로컬 어댑터는 서버 전송을 직접 하지 않습니다. 인증된 API 클라이언트가 별도 승인 흐름에서 처리해야 합니다.",
  );
}
