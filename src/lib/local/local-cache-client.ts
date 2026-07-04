import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { ready, runTauriAdapter, unavailable } from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import type { ChatMessageResponse, ChatMessageType } from "@/types/api/chat";
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
  TAURI_COMMANDS.listLocalSqliteBackups,
  TAURI_COMMANDS.markActivityContextSynced,
  TAURI_COMMANDS.readRoomMessages,
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

  return ready(summary, undefined, translate("local.cache.ready"));
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

export function listLocalSqliteBackups() {
  const commandName = TAURI_COMMANDS.listLocalSqliteBackups;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => tauriCommands.listLocalSqliteBackups());
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

export async function readCachedRoomMessages(roomId: string, limit = 40): Promise<ChatMessageResponse[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  try {
    const result = await tauriCommands.readRoomMessages({ limit, roomId });
    return result.items
      .flatMap((item) => parseCachedRoomMessage(item.bodyJson))
      .sort((a, b) => a.roomSequence - b.roomSequence);
  } catch {
    return [];
  }
}

export async function syncCachedRoomMessages(roomId: string, messages: ChatMessageResponse[], afterSequence = 0): Promise<void> {
  if (!isTauriRuntime() || messages.length === 0) {
    return;
  }

  const cacheableMessages = messages.filter(isChatMessageResponse);

  if (cacheableMessages.length === 0) {
    return;
  }

  try {
    await tauriCommands.syncRoomMessages({
      afterSequence,
      messages: cacheableMessages.map((message) => ({
        bodyJson: JSON.stringify(message),
        roomSequence: message.roomSequence,
        serverMessageId: message.id,
      })),
      roomId,
    });
  } catch {
    // Cache sync is a best-effort fallback path; the server remains the source of truth.
  }
}

function getLocalCacheReadinessSummary(): LocalCacheReadinessSummary {
  return {
    cacheStore: "sqlite",
    implementedCommands: [...IMPLEMENTED_LOCAL_CACHE_COMMANDS],
    plannedCommands: [...PLANNED_LOCAL_CACHE_COMMANDS],
    serverTransfer: "not_started",
  };
}

function parseCachedRoomMessage(bodyJson: string): ChatMessageResponse[] {
  try {
    const parsed = JSON.parse(bodyJson);
    return isChatMessageResponse(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

function isChatMessageResponse(value: unknown): value is ChatMessageResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.chatRoomId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.roomSequence === "number" &&
    isChatMessageType(value.messageType) &&
    isRecord(value.body) &&
    isRealtimeActor(value.sender) &&
    (value.clientMessageId === undefined || typeof value.clientMessageId === "string") &&
    (value.resourceId === undefined || value.resourceId === null || typeof value.resourceId === "string")
  );
}

function isRealtimeActor(value: unknown): value is ChatMessageResponse["sender"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.type === "USER" || value.type === "SYSTEM" || value.type === "AGENT") &&
    (value.id === null || typeof value.id === "string") &&
    typeof value.name === "string"
  );
}

function isChatMessageType(value: unknown): value is ChatMessageType {
  return value === "TEXT" || value === "FILE" || value === "AGENT_COMMAND" || value === "AGENT_RESPONSE" || value === "SYSTEM";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
