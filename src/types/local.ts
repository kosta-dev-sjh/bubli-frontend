import type {
  ActivityLogResponse,
  ActivityLogsTodayResponse,
} from "@/types/api/activity";
import type {
  ActivityContextResult,
  LocalBackupRestoreInput,
  LocalFilePreviewInput,
  LocalFilePreviewResult,
  LocalFileSearchInput,
  LocalFileSearchResult,
  ManagedFolderCommandInput,
  ManagedFolderScanResult,
  ManagedFolderSelection,
  ManagedFolderWatchResult,
  SelectManagedFolderInput,
  SqliteIntegrityResult,
  SyncOutboxFlushResult,
  TauriCommandName,
  TimerRecoveryState,
  WidgetUsageEventInput,
  WidgetUsageEventRecordResult,
  WidgetUsageRollupInput,
  WidgetUsageRollupResult,
  WidgetUsageSummarySyncInput,
  WidgetUsageSummarySyncResult,
} from "@/lib/tauri/commands";

export type LocalAdapterEnvironment = "browser" | "server" | "tauri";

export type LocalAdapterUnavailableReason = "requires_tauri";

export type LocalAdapterBlockedReason =
  | "activity_consent_required"
  | "native_command_pending"
  | "personal_scope_only"
  | "server_transfer_not_allowed";

export type LocalAdapterFailedReason = "tauri_command_failed" | "invalid_input";

export type LocalAdapterReady<TData> = {
  commandName?: TauriCommandName;
  data: TData;
  environment: "tauri";
  message?: string;
  status: "ready";
};

export type LocalAdapterPending<TSummary> = {
  commandName?: TauriCommandName;
  environment: "tauri";
  message: string;
  status: "pending";
  summary: TSummary;
};

export type LocalAdapterUnavailable = {
  commandName?: TauriCommandName;
  environment: Exclude<LocalAdapterEnvironment, "tauri">;
  message: string;
  reason: LocalAdapterUnavailableReason;
  status: "unavailable";
};

export type LocalAdapterBlocked = {
  commandName?: TauriCommandName;
  environment: LocalAdapterEnvironment;
  message: string;
  reason: LocalAdapterBlockedReason;
  status: "blocked";
};

export type LocalAdapterFailed = {
  commandName?: TauriCommandName;
  environment: LocalAdapterEnvironment;
  message: string;
  reason: LocalAdapterFailedReason;
  status: "failed";
};

export type LocalAdapterResult<TData, TSummary = never> =
  | LocalAdapterReady<TData>
  | LocalAdapterPending<TSummary>
  | LocalAdapterUnavailable
  | LocalAdapterBlocked
  | LocalAdapterFailed;

export type LocalNativeCommandState = "implemented" | "planned";

export type LocalCacheReadinessSummary = {
  cacheStore: "sqlite";
  implementedCommands: TauriCommandName[];
  plannedCommands: string[];
  serverTransfer: "not_started";
};

export type LocalSyncSummary = {
  failedCount: number;
  pendingCount?: number;
  queuedCount?: number;
  sentCount?: number;
  serverTransfer: "queued_only" | "not_started" | "sent";
  summarizedAt: string;
};

export type ActivityContextReadInput = {
  consentGranted: boolean;
};

export type ActivityContextRecordInput = ActivityContextReadInput & {
  roomId?: string | null;
};

export type ActivityContextRecordResult = {
  appName: string;
  context: ActivityContextResult;
  recordedActivity: ActivityLogResponse;
  todayActivities: ActivityLogsTodayResponse;
  windowTitle?: string;
};

export type LocalFolderScopeInput = {
  roomId?: string | null;
};

export type PersonalManagedFolderSelectInput = SelectManagedFolderInput & LocalFolderScopeInput;
export type PersonalManagedFolderCommandInput = ManagedFolderCommandInput & LocalFolderScopeInput;

export type LocalCacheIntegrityResult = LocalAdapterResult<SqliteIntegrityResult, LocalCacheReadinessSummary>;
export type LocalCacheReadinessResult = LocalAdapterResult<LocalCacheReadinessSummary, LocalCacheReadinessSummary>;
export type LocalTimerRecoveryResult = LocalAdapterResult<TimerRecoveryState, LocalCacheReadinessSummary>;
export type LocalBackupRestoreRequest = LocalBackupRestoreInput;
export type ManagedFolderSelectResult = LocalAdapterResult<ManagedFolderSelection>;
export type ManagedFolderScanAdapterResult = LocalAdapterResult<ManagedFolderScanResult>;
export type ManagedFolderWatchAdapterResult = LocalAdapterResult<
  ManagedFolderWatchResult,
  { localFolderId: string; watching: false }
>;
export type LocalFileSearchAdapterInput = LocalFileSearchInput & LocalFolderScopeInput;
export type LocalFileSearchAdapterResult = LocalAdapterResult<LocalFileSearchResult>;
export type LocalFilePreviewAdapterInput = LocalFilePreviewInput & LocalFolderScopeInput;
export type LocalFilePreviewAdapterResult = LocalAdapterResult<LocalFilePreviewResult>;
export type ActivityContextAdapterResult = LocalAdapterResult<ActivityContextResult>;
export type ActivityContextRecordAdapterResult = LocalAdapterResult<ActivityContextRecordResult>;
export type WidgetUsageEventAdapterInput = WidgetUsageEventInput;
export type WidgetUsageEventAdapterResult = LocalAdapterResult<WidgetUsageEventRecordResult>;
export type WidgetUsageRollupAdapterInput = WidgetUsageRollupInput;
export type WidgetUsageRollupAdapterResult = LocalAdapterResult<WidgetUsageRollupResult[]>;
export type WidgetUsageSummarySyncAdapterInput = WidgetUsageSummarySyncInput;
export type WidgetUsageSummarySyncAdapterResult = LocalAdapterResult<WidgetUsageSummarySyncResult, LocalSyncSummary>;
export type SyncOutboxSummaryResult = LocalAdapterResult<SyncOutboxFlushResult, LocalSyncSummary>;

export type LocalAdapterSmokeResult = {
  activity: ActivityContextAdapterResult;
  cache: LocalCacheReadinessResult;
  folderSearch: LocalFileSearchAdapterResult;
  outbox: SyncOutboxSummaryResult;
};
