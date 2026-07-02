import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { ready, runTauriAdapter, unavailable } from "@/lib/local/adapter-result";
import type {
  LocalBackupRestoreRequest,
  LocalCacheReadinessResult,
  LocalCacheReadinessSummary,
  LocalCacheIntegrityResult,
  LocalTimerRecoveryResult,
  WidgetUsageEventAdapterInput,
  WidgetUsageEventAdapterResult,
  WidgetUsageRollupAdapterInput,
  WidgetUsageRollupAdapterResult,
} from "@/types/local";

const IMPLEMENTED_LOCAL_CACHE_COMMANDS = [
  TAURI_COMMANDS.backupLocalSqlite,
  TAURI_COMMANDS.checkLocalSqliteIntegrity,
  TAURI_COMMANDS.markActivityContextSynced,
  TAURI_COMMANDS.recordActivityContext,
  TAURI_COMMANDS.recordTimerState,
  TAURI_COMMANDS.recoverTimerState,
  TAURI_COMMANDS.recordWidgetUsageEvent,
  TAURI_COMMANDS.restoreLocalSqliteBackup,
  TAURI_COMMANDS.rollupWidgetUsage,
  TAURI_COMMANDS.stageActivityContextsForSync,
  TAURI_COMMANDS.syncRoomMessages,
] as const;

const PLANNED_LOCAL_CACHE_COMMANDS = [] as const;

export function getLocalCacheReadiness(): LocalCacheReadinessResult {
  const summary = getLocalCacheReadinessSummary();

  if (!isTauriRuntime()) {
    return unavailable();
  }

  return ready(summary, undefined, "Tauri 로컬 SQLite 저장소를 쓸 수 있는 환경입니다.");
}

export function checkLocalSqliteIntegrity(): Promise<LocalCacheIntegrityResult> | LocalCacheIntegrityResult {
  const commandName = TAURI_COMMANDS.checkLocalSqliteIntegrity;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => tauriCommands.checkLocalSqliteIntegrity());
}

export function backupLocalSqlite() {
  const commandName = TAURI_COMMANDS.backupLocalSqlite;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => tauriCommands.backupLocalSqlite());
}

export function restoreLocalSqliteBackup(input: LocalBackupRestoreRequest) {
  const commandName = TAURI_COMMANDS.restoreLocalSqliteBackup;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => tauriCommands.restoreLocalSqliteBackup(input));
}

export function recoverLocalTimerState(): Promise<LocalTimerRecoveryResult> | LocalTimerRecoveryResult {
  const commandName = TAURI_COMMANDS.recoverTimerState;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => tauriCommands.recoverTimerState());
}

export async function recordWidgetUsageEvent(
  input: WidgetUsageEventAdapterInput,
): Promise<WidgetUsageEventAdapterResult> {
  return runTauriAdapter(TAURI_COMMANDS.recordWidgetUsageEvent, () =>
    tauriCommands.recordWidgetUsageEvent(input),
  );
}

export async function rollupWidgetUsage(
  input?: WidgetUsageRollupAdapterInput,
): Promise<WidgetUsageRollupAdapterResult> {
  return runTauriAdapter(TAURI_COMMANDS.rollupWidgetUsage, () =>
    tauriCommands.rollupWidgetUsage(input),
  );
}

function getLocalCacheReadinessSummary(): LocalCacheReadinessSummary {
  return {
    cacheStore: "sqlite",
    implementedCommands: [...IMPLEMENTED_LOCAL_CACHE_COMMANDS],
    plannedCommands: [...PLANNED_LOCAL_CACHE_COMMANDS],
    serverTransfer: "not_started",
  };
}
