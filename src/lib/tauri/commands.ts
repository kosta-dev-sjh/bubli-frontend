import { invokeTauri } from "@/lib/tauri/ipc";

export const TAURI_COMMANDS = {
  appReady: "app_ready",
  backupLocalSqlite: "backup_local_sqlite",
  checkLocalSqliteIntegrity: "check_local_sqlite_integrity",
  clearActiveProjectRoom: "clear_active_project_room",
  clearTauriAuthSession: "clear_tauri_auth_session",
  closeAllWidgetWindows: "close_all_widget_windows",
  closeWidgetWindow: "close_widget_window",
  flushSyncOutbox: "flush_sync_outbox",
  getIndexProgress: "get_index_progress",
  getPreferredAppMonitor: "get_preferred_app_monitor",
  getWidgetBarItems: "get_widget_bar_items",
  getWidgetWindowState: "get_widget_window_state",
  listAppMonitors: "list_app_monitors",
  listLocalSqliteBackups: "list_local_sqlite_backups",
  markActivityContextSynced: "mark_activity_context_synced",
  listManagedFolders: "list_managed_folders",
  openWidgetWindow: "open_widget_window",
  readActiveProjectRoom: "read_active_project_room",
  readTauriAuthSession: "read_tauri_auth_session",
  readActivityContext: "read_activity_context",
  readLocalFilePreview: "read_local_file_preview",
  readRoomMessages: "read_room_messages",
  readWidgetSummaryCache: "read_widget_summary_cache",
  reindexFile: "reindex_file",
  recoverTimerState: "recover_timer_state",
  recordActivityContext: "record_activity_context",
  recordTimerState: "record_timer_state",
  recordWidgetUsageEvent: "record_widget_usage_event",
  removeManagedFolder: "remove_managed_folder",
  markLocalFileEventsSynced: "mark_local_file_events_synced",
  markWidgetUsageSummarySynced: "mark_widget_usage_summary_synced",
  openLocalFile: "open_local_file",
  registerWidgetShortcut: "register_widget_shortcut",
  restoreLocalSqliteBackup: "restore_local_sqlite_backup",
  rollupWidgetUsage: "rollup_widget_usage",
  scanManagedFolder: "scan_managed_folder",
  searchLocalFiles: "search_local_files",
  selectManagedFolder: "select_managed_folder",
  setPreferredAppMonitor: "set_preferred_app_monitor",
  setFolderSync: "set_folder_sync",
  setWidgetAlwaysOnTop: "set_widget_always_on_top",
  setWidgetClickThrough: "set_widget_click_through",
  setWidgetRoomContext: "set_widget_room_context",
  setWidgetWindowMode: "set_widget_window_mode",
  setWidgetWindowPosition: "set_widget_window_position",
  stageActivityContextsForSync: "stage_activity_contexts_for_sync",
  stageLocalFileEventsForSync: "stage_local_file_events_for_sync",
  storeActiveProjectRoom: "store_active_project_room",
  storeTauriAuthSession: "store_tauri_auth_session",
  storeWidgetSummaryCache: "store_widget_summary_cache",
  syncRoomMessages: "sync_room_messages",
  syncWidgetUsageSummary: "sync_widget_usage_summary",
  toggleWidgetDockOrb: "toggle_widget_dock_orb",
  toggleWidgetWindow: "toggle_widget_window",
  unwatchAllManagedFolders: "unwatch_all_managed_folders",
  updateWidgetTrayState: "update_widget_tray_state",
  watchAllManagedFolders: "watch_all_managed_folders",
  watchManagedFolder: "watch_managed_folder",
} as const;

// Tauri widget work treats v20 as the feature checklist, not just visual reference.
// Match the v20 desktop widget responsibilities first, then add only the missing pieces.
// Missing commands stay planned until Rust and capabilities are ready.
export const PLANNED_TAURI_COMMANDS = {} as const;

export type TauriCommandName = (typeof TAURI_COMMANDS)[keyof typeof TAURI_COMMANDS];
export type PlannedTauriCommandName = (typeof PLANNED_TAURI_COMMANDS)[keyof typeof PLANNED_TAURI_COMMANDS];

export type ManagedFolderSelection = {
  localFolderId: string;
  name: string;
  path: string;
};

export type ManagedFolderListItem = ManagedFolderSelection & {
  createdAt: string;
  status: "ACTIVE" | "PAUSED" | "REMOVED" | string;
  syncEnabled: boolean;
  updatedAt: string;
};

export type ManagedFolderListResult = {
  folders: ManagedFolderListItem[];
  loadedAt: string;
};

// The native folder picker can be wired through the dialog plugin later; until
// then the frontend may pass an already-resolved absolute path to register a
// personal managed folder. Personal-only: a managed folder never carries roomId.
export type SelectManagedFolderInput = {
  path?: string;
};

export type ManagedFolderScanResult = {
  changedCount: number;
  localFolderId: string;
  scannedAt: string;
};

export type ManagedFolderCommandInput = {
  localFolderId: string;
};

export type ManagedFolderSyncInput = ManagedFolderCommandInput & {
  enabled: boolean;
};

export type ManagedFolderSyncResult = {
  localFolderId: string;
  pendingEventCount: number;
  syncEnabled: boolean;
  updatedAt: string;
};

export type ManagedFolderRemoveResult = {
  localFolderId: string;
  removedAt: string;
  status: "REMOVED";
};

export type ManagedFolderIndexProgressResult = {
  calculatedAt: string;
  indexedFiles: number;
  localFolderId: string;
  pendingEventCount: number;
  pendingFiles: number;
  progressPercent: number;
  syncEnabled: boolean;
  totalFiles: number;
};

export type ManagedFolderWatchResult = {
  localFolderId: string;
  watching: boolean;
};

export type ManagedFolderWatchAllResult = {
  activeFolderCount: number;
  skippedCount: number;
  skippedFolderIds: string[];
  watchedCount: number;
  watchedFolderIds: string[];
};

export type ManagedFolderUnwatchAllResult = {
  stoppedCount: number;
  stoppedFolderIds: string[];
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

export type LocalFilePreviewInput = {
  localFileId: string;
  maxChars?: number;
};

export type LocalFilePreviewResult = {
  localFileId: string;
  mimeType?: string | null;
  name: string;
  path: string;
  previewText?: string | null;
  readAt: string;
  status: "READY" | "UNSUPPORTED" | "MISSING" | "TOO_LARGE";
  truncated: boolean;
};

export type LocalFileOpenInput = {
  localFileId: string;
};

export type LocalFileOpenResult = {
  localFileId: string;
  name: string;
  openedAt: string;
  path: string;
};

export type LocalFileReindexInput = {
  localFileId: string;
};

export type LocalFileReindexResult = {
  changed: boolean;
  checksum?: string | null;
  localFileId: string;
  localFolderId: string;
  name: string;
  path: string;
  reindexedAt: string;
  status: "REINDEXED" | "MISSING";
};

export type LocalFileEventsSyncStageInput = {
  limit?: number;
  localFolderId?: string;
};

export type LocalFileSyncEventCandidate = {
  eventType: "CREATED" | "UPDATED" | "DELETED";
  fileName: string;
  fileSizeBytes?: number | null;
  localEventId: string;
  localFileId?: string | null;
  mimeType?: string | null;
  resourceId?: string | null;
};

export type LocalFileEventsSyncStageResult = {
  events: LocalFileSyncEventCandidate[];
  stagedAt: string;
};

export type LocalFileEventSyncResultInput = {
  localEventId: string;
  resourceId?: string | null;
  status: string;
};

export type LocalFileEventsMarkSyncedInput = {
  results: LocalFileEventSyncResultInput[];
};

export type LocalFileEventsMarkSyncedResult = {
  completedAt: string;
  failedCount: number;
  syncedCount: number;
};

export type SqliteIntegrityResult = {
  checkedAt: string;
  ok: boolean;
  recoveryRequired: boolean;
};

export type TauriAuthSessionStoreInput = {
  sessionJson: string;
};

export type TauriAuthSessionReadResult = {
  savedAt: string;
  sessionJson: string;
};

export type ActiveProjectRoomStoreInput = {
  roomId: string;
  roomLabel?: string | null;
};

export type ActiveProjectRoomReadResult = {
  roomId: string;
  roomLabel?: string | null;
  savedAt: string;
};

export type LocalRoomMessageSyncInput = {
  afterSequence?: number | null;
  messages?: LocalRoomMessageCacheInput[];
  roomId: string;
};

export type LocalRoomMessageCacheInput = {
  bodyJson: string;
  roomSequence: number;
  serverMessageId: string;
};

export type LocalRoomMessageReadInput = {
  limit?: number | null;
  roomId: string;
};

export type LocalRoomMessageCacheEntry = {
  bodyJson: string;
  cachedAt: string;
  roomSequence: number;
  serverMessageId?: string | null;
};

export type LocalRoomMessageReadResult = {
  items: LocalRoomMessageCacheEntry[];
  latestSequence: number;
  roomId: string;
  state: "EMPTY" | "STALE" | "SYNCED" | string;
  syncedAt?: string | null;
};

export type LocalRoomMessageSyncResult = {
  cachedCount: number;
  latestSequence: number;
  roomId: string;
  syncedAt: string;
};

export type WidgetSummaryCacheStoreInput = {
  summaryJson: string;
};

export type WidgetSummaryCacheReadResult = {
  cachedAt: string;
  summaryJson: string;
};

export type LocalBackupResult = {
  backupId: string;
  createdAt: string;
  fileName: string;
  sizeBytes: number;
};

export type LocalBackupManifestEntry = LocalBackupResult;

export type LocalBackupManifestResult = {
  backups: LocalBackupManifestEntry[];
  latestBackupId?: string | null;
  readAt: string;
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

export type ActivityContextRecordInput = {
  appName: string;
  capturedAt: string;
  durationSeconds?: number | null;
  endedAt: string;
  roomId?: string | null;
  startedAt: string;
  windowTitle?: string | null;
};

export type ActivityContextRecordResult = {
  localActivityId: string;
  recordedAt: string;
  syncStatus: "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "FAILED";
};

export type ActivityContextSyncInput = {
  localActivityId: string;
  serverActivityLogId?: string | null;
  status: "SYNCED" | "FAILED" | "SYNC_PENDING" | "LOCAL_ONLY";
};

export type ActivityContextSyncResult = {
  localActivityId: string;
  markedAt: string;
  syncStatus: "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "FAILED";
};

export type ActivityContextSyncStageInput = {
  limit?: number;
};

export type ActivityContextSyncCandidate = {
  appName: string;
  capturedAt: string;
  durationSeconds?: number | null;
  endedAt: string;
  localActivityId: string;
  roomId?: string | null;
  startedAt: string;
  windowTitle?: string | null;
};

export type ActivityContextSyncStageResult = {
  activities: ActivityContextSyncCandidate[];
  stagedAt: string;
};

export type AppMonitorPosition = {
  x: number;
  y: number;
};

export type AppMonitorSize = {
  height: number;
  width: number;
};

export type AppMonitorInfo = {
  id: string;
  isPrimary: boolean;
  name?: string;
  position: AppMonitorPosition;
  scaleFactor: number;
  size: AppMonitorSize;
};

export type AppMonitorPreference = {
  monitors: AppMonitorInfo[];
  preferredMonitorId: string;
};

export type AppMonitorPreferenceInput = {
  monitorId: string;
};

export type WidgetUsageEventInput = {
  bubbleType: string;
  eventType: string;
  itemId?: string;
  itemType?: string;
  occurredAt: string;
};

export type WidgetUsageEventRecordResult = {
  recordedAt: string;
};

export type WidgetUsageRollupInput = {
  summaryDate?: string;
};

export type WidgetUsageRollupResult = {
  bubbleType: string;
  interactionCount: number;
  openCount: number;
  rollupKey: string;
  sourceEventCount: number;
  summaryDate: string;
  visibleSeconds: number;
};

export type WidgetUsageSummarySyncInput = {
  rollupKeys?: string[];
};

export type WidgetUsageSummaryStagedRollup = WidgetUsageRollupResult;

export type WidgetUsageSummarySyncResult = {
  failedCount: number;
  rollups: WidgetUsageSummaryStagedRollup[];
  sentCount: number;
  syncedAt: string;
};

export type WidgetUsageSummaryMarkSyncedInput = {
  rollupKeys: string[];
};

export type WidgetUsageSummaryMarkSyncedResult = {
  completedAt: string;
  syncedCount: number;
};

export type WidgetBubbleType = "agent" | "alert" | "chat" | "memo" | "resource" | "schedule" | "timer" | "todo";
export type WidgetWindowBubbleType = WidgetBubbleType | "bar" | "menu";

export type WidgetWindowMode = "DEFAULT" | "TRANSLUCENT" | "GHOST" | "MINIMIZED";

export type WidgetWindowPosition = {
  x: number;
  y: number;
};

export type WidgetWindowState = {
  activeBubble: WidgetWindowBubbleType;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  dockOrbVisible: boolean;
  mode: WidgetWindowMode;
  position: WidgetWindowPosition;
  selectedRoomId?: string | null;
  shortcut?: string;
  trayVisible: boolean;
  windowId?: string;
  windowVisible: boolean;
};

export type WidgetRoomContextInput = {
  selectedRoomId?: string | null;
};

export type AppReadyInput = {
  selectedRoomId?: string | null;
};

export type WidgetWindowModeInput = {
  bubbleType?: WidgetWindowBubbleType;
  mode: WidgetWindowMode;
  selectedRoomId?: string | null;
  windowId?: string;
};

export type WidgetWindowPositionInput = WidgetWindowPosition & {
  bubbleType?: WidgetWindowBubbleType;
  windowId?: string;
};

export type WidgetWindowOpenInput = {
  bubbleType?: WidgetWindowBubbleType;
  mode?: WidgetWindowMode;
  selectedRoomId?: string | null;
  windowId?: string;
};

export type WidgetWindowTargetInput = {
  bubbleType?: WidgetWindowBubbleType;
  windowId?: string;
};

export type WidgetBooleanInput = {
  bubbleType?: WidgetWindowBubbleType;
  enabled: boolean;
  windowId?: string;
};

export type WidgetShortcutInput = {
  shortcut: string;
};

export type SyncOutboxFlushResult = {
  failedCount: number;
  flushedAt: string;
  pendingCount: number;
  sentCount: number;
};

export type TimerRecoveryState = {
  localTimeLogId?: string;
  recoveryRequired: boolean;
  serverTimeLogId?: string;
  status: "NONE" | "RECOVERY_NEEDED" | "RESTORED" | "SERVER_WINS";
};

export type TimerStateRecordInput = {
  roomId?: string | null;
  serverTimeLogId: string;
  startedAt?: string | null;
  status: "ENDED" | "NEEDS_RECOVERY" | "PAUSED" | "RUNNING";
};

export type TimerStateRecordResult = {
  localTimeLogId: string;
  recordedAt: string;
  serverTimeLogId: string;
  status: string;
};

export type TauriCommandContract = {
  app_ready: {
    args: AppReadyInput | undefined;
    result: string;
  };
  backup_local_sqlite: {
    args: undefined;
    result: LocalBackupResult;
  };
  check_local_sqlite_integrity: {
    args: undefined;
    result: SqliteIntegrityResult;
  };
  clear_active_project_room: {
    args: undefined;
    result: null;
  };
  clear_tauri_auth_session: {
    args: undefined;
    result: null;
  };
  close_all_widget_windows: {
    args: undefined;
    result: number;
  };
  close_widget_window: {
    args: WidgetWindowTargetInput | undefined;
    result: WidgetWindowState;
  };
  flush_sync_outbox: {
    args: undefined;
    result: SyncOutboxFlushResult;
  };
  get_index_progress: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderIndexProgressResult;
  };
  get_preferred_app_monitor: {
    args: undefined;
    result: AppMonitorPreference;
  };
  get_widget_window_state: {
    args: WidgetWindowTargetInput | undefined;
    result: WidgetWindowState;
  };
  get_widget_bar_items: {
    args: undefined;
    result: WidgetWindowState[];
  };
  list_app_monitors: {
    args: undefined;
    result: AppMonitorPreference;
  };
  list_local_sqlite_backups: {
    args: undefined;
    result: LocalBackupManifestResult;
  };
  mark_activity_context_synced: {
    args: ActivityContextSyncInput;
    result: ActivityContextSyncResult;
  };
  list_managed_folders: {
    args: undefined;
    result: ManagedFolderListResult;
  };
  open_widget_window: {
    args: WidgetWindowOpenInput | undefined;
    result: WidgetWindowState;
  };
  read_active_project_room: {
    args: undefined;
    result: ActiveProjectRoomReadResult | null;
  };
  read_tauri_auth_session: {
    args: undefined;
    result: TauriAuthSessionReadResult | null;
  };
  read_activity_context: {
    args: undefined;
    result: ActivityContextResult;
  };
  read_local_file_preview: {
    args: LocalFilePreviewInput;
    result: LocalFilePreviewResult;
  };
  read_room_messages: {
    args: LocalRoomMessageReadInput;
    result: LocalRoomMessageReadResult;
  };
  read_widget_summary_cache: {
    args: undefined;
    result: WidgetSummaryCacheReadResult | null;
  };
  reindex_file: {
    args: LocalFileReindexInput;
    result: LocalFileReindexResult;
  };
  recover_timer_state: {
    args: undefined;
    result: TimerRecoveryState;
  };
  record_activity_context: {
    args: ActivityContextRecordInput;
    result: ActivityContextRecordResult;
  };
  record_timer_state: {
    args: TimerStateRecordInput;
    result: TimerStateRecordResult;
  };
  record_widget_usage_event: {
    args: WidgetUsageEventInput;
    result: WidgetUsageEventRecordResult;
  };
  remove_managed_folder: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderRemoveResult;
  };
  mark_local_file_events_synced: {
    args: LocalFileEventsMarkSyncedInput;
    result: LocalFileEventsMarkSyncedResult;
  };
  mark_widget_usage_summary_synced: {
    args: WidgetUsageSummaryMarkSyncedInput;
    result: WidgetUsageSummaryMarkSyncedResult;
  };
  open_local_file: {
    args: LocalFileOpenInput;
    result: LocalFileOpenResult;
  };
  register_widget_shortcut: {
    args: WidgetShortcutInput;
    result: WidgetWindowState;
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
    args: SelectManagedFolderInput | undefined;
    result: ManagedFolderSelection;
  };
  set_preferred_app_monitor: {
    args: AppMonitorPreferenceInput;
    result: AppMonitorPreference;
  };
  set_folder_sync: {
    args: ManagedFolderSyncInput;
    result: ManagedFolderSyncResult;
  };
  set_widget_always_on_top: {
    args: WidgetBooleanInput;
    result: WidgetWindowState;
  };
  set_widget_click_through: {
    args: WidgetBooleanInput;
    result: WidgetWindowState;
  };
  set_widget_room_context: {
    args: WidgetRoomContextInput;
    result: WidgetWindowState[];
  };
  set_widget_window_mode: {
    args: WidgetWindowModeInput;
    result: WidgetWindowState;
  };
  set_widget_window_position: {
    args: WidgetWindowPositionInput;
    result: WidgetWindowState;
  };
  stage_activity_contexts_for_sync: {
    args: ActivityContextSyncStageInput | undefined;
    result: ActivityContextSyncStageResult;
  };
  stage_local_file_events_for_sync: {
    args: LocalFileEventsSyncStageInput | undefined;
    result: LocalFileEventsSyncStageResult;
  };
  store_active_project_room: {
    args: ActiveProjectRoomStoreInput;
    result: ActiveProjectRoomReadResult;
  };
  store_tauri_auth_session: {
    args: TauriAuthSessionStoreInput;
    result: TauriAuthSessionReadResult;
  };
  store_widget_summary_cache: {
    args: WidgetSummaryCacheStoreInput;
    result: WidgetSummaryCacheReadResult;
  };
  sync_room_messages: {
    args: LocalRoomMessageSyncInput;
    result: LocalRoomMessageSyncResult;
  };
  sync_widget_usage_summary: {
    args: WidgetUsageSummarySyncInput | undefined;
    result: WidgetUsageSummarySyncResult;
  };
  toggle_widget_dock_orb: {
    args: WidgetBooleanInput | undefined;
    result: WidgetWindowState;
  };
  toggle_widget_window: {
    args: WidgetWindowTargetInput | undefined;
    result: WidgetWindowState;
  };
  unwatch_all_managed_folders: {
    args: undefined;
    result: ManagedFolderUnwatchAllResult;
  };
  update_widget_tray_state: {
    args: WidgetBooleanInput;
    result: WidgetWindowState;
  };
  watch_all_managed_folders: {
    args: undefined;
    result: ManagedFolderWatchAllResult;
  };
  watch_managed_folder: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderWatchResult;
  };
};

export type PlannedTauriCommandContract = Record<never, never>;

export type TauriCommandArgs<TCommand extends TauriCommandName> = TauriCommandContract[TCommand]["args"];
export type TauriCommandResult<TCommand extends TauriCommandName> = TauriCommandContract[TCommand]["result"];
export type PlannedTauriCommandArgs<TCommand extends PlannedTauriCommandName> = never;
export type PlannedTauriCommandResult<TCommand extends PlannedTauriCommandName> = never;

export const tauriCommands = {
  appReady(input?: AppReadyInput) {
    return invokeTauri<string>(TAURI_COMMANDS.appReady, input ? { input } : undefined);
  },
  backupLocalSqlite() {
    return invokeTauri<LocalBackupResult>(TAURI_COMMANDS.backupLocalSqlite);
  },
  checkLocalSqliteIntegrity() {
    return invokeTauri<SqliteIntegrityResult>(TAURI_COMMANDS.checkLocalSqliteIntegrity);
  },
  clearActiveProjectRoom() {
    return invokeTauri<null>(TAURI_COMMANDS.clearActiveProjectRoom);
  },
  clearTauriAuthSession() {
    return invokeTauri<null>(TAURI_COMMANDS.clearTauriAuthSession);
  },
  closeAllWidgetWindows() {
    return invokeTauri<number>(TAURI_COMMANDS.closeAllWidgetWindows);
  },
  closeWidgetWindow(input?: WidgetWindowTargetInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.closeWidgetWindow, input ? { input } : undefined);
  },
  flushSyncOutbox() {
    return invokeTauri<SyncOutboxFlushResult>(TAURI_COMMANDS.flushSyncOutbox);
  },
  getIndexProgress(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderIndexProgressResult>(TAURI_COMMANDS.getIndexProgress, { input });
  },
  getPreferredAppMonitor() {
    return invokeTauri<AppMonitorPreference>(TAURI_COMMANDS.getPreferredAppMonitor);
  },
  getWidgetWindowState(input?: WidgetWindowTargetInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.getWidgetWindowState, input ? { input } : undefined);
  },
  getWidgetBarItems() {
    return invokeTauri<WidgetWindowState[]>(TAURI_COMMANDS.getWidgetBarItems);
  },
  listAppMonitors() {
    return invokeTauri<AppMonitorPreference>(TAURI_COMMANDS.listAppMonitors);
  },
  listLocalSqliteBackups() {
    return invokeTauri<LocalBackupManifestResult>(TAURI_COMMANDS.listLocalSqliteBackups);
  },
  markActivityContextSynced(input: ActivityContextSyncInput) {
    return invokeTauri<ActivityContextSyncResult>(TAURI_COMMANDS.markActivityContextSynced, { input });
  },
  listManagedFolders() {
    return invokeTauri<ManagedFolderListResult>(TAURI_COMMANDS.listManagedFolders);
  },
  openWidgetWindow(input?: WidgetWindowOpenInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.openWidgetWindow, input ? { input } : undefined);
  },
  readActiveProjectRoom() {
    return invokeTauri<ActiveProjectRoomReadResult | null>(TAURI_COMMANDS.readActiveProjectRoom);
  },
  readTauriAuthSession() {
    return invokeTauri<TauriAuthSessionReadResult | null>(TAURI_COMMANDS.readTauriAuthSession);
  },
  readActivityContext() {
    return invokeTauri<ActivityContextResult>(TAURI_COMMANDS.readActivityContext);
  },
  readLocalFilePreview(input: LocalFilePreviewInput) {
    return invokeTauri<LocalFilePreviewResult>(TAURI_COMMANDS.readLocalFilePreview, { input });
  },
  readRoomMessages(input: LocalRoomMessageReadInput) {
    return invokeTauri<LocalRoomMessageReadResult>(TAURI_COMMANDS.readRoomMessages, { input });
  },
  readWidgetSummaryCache() {
    return invokeTauri<WidgetSummaryCacheReadResult | null>(TAURI_COMMANDS.readWidgetSummaryCache);
  },
  reindexFile(input: LocalFileReindexInput) {
    return invokeTauri<LocalFileReindexResult>(TAURI_COMMANDS.reindexFile, { input });
  },
  recoverTimerState() {
    return invokeTauri<TimerRecoveryState>(TAURI_COMMANDS.recoverTimerState);
  },
  recordActivityContext(input: ActivityContextRecordInput) {
    return invokeTauri<ActivityContextRecordResult>(TAURI_COMMANDS.recordActivityContext, { input });
  },
  recordTimerState(input: TimerStateRecordInput) {
    return invokeTauri<TimerStateRecordResult>(TAURI_COMMANDS.recordTimerState, { input });
  },
  recordWidgetUsageEvent(input: WidgetUsageEventInput) {
    return invokeTauri<WidgetUsageEventRecordResult>(TAURI_COMMANDS.recordWidgetUsageEvent, { input });
  },
  removeManagedFolder(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderRemoveResult>(TAURI_COMMANDS.removeManagedFolder, { input });
  },
  markLocalFileEventsSynced(input: LocalFileEventsMarkSyncedInput) {
    return invokeTauri<LocalFileEventsMarkSyncedResult>(TAURI_COMMANDS.markLocalFileEventsSynced, { input });
  },
  markWidgetUsageSummarySynced(input: WidgetUsageSummaryMarkSyncedInput) {
    return invokeTauri<WidgetUsageSummaryMarkSyncedResult>(TAURI_COMMANDS.markWidgetUsageSummarySynced, { input });
  },
  openLocalFile(input: LocalFileOpenInput) {
    return invokeTauri<LocalFileOpenResult>(TAURI_COMMANDS.openLocalFile, { input });
  },
  registerWidgetShortcut(input: WidgetShortcutInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.registerWidgetShortcut, { input });
  },
  restoreLocalSqliteBackup(input: LocalBackupRestoreInput) {
    return invokeTauri<LocalBackupRestoreResult>(TAURI_COMMANDS.restoreLocalSqliteBackup, { input });
  },
  rollupWidgetUsage(input?: WidgetUsageRollupInput) {
    return invokeTauri<WidgetUsageRollupResult[]>(
      TAURI_COMMANDS.rollupWidgetUsage,
      input ? { input } : undefined,
    );
  },
  scanManagedFolder(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderScanResult>(TAURI_COMMANDS.scanManagedFolder, { input });
  },
  searchLocalFiles(input: LocalFileSearchInput) {
    return invokeTauri<LocalFileSearchResult>(TAURI_COMMANDS.searchLocalFiles, { input });
  },
  selectManagedFolder(input?: SelectManagedFolderInput) {
    return invokeTauri<ManagedFolderSelection>(
      TAURI_COMMANDS.selectManagedFolder,
      input ? { input } : undefined,
    );
  },
  setPreferredAppMonitor(input: AppMonitorPreferenceInput) {
    return invokeTauri<AppMonitorPreference>(TAURI_COMMANDS.setPreferredAppMonitor, { input });
  },
  setFolderSync(input: ManagedFolderSyncInput) {
    return invokeTauri<ManagedFolderSyncResult>(TAURI_COMMANDS.setFolderSync, { input });
  },
  setWidgetAlwaysOnTop(input: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.setWidgetAlwaysOnTop, { input });
  },
  setWidgetClickThrough(input: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.setWidgetClickThrough, { input });
  },
  setWidgetRoomContext(input: WidgetRoomContextInput) {
    return invokeTauri<WidgetWindowState[]>(TAURI_COMMANDS.setWidgetRoomContext, { input });
  },
  setWidgetWindowMode(input: WidgetWindowModeInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.setWidgetWindowMode, { input });
  },
  setWidgetWindowPosition(input: WidgetWindowPositionInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.setWidgetWindowPosition, { input });
  },
  stageActivityContextsForSync(input?: ActivityContextSyncStageInput) {
    return invokeTauri<ActivityContextSyncStageResult>(
      TAURI_COMMANDS.stageActivityContextsForSync,
      input ? { input } : undefined,
    );
  },
  stageLocalFileEventsForSync(input?: LocalFileEventsSyncStageInput) {
    return invokeTauri<LocalFileEventsSyncStageResult>(
      TAURI_COMMANDS.stageLocalFileEventsForSync,
      input ? { input } : undefined,
    );
  },
  storeActiveProjectRoom(input: ActiveProjectRoomStoreInput) {
    return invokeTauri<ActiveProjectRoomReadResult>(TAURI_COMMANDS.storeActiveProjectRoom, { input });
  },
  storeTauriAuthSession(input: TauriAuthSessionStoreInput) {
    return invokeTauri<TauriAuthSessionReadResult>(TAURI_COMMANDS.storeTauriAuthSession, { input });
  },
  storeWidgetSummaryCache(input: WidgetSummaryCacheStoreInput) {
    return invokeTauri<WidgetSummaryCacheReadResult>(TAURI_COMMANDS.storeWidgetSummaryCache, { input });
  },
  syncRoomMessages(input: LocalRoomMessageSyncInput) {
    return invokeTauri<LocalRoomMessageSyncResult>(TAURI_COMMANDS.syncRoomMessages, { input });
  },
  syncWidgetUsageSummary(input?: WidgetUsageSummarySyncInput) {
    return invokeTauri<WidgetUsageSummarySyncResult>(
      TAURI_COMMANDS.syncWidgetUsageSummary,
      input ? { input } : undefined,
    );
  },
  toggleWidgetDockOrb(input?: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.toggleWidgetDockOrb, input ? { input } : undefined);
  },
  toggleWidgetWindow(input?: WidgetWindowTargetInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.toggleWidgetWindow, input ? { input } : undefined);
  },
  unwatchAllManagedFolders() {
    return invokeTauri<ManagedFolderUnwatchAllResult>(TAURI_COMMANDS.unwatchAllManagedFolders);
  },
  updateWidgetTrayState(input: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.updateWidgetTrayState, { input });
  },
  watchAllManagedFolders() {
    return invokeTauri<ManagedFolderWatchAllResult>(TAURI_COMMANDS.watchAllManagedFolders);
  },
  watchManagedFolder(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderWatchResult>(TAURI_COMMANDS.watchManagedFolder, { input });
  },
} as const;

export const plannedTauriCommands = {} as const;
