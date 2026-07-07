import { invokeTauri } from "@/lib/tauri/ipc";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { AuthTokenResponse } from "@/types/api/auth";

function localDateFromIso(isoValue: string) {
  const date = new Date(isoValue);
  if (!Number.isFinite(date.getTime())) {
    return isoValue.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const TAURI_COMMANDS = {
  appReady: "app_ready",
  arrangeWidgetWindows: "arrange_widget_windows",
  backupLocalSqlite: "backup_local_sqlite",
  checkLocalSqliteIntegrity: "check_local_sqlite_integrity",
  clearActiveProjectRoom: "clear_active_project_room",
  clearTauriAuthSession: "clear_tauri_auth_session",
  closeAllWidgetWindows: "close_all_widget_windows",
  closeWidgetWindow: "close_widget_window",
  callbackTauriGoogleOauth: "callback_tauri_google_oauth",
  completeTauriGoogleOauth: "complete_tauri_google_oauth",
  dragWidgetBarWindow: "drag_widget_bar_window",
  setWidgetBarPreviewPlacement: "set_widget_bar_preview_placement",
  extractLocalFileKeySentences: "extract_local_file_key_sentences",
  findLocalFileByResourceId: "find_local_file_by_resource_id",
  flushSyncOutbox: "flush_sync_outbox",
  getAuthenticatedSurfacesEnabled: "get_authenticated_surfaces_enabled",
  getIndexProgress: "get_index_progress",
  getLocalFileAnalysisStatus: "get_local_file_analysis_status",
  getOrCreateWidgetUsageDeviceId: "get_or_create_widget_usage_device_id",
  getPreferredAppMonitor: "get_preferred_app_monitor",
  getTauriGoogleAuthorizationUrl: "get_tauri_google_authorization_url",
  getWidgetBarItems: "get_widget_bar_items",
  getWidgetWindowState: "get_widget_window_state",
  listAppMonitors: "list_app_monitors",
  listLocalSqliteBackups: "list_local_sqlite_backups",
  closeOnboardingOverlay: "close_onboarding_overlay",
  setAppBadgeCount: "set_app_badge_count",
  openOnboardingOverlay: "open_onboarding_overlay",
  markActivityContextSynced: "mark_activity_context_synced",
  listManagedFolders: "list_managed_folders",
  moveWidgetWindowsToMonitor: "move_widget_windows_to_monitor",
  notifyWidgetDragStarted: "notify_widget_drag_started",
  notifyWidgetPointerSeen: "notify_widget_pointer_seen",
  openExternalUrl: "open_external_url",
  openMainWindowRoute: "open_main_window_route",
  openWidgetWindow: "open_widget_window",
  openWidgetWindows: "open_widget_windows",
  quitApp: "quit_app",
  readActiveProjectRoom: "read_active_project_room",
  readTauriAuthSession: "read_tauri_auth_session",
  readActivityContext: "read_activity_context",
  readLocalFilePreview: "read_local_file_preview",
  readRoomMessages: "read_room_messages",
  readWidgetPref: "read_widget_pref",
  readWidgetSummaryCache: "read_widget_summary_cache",
  reindexFile: "reindex_file",
  recoverTimerState: "recover_timer_state",
  recordActivityContext: "record_activity_context",
  recordTimerState: "record_timer_state",
  recordWidgetUsageEvent: "record_widget_usage_event",
  removeManagedFolder: "remove_managed_folder",
  resizeWidgetWindow: "resize_widget_window",
  markLocalFileAnalysesSent: "mark_local_file_analyses_sent",
  markLocalFileEventsSynced: "mark_local_file_events_synced",
  markWidgetUsageSummaryFailed: "mark_widget_usage_summary_failed",
  markWidgetUsageSummarySynced: "mark_widget_usage_summary_synced",
  openLocalFile: "open_local_file",
  registerWidgetShortcut: "register_widget_shortcut",
  restoreLocalSqliteBackup: "restore_local_sqlite_backup",
  rollupWidgetUsage: "rollup_widget_usage",
  scanManagedFolder: "scan_managed_folder",
  searchLocalFiles: "search_local_files",
  selectManagedFolder: "select_managed_folder",
  seedWidgetBarItems: "seed_widget_bar_items",
  setPreferredAppMonitor: "set_preferred_app_monitor",
  setAuthenticatedSurfacesEnabled: "set_authenticated_surfaces_enabled",
  setActivityContextConsent: "set_activity_context_consent",
  setFolderSync: "set_folder_sync",
  setWidgetAlwaysOnTop: "set_widget_always_on_top",
  setWidgetClickThrough: "set_widget_click_through",
  setWidgetInteractiveRects: "set_widget_interactive_rects",
  setWidgetRoomContext: "set_widget_room_context",
  setWidgetWindowMode: "set_widget_window_mode",
  setWidgetWindowPosition: "set_widget_window_position",
  showMainWindow: "show_main_window",
  startTauriGoogleOauthLoopback: "start_tauri_google_oauth_loopback",
  stageActivityContextsForSync: "stage_activity_contexts_for_sync",
  stageLocalFileAnalysisBackfill: "stage_local_file_analysis_backfill",
  stageLocalFileEventsForSync: "stage_local_file_events_for_sync",
  storeActiveProjectRoom: "store_active_project_room",
  storeTauriAuthSession: "store_tauri_auth_session",
  storeWidgetPref: "store_widget_pref",
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

export type AuthenticatedSurfacesInput = {
  enabled: boolean;
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

export type ActivityContextConsentInput = {
  enabled: boolean;
};

export type ActivityContextConsentResult = {
  enabled: boolean;
  updatedAt: string;
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

export type LocalFileByResourceIdInput = {
  resourceId: string;
};

export type LocalFileByResourceIdResult = {
  checksum?: string | null;
  latestEventAt?: string | null;
  latestEventType?: "CREATED" | "UPDATED" | string | null;
  localFileId: string;
  name: string;
  path: string;
  resourceId: string;
  revisionNo: number;
  sizeBytes?: number | null;
  syncStatus: string;
  updatedAt: string;
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
  status: "READY" | "UNSUPPORTED" | "MISSING" | "TOO_LARGE" | "EMPTY";
  truncated: boolean;
};

export type LocalFileKeySentenceInput = {
  localFileId: string;
  maxChars?: number;
  maxSentenceChars?: number;
  maxSentences?: number;
};

export type LocalFileKeySentenceItem = {
  endOffset: number;
  index: number;
  score: number;
  startOffset: number;
  text: string;
};

export type LocalFileKeySentenceResult = {
  analyzedCharCount: number;
  checksum?: string | null;
  combinedText: string;
  extractedAt: string;
  extractionMethod: "BM25_MMR_KEY_SENTENCE_V1" | string;
  fileName: string;
  keySentences: LocalFileKeySentenceItem[];
  localFileId: string;
  mimeType?: string | null;
  path: string;
  sourceCharCount: number;
  status: "READY" | "UNSUPPORTED" | "MISSING" | "TOO_LARGE" | "EMPTY";
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

export type LocalFileAnalysisBackfillStageInput = {
  limit?: number;
  maxAttempts?: number;
};

export type LocalFileAnalysisStatusInput = {
  maxAttempts?: number;
};

export type LocalFileAnalysisStatusResult = {
  failedCount: number;
  latestErrorMessage?: string | null;
  pendingCount: number;
  readAt: string;
  retryableFailedCount: number;
  syncedCount: number;
};

export type LocalFileAnalysisBackfillCandidate = {
  attemptCount: number;
  checksum?: string | null;
  fileName: string;
  localFileId: string;
  mimeType?: string | null;
  resourceId: string;
};

export type LocalFileAnalysisBackfillStageResult = {
  candidates: LocalFileAnalysisBackfillCandidate[];
  stagedAt: string;
};

export type LocalFileAnalysisMarkInput = {
  checksum?: string | null;
  errorMessage?: string | null;
  localFileId: string;
  resourceId: string;
  status: string;
};

export type LocalFileAnalysesMarkInput = {
  results: LocalFileAnalysisMarkInput[];
};

export type LocalFileAnalysesMarkResult = {
  completedAt: string;
  failedCount: number;
  syncedCount: number;
};

export type SqliteIntegrityResult = {
  checkedAt: string;
  databaseSizeBytes: number;
  freelistCount: number;
  journalMode: string;
  ok: boolean;
  pageCount: number;
  pageSize: number;
  quickCheck: string;
  recoveryRequired: boolean;
  walSizeBytes: number;
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
  cacheKey?: string | null;
  summaryJson: string;
};

export type WidgetSummaryCacheReadInput = {
  cacheKey?: string | null;
};

export type WidgetSummaryCacheReadResult = {
  cachedAt: string;
  summaryJson: string;
};

export type WidgetPrefStoreInput = {
  cacheKey: string;
  kind: string;
  valueJson: string;
};

export type WidgetPrefReadInput = {
  cacheKey: string;
  kind: string;
};

export type WidgetPrefValue = {
  valueJson: string;
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
  requiresRestart: boolean;
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

export type AppMonitorWorkArea = {
  position: AppMonitorPosition;
  size: AppMonitorSize;
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

export type CurrentTauriWindowMonitorState = {
  monitor: {
    position: AppMonitorPosition;
    scaleFactor: number;
    workArea: AppMonitorWorkArea;
  } | null;
  outerPosition: AppMonitorPosition;
};

export type AppMonitorPreferenceInput = {
  monitorId: string;
};

// Bubli 메뉴 "모니터로 이동" 입력 — 바 + 열린 버블 창을 이 모니터로 옮긴다.
export type MoveWidgetWindowsToMonitorInput = {
  monitorId: string;
};

export type WidgetUsageEventInput = {
  bubbleType: string;
  eventType: string;
  itemId?: string;
  itemType?: string;
  occurredAt: string;
  summaryDate?: string;
};

export type WidgetUsageEventRecordResult = {
  recordedAt: string;
};

export type WidgetUsageDeviceIdentityResult = {
  deviceId: string;
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

export type WidgetUsageSummaryMarkFailedInput = {
  errorMessage?: string | null;
  rollupKeys: string[];
};

export type WidgetUsageSummaryMarkFailedResult = {
  completedAt: string;
  failedCount: number;
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
  monitorId?: string | null;
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
  qaAllWidgets?: boolean;
  selectedRoomId?: string | null;
  surfaceReadyOnly?: boolean;
};

export type MainWindowRouteInput = {
  route: string;
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

export type WidgetBarDragInput = {
  grabX: number;
  grabY: number;
  navHeight: number;
  navWidth: number;
  rootHeight: number;
  rootWidth: number;
};

export type WidgetBarDragResult = {
  placement: "above" | "below";
  state: WidgetWindowState;
};

export type WidgetBarPreviewPlacementInput = {
  currentOffsetTop: number;
  navHeight: number;
  nextOffsetTop: number;
  placement: "above" | "below";
};

// 사용자 코너 드래그 리사이즈 입력(논리 px). Rust가 버블별 [기본, 기본×1.6]으로 클램프하고,
// commit=true(드래그 종료)일 때만 SQLite local_widget_bubble_sizes에 저장한다.
export type WidgetWindowResizeInput = {
  bubbleType?: WidgetWindowBubbleType;
  commit?: boolean;
  height: number;
  width: number;
  windowId?: string;
};

// 자동 정렬 프리셋: 격자(기본)/세로 한 열/가로 한 줄/계단식.
export type WidgetArrangeLayout = "board" | "grid" | "column" | "row" | "cascade";

export type WidgetArrangeInput = {
  layout?: WidgetArrangeLayout;
};

export type WidgetWindowOpenInput = {
  bubbleType?: WidgetWindowBubbleType;
  mode?: WidgetWindowMode;
  selectedRoomId?: string | null;
  windowId?: string;
};

export type WidgetWindowsOpenInput = {
  windows: WidgetWindowOpenInput[];
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

// 위젯 창(투명 사각형)에서 실제 마우스를 받아야 하는 콘텐츠 rect(논리 px, 창-로컬 좌표).
// Rust 커서 폴러가 이 rect 밖에서만 set_ignore_cursor_events(true)로 클릭을 통과시킨다.
export type WidgetInteractiveRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type WidgetInteractiveRectsInput = {
  rects: WidgetInteractiveRect[];
};

// 위젯 메뉴 버블리에서 메인 앱을 열 때 쓰는 입력. route는 Rust 쪽 화이트리스트로 검증된다.
export type MainWindowShowInput = {
  route?: "settings";
};

export type TauriGoogleOauthLoopbackInput = {
  authorizeUrl: string;
  expectedState?: string | null;
  redirectUri: string;
};

export type TauriGoogleCompleteOauthInput = TauriGoogleOauthLoopbackInput & {
  apiBaseUrl: string;
};

export type TauriGoogleOauthLoopbackResult = {
  code: string;
  state?: string | null;
};

export type TauriGoogleApiInput = {
  apiBaseUrl: string;
  redirectUri: string;
  state?: string | null;
};

export type TauriGoogleCallbackInput = {
  apiBaseUrl: string;
  code: string;
  redirectUri: string;
};

export type TauriGoogleAuthorizeResponse = {
  authorizeUrl: string;
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
  arrange_widget_windows: {
    args: WidgetArrangeInput;
    result: WidgetWindowState[];
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
  close_onboarding_overlay: {
    args: undefined;
    result: null;
  };
  set_app_badge_count: {
    args: { count: number };
    result: null;
  };
  close_widget_window: {
    args: WidgetWindowTargetInput | undefined;
    result: WidgetWindowState;
  };
  callback_tauri_google_oauth: {
    args: TauriGoogleCallbackInput;
    result: AuthTokenResponse;
  };
  complete_tauri_google_oauth: {
    args: TauriGoogleCompleteOauthInput;
    result: AuthTokenResponse;
  };
  drag_widget_bar_window: {
    args: WidgetBarDragInput;
    result: WidgetBarDragResult;
  };
  set_widget_bar_preview_placement: {
    args: WidgetBarPreviewPlacementInput;
    result: WidgetBarDragResult;
  };
  extract_local_file_key_sentences: {
    args: LocalFileKeySentenceInput;
    result: LocalFileKeySentenceResult;
  };
  find_local_file_by_resource_id: {
    args: LocalFileByResourceIdInput;
    result: LocalFileByResourceIdResult | null;
  };
  flush_sync_outbox: {
    args: undefined;
    result: SyncOutboxFlushResult;
  };
  get_index_progress: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderIndexProgressResult;
  };
  get_local_file_analysis_status: {
    args: LocalFileAnalysisStatusInput | undefined;
    result: LocalFileAnalysisStatusResult;
  };
  get_preferred_app_monitor: {
    args: undefined;
    result: AppMonitorPreference;
  };
  get_tauri_google_authorization_url: {
    args: TauriGoogleApiInput;
    result: TauriGoogleAuthorizeResponse;
  };
  get_authenticated_surfaces_enabled: {
    args: undefined;
    result: boolean;
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
  move_widget_windows_to_monitor: {
    args: MoveWidgetWindowsToMonitorInput;
    result: WidgetWindowState[];
  };
  notify_widget_drag_started: {
    args: undefined;
    result: null;
  };
  notify_widget_pointer_seen: {
    args: undefined;
    result: null;
  };
  open_widget_window: {
    args: WidgetWindowOpenInput | undefined;
    result: WidgetWindowState;
  };
  open_widget_windows: {
    args: WidgetWindowsOpenInput;
    result: WidgetWindowState[];
  };
  quit_app: {
    args: undefined;
    result: null;
  };
  show_main_window: {
    args: MainWindowShowInput | undefined;
    result: null;
  };
  start_tauri_google_oauth_loopback: {
    args: TauriGoogleOauthLoopbackInput;
    result: TauriGoogleOauthLoopbackResult;
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
  read_widget_pref: {
    args: WidgetPrefReadInput;
    result: WidgetPrefValue | null;
  };
  read_widget_summary_cache: {
    args: WidgetSummaryCacheReadInput | undefined;
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
  get_or_create_widget_usage_device_id: {
    args: undefined;
    result: WidgetUsageDeviceIdentityResult;
  };
  remove_managed_folder: {
    args: ManagedFolderCommandInput;
    result: ManagedFolderRemoveResult;
  };
  resize_widget_window: {
    args: WidgetWindowResizeInput;
    result: WidgetWindowState;
  };
  mark_local_file_analyses_sent: {
    args: LocalFileAnalysesMarkInput;
    result: LocalFileAnalysesMarkResult;
  };
  mark_local_file_events_synced: {
    args: LocalFileEventsMarkSyncedInput;
    result: LocalFileEventsMarkSyncedResult;
  };
  mark_widget_usage_summary_synced: {
    args: WidgetUsageSummaryMarkSyncedInput;
    result: WidgetUsageSummaryMarkSyncedResult;
  };
  mark_widget_usage_summary_failed: {
    args: WidgetUsageSummaryMarkFailedInput;
    result: WidgetUsageSummaryMarkFailedResult;
  };
  open_local_file: {
    args: LocalFileOpenInput;
    result: LocalFileOpenResult;
  };
  open_external_url: {
    args: { url: string };
    result: null;
  };
  open_main_window_route: {
    args: MainWindowRouteInput;
    result: string;
  };
  open_onboarding_overlay: {
    args: undefined;
    result: null;
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
  seed_widget_bar_items: {
    args: WidgetRoomContextInput | undefined;
    result: WidgetWindowState[];
  };
  set_preferred_app_monitor: {
    args: AppMonitorPreferenceInput;
    result: AppMonitorPreference;
  };
  set_authenticated_surfaces_enabled: {
    args: AuthenticatedSurfacesInput;
    result: boolean;
  };
  set_activity_context_consent: {
    args: ActivityContextConsentInput;
    result: ActivityContextConsentResult;
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
  set_widget_interactive_rects: {
    args: WidgetInteractiveRectsInput;
    result: null;
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
  stage_local_file_analysis_backfill: {
    args: LocalFileAnalysisBackfillStageInput | undefined;
    result: LocalFileAnalysisBackfillStageResult;
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
  store_widget_pref: {
    args: WidgetPrefStoreInput;
    result: null;
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

const pendingWidgetUsageEventRecords = new Set<Promise<WidgetUsageEventRecordResult>>();

export async function waitForPendingWidgetUsageEventRecords() {
  while (pendingWidgetUsageEventRecords.size > 0) {
    await Promise.allSettled([...pendingWidgetUsageEventRecords]);
  }
}

export const tauriCommands = {
  appReady(input?: AppReadyInput) {
    return invokeTauri<string>(TAURI_COMMANDS.appReady, input ? { input } : undefined);
  },
  arrangeWidgetWindows(input?: WidgetArrangeInput) {
    return invokeTauri<WidgetWindowState[]>(TAURI_COMMANDS.arrangeWidgetWindows, input ? { input } : undefined);
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
  callbackTauriGoogleOauth(input: TauriGoogleCallbackInput) {
    return invokeTauri<AuthTokenResponse>(TAURI_COMMANDS.callbackTauriGoogleOauth, { input });
  },
  completeTauriGoogleOauth(input: TauriGoogleCompleteOauthInput) {
    return invokeTauri<AuthTokenResponse>(TAURI_COMMANDS.completeTauriGoogleOauth, { input });
  },
  closeOnboardingOverlay() {
    return invokeTauri<null>(TAURI_COMMANDS.closeOnboardingOverlay);
  },
  // 앱 아이콘의 읽지 않은 알림 배지(맥 독 숫자 / 윈도우 작업표시줄 점)를 갱신한다.
  setAppBadgeCount(count: number) {
    return invokeTauri<null>(TAURI_COMMANDS.setAppBadgeCount, { count });
  },
  dragWidgetBarWindow(input: WidgetBarDragInput) {
    return invokeTauri<WidgetBarDragResult>(TAURI_COMMANDS.dragWidgetBarWindow, { input });
  },
  setWidgetBarPreviewPlacement(input: WidgetBarPreviewPlacementInput) {
    return invokeTauri<WidgetBarDragResult>(TAURI_COMMANDS.setWidgetBarPreviewPlacement, { input });
  },
  extractLocalFileKeySentences(input: LocalFileKeySentenceInput) {
    return invokeTauri<LocalFileKeySentenceResult>(TAURI_COMMANDS.extractLocalFileKeySentences, { input });
  },
  findLocalFileByResourceId(input: LocalFileByResourceIdInput) {
    return invokeTauri<LocalFileByResourceIdResult | null>(TAURI_COMMANDS.findLocalFileByResourceId, { input });
  },
  flushSyncOutbox() {
    return invokeTauri<SyncOutboxFlushResult>(TAURI_COMMANDS.flushSyncOutbox);
  },
  getIndexProgress(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderIndexProgressResult>(TAURI_COMMANDS.getIndexProgress, { input });
  },
  getLocalFileAnalysisStatus(input?: LocalFileAnalysisStatusInput) {
    return invokeTauri<LocalFileAnalysisStatusResult>(
      TAURI_COMMANDS.getLocalFileAnalysisStatus,
      input ? { input } : undefined,
    );
  },
  getPreferredAppMonitor() {
    return invokeTauri<AppMonitorPreference>(TAURI_COMMANDS.getPreferredAppMonitor);
  },
  getTauriGoogleAuthorizationUrl(input: TauriGoogleApiInput) {
    return invokeTauri<TauriGoogleAuthorizeResponse>(TAURI_COMMANDS.getTauriGoogleAuthorizationUrl, { input });
  },
  getAuthenticatedSurfacesEnabled() {
    return invokeTauri<boolean>(TAURI_COMMANDS.getAuthenticatedSurfacesEnabled);
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
  // Bubli 메뉴 "모니터로 이동": 바 + 열린 버블 창을 지정 모니터로 옮기고 선호 모니터도 같이 갱신한다.
  moveWidgetWindowsToMonitor(input: MoveWidgetWindowsToMonitorInput) {
    return invokeTauri<WidgetWindowState[]>(TAURI_COMMANDS.moveWidgetWindowsToMonitor, { input });
  },
  notifyWidgetDragStarted() {
    return invokeTauri<null>(TAURI_COMMANDS.notifyWidgetDragStarted);
  },
  notifyWidgetPointerSeen() {
    return invokeTauri<null>(TAURI_COMMANDS.notifyWidgetPointerSeen);
  },
  openWidgetWindow(input?: WidgetWindowOpenInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.openWidgetWindow, input ? { input } : undefined);
  },
  openWidgetWindows(input: WidgetWindowsOpenInput) {
    return invokeTauri<WidgetWindowState[]>(TAURI_COMMANDS.openWidgetWindows, { input });
  },
  openMainWindowRoute(input: MainWindowRouteInput) {
    return invokeTauri<string>(TAURI_COMMANDS.openMainWindowRoute, { input });
  },
  openExternalUrl(url: string) {
    return invokeTauri<null>(TAURI_COMMANDS.openExternalUrl, { url });
  },
  openOnboardingOverlay() {
    return invokeTauri<null>(TAURI_COMMANDS.openOnboardingOverlay);
  },
  quitApp() {
    return invokeTauri<null>(TAURI_COMMANDS.quitApp);
  },
  showMainWindow(input?: MainWindowShowInput) {
    return invokeTauri<null>(TAURI_COMMANDS.showMainWindow, input ? { input } : undefined);
  },
  startTauriGoogleOauthLoopback(input: TauriGoogleOauthLoopbackInput) {
    return invokeTauri<TauriGoogleOauthLoopbackResult>(TAURI_COMMANDS.startTauriGoogleOauthLoopback, { input });
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
  setActivityContextConsent(input: ActivityContextConsentInput) {
    return invokeTauri<ActivityContextConsentResult>(TAURI_COMMANDS.setActivityContextConsent, { input });
  },
  readLocalFilePreview(input: LocalFilePreviewInput) {
    return invokeTauri<LocalFilePreviewResult>(TAURI_COMMANDS.readLocalFilePreview, { input });
  },
  readRoomMessages(input: LocalRoomMessageReadInput) {
    return invokeTauri<LocalRoomMessageReadResult>(TAURI_COMMANDS.readRoomMessages, { input });
  },
  readWidgetPref(input: WidgetPrefReadInput) {
    return invokeTauri<WidgetPrefValue | null>(TAURI_COMMANDS.readWidgetPref, { input });
  },
  readWidgetSummaryCache(input?: WidgetSummaryCacheReadInput) {
    return invokeTauri<WidgetSummaryCacheReadResult | null>(
      TAURI_COMMANDS.readWidgetSummaryCache,
      input ? { input } : undefined,
    );
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
    const promise = invokeTauri<WidgetUsageEventRecordResult>(TAURI_COMMANDS.recordWidgetUsageEvent, {
      input: {
        ...input,
        summaryDate: input.summaryDate ?? localDateFromIso(input.occurredAt),
      },
    });
    pendingWidgetUsageEventRecords.add(promise);
    promise.then(
      () => pendingWidgetUsageEventRecords.delete(promise),
      () => pendingWidgetUsageEventRecords.delete(promise),
    );
    return promise;
  },
  getOrCreateWidgetUsageDeviceId() {
    return invokeTauri<WidgetUsageDeviceIdentityResult>(TAURI_COMMANDS.getOrCreateWidgetUsageDeviceId);
  },
  removeManagedFolder(input: ManagedFolderCommandInput) {
    return invokeTauri<ManagedFolderRemoveResult>(TAURI_COMMANDS.removeManagedFolder, { input });
  },
  resizeWidgetWindow(input: WidgetWindowResizeInput) {
    return invokeTauri<WidgetWindowState>(TAURI_COMMANDS.resizeWidgetWindow, { input });
  },
  markLocalFileAnalysesSent(input: LocalFileAnalysesMarkInput) {
    return invokeTauri<LocalFileAnalysesMarkResult>(TAURI_COMMANDS.markLocalFileAnalysesSent, { input });
  },
  markLocalFileEventsSynced(input: LocalFileEventsMarkSyncedInput) {
    return invokeTauri<LocalFileEventsMarkSyncedResult>(TAURI_COMMANDS.markLocalFileEventsSynced, { input });
  },
  markWidgetUsageSummaryFailed(input: WidgetUsageSummaryMarkFailedInput) {
    return invokeTauri<WidgetUsageSummaryMarkFailedResult>(TAURI_COMMANDS.markWidgetUsageSummaryFailed, { input });
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
  seedWidgetBarItems(input?: WidgetRoomContextInput) {
    return invokeTauri<WidgetWindowState[]>(TAURI_COMMANDS.seedWidgetBarItems, input ? { input } : undefined);
  },
  setPreferredAppMonitor(input: AppMonitorPreferenceInput) {
    return invokeTauri<AppMonitorPreference>(TAURI_COMMANDS.setPreferredAppMonitor, { input });
  },
  setAuthenticatedSurfacesEnabled(input: AuthenticatedSurfacesInput) {
    return invokeTauri<boolean>(TAURI_COMMANDS.setAuthenticatedSurfacesEnabled, { input });
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
  setWidgetInteractiveRects(input: WidgetInteractiveRectsInput) {
    return invokeTauri<null>(TAURI_COMMANDS.setWidgetInteractiveRects, { input });
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
  stageLocalFileAnalysisBackfill(input?: LocalFileAnalysisBackfillStageInput) {
    return invokeTauri<LocalFileAnalysisBackfillStageResult>(
      TAURI_COMMANDS.stageLocalFileAnalysisBackfill,
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
  storeWidgetPref(input: WidgetPrefStoreInput) {
    return invokeTauri<null>(TAURI_COMMANDS.storeWidgetPref, { input });
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

// 위젯 창 위치 잠금(핀 고정) 상태. 핀을 켜면 이 창은 상단 고정에 더해 위치도 잠겨
// 드래그로 움직이지 않는다. 창(webview)마다 자기 인스턴스에서 이 값을 들고 있으므로
// 위젯별로 독립적으로 동작한다.
let widgetWindowDragLocked = false;

export function setWidgetWindowDragLocked(locked: boolean): void {
  widgetWindowDragLocked = locked;
}

export function isWidgetWindowDragLocked(): boolean {
  return widgetWindowDragLocked;
}

// 위젯 창 드래그 시작.
// data-tauri-drag-region은 mousedown "target 요소 자체"에 속성이 있어야만 동작해서
// 헤더 안 아이콘/텍스트(자식 요소)에서 누르면 드래그가 시작되지 않는다.
// 그래서 공식 Tauri v2 window API startDragging을 명시적으로 호출한다.
// 호출 전에 notify_widget_drag_started로 Rust 커서 폴러의 이동 grace를 미리 열어,
// 드래그 도중 클릭 통과(set_ignore_cursor_events)가 켜지는 일을 막는다.
export async function startWidgetWindowDragging(): Promise<void> {
  if (!isTauriRuntime()) return;
  // 핀 고정(위치 잠금) 상태면 드래그 자체를 시작하지 않는다.
  if (widgetWindowDragLocked) return;

  void tauriCommands.notifyWidgetDragStarted().catch(() => undefined);
  const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  await getCurrentWebviewWindow().startDragging();
}

// 고스트 창을 콘텐츠 크기에 맞춰 조절한다 — 타이머 이름/숫자가 줄바꿈으로 잘리지 않고
// 한 줄로 다 보이도록 창이 콘텐츠만큼 커진다. 고스트 창은 min==max로 잠겨 있으므로
// 잠깐 풀었다가 새 크기로 다시 잠근다(apply_widget_window_state와 같은 순서, macOS 조용한 실패 방지).
// 폭주 방지를 위해 [180,520]px로 클램프한다. 브라우저 미리보기에서는 no-op.
export async function autoSizeGhostWidgetWindow(width: number, height: number): Promise<void> {
  if (!isTauriRuntime()) return;
  const w = Math.min(Math.max(Math.round(width), 180), 520);
  const h = Math.min(Math.max(Math.round(height), 120), 520);
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const { LogicalSize } = await import("@tauri-apps/api/dpi");
    const win = getCurrentWebviewWindow();
    const size = new LogicalSize(w, h);
    await win.setMinSize(null);
    await win.setMaxSize(size);
    await win.setMinSize(size);
    await win.setSize(size);
  } catch {
    // 창 API 접근 실패는 무시한다(다음 렌더/리사이즈 관찰에서 다시 시도).
  }
}

export async function readCurrentTauriWindowMonitorState(): Promise<CurrentTauriWindowMonitorState | null> {
  if (!isTauriRuntime()) return null;

  const { currentMonitor, getCurrentWindow } = await import("@tauri-apps/api/window");
  const windowApi = getCurrentWindow();
  const [outerPosition, monitor] = await Promise.all([windowApi.outerPosition(), currentMonitor()]);

  return {
    monitor: monitor
      ? {
          position: monitor.position,
          scaleFactor: monitor.scaleFactor,
          workArea: monitor.workArea,
        }
      : null,
    outerPosition,
  };
}
