import { invokeTauri } from "@/lib/tauri/ipc";

export const TAURI_COMMANDS = {
  backupLocalSqlite: "backup_local_sqlite",
  checkLocalSqliteIntegrity: "check_local_sqlite_integrity",
  flushSyncOutbox: "flush_sync_outbox",
  readActivityContext: "read_activity_context",
  recoverTimerState: "recover_timer_state",
  recordWidgetUsageEvent: "record_widget_usage_event",
  restoreLocalSqliteBackup: "restore_local_sqlite_backup",
  rollupWidgetUsage: "rollup_widget_usage",
  scanManagedFolder: "scan_managed_folder",
  searchLocalFiles: "search_local_files",
  selectManagedFolder: "select_managed_folder",
  syncRoomMessages: "sync_room_messages",
  syncWidgetUsageSummary: "sync_widget_usage_summary",
  watchManagedFolder: "watch_managed_folder",
} as const;

export type TauriCommandName = (typeof TAURI_COMMANDS)[keyof typeof TAURI_COMMANDS];

export type ManagedFolderSelection = {
  localFolderId: string;
  name: string;
  path: string;
};

export type ManagedFolderScanResult = {
  changedCount: number;
  localFolderId: string;
  scannedAt: string;
};

export type LocalFileSearchResult = {
  items: Array<{
    localFileId: string;
    matchedText?: string;
    name: string;
    path: string;
    updatedAt: string;
  }>;
};

export type SqliteIntegrityResult = {
  checkedAt: string;
  ok: boolean;
  recoveryRequired: boolean;
};

export type LocalBackupResult = {
  backupId: string;
  createdAt: string;
  fileName: string;
  sizeBytes: number;
};

export type ActivityContextResult = {
  appName: string;
  capturedAt: string;
  durationSeconds?: number;
  windowTitle?: string;
};

export type WidgetUsageEventInput = {
  bubbleType: string;
  eventType: string;
  itemId?: string;
  itemType?: string;
  occurredAt: string;
};

export type WidgetUsageRollupResult = {
  bubbleType: string;
  rollupKey: string;
  sourceEventCount: number;
  summaryDate: string;
};

export type SyncOutboxFlushResult = {
  failedCount: number;
  flushedAt: string;
  sentCount: number;
};

export type TimerRecoveryState = {
  localTimeLogId?: string;
  recoveryRequired: boolean;
  serverTimeLogId?: string;
  status: "NONE" | "RECOVERY_NEEDED" | "RESTORED" | "SERVER_WINS";
};

export const tauriCommands = {
  backupLocalSqlite() {
    return invokeTauri<LocalBackupResult>(TAURI_COMMANDS.backupLocalSqlite);
  },

  checkLocalSqliteIntegrity() {
    return invokeTauri<SqliteIntegrityResult>(TAURI_COMMANDS.checkLocalSqliteIntegrity);
  },

  flushSyncOutbox() {
    return invokeTauri<SyncOutboxFlushResult>(TAURI_COMMANDS.flushSyncOutbox);
  },

  readActivityContext() {
    return invokeTauri<ActivityContextResult>(TAURI_COMMANDS.readActivityContext);
  },

  recoverTimerState() {
    return invokeTauri<TimerRecoveryState>(TAURI_COMMANDS.recoverTimerState);
  },

  recordWidgetUsageEvent(input: WidgetUsageEventInput) {
    return invokeTauri<null>(TAURI_COMMANDS.recordWidgetUsageEvent, input);
  },

  restoreLocalSqliteBackup(backupId: string) {
    return invokeTauri<SqliteIntegrityResult>(TAURI_COMMANDS.restoreLocalSqliteBackup, { backupId });
  },

  rollupWidgetUsage(summaryDate: string) {
    return invokeTauri<WidgetUsageRollupResult[]>(TAURI_COMMANDS.rollupWidgetUsage, { summaryDate });
  },

  scanManagedFolder(localFolderId: string) {
    return invokeTauri<ManagedFolderScanResult>(TAURI_COMMANDS.scanManagedFolder, { localFolderId });
  },

  searchLocalFiles(query: string) {
    return invokeTauri<LocalFileSearchResult>(TAURI_COMMANDS.searchLocalFiles, { query });
  },

  selectManagedFolder() {
    return invokeTauri<ManagedFolderSelection>(TAURI_COMMANDS.selectManagedFolder);
  },

  syncRoomMessages(chatRoomId: string) {
    return invokeTauri<null>(TAURI_COMMANDS.syncRoomMessages, { chatRoomId });
  },

  syncWidgetUsageSummary(summaryDate: string) {
    return invokeTauri<null>(TAURI_COMMANDS.syncWidgetUsageSummary, { summaryDate });
  },

  watchManagedFolder(localFolderId: string) {
    return invokeTauri<null>(TAURI_COMMANDS.watchManagedFolder, { localFolderId });
  },
} as const;
