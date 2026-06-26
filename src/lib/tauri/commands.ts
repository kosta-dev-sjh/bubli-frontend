import { invokeTauri } from "@/lib/tauri/ipc";

export const TAURI_COMMANDS = {
  appReady: "app_ready",
} as const;

export const PLANNED_TAURI_COMMANDS = {
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
export type PlannedTauriCommandName = (typeof PLANNED_TAURI_COMMANDS)[keyof typeof PLANNED_TAURI_COMMANDS];

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

export type ManagedFolderCommandInput = {
  localFolderId: string;
};

export type ManagedFolderWatchResult = {
  localFolderId: string;
  watching: boolean;
};

export type LocalFileSearchInput = {
  limit?: number;
  query: string;
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

export type LocalRoomMessageSyncInput = {
  afterSequence?: number | null;
  roomId: string;
};

export type LocalRoomMessageSyncResult = {
  cachedCount: number;
  latestSequence: number;
  roomId: string;
  syncedAt: string;
};

export type LocalBackupResult = {
  backupId: string;
  createdAt: string;
  fileName: string;
  sizeBytes: number;
};

export type LocalBackupRestoreInput = {
  backupId: string;
};

export type LocalBackupRestoreResult = {
  backupId: string;
  restoredAt: string;
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

export type WidgetUsageRollupInput = {
  summaryDate?: string;
};

export type WidgetUsageRollupResult = {
  bubbleType: string;
  rollupKey: string;
  sourceEventCount: number;
  summaryDate: string;
};

export type WidgetUsageSummarySyncInput = {
  rollupKeys?: string[];
};

export type WidgetUsageSummarySyncResult = {
  failedCount: number;
  sentCount: number;
  syncedAt: string;
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

export type TauriCommandContract = {
  app_ready: {
    args: undefined;
    result: string;
  };
};

export type PlannedTauriCommandContract = {
  backup_local_sqlite: {
    args: undefined;
    result: LocalBackupResult;
  };
  check_local_sqlite_integrity: {
    args: undefined;
    result: SqliteIntegrityResult;
  };
  flush_sync_outbox: {
    args: undefined;
    result: SyncOutboxFlushResult;
  };
  read_activity_context: {
    args: undefined;
    result: ActivityContextResult;
  };
  recover_timer_state: {
    args: undefined;
    result: TimerRecoveryState;
  };
  record_widget_usage_event: {
    args: WidgetUsageEventInput;
    result: { recordedAt: string };
  };
  restore_local_sqlite_backup: {
    args: LocalBackupRestoreInput;
    result: LocalBackupRestoreResult;
  };
  rollup_widget_usage: {
    args: WidgetUsageRollupInput | undefined;
    result: WidgetUsageRollupResult[];
  };
  scan_managed_folder: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderScanResult;
  };
  search_local_files: {
    args: LocalFileSearchInput;
    result: LocalFileSearchResult;
  };
  select_managed_folder: {
    args: undefined;
    result: ManagedFolderSelection;
  };
  sync_room_messages: {
    args: LocalRoomMessageSyncInput;
    result: LocalRoomMessageSyncResult;
  };
  sync_widget_usage_summary: {
    args: WidgetUsageSummarySyncInput | undefined;
    result: WidgetUsageSummarySyncResult;
  };
  watch_managed_folder: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderWatchResult;
  };
};

export type TauriCommandArgs<TCommand extends TauriCommandName> = TauriCommandContract[TCommand]["args"];
export type TauriCommandResult<TCommand extends TauriCommandName> = TauriCommandContract[TCommand]["result"];
export type PlannedTauriCommandArgs<TCommand extends PlannedTauriCommandName> = PlannedTauriCommandContract[TCommand]["args"];
export type PlannedTauriCommandResult<TCommand extends PlannedTauriCommandName> = PlannedTauriCommandContract[TCommand]["result"];

export const tauriCommands = {
  appReady() {
    return invokeTauri<string>(TAURI_COMMANDS.appReady);
  },
} as const;
