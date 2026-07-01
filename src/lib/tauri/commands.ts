import { invokeTauri } from "@/lib/tauri/ipc";

export const TAURI_COMMANDS = {
  appReady: "app_ready",
  backupLocalSqlite: "backup_local_sqlite",
  checkLocalSqliteIntegrity: "check_local_sqlite_integrity",
  clearTauriAuthSession: "clear_tauri_auth_session",
  closeWidgetWindow: "close_widget_window",
  flushSyncOutbox: "flush_sync_outbox",
  getPreferredAppMonitor: "get_preferred_app_monitor",
  getWidgetBarItems: "get_widget_bar_items",
  getWidgetWindowState: "get_widget_window_state",
  listAppMonitors: "list_app_monitors",
  markActivityContextSynced: "mark_activity_context_synced",
  openWidgetWindow: "open_widget_window",
  readTauriAuthSession: "read_tauri_auth_session",
  readActivityContext: "read_activity_context",
  readLocalFilePreview: "read_local_file_preview",
  recoverTimerState: "recover_timer_state",
  recordActivityContext: "record_activity_context",
  recordTimerState: "record_timer_state",
  recordWidgetUsageEvent: "record_widget_usage_event",
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
  setWidgetAlwaysOnTop: "set_widget_always_on_top",
  setWidgetClickThrough: "set_widget_click_through",
  setWidgetWindowMode: "set_widget_window_mode",
  setWidgetWindowPosition: "set_widget_window_position",
  stageActivityContextsForSync: "stage_activity_contexts_for_sync",
  stageLocalFileEventsForSync: "stage_local_file_events_for_sync",
  storeTauriAuthSession: "store_tauri_auth_session",
  syncRoomMessages: "sync_room_messages",
  syncWidgetUsageSummary: "sync_widget_usage_summary",
  toggleWidgetDockOrb: "toggle_widget_dock_orb",
  toggleWidgetWindow: "toggle_widget_window",
  updateWidgetTrayState: "update_widget_tray_state",
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
  clear_tauri_auth_session: {
    args: undefined;
    result: null;
  };
  close_widget_window: {
    args: WidgetWindowTargetInput | undefined;
    result: WidgetWindowState;
  };
  flush_sync_outbox: {
    args: undefined;
    result: SyncOutboxFlushResult;
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
  mark_activity_context_synced: {
    args: ActivityContextSyncInput;
    result: ActivityContextSyncResult;
  };
  open_widget_window: {
    args: WidgetWindowOpenInput | undefined;
    result: WidgetWindowState;
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
  set_widget_always_on_top: {
    args: WidgetBooleanInput;
    result: WidgetWindowState;
  };
  set_widget_click_through: {
    args: WidgetBooleanInput;
    result: WidgetWindowState;
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
  store_tauri_auth_session: {
    args: TauriAuthSessionStoreInput;
    result: TauriAuthSessionReadResult;
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
  update_widget_tray_state: {
    args: WidgetBooleanInput;
    result: WidgetWindowState;
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
  clearTauriAuthSession() {
    return invokeTauri<null>(TAURI_COMMANDS.clearTauriAuthSession);
  },
  closeWidgetWindow(input?: WidgetWindowTargetInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.closeWidgetWindow, input ? { input } : undefined);
  },
  flushSyncOutbox() {
    return invokeTauri<SyncOutboxFlushResult>(TAURI_COMMANDS.flushSyncOutbox);
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
  markActivityContextSynced(input: ActivityContextSyncInput) {
    return invokeTauri<ActivityContextSyncResult>(TAURI_COMMANDS.markActivityContextSynced, { input });
  },
  openWidgetWindow(input?: WidgetWindowOpenInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.openWidgetWindow, input ? { input } : undefined);
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
  setWidgetAlwaysOnTop(input: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.setWidgetAlwaysOnTop, { input });
  },
  setWidgetClickThrough(input: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.setWidgetClickThrough, { input });
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
  storeTauriAuthSession(input: TauriAuthSessionStoreInput) {
    return invokeTauri<TauriAuthSessionReadResult>(TAURI_COMMANDS.storeTauriAuthSession, { input });
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
  updateWidgetTrayState(input: WidgetBooleanInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.updateWidgetTrayState, { input });
  },
  watchManagedFolder(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderWatchResult>(TAURI_COMMANDS.watchManagedFolder, { input });
  },
} as const;

export const plannedTauriCommands = {} as const;
