import { plannedTauriCommands, PLANNED_TAURI_COMMANDS } from "@/lib/tauri/commands";
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
  PLANNED_TAURI_COMMANDS.backupLocalSqlite,
  PLANNED_TAURI_COMMANDS.checkLocalSqliteIntegrity,
  PLANNED_TAURI_COMMANDS.recoverTimerState,
  PLANNED_TAURI_COMMANDS.recordWidgetUsageEvent,
  PLANNED_TAURI_COMMANDS.restoreLocalSqliteBackup,
  PLANNED_TAURI_COMMANDS.rollupWidgetUsage,
  PLANNED_TAURI_COMMANDS.syncRoomMessages,
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
  const commandName = PLANNED_TAURI_COMMANDS.checkLocalSqliteIntegrity;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => plannedTauriCommands.checkLocalSqliteIntegrity());
}

export function backupLocalSqlite() {
  const commandName = PLANNED_TAURI_COMMANDS.backupLocalSqlite;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => plannedTauriCommands.backupLocalSqlite());
}

export function restoreLocalSqliteBackup(input: LocalBackupRestoreRequest) {
  const commandName = PLANNED_TAURI_COMMANDS.restoreLocalSqliteBackup;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => plannedTauriCommands.restoreLocalSqliteBackup(input));
}

export function recoverLocalTimerState(): Promise<LocalTimerRecoveryResult> | LocalTimerRecoveryResult {
  const commandName = PLANNED_TAURI_COMMANDS.recoverTimerState;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => plannedTauriCommands.recoverTimerState());
}

export async function recordWidgetUsageEvent(
  input: WidgetUsageEventAdapterInput,
): Promise<WidgetUsageEventAdapterResult> {
  return runTauriAdapter(PLANNED_TAURI_COMMANDS.recordWidgetUsageEvent, () =>
    plannedTauriCommands.recordWidgetUsageEvent(input),
  );
}

export async function rollupWidgetUsage(
  input?: WidgetUsageRollupAdapterInput,
): Promise<WidgetUsageRollupAdapterResult> {
  return runTauriAdapter(PLANNED_TAURI_COMMANDS.rollupWidgetUsage, () =>
    plannedTauriCommands.rollupWidgetUsage(input),
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
