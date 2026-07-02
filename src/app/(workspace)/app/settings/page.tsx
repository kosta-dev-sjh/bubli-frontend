"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { activityApi } from "@/features/activity/api/activityApi";
import { authApi } from "@/features/auth/api/authApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { TranslateVars, MessageKey } from "@/lib/i18n";
import { recordCurrentActivityContext } from "@/lib/local/activity-client";
import {
  backupLocalSqlite,
  checkLocalSqliteIntegrity,
  getLocalCacheReadiness,
  listLocalSqliteBackups,
  recoverLocalTimerState,
  restoreLocalSqliteBackup,
} from "@/lib/local/local-cache-client";
import {
  getPersonalManagedFolderIndexProgress,
  listPersonalManagedFolders,
  openPersonalLocalFile,
  reindexPersonalLocalFile,
  removePersonalManagedFolder,
  scanPersonalManagedFolder,
  searchPersonalLocalFiles,
  selectPersonalManagedFolder,
  setPersonalManagedFolderSync,
  syncPersonalLocalFileEventsToServer,
  watchPersonalManagedFolder,
} from "@/lib/local/managed-folder-client";
import { syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  tauriCommands,
  type AppMonitorInfo,
  type AppMonitorPreference,
  type ManagedFolderIndexProgressResult,
} from "@/lib/tauri/commands";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { ActivityLogResponse } from "@/types/api/activity";
import type { AuthUser } from "@/types/api/auth";
import type { NotificationPreferencesResponse, NotificationPreferencesUpdateRequest } from "@/types/api/notification";
import type {
  ManagedFolderResponse,
  PrivacyConsentsResponse,
  PrivacyConsentsUpdateRequest,
  StorageUsageResponse,
} from "@/types/api/settings";
import type {
  WidgetBubbleSettingResponse,
  WidgetBubbleType,
  WidgetTodayUsageSummaryResponse,
} from "@/types/api/widget";
import type { LocalAdapterResult } from "@/types/local";

import styles from "./settings-page.module.css";

type SettingsData = {
  folders: ManagedFolderResponse[];
  notifications: NotificationPreferencesResponse | null;
  privacy: PrivacyConsentsResponse | null;
  storage: StorageUsageResponse | null;
  googleCalendarConnectUrl: string | null;
  activityLogs: ActivityLogResponse[] | null;
  widgetBubbles: WidgetBubbleSettingResponse[] | null;
  widgetUsage: WidgetTodayUsageSummaryResponse | null;
};

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; settings: SettingsData; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline" };

const defaultNotifications: NotificationPreferencesResponse = {
  agentEnabled: false,
  capacityEnabled: false,
  commentEnabled: false,
  messageEnabled: false,
  resourceVersionEnabled: false,
};

const defaultPrivacy: PrivacyConsentsResponse = {
  activityDetectionEnabled: false,
  localFolderEnabled: false,
  personalAgentLocalMemoryEnabled: false,
  widgetUsageLocalEventEnabled: false,
};

const emptySettings: SettingsData = {
  folders: [],
  notifications: null,
  privacy: null,
  storage: null,
  googleCalendarConnectUrl: null,
  activityLogs: null,
  widgetBubbles: null,
  widgetUsage: null,
};

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const widgetBubbleLabels: Record<WidgetBubbleType, MessageKey> = {
  AGENT: "settings.bubbleType.AGENT",
  ALERT: "settings.bubbleType.ALERT",
  CHAT: "settings.bubbleType.CHAT",
  MEMO: "settings.bubbleType.MEMO",
  RESOURCE: "settings.bubbleType.RESOURCE",
  SCHEDULE: "settings.bubbleType.SCHEDULE",
  TIMER: "settings.bubbleType.TIMER",
  TODO: "settings.bubbleType.TODO",
};

const notificationRows: Array<{
  descriptionKey: MessageKey;
  key: keyof NotificationPreferencesResponse;
  titleKey: MessageKey;
}> = [
  { key: "messageEnabled", titleKey: "settings.notif.message.title", descriptionKey: "settings.notif.message.desc" },
  { key: "commentEnabled", titleKey: "settings.notif.comment.title", descriptionKey: "settings.notif.comment.desc" },
  { key: "resourceVersionEnabled", titleKey: "settings.notif.resource.title", descriptionKey: "settings.notif.resource.desc" },
  { key: "agentEnabled", titleKey: "settings.notif.agent.title", descriptionKey: "settings.notif.agent.desc" },
  { key: "capacityEnabled", titleKey: "settings.notif.capacity.title", descriptionKey: "settings.notif.capacity.desc" },
];

const privacyRows: Array<{
  descriptionKey: MessageKey;
  key: keyof PrivacyConsentsResponse;
  titleKey: MessageKey;
}> = [
  { key: "localFolderEnabled", titleKey: "settings.privacy.folder.title", descriptionKey: "settings.privacy.folder.desc" },
  { key: "activityDetectionEnabled", titleKey: "settings.privacy.activity.title", descriptionKey: "settings.privacy.activity.desc" },
  { key: "personalAgentLocalMemoryEnabled", titleKey: "settings.privacy.memory.title", descriptionKey: "settings.privacy.memory.desc" },
  { key: "widgetUsageLocalEventEnabled", titleKey: "settings.privacy.widget.title", descriptionKey: "settings.privacy.widget.desc" },
];

const localeOptions = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
  { label: "日本語", value: "ja" },
];

const timezoneOptions: Array<{ labelKey: MessageKey; value: string }> = [
  { labelKey: "settings.tz.seoul", value: "Asia/Seoul" },
  { labelKey: "settings.tz.utc", value: "UTC" },
  { labelKey: "settings.tz.tokyo", value: "Asia/Tokyo" },
];

const defaultProfileDraft = { locale: "ko", name: "", timezone: "Asia/Seoul" };

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function enabledCount(record: object | null) {
  if (!record) return 0;
  return Object.values(record).filter((value) => value === true).length;
}

function byteLabel(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))}MB`;
  return `${Math.round(value / 1024)}KB`;
}

function storageLabel(t: TranslateFn, storage: StorageUsageResponse | null) {
  if (!storage) return t("settings.value.beforeCheck");
  return `${byteLabel(storage.usedBytes)} / ${byteLabel(storage.limitBytes)}`;
}

function userToProfileDraft(user: AuthUser) {
  return {
    locale: user.locale ?? "ko",
    name: user.name,
    timezone: user.timezone ?? "Asia/Seoul",
  };
}

function userContactLabel(t: TranslateFn, user: AuthUser) {
  return user.email ?? user.bubliId ?? t("layout.user.loggedIn");
}

function localManagedFolderToSettingsFolder(folder: {
  createdAt: string;
  localFolderId: string;
  name: string;
  path: string;
  syncEnabled: boolean;
  updatedAt: string;
}): ManagedFolderResponse {
  return {
    createdAt: folder.createdAt,
    id: folder.localFolderId,
    localPath: folder.path,
    name: folder.name,
    syncEnabled: folder.syncEnabled,
    updatedAt: folder.updatedAt,
  };
}

function localResultMessage<TData, TSummary>(t: TranslateFn, result: LocalAdapterResult<TData, TSummary>) {
  if (result.status === "ready") return result.message ?? t("settings.msg.done");
  if (result.status === "pending") return result.message;
  if (result.status === "unavailable") return t("settings.msg.availableInApp");
  return result.message;
}

function monitorLabel(t: TranslateFn, monitor: AppMonitorInfo, index: number) {
  const name = monitor.name?.trim() || t("settings.folders.monitorFallback", { index: index + 1 });
  const primaryLabel = monitor.isPrimary ? ` · ${t("settings.folders.primaryTag")}` : "";
  return `${name}${primaryLabel} - ${monitor.size.width}x${monitor.size.height} @ ${monitor.position.x},${monitor.position.y}`;
}

function activityDurationLabel(t: TranslateFn, seconds?: number | null) {
  if (!seconds || seconds < 0) return t("settings.activity.justRecorded");

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.max(1, Math.floor((seconds % 3600) / 60));

  if (hours > 0) {
    return t("settings.activity.hourMinute", { hours, minutes });
  }

  return t("settings.activity.minute", { minutes });
}

function activityStartedLabel(t: TranslateFn, value?: string | null) {
  if (!value) return t("settings.activity.timeUnknown");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("settings.activity.timeUnknown");

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type StatusMessage = { text: string; tone: "approved" | "warning" };

export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [profileDraft, setProfileDraft] = useState(defaultProfileDraft);
  const [saveMessage, setSaveMessage] = useState<StatusMessage | null>(null);
  const [localActionMessage, setLocalActionMessage] = useState<StatusMessage | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<Array<{ localFileId: string; name: string; path: string }>>([]);
  const [folderProgress, setFolderProgress] = useState<Record<string, ManagedFolderIndexProgressResult>>({});
  const [lastBackupId, setLastBackupId] = useState<string | null>(null);
  const [backupListLabel, setBackupListLabel] = useState(() => t("settings.msg.backupNotLoaded"));
  const [desktopRuntime, setDesktopRuntime] = useState(false);
  const [monitorPreference, setMonitorPreference] = useState<AppMonitorPreference | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setSaveMessage(null);
    setLocalActionMessage(null);

    try {
      const user = await authApi.getMe();
      const [notifications, privacy, storage, activityLogs, widgetBubbles, widgetUsage, localFolders] =
        await Promise.allSettled([
          settingsApi.getNotificationPreferences(),
          settingsApi.getPrivacyConsents(),
          settingsApi.getStorageUsage(),
          activityApi.getToday(),
          widgetApi.getBubbles(),
          widgetApi.getTodayUsageRollups(),
          listPersonalManagedFolders(),
        ]);
      const folderResult = settledValue(localFolders, null);

      setProfileDraft(userToProfileDraft(user));
      setState({
        kind: "ready",
        settings: {
          folders:
            folderResult?.status === "ready"
              ? folderResult.data.folders.map(localManagedFolderToSettingsFolder)
              : [],
          notifications: settledValue(notifications, null),
          privacy: settledValue(privacy, null),
          storage: settledValue(storage, null),
          googleCalendarConnectUrl: calendarApi.getGoogleConnectUrl(),
          activityLogs: settledValue(activityLogs, null),
          widgetBubbles: settledValue(widgetBubbles, null),
          widgetUsage: settledValue(widgetUsage, null),
        },
        user,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      setProfileDraft(defaultProfileDraft);
      setState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    const runtimeHandle = window.setTimeout(() => {
      setDesktopRuntime(isTauriRuntime());
    }, 0);
    const loadHandle = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(runtimeHandle);
      window.clearTimeout(loadHandle);
    };
  }, [load]);

  useEffect(() => {
    if (!desktopRuntime) {
      return;
    }

    let cancelled = false;
    void tauriCommands
      .listAppMonitors()
      .then((preference) => {
        if (!cancelled) setMonitorPreference(preference);
      })
      .catch(() => {
        if (!cancelled) setLocalActionMessage({ text: t("settings.msg.monitorLoadFailed"), tone: "warning" });
      });

    return () => {
      cancelled = true;
    };
  }, [desktopRuntime]);

  const updateReadyState = useCallback((updater: (current: Extract<PageState, { kind: "ready" }>) => Extract<PageState, { kind: "ready" }>) => {
    setState((current) => (current.kind === "ready" ? updater(current) : current));
  }, []);

  const refreshActivityLogs = useCallback(async () => {
    if (state.kind !== "ready") return;

    try {
      const activityLogs = await activityApi.getToday();
      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, activityLogs },
      }));
      setLocalActionMessage({ text: t("settings.msg.todayActivityLoaded", { count: activityLogs.length }), tone: "approved" });
    } catch {
      setLocalActionMessage({ text: t("settings.msg.activityLoadFailed"), tone: "warning" });
    }
  }, [state.kind, updateReadyState]);

  const saveProfile = useCallback(async () => {
    if (state.kind !== "ready") return;

    const nextUser = {
      ...state.user,
      locale: profileDraft.locale,
      name: profileDraft.name.trim() || state.user.name,
      timezone: profileDraft.timezone,
    };

    updateReadyState((current) => ({ ...current, user: nextUser }));
    setSaveMessage({ text: t("settings.msg.displaySaved"), tone: "approved" });

    try {
      const saved = await authApi.updateMe({
        locale: nextUser.locale,
        name: nextUser.name,
        timezone: nextUser.timezone,
      });
      updateReadyState((current) => ({ ...current, user: saved }));
    } catch {
      if (shouldUseWorkspacePreviewData()) return;
      setSaveMessage({ text: t("settings.msg.saveFailed"), tone: "warning" });
    }
  }, [profileDraft, state, updateReadyState]);

  const logout = useCallback(async () => {
    await authApi.logout();
    router.push("/login");
    router.refresh();
  }, [router]);

  const toggleNotification = useCallback(
    async (key: keyof NotificationPreferencesResponse) => {
      if (state.kind !== "ready") return;
      const current = state.settings.notifications ?? defaultNotifications;
      const next: NotificationPreferencesResponse = { ...current, [key]: !current[key] };

      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, notifications: next },
      }));
      setSaveMessage({ text: t("settings.msg.notifSaved"), tone: "approved" });

      try {
        const patch: NotificationPreferencesUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updateNotificationPreferences(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, notifications: saved },
        }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setSaveMessage({ text: t("settings.msg.notifSaveFailed"), tone: "warning" });
      }
    },
    [state, updateReadyState],
  );

  const togglePrivacy = useCallback(
    async (key: keyof PrivacyConsentsResponse) => {
      if (state.kind !== "ready") return;
      const current = state.settings.privacy ?? defaultPrivacy;
      const next: PrivacyConsentsResponse = { ...current, [key]: !current[key] };

      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, privacy: next },
      }));
      setSaveMessage({ text: t("settings.msg.privacySaved"), tone: "approved" });

      try {
        const patch: PrivacyConsentsUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updatePrivacyConsents(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, privacy: saved },
        }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setSaveMessage({ text: t("settings.msg.privacySaveFailed"), tone: "warning" });
      }
    },
    [state, updateReadyState],
  );

  const toggleWidgetBubble = useCallback(
    async (bubble: WidgetBubbleSettingResponse) => {
      if (state.kind !== "ready") return;
      const current = state.settings.widgetBubbles ?? [];
      const nextBubble = { ...bubble, enabled: !bubble.enabled };
      const next = current.map((item) => (item.id === bubble.id ? nextBubble : item));

      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, widgetBubbles: next },
      }));
      setSaveMessage({ text: t("settings.msg.bubbleSaved"), tone: "approved" });

      try {
        const saved = await widgetApi.updateBubbles({
          bubbles: [
            {
              bubbleType: nextBubble.bubbleType,
              enabled: nextBubble.enabled,
              id: nextBubble.id,
            },
          ],
        });
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, widgetBubbles: saved },
        }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setSaveMessage({ text: t("settings.msg.bubbleSaveFailed"), tone: "warning" });
      }
    },
    [state, updateReadyState],
  );

  const selectManagedFolder = useCallback(async () => {
    if (state.kind !== "ready") return;

    const result = await selectPersonalManagedFolder();
    setLocalActionMessage({ text: localResultMessage(t, result), tone: result.status === "ready" ? "approved" : "warning" });
    if (result.status !== "ready") return;

    const folder = result.data;
    const fallbackFolder: ManagedFolderResponse = {
      createdAt: new Date().toISOString(),
      id: folder.localFolderId,
      localPath: folder.path,
      name: folder.name,
      syncEnabled: false,
      updatedAt: new Date().toISOString(),
    };

    updateReadyState((ready) => ({
      ...ready,
      settings: {
        ...ready.settings,
        folders: [fallbackFolder, ...ready.settings.folders.filter((item) => item.id !== fallbackFolder.id)],
      },
    }));

    setLocalActionMessage({ text: t("settings.msg.folderConnected"), tone: "approved" });
  }, [state.kind, t, updateReadyState]);

  const checkLocalCache = useCallback(async () => {
    const result = await Promise.resolve(checkLocalSqliteIntegrity());
    if (result.status === "ready") {
      setLocalActionMessage(
        result.data.ok
          ? { text: t("settings.msg.cacheHealthy"), tone: "approved" }
          : { text: t("settings.msg.cacheNeedsRecovery"), tone: "warning" },
      );
      return;
    }
    setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [t]);

  const backupLocalCache = useCallback(async () => {
    const result = await Promise.resolve(backupLocalSqlite());
    if (result.status === "ready") {
      setLastBackupId(result.data.backupId);
      setBackupListLabel(t("settings.msg.backupRecent", { fileName: result.data.fileName }));
      setLocalActionMessage({ text: t("settings.msg.backupCreated", { fileName: result.data.fileName }), tone: "approved" });
      return;
    }
    setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [t]);

  const restoreLocalCache = useCallback(async () => {
    if (!lastBackupId) {
      setLocalActionMessage({ text: t("settings.msg.backupNeeded"), tone: "warning" });
      return;
    }

    const result = await Promise.resolve(restoreLocalSqliteBackup({ backupId: lastBackupId }));
    setLocalActionMessage(
      result.status === "ready"
        ? { text: t("settings.msg.restoreDone"), tone: "approved" }
        : { text: localResultMessage(t, result), tone: "warning" },
    );
  }, [lastBackupId, t]);

  useEffect(() => {
    if (!desktopRuntime) return;

    let cancelled = false;

    async function loadBackupManifest() {
      const result = await Promise.resolve(listLocalSqliteBackups());
      if (cancelled || result.status !== "ready") return;

      setLastBackupId(result.data.latestBackupId ?? null);
      setBackupListLabel(
        result.data.backups.length > 0
          ? t("settings.msg.backupManifest", { count: result.data.backups.length, fileName: result.data.backups[0].fileName })
          : t("settings.msg.backupNone"),
      );
    }

    void loadBackupManifest();

    return () => {
      cancelled = true;
    };
  }, [desktopRuntime]);

  const refreshManagedFolderProgress = useCallback(async (localFolderId: string) => {
    const result = await getPersonalManagedFolderIndexProgress({ localFolderId });
    if (result.status === "ready") {
      setFolderProgress((current) => ({ ...current, [localFolderId]: result.data }));
      setLocalActionMessage({
        text: t("settings.msg.indexProgress", {
          indexed: result.data.indexedFiles,
          total: result.data.totalFiles,
          pending: result.data.pendingEventCount,
        }),
        tone: "approved",
      });
      return;
    }

    setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [t]);

  const toggleManagedFolderSync = useCallback(
    async (folder: ManagedFolderResponse) => {
      const result = await setPersonalManagedFolderSync({
        enabled: !folder.syncEnabled,
        localFolderId: folder.id,
      });
      if (result.status !== "ready") {
        setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
        return;
      }

      updateReadyState((ready) => ({
        ...ready,
        settings: {
          ...ready.settings,
          folders: ready.settings.folders.map((item) =>
            item.id === folder.id
              ? {
                  ...item,
                  syncEnabled: result.data.syncEnabled,
                  updatedAt: result.data.updatedAt,
                }
              : item,
          ),
        },
      }));
      setLocalActionMessage(
        result.data.syncEnabled
          ? { text: t("settings.msg.syncOn", { pending: result.data.pendingEventCount }), tone: "approved" }
          : { text: t("settings.msg.syncOff"), tone: "approved" },
      );
      void refreshManagedFolderProgress(folder.id);
    },
    [refreshManagedFolderProgress, t, updateReadyState],
  );

  const removeManagedFolder = useCallback(
    async (folder: ManagedFolderResponse) => {
      const result = await removePersonalManagedFolder({ localFolderId: folder.id });
      if (result.status !== "ready") {
        setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
        return;
      }

      updateReadyState((ready) => ({
        ...ready,
        settings: {
          ...ready.settings,
          folders: ready.settings.folders.filter((item) => item.id !== folder.id),
        },
      }));
      setFolderProgress((current) => {
        const next = { ...current };
        delete next[folder.id];
        return next;
      });
      setLocalFiles([]);
      setLocalActionMessage({ text: t("settings.msg.folderRemoved"), tone: "approved" });
    },
    [t, updateReadyState],
  );

  const scanManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
    if (!folderId) {
      setLocalActionMessage({ text: t("settings.msg.selectFolderFirst"), tone: "warning" });
      return;
    }

    const result = await scanPersonalManagedFolder({ localFolderId: folderId });
    if (result.status === "ready") void refreshManagedFolderProgress(folderId);
    setLocalActionMessage(
      result.status === "ready"
        ? { text: t("settings.msg.folderChanges", { count: result.data.changedCount }), tone: "approved" }
        : { text: localResultMessage(t, result), tone: "warning" },
    );
  }, [refreshManagedFolderProgress, state, t]);

  const watchManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
    if (!folderId) {
      setLocalActionMessage({ text: t("settings.msg.selectFolderFirst"), tone: "warning" });
      return;
    }

    const result = await watchPersonalManagedFolder({ localFolderId: folderId });
    setLocalActionMessage(
      result.status === "ready"
        ? { text: t("settings.msg.watchOn"), tone: "approved" }
        : { text: localResultMessage(t, result), tone: "warning" },
    );
  }, [state, t]);

  const searchLocalFiles = useCallback(async () => {
    const query = folderSearchQuery.trim();
    if (!query) {
      setLocalActionMessage({ text: t("settings.msg.enterQuery"), tone: "warning" });
      return;
    }

    const result = await searchPersonalLocalFiles({ limit: 20, query });
    if (result.status === "ready") {
      setLocalFiles(result.data.items.map((item) => ({ localFileId: item.localFileId, name: item.name, path: item.path })));
      setLocalActionMessage({ text: t("settings.msg.localFilesFound", { count: result.data.items.length }), tone: "approved" });
      return;
    }

    setLocalFiles([]);
    setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [folderSearchQuery, t]);

  const openLocalFile = useCallback(async (localFileId: string) => {
    const result = await openPersonalLocalFile({ localFileId });
    setLocalActionMessage(
      result.status === "ready"
        ? { text: t("settings.msg.fileOpened", { name: result.data.name }), tone: "approved" }
        : { text: localResultMessage(t, result), tone: "warning" },
    );
  }, [t]);

  const reindexLocalFile = useCallback(
    async (localFileId: string) => {
      const result = await reindexPersonalLocalFile({ localFileId });
      if (result.status !== "ready") {
        setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
        return;
      }

      const query = folderSearchQuery.trim();
      if (query) {
        void searchPersonalLocalFiles({ limit: 20, query }).then((searchResult) => {
          if (searchResult.status !== "ready") return;
          setLocalFiles(
            searchResult.data.items.map((item) => ({
              localFileId: item.localFileId,
              name: item.name,
              path: item.path,
            })),
          );
        });
      }
      setLocalActionMessage(
        result.data.status === "MISSING"
          ? { text: t("settings.msg.fileMissing", { name: result.data.name }), tone: "warning" }
          : {
              text: result.data.changed
                ? t("settings.msg.fileReindexedChanged", { name: result.data.name })
                : t("settings.msg.fileReindexed", { name: result.data.name }),
              tone: "approved",
            },
      );
    },
    [folderSearchQuery, t],
  );

  useEffect(() => {
    if (!desktopRuntime) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listenManagedFolderWatchEvents((event) => {
      if (disposed) return;

      setLocalActionMessage({ text: t("settings.msg.folderWatchDetected", { count: event.changedCount }), tone: "approved" });
      const query = folderSearchQuery.trim();
      if (!query) return;

      void searchPersonalLocalFiles({ limit: 20, query }).then((result) => {
        if (disposed || result.status !== "ready") return;
        setLocalFiles(result.data.items.map((item) => ({ localFileId: item.localFileId, name: item.name, path: item.path })));
      });
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [desktopRuntime, folderSearchQuery]);

  const readActivity = useCallback(async () => {
    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.activityDetectionEnabled) : false;
    const result = await recordCurrentActivityContext({ consentGranted });
    if (result.status === "ready") {
      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, activityLogs: result.data.todayActivities },
      }));
      setLocalActionMessage({
        text: result.data.windowTitle
          ? t("settings.msg.activityDetectedWindow", { app: result.data.appName, window: result.data.windowTitle })
          : t("settings.msg.activityDetected", { app: result.data.appName }),
        tone: "approved",
      });
      return;
    }

    setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [state, t, updateReadyState]);

  const deleteActivityLog = useCallback(
    async (activityLogId: string) => {
      if (state.kind !== "ready") return;

      setDeletingActivityId(activityLogId);
      updateReadyState((ready) => ({
        ...ready,
        settings: {
          ...ready.settings,
          activityLogs: ready.settings.activityLogs?.filter((activity) => activity.id !== activityLogId) ?? null,
        },
      }));

      try {
        await activityApi.delete(activityLogId);
        setLocalActionMessage({ text: t("settings.msg.activityDeleted"), tone: "approved" });
      } catch {
        const activityLogs = await activityApi.getToday().catch(() => null);
        if (activityLogs) {
          updateReadyState((ready) => ({
            ...ready,
            settings: { ...ready.settings, activityLogs },
          }));
        }
        setLocalActionMessage({ text: t("settings.msg.activityDeleteFailed"), tone: "warning" });
      } finally {
        setDeletingActivityId(null);
      }
    },
    [state.kind, t, updateReadyState],
  );

  const selectAppMonitor = useCallback(
    async (monitorId: string) => {
      if (!desktopRuntime) return;

      try {
        const preference = await tauriCommands.setPreferredAppMonitor({ monitorId });
        setMonitorPreference(preference);
        setLocalActionMessage({ text: t("settings.msg.monitorSaved"), tone: "approved" });
      } catch {
        setLocalActionMessage({ text: t("settings.msg.monitorSaveFailed"), tone: "warning" });
      }
    },
    [desktopRuntime, t],
  );

  const openGoogleCalendarConnect = useCallback(() => {
    if (state.kind !== "ready" || !state.settings.googleCalendarConnectUrl) return;
    window.location.assign(state.settings.googleCalendarConnectUrl);
  }, [state]);

  const checkSyncOutbox = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
    const result = await syncPersonalLocalFileEventsToServer(folderId ? { localFolderId: folderId } : undefined);
    setLocalActionMessage({ text: localResultMessage(t, result), tone: result.status === "ready" ? "approved" : "warning" });
  }, [state, t]);

  const syncWidgetUsage = useCallback(async () => {
    const result = await syncLocalWidgetUsageSummaryToServer();
    setLocalActionMessage({ text: localResultMessage(t, result), tone: result.status === "ready" ? "approved" : "warning" });
  }, [t]);

  const recoverTimer = useCallback(async () => {
    const result = await Promise.resolve(recoverLocalTimerState());
    if (result.status === "ready") {
      setLocalActionMessage(
        result.data.recoveryRequired
          ? { text: t("settings.msg.timerRecoveryNeeded"), tone: "warning" }
          : { text: t("settings.msg.timerHealthy"), tone: "approved" },
      );
      return;
    }

    setLocalActionMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [t]);

  const readySettings = state.kind === "ready" ? state.settings : emptySettings;
  const notificationSettings = readySettings.notifications ?? defaultNotifications;
  const privacySettings = readySettings.privacy ?? defaultPrivacy;
  const managedFolders = readySettings.folders;
  const widgetBubbles = readySettings.widgetBubbles ?? [];
  const enabledWidgetCount = widgetBubbles.filter((bubble) => bubble.enabled).length;
  const localCacheReadiness = getLocalCacheReadiness();
  const todayActivityLogs = readySettings.activityLogs ?? [];

  return (
    <section className={`workspace-route ${styles.route}`} aria-labelledby="settings-title">
      <header className={`${styles.routeHeader} workspace-route__header`}>
        <div>
          <span className={styles.kicker}>{t("settings.kicker")}</span>
          <h1 id="settings-title">{t("settings.title")}</h1>
          <p>{t("settings.subtitle")}</p>
        </div>
        <div className={styles.headerStatus}>
          <StatusBadge tone={state.kind === "ready" ? "approved" : state.kind === "auth" ? "warning" : "neutral"}>
            {state.kind === "ready"
              ? t("settings.status.connected")
              : state.kind === "auth"
                ? t("settings.status.loginRequired")
                : t("settings.status.waiting")}
          </StatusBadge>
          <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>
            {desktopRuntime ? t("settings.status.desktopApp") : t("settings.status.browser")}
          </StatusBadge>
          {localActionMessage ? <StatusBadge tone={localActionMessage.tone}>{localActionMessage.text}</StatusBadge> : null}
          {saveMessage ? <StatusBadge tone={saveMessage.tone}>{saveMessage.text}</StatusBadge> : null}
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className={styles.notice}>{t("settings.notice.loading")}</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className={styles.notice}>
          <div>
            <strong>{t("settings.notice.authTitle")}</strong>
            <span>{t("settings.notice.authBody")}</span>
          </div>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("common.login")}
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && (
        <GlassPanel className={styles.notice}>
          <div>
            <strong>{t("settings.notice.offlineTitle")}</strong>
            <span>{t("settings.notice.offlineBody")}</span>
          </div>
        </GlassPanel>
      )}

      {(state.kind === "ready" || state.kind === "offline") && (
        <div className={styles.page}>
          <div className={styles.statusGrid}>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.account")}</span>
              <strong>{state.kind === "ready" ? state.user.name : t("settings.value.beforeConnect")}</strong>
              <small>{state.kind === "ready" ? userContactLabel(t, state.user) : t("settings.value.shownAfterConnect")}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.notifications")}</span>
              <strong>{state.kind === "ready" ? t("settings.value.enabledCount", { count: enabledCount(notificationSettings) }) : t("settings.value.beforeCheck")}</strong>
              <small>{readySettings.notifications ? t("settings.value.serverSetting") : t("settings.status.waiting")}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.desktopApp")}</span>
              <strong>{desktopRuntime ? t("settings.value.running") : t("settings.value.appOnly")}</strong>
              <small>{desktopRuntime ? t("settings.value.tauriRunning") : t("settings.value.browserReadonly")}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.storage")}</span>
              <strong>{storageLabel(t, readySettings.storage)}</strong>
              <small>{readySettings.storage ? t("settings.value.serverUsage") : t("settings.value.noData")}</small>
            </GlassPanel>
          </div>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>{t("settings.card.account")}</span>
                <h2>{t("settings.account.title")}</h2>
              </div>
              <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>{state.kind === "ready" ? t("settings.value.connected") : t("settings.value.beforeConnect")}</StatusBadge>
            </div>
            <div className={styles.accountGrid}>
              <div className={styles.identity}>
                <span>{t("settings.account.name")}</span>
                <strong>{state.kind === "ready" ? state.user.name : t("settings.value.shownAfterConnect")}</strong>
              </div>
              <div className={styles.identity}>
                <span>{t("settings.account.identifier")}</span>
                <strong>{state.kind === "ready" ? userContactLabel(t, state.user) : t("settings.value.shownAfterConnect")}</strong>
              </div>
              <div className={styles.identity}>
                <span>{t("settings.account.bubliId")}</span>
                <strong>{state.kind === "ready" ? state.user.bubliId : t("settings.value.noData")}</strong>
              </div>
              <div className={styles.actions}>
                <Button disabled={state.kind !== "ready"} onClick={() => void logout()} type="button" variant="quiet">
                  {t("common.logout")}
                </Button>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>{t("settings.display")}</span>
                <h2>{t("settings.languageScreen")}</h2>
              </div>
              <Button disabled={state.kind !== "ready"} onClick={() => void saveProfile()} type="button" variant="primary">
                {t("common.save")}
              </Button>
            </div>
            <div className={styles.profileGrid}>
              <label className="workspace-route__field">
                <span>{t("settings.display.name")}</span>
                <input
                  disabled={state.kind !== "ready"}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, name: event.target.value }))}
                  value={profileDraft.name}
                />
              </label>
              <div className={styles.settingBlock}>
                <span>{t("settings.language")}</span>
                <div aria-label={t("settings.display.languageAria")} className={styles.segmented} role="radiogroup">
                  {localeOptions.map((option) => (
                    <button
                      aria-checked={profileDraft.locale === option.value}
                      className={profileDraft.locale === option.value ? styles.segmentedActive : ""}
                      disabled={state.kind !== "ready"}
                      key={option.value}
                      onClick={() => setProfileDraft((draft) => ({ ...draft, locale: option.value }))}
                      role="radio"
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="workspace-route__field">
                <span>{t("settings.display.timezone")}</span>
                <select
                  disabled={state.kind !== "ready"}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, timezone: event.target.value }))}
                  value={profileDraft.timezone}
                >
                  {timezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.settingBlock}>
                <span>{t("settings.display.theme")}</span>
                <ThemeToggle />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>{t("settings.section.integration")}</span>
                <h2>Google Calendar</h2>
              </div>
              <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>
                {state.kind === "ready" ? t("settings.gcal.ready") : t("settings.status.waiting")}
              </StatusBadge>
            </div>
            <div className={styles.integrationGrid}>
              <div className={styles.integrationLead}>
                <strong>{t("settings.gcal.lead")}</strong>
                <span>{t("settings.gcal.leadSub")}</span>
              </div>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>
                    <strong>{t("settings.gcal.connectionStatus")}</strong>
                    <small>{state.kind === "ready" ? t("settings.gcal.canConnect") : t("settings.gcal.afterLogin")}</small>
                  </span>
                  <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>
                    {state.kind === "ready" ? t("settings.value.prepared") : t("settings.value.waiting")}
                  </StatusBadge>
                </div>
                <div className={styles.row}>
                  <span>
                    <strong>{t("settings.gcal.scope")}</strong>
                    <small>{t("settings.gcal.scopeDesc")}</small>
                  </span>
                  <StatusBadge tone="personal">{t("settings.value.schedule")}</StatusBadge>
                </div>
              </div>
            </div>
            <div className={styles.inlineActions}>
              <Button disabled={state.kind !== "ready"} onClick={openGoogleCalendarConnect} type="button" variant="primary">
                {t("settings.gcal.connectCta")}
              </Button>
              <Link className="bubli-button" href="/app/calendar">
                {t("settings.gcal.viewCalendar")}
              </Link>
            </div>
          </GlassPanel>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>{t("settings.card.notifications")}</span>
                  <h2>{t("settings.notifications.title")}</h2>
                </div>
                <StatusBadge tone={readySettings.notifications ? "approved" : "neutral"}>
                  {readySettings.notifications ? t("settings.value.enabledCount", { count: enabledCount(notificationSettings) }) : t("settings.status.waiting")}
                </StatusBadge>
              </div>
              <div className={styles.rows}>
                {notificationRows.map((row) => (
                  <button
                    className={styles.row}
                    disabled={state.kind !== "ready" || !readySettings.notifications}
                    key={row.key}
                    onClick={() => void toggleNotification(row.key)}
                    type="button"
                  >
                    <span>
                      <strong>{t(row.titleKey)}</strong>
                      <small>{t(row.descriptionKey)}</small>
                    </span>
                    <span
                      aria-checked={notificationSettings[row.key]}
                      className={`${styles.toggle}${notificationSettings[row.key] ? ` ${styles.toggleOn}` : ""}`}
                      role="switch"
                    >
                      <span />
                    </span>
                  </button>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>{t("settings.section.privacy")}</span>
                  <h2>{t("settings.privacy.title")}</h2>
                </div>
                <StatusBadge tone={readySettings.privacy ? "personal" : "neutral"}>
                  {readySettings.privacy ? t("settings.value.consentCount", { count: enabledCount(privacySettings) }) : t("settings.status.waiting")}
                </StatusBadge>
              </div>
              <div className={styles.rows}>
                {privacyRows.map((row) => (
                  <button
                    className={styles.row}
                    disabled={state.kind !== "ready" || !readySettings.privacy}
                    key={row.key}
                    onClick={() => void togglePrivacy(row.key)}
                    type="button"
                  >
                    <span>
                      <strong>{t(row.titleKey)}</strong>
                      <small>{t(row.descriptionKey)}</small>
                    </span>
                    <span aria-checked={privacySettings[row.key]} className={`${styles.toggle}${privacySettings[row.key] ? ` ${styles.toggleOn}` : ""}`} role="switch">
                      <span />
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles.guard}>{t("settings.privacy.guard")}</p>
              <div className={styles.inlineActions}>
                <Button disabled={!desktopRuntime || state.kind !== "ready"} onClick={() => void readActivity()} type="button" variant="quiet">
                  {t("settings.privacy.recordActivity")}
                </Button>
                <Button disabled={state.kind !== "ready" || !privacySettings.activityDetectionEnabled} onClick={() => void refreshActivityLogs()} type="button" variant="secondary">
                  {t("settings.privacy.refreshToday")}
                </Button>
              </div>
              <div className={styles.activityList} aria-label={t("settings.privacy.activityListAria")}>
                {todayActivityLogs.length > 0 ? (
                  todayActivityLogs.map((activity) => (
                    <div className={styles.activityRow} key={activity.id}>
                      <span>
                        <strong>{activity.appName || t("settings.privacy.noAppName")}</strong>
                        <small>
                          {[activity.windowTitle, activityStartedLabel(t, activity.startedAt), activityDurationLabel(t, activity.durationSeconds)]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                      <Button
                        disabled={deletingActivityId === activity.id}
                        loading={deletingActivityId === activity.id}
                        onClick={() => void deleteActivityLog(activity.id)}
                        size="sm"
                        type="button"
                        variant="quiet"
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyRow}>{t("settings.privacy.noActivity")}</p>
                )}
              </div>
            </GlassPanel>
          </div>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>{t("settings.card.desktopApp")}</span>
                  <h2>{t("settings.folders.title")}</h2>
                </div>
                <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>{desktopRuntime ? t("settings.value.appRunning") : t("settings.value.availableInApp")}</StatusBadge>
              </div>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>
                    <strong>{t("settings.folders.localSqlite")}</strong>
                    <small>{localCacheReadiness.status === "ready" ? t("settings.folders.cacheAvailable") : t("settings.folders.cacheUnavailable")}</small>
                  </span>
                  <StatusBadge tone={localCacheReadiness.status === "ready" ? "approved" : "neutral"}>
                    {localCacheReadiness.status === "ready" ? t("settings.value.prepared") : t("settings.value.appRequired")}
                  </StatusBadge>
                </div>
                <div className={styles.row}>
                  <span>
                    <strong>{t("settings.folders.appMonitor")}</strong>
                    <small>{t("settings.folders.appMonitorDesc")}</small>
                  </span>
                  <select
                    className={styles.inlineSelect}
                    disabled={!desktopRuntime || !monitorPreference}
                    onChange={(event) => void selectAppMonitor(event.target.value)}
                    value={monitorPreference?.preferredMonitorId ?? "primary"}
                  >
                    <option value="primary">{t("settings.folders.primaryMonitor")}</option>
                    {monitorPreference?.monitors.map((monitor, index) => (
                      <option key={monitor.id} value={monitor.id}>
                        {monitorLabel(t, monitor, index)}
                      </option>
                    ))}
                  </select>
                </div>
                {managedFolders.length > 0 ? (
                  managedFolders.map((folder) => (
                    <div className={styles.row} key={folder.id}>
                      <span>
                        <strong>{folder.name}</strong>
                        <small>
                          {folder.localPath ?? t("settings.folders.localPathAppOnly")}
                          {folderProgress[folder.id]
                            ? ` · ${t("settings.folders.inlineProgress", { percent: folderProgress[folder.id].progressPercent, pending: folderProgress[folder.id].pendingEventCount })}`
                            : ""}
                        </small>
                      </span>
                      <div className={styles.inlineActions}>
                        <StatusBadge tone={folder.syncEnabled ? "approved" : "neutral"}>
                          {folder.syncEnabled ? t("settings.folders.syncOn") : t("settings.folders.localOnly")}
                        </StatusBadge>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void refreshManagedFolderProgress(folder.id)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          {t("settings.folders.progress")}
                        </Button>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void toggleManagedFolderSync(folder)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          {folder.syncEnabled ? t("settings.folders.syncDisable") : t("settings.folders.syncEnable")}
                        </Button>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void removeManagedFolder(folder)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          {t("settings.folders.disconnect")}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyRow}>{t("settings.folders.noFolder")}</div>
                )}
              </div>
              <div className={styles.inlineActions}>
                <Button disabled={state.kind !== "ready" || !desktopRuntime} onClick={() => void selectManagedFolder()} type="button" variant="primary">
                  {t("settings.folders.selectFolder")}
                </Button>
                <Button disabled={state.kind !== "ready" || !desktopRuntime} onClick={() => void scanManagedFolder()} type="button" variant="quiet">
                  {t("settings.folders.scan")}
                </Button>
                <Button disabled={state.kind !== "ready" || !desktopRuntime} onClick={() => void watchManagedFolder()} type="button" variant="quiet">
                  {t("settings.folders.watch")}
                </Button>
              </div>
              <div className={styles.searchLine}>
                <label className="workspace-route__field">
                  <span>{t("settings.folders.searchLocal")}</span>
                  <input
                    disabled={!desktopRuntime}
                    onChange={(event) => setFolderSearchQuery(event.target.value)}
                    placeholder={t("settings.folders.searchPlaceholder")}
                    value={folderSearchQuery}
                  />
                </label>
                <Button disabled={!desktopRuntime} onClick={() => void searchLocalFiles()} type="button" variant="quiet">
                  {t("common.search")}
                </Button>
              </div>
              {localFiles.length > 0 ? (
                <div className={styles.rows}>
                  {localFiles.map((file) => (
                    <div className={styles.row} key={file.localFileId}>
                      <span>
                        <strong>{file.name}</strong>
                        <small>{file.path}</small>
                      </span>
                      <div className={styles.inlineActions}>
                        <StatusBadge tone="neutral">{t("settings.value.local")}</StatusBadge>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void openLocalFile(file.localFileId)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          {t("common.open")}
                        </Button>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void reindexLocalFile(file.localFileId)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          {t("settings.folders.reindex")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassPanel>

            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>{t("settings.section.bubble")}</span>
                  <h2>{t("settings.bubble.title")}</h2>
                </div>
                <StatusBadge tone={enabledWidgetCount > 0 ? "personal" : "neutral"}>
                  {widgetBubbles.length > 0 ? t("settings.value.enabledCount", { count: enabledWidgetCount }) : t("settings.value.noData")}
                </StatusBadge>
              </div>
              {widgetBubbles.length > 0 ? (
                <div className={styles.bubbleGrid}>
                  {widgetBubbles.map((bubble) => (
                    <button className={styles.bubbleRow} key={bubble.id} onClick={() => void toggleWidgetBubble(bubble)} type="button">
                      <span>
                        <strong>{t(widgetBubbleLabels[bubble.bubbleType])}</strong>
                        <small>
                          {bubble.minimized ? t("settings.bubble.stateMinimized") : bubble.ghostMode ? t("settings.bubble.stateGhost") : t("settings.bubble.stateDefault")} · {bubble.alertEnabled ? t("settings.bubble.alertOn") : t("settings.bubble.alertOff")}
                        </small>
                      </span>
                      <span aria-checked={bubble.enabled} className={`${styles.toggle}${bubble.enabled ? ` ${styles.toggleOn}` : ""}`} role="switch">
                        <span />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyRow}>{t("settings.value.noData")}</div>
              )}
              <div className={styles.metrics}>
                <div>
                  <span>{t("settings.bubble.todayOpen")}</span>
                  <strong>{readySettings.widgetUsage ? readySettings.widgetUsage.totalOpenCount : "-"}</strong>
                </div>
                <div>
                  <span>{t("settings.bubble.todayInteraction")}</span>
                  <strong>{readySettings.widgetUsage ? readySettings.widgetUsage.totalInteractionCount : "-"}</strong>
                </div>
                <div>
                  <span>{t("settings.bubble.visibleTime")}</span>
                  <strong>{readySettings.widgetUsage ? t("settings.value.minutes", { count: Math.round(readySettings.widgetUsage.totalVisibleSeconds / 60) }) : "-"}</strong>
                </div>
              </div>
              <div className={styles.inlineActions}>
                <Button disabled={!desktopRuntime} onClick={() => void syncWidgetUsage()} type="button" variant="quiet">
                  {t("settings.bubble.syncUsage")}
                </Button>
                <Button disabled={!desktopRuntime} onClick={() => void recoverTimer()} type="button" variant="quiet">
                  {t("settings.bubble.recoverTimer")}
                </Button>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>{t("settings.section.backup")}</span>
                <h2>{t("settings.backup.title")}</h2>
              </div>
              <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>{desktopRuntime ? t("settings.value.localRun") : t("settings.value.appRequired")}</StatusBadge>
            </div>
            <p className={styles.mutedText}>{backupListLabel}</p>
            <div className={styles.recoveryGrid}>
              <button className={styles.row} disabled={!desktopRuntime} onClick={() => void checkLocalCache()} type="button">
                <span>
                  <strong>{t("settings.backup.checkCache")}</strong>
                  <small>{t("settings.backup.checkCacheDesc")}</small>
                </span>
                <StatusBadge tone="neutral">{t("settings.value.check")}</StatusBadge>
              </button>
              <button className={styles.row} disabled={!desktopRuntime} onClick={() => void backupLocalCache()} type="button">
                <span>
                  <strong>{t("settings.backup.create")}</strong>
                  <small>{t("settings.backup.createDesc")}</small>
                </span>
                <StatusBadge tone="neutral">{t("settings.value.backup")}</StatusBadge>
              </button>
              <button className={styles.row} disabled={!desktopRuntime || !lastBackupId} onClick={() => void restoreLocalCache()} type="button">
                <span>
                  <strong>{t("settings.backup.restore")}</strong>
                  <small>{lastBackupId ? t("settings.backup.restoreReady") : t("settings.backup.restoreNeed")}</small>
                </span>
                <StatusBadge tone="neutral">{t("settings.value.restore")}</StatusBadge>
              </button>
              <button className={styles.row} disabled={!desktopRuntime} onClick={() => void checkSyncOutbox()} type="button">
                <span>
                  <strong>{t("settings.backup.outbox")}</strong>
                  <small>{t("settings.backup.outboxDesc")}</small>
                </span>
                <StatusBadge tone="neutral">{t("settings.value.confirm")}</StatusBadge>
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </section>
  );
}
