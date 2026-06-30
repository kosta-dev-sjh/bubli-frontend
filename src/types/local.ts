import type {
  ActivityContextResult,
  LocalBackupRestoreInput,
  LocalFileSearchInput,
  LocalFileSearchResult,
  ManagedFolderCommandInput,
  ManagedFolderScanResult,
  ManagedFolderSelection,
  ManagedFolderWatchResult,
  PlannedTauriCommandName,
  SelectManagedFolderInput,
  SqliteIntegrityResult,
  SyncOutboxFlushResult,
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
  commandName?: PlannedTauriCommandName;
  data: TData;
  environment: "tauri";
  message?: string;
  status: "ready";
};

export type LocalAdapterPending<TSummary> = {
  commandName?: PlannedTauriCommandName;
  environment: "tauri";
  message: string;
  status: "pending";
  summary: TSummary;
};

export type LocalAdapterUnavailable = {
  commandName?: PlannedTauriCommandName;
  environment: Exclude<LocalAdapterEnvironment, "tauri">;
  message: string;
  reason: LocalAdapterUnavailableReason;
  status: "unavailable";
};

export type LocalAdapterBlocked = {
  commandName?: PlannedTauriCommandName;
  environment: LocalAdapterEnvironment;
  message: string;
  reason: LocalAdapterBlockedReason;
  status: "blocked";
};

export type LocalAdapterFailed = {
  commandName?: PlannedTauriCommandName;
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
  implementedCommands: PlannedTauriCommandName[];
  plannedCommands: PlannedTauriCommandName[];
  serverTransfer: "not_started";
};

export type LocalSyncSummary = {
  failedCount: number;
  pendingCount?: number;
  queuedCount?: number;
  serverTransfer: "queued_only" | "not_started";
  summarizedAt: string;
};

export type ActivityContextReadInput = {
  consentGranted: boolean;
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
export type ActivityContextAdapterResult = LocalAdapterResult<ActivityContextResult>;
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
