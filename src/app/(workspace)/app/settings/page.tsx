"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { authApi } from "@/features/auth/api/authApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { Locale, MessageKey, TranslateVars } from "@/lib/i18n";
import {
  backupLocalSqlite,
  checkLocalSqliteIntegrity,
  listLocalSqliteBackups,
  restoreLocalSqliteBackup,
} from "@/lib/local/local-cache-client";
import {
  listPersonalManagedFolders,
  removePersonalManagedFolder,
  selectPersonalManagedFolder,
  setPersonalManagedFolderSync,
  syncPersonalLocalFileEventsToServer,
} from "@/lib/local/managed-folder-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  tauriCommands,
  type AppMonitorInfo,
  type AppMonitorPreference,
  type SqliteIntegrityResult,
} from "@/lib/tauri/commands";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { AuthUser } from "@/types/api/auth";
import type { NotificationPreferencesResponse, NotificationPreferencesUpdateRequest } from "@/types/api/notification";
import type {
  ManagedFolderResponse,
  PrivacyConsentsResponse,
  PrivacyConsentsUpdateRequest,
  StorageUsageResponse,
} from "@/types/api/settings";
import type { WidgetBubbleSettingResponse, WidgetBubbleType } from "@/types/api/widget";
import type { LocalAdapterResult } from "@/types/local";

import styles from "./settings-page.module.css";

type SettingsData = {
  folders: ManagedFolderResponse[];
  googleCalendarConnectUrl: string | null;
  googleCalendarConnected: boolean;
  notifications: NotificationPreferencesResponse | null;
  privacy: PrivacyConsentsResponse | null;
  storage: StorageUsageResponse | null;
  widgetBubbles: WidgetBubbleSettingResponse[] | null;
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
  googleCalendarConnectUrl: null,
  googleCalendarConnected: false,
  notifications: null,
  privacy: null,
  storage: null,
  widgetBubbles: null,
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

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
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

function localSqliteDiagnosticsLabel(result: SqliteIntegrityResult) {
  const freePages = Math.max(0, result.freelistCount);
  return `DB ${byteLabel(result.databaseSizeBytes)} · WAL ${byteLabel(result.walSizeBytes)} · ${result.pageCount} pages · free ${freePages} · ${result.journalMode}`;
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

type StatusMessage = { text: string; tone: "approved" | "warning" };

type NavItem = { id: string; labelKey: MessageKey };

export default function SettingsPage() {
  const { t, setLocale } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [nameDraft, setNameDraft] = useState("");
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [lastBackupId, setLastBackupId] = useState<string | null>(null);
  const [backupListLabel, setBackupListLabel] = useState<string | null>(null);
  const [desktopRuntime, setDesktopRuntime] = useState(false);
  const [monitorPreference, setMonitorPreference] = useState<AppMonitorPreference | null>(null);
  const [copiedBubliId, setCopiedBubliId] = useState(false);

  // Bubli ID 복사 — 소통 탭 친구 관리 모달의 복사 패턴과 동일하게 짧은 "복사됨" 피드백을 준다.
  const copyBubliId = useCallback(async (bubliId: string) => {
    if (!bubliId) return;

    try {
      await navigator.clipboard.writeText(bubliId);
      setCopiedBubliId(true);
      window.setTimeout(() => setCopiedBubliId(false), 1600);
    } catch {
      setCopiedBubliId(false);
    }
  }, []);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setMessage(null);

    try {
      const user = await authApi.getMe();
      const [notifications, privacy, storage, widgetBubbles, localFolders, googleConnection] = await Promise.allSettled([
        settingsApi.getNotificationPreferences(),
        settingsApi.getPrivacyConsents(),
        settingsApi.getStorageUsage(),
        widgetApi.getBubbles(),
        listPersonalManagedFolders(),
        calendarApi.getGoogleConnection(),
      ]);
      const folderResult = settledValue(localFolders, null);

      setNameDraft(user.name);
      setState({
        kind: "ready",
        settings: {
          folders:
            folderResult?.status === "ready"
              ? folderResult.data.folders.map(localManagedFolderToSettingsFolder)
              : [],
          googleCalendarConnectUrl: calendarApi.getGoogleConnectUrl(),
          googleCalendarConnected: googleConnection.status === "fulfilled" && googleConnection.value?.status === "ACTIVE",
          notifications: settledValue(notifications, null),
          privacy: settledValue(privacy, null),
          storage: settledValue(storage, null),
          widgetBubbles: settledValue(widgetBubbles, null),
        },
        user,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      setNameDraft("");
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
        if (!cancelled) setMessage({ text: t("settings.msg.monitorLoadFailed"), tone: "warning" });
      });

    return () => {
      cancelled = true;
    };
  }, [desktopRuntime, t]);

  const updateReadyState = useCallback((updater: (current: Extract<PageState, { kind: "ready" }>) => Extract<PageState, { kind: "ready" }>) => {
    setState((current) => (current.kind === "ready" ? updater(current) : current));
  }, []);

  const restoreManagedFolderWatchers = useCallback(async () => {
    if (!desktopRuntime) return;
    await tauriCommands.watchAllManagedFolders().catch(() => undefined);
  }, [desktopRuntime]);

  useEffect(() => {
    if (state.kind !== "ready" || !state.settings.privacy?.localFolderEnabled || state.settings.folders.length === 0) {
      return;
    }

    void restoreManagedFolderWatchers();
  }, [restoreManagedFolderWatchers, state]);

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
  }, [desktopRuntime, t]);

  const saveProfile = useCallback(
    async (patch: Partial<Pick<AuthUser, "locale" | "name" | "timezone">>) => {
      if (state.kind !== "ready") return;

      const nextUser: AuthUser = { ...state.user, ...patch };
      updateReadyState((current) => ({ ...current, user: nextUser }));
      if (patch.locale) setLocale(patch.locale as Locale);
      setMessage({ text: t("settings.msg.displaySaved"), tone: "approved" });

      try {
        const saved = await authApi.updateMe({
          locale: nextUser.locale ?? "ko",
          name: nextUser.name,
          timezone: nextUser.timezone ?? "Asia/Seoul",
        });
        updateReadyState((current) => ({ ...current, user: saved }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setMessage({ text: t("settings.msg.saveFailed"), tone: "warning" });
      }
    },
    [setLocale, state, t, updateReadyState],
  );

  const saveName = useCallback(() => {
    if (state.kind !== "ready") return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === state.user.name) return;
    void saveProfile({ name: trimmed });
  }, [nameDraft, saveProfile, state]);

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
      setMessage({ text: t("settings.msg.notifSaved"), tone: "approved" });

      try {
        const patch: NotificationPreferencesUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updateNotificationPreferences(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, notifications: saved },
        }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setMessage({ text: t("settings.msg.notifSaveFailed"), tone: "warning" });
      }
    },
    [state, t, updateReadyState],
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
      setMessage({ text: t("settings.msg.privacySaved"), tone: "approved" });

      try {
        const patch: PrivacyConsentsUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updatePrivacyConsents(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, privacy: saved },
        }));
        if (key === "localFolderEnabled" && saved.localFolderEnabled) {
          void restoreManagedFolderWatchers();
        }
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setMessage({ text: t("settings.msg.privacySaveFailed"), tone: "warning" });
      }
    },
    [restoreManagedFolderWatchers, state, t, updateReadyState],
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
      setMessage({ text: t("settings.msg.bubbleSaved"), tone: "approved" });

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
        setMessage({ text: t("settings.msg.bubbleSaveFailed"), tone: "warning" });
      }
    },
    [state, t, updateReadyState],
  );

  const openGoogleCalendarConnect = useCallback(() => {
    if (state.kind !== "ready" || !state.settings.googleCalendarConnectUrl) return;
    window.location.assign(state.settings.googleCalendarConnectUrl);
  }, [state]);

  const disconnectGoogleCalendar = useCallback(async () => {
    if (state.kind !== "ready") return;

    try {
      await calendarApi.disconnectGoogleConnection();
      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, googleCalendarConnected: false },
      }));
      setMessage({ text: t("settings.msg.gcalDisconnected"), tone: "approved" });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setMessage({ text: t("settings.msg.gcalDisconnectFailed"), tone: "warning" });
    }
  }, [state.kind, t, updateReadyState]);

  const selectManagedFolder = useCallback(async () => {
    if (state.kind !== "ready") return;

    const consentGranted = Boolean(state.settings.privacy?.localFolderEnabled);
    const result = await selectPersonalManagedFolder({ consentGranted });
    if (result.status !== "ready") {
      setMessage({ text: localResultMessage(t, result), tone: "warning" });
      return;
    }

    const folder = result.data;
    const fallbackFolder: ManagedFolderResponse = {
      createdAt: new Date().toISOString(),
      id: folder.localFolderId,
      localPath: folder.path,
      name: folder.name,
      syncEnabled: true,
      updatedAt: new Date().toISOString(),
    };

    updateReadyState((ready) => ({
      ...ready,
      settings: {
        ...ready.settings,
        folders: [fallbackFolder, ...ready.settings.folders.filter((item) => item.id !== fallbackFolder.id)],
      },
    }));

    setMessage({ text: t("settings.msg.folderConnected"), tone: "approved" });
    void restoreManagedFolderWatchers();
  }, [restoreManagedFolderWatchers, state, t, updateReadyState]);

  const toggleManagedFolderSync = useCallback(
    async (folder: ManagedFolderResponse) => {
      const result = await setPersonalManagedFolderSync({
        consentGranted: Boolean(state.kind === "ready" && state.settings.privacy?.localFolderEnabled),
        enabled: !folder.syncEnabled,
        localFolderId: folder.id,
      });
      if (result.status !== "ready") {
        setMessage({ text: localResultMessage(t, result), tone: "warning" });
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
      setMessage(
        result.data.syncEnabled
          ? { text: t("settings.msg.syncOn", { pending: result.data.pendingEventCount }), tone: "approved" }
          : { text: t("settings.msg.syncOff"), tone: "approved" },
      );
      if (result.data.syncEnabled) {
        void restoreManagedFolderWatchers();
      }
    },
    [restoreManagedFolderWatchers, state, t, updateReadyState],
  );

  const removeManagedFolder = useCallback(
    async (folder: ManagedFolderResponse) => {
      const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.localFolderEnabled) : false;
      const result = await removePersonalManagedFolder({ consentGranted, localFolderId: folder.id });
      if (result.status !== "ready") {
        setMessage({ text: localResultMessage(t, result), tone: "warning" });
        return;
      }

      updateReadyState((ready) => ({
        ...ready,
        settings: {
          ...ready.settings,
          folders: ready.settings.folders.filter((item) => item.id !== folder.id),
        },
      }));
      setMessage({ text: t("settings.msg.folderRemoved"), tone: "approved" });
    },
    [state, t, updateReadyState],
  );

  const selectAppMonitor = useCallback(
    async (monitorId: string) => {
      if (!desktopRuntime) return;

      try {
        const preference = await tauriCommands.setPreferredAppMonitor({ monitorId });
        setMonitorPreference(preference);
        setMessage({ text: t("settings.msg.monitorSaved"), tone: "approved" });
      } catch {
        setMessage({ text: t("settings.msg.monitorSaveFailed"), tone: "warning" });
      }
    },
    [desktopRuntime, t],
  );

  const checkLocalCache = useCallback(async () => {
    const result = await Promise.resolve(checkLocalSqliteIntegrity());
    if (result.status === "ready") {
      const detail = localSqliteDiagnosticsLabel(result.data);
      setMessage(
        result.data.ok
          ? { text: `${t("settings.msg.cacheHealthy")} · ${detail}`, tone: "approved" }
          : { text: `${t("settings.msg.cacheNeedsRecovery")} · ${result.data.quickCheck} · ${detail}`, tone: "warning" },
      );
      return;
    }
    setMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [t]);

  const backupLocalCache = useCallback(async () => {
    const result = await Promise.resolve(backupLocalSqlite());
    if (result.status === "ready") {
      setLastBackupId(result.data.backupId);
      setBackupListLabel(t("settings.msg.backupRecent", { fileName: result.data.fileName }));
      setMessage({ text: t("settings.msg.backupCreated", { fileName: result.data.fileName }), tone: "approved" });
      return;
    }
    setMessage({ text: localResultMessage(t, result), tone: "warning" });
  }, [t]);

  const restoreLocalCache = useCallback(async () => {
    if (!lastBackupId) {
      setMessage({ text: t("settings.msg.backupNeeded"), tone: "warning" });
      return;
    }

    const result = await Promise.resolve(restoreLocalSqliteBackup({ backupId: lastBackupId }));
    setMessage(
      result.status === "ready"
        ? {
            text: result.data.requiresRestart ? t("settings.msg.restoreQueued") : t("settings.msg.restoreDone"),
            tone: "approved",
          }
        : { text: localResultMessage(t, result), tone: "warning" },
    );
  }, [lastBackupId, t]);

  const checkSyncOutbox = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.localFolderEnabled) : false;
    const result = await syncPersonalLocalFileEventsToServer(
      folderId ? { consentGranted, localFolderId: folderId } : { consentGranted },
    );
    setMessage({ text: localResultMessage(t, result), tone: result.status === "ready" ? "approved" : "warning" });
  }, [state, t]);

  const ready = state.kind === "ready";
  const readySettings = ready ? state.settings : emptySettings;
  const notificationSettings = readySettings.notifications ?? defaultNotifications;
  const privacySettings = readySettings.privacy ?? defaultPrivacy;
  const managedFolders = readySettings.folders;
  const widgetBubbles = readySettings.widgetBubbles ?? [];
  const currentLocale = ready ? (state.user.locale ?? "ko") : "ko";
  const currentTimezone = ready ? (state.user.timezone ?? "Asia/Seoul") : "Asia/Seoul";
  const googleConnected = ready && state.settings.googleCalendarConnected;
  const nameDirty = ready && nameDraft.trim().length > 0 && nameDraft.trim() !== state.user.name;

  const navItems: NavItem[] = [
    { id: "settings-account", labelKey: "settings.nav.account" },
    { id: "settings-preferences", labelKey: "settings.nav.preferences" },
    { id: "settings-notifications", labelKey: "settings.nav.notifications" },
    { id: "settings-integrations", labelKey: "settings.nav.integrations" },
    { id: "settings-privacy", labelKey: "settings.nav.privacy" },
    { id: "settings-widget", labelKey: "settings.nav.widget" },
    ...(desktopRuntime ? [{ id: "settings-desktop", labelKey: "settings.nav.desktop" } satisfies NavItem] : []),
  ];

  return (
    <section className={`workspace-route ${styles.route}`} aria-labelledby="settings-title">
      <header className={`${styles.routeHeader} workspace-route__header`}>
        <div>
          <span className={styles.kicker}>{t("settings.kicker")}</span>
          <h1 id="settings-title">{t("settings.title")}</h1>
          <p>{t("settings.subtitle")}</p>
        </div>
        {message ? (
          <div aria-live="polite" className={styles.messageLine}>
            <StatusBadge tone={message.tone}>{message.text}</StatusBadge>
          </div>
        ) : null}
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
          <nav aria-label={t("settings.nav.aria")} className={styles.nav}>
            {navItems.map((item) => (
              <a className={styles.navLink} href={`#${item.id}`} key={item.id}>
                {t(item.labelKey)}
              </a>
            ))}
          </nav>

          <div className={styles.sections}>
            <GlassPanel className={styles.section} id="settings-account">
              <h2>{t("settings.nav.account")}</h2>
              <p className={styles.sectionDesc}>{t("settings.account.desc")}</p>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.account.name")}</strong>
                    <p>{t("settings.account.nameDesc")}</p>
                  </div>
                  <div className={styles.rowControl}>
                    <input
                      aria-label={t("settings.account.name")}
                      className={styles.textInput}
                      disabled={!ready}
                      onChange={(event) => setNameDraft(event.target.value)}
                      value={nameDraft}
                    />
                    <Button disabled={!nameDirty} onClick={saveName} size="sm" type="button" variant="primary">
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.account.identifier")}</strong>
                  </div>
                  <span className={styles.rowValue}>
                    {ready ? userContactLabel(t, state.user) : t("settings.value.shownAfterConnect")}
                  </span>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.account.bubliId")}</strong>
                  </div>
                  <div className={styles.rowControl}>
                    <span className={styles.rowValue}>{ready ? state.user.bubliId : t("settings.value.noData")}</span>
                    <Button
                      disabled={!ready || !state.user.bubliId}
                      icon={copiedBubliId ? <Check aria-hidden size={14} strokeWidth={2.2} /> : <Copy aria-hidden size={14} strokeWidth={2} />}
                      onClick={() => void copyBubliId(ready ? state.user.bubliId : "")}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      {copiedBubliId ? t("settings.account.copied") : t("settings.account.copy")}
                    </Button>
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.card.storage")}</strong>
                    <p>{t("settings.value.serverUsage")}</p>
                  </div>
                  <span className={styles.rowValue}>{storageLabel(t, readySettings.storage)}</span>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("common.logout")}</strong>
                    <p>{t("settings.account.logoutDesc")}</p>
                  </div>
                  <Button disabled={!ready} onClick={() => void logout()} size="sm" type="button" variant="quiet">
                    {t("common.logout")}
                  </Button>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className={styles.section} id="settings-preferences">
              <h2>{t("settings.nav.preferences")}</h2>
              <p className={styles.sectionDesc}>{t("settings.pref.desc")}</p>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.language")}</strong>
                    <p>{t("settings.pref.languageDesc")}</p>
                  </div>
                  <div aria-label={t("settings.display.languageAria")} className={styles.segmented} role="radiogroup">
                    {localeOptions.map((option) => (
                      <button
                        aria-checked={currentLocale === option.value}
                        className={currentLocale === option.value ? styles.segmentedActive : ""}
                        disabled={!ready}
                        key={option.value}
                        onClick={() => void saveProfile({ locale: option.value })}
                        role="radio"
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.display.timezone")}</strong>
                    <p>{t("settings.pref.timezoneDesc")}</p>
                  </div>
                  <select
                    aria-label={t("settings.display.timezone")}
                    className={styles.selectControl}
                    disabled={!ready}
                    onChange={(event) => void saveProfile({ timezone: event.target.value })}
                    value={currentTimezone}
                  >
                    {timezoneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.display.theme")}</strong>
                    <p>{t("settings.pref.themeDesc")}</p>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className={styles.section} id="settings-notifications">
              <h2>{t("settings.nav.notifications")}</h2>
              <p className={styles.sectionDesc}>{t("settings.notif.sectionDesc")}</p>
              <div className={styles.rows}>
                {notificationRows.map((row) => (
                  <div className={styles.row} key={row.key}>
                    <div className={styles.rowText}>
                      <strong>{t(row.titleKey)}</strong>
                      <p>{t(row.descriptionKey)}</p>
                    </div>
                    <button
                      aria-checked={notificationSettings[row.key]}
                      aria-label={t(row.titleKey)}
                      className={`${styles.toggle}${notificationSettings[row.key] ? ` ${styles.toggleOn}` : ""}`}
                      disabled={!ready || !readySettings.notifications}
                      onClick={() => void toggleNotification(row.key)}
                      role="switch"
                      type="button"
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className={styles.section} id="settings-integrations">
              <h2>{t("settings.nav.integrations")}</h2>
              <p className={styles.sectionDesc}>{t("settings.integration.desc")}</p>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>Google Calendar</strong>
                    <p>
                      {googleConnected
                        ? t("settings.gcal.connectedDesc")
                        : ready
                          ? t("settings.gcal.canConnect")
                          : t("settings.gcal.afterLogin")}
                    </p>
                  </div>
                  <div className={styles.rowControl}>
                    {googleConnected ? (
                      <>
                        <StatusBadge tone="approved">{t("settings.gcal.connected")}</StatusBadge>
                        <Button onClick={openGoogleCalendarConnect} size="sm" type="button" variant="secondary">
                          {t("settings.gcal.reconnectCta")}
                        </Button>
                        <Button onClick={() => void disconnectGoogleCalendar()} size="sm" type="button" variant="quiet">
                          {t("settings.gcal.disconnectCta")}
                        </Button>
                      </>
                    ) : (
                      <Button disabled={!ready} onClick={openGoogleCalendarConnect} size="sm" type="button" variant="primary">
                        {t("settings.gcal.connectCta")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.sectionFoot}>
                <Link className="bubli-button bubli-button--sm" href="/app/calendar">
                  {t("settings.gcal.viewCalendar")}
                </Link>
              </div>
            </GlassPanel>

            <GlassPanel className={styles.section} id="settings-privacy">
              <h2>{t("settings.nav.privacy")}</h2>
              <p className={styles.sectionDesc}>{t("settings.privacy.desc")}</p>
              <div className={styles.rows}>
                {privacyRows.map((row) => (
                  <div className={styles.row} key={row.key}>
                    <div className={styles.rowText}>
                      <strong>{t(row.titleKey)}</strong>
                      <p>{t(row.descriptionKey)}</p>
                    </div>
                    <button
                      aria-checked={privacySettings[row.key]}
                      aria-label={t(row.titleKey)}
                      className={`${styles.toggle}${privacySettings[row.key] ? ` ${styles.toggleOn}` : ""}`}
                      disabled={!ready || !readySettings.privacy}
                      onClick={() => void togglePrivacy(row.key)}
                      role="switch"
                      type="button"
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>
              <p className={styles.guard}>{t("settings.privacy.guard")}</p>
            </GlassPanel>

            <GlassPanel className={styles.section} id="settings-widget">
              <h2>{t("settings.widget.title")}</h2>
              <p className={styles.sectionDesc}>{t("settings.widget.desc")}</p>
              {widgetBubbles.length > 0 ? (
                <div className={styles.rows}>
                  {widgetBubbles.map((bubble) => (
                    <div className={styles.row} key={bubble.id}>
                      <div className={styles.rowText}>
                        <strong>{t(widgetBubbleLabels[bubble.bubbleType])}</strong>
                      </div>
                      <button
                        aria-checked={bubble.enabled}
                        aria-label={t(widgetBubbleLabels[bubble.bubbleType])}
                        className={`${styles.toggle}${bubble.enabled ? ` ${styles.toggleOn}` : ""}`}
                        disabled={!ready}
                        onClick={() => void toggleWidgetBubble(bubble)}
                        role="switch"
                        type="button"
                      >
                        <span />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyRow}>{t("settings.value.noData")}</p>
              )}
            </GlassPanel>

            {desktopRuntime ? (
              <GlassPanel className={styles.section} id="settings-desktop">
                <h2>{t("settings.nav.desktop")}</h2>
                <p className={styles.sectionDesc}>{t("settings.desktop.desc")}</p>
                <div className={styles.rows}>
                  <div className={styles.row}>
                    <div className={styles.rowText}>
                      <strong>{t("settings.folders.appMonitor")}</strong>
                      <p>{t("settings.folders.appMonitorDesc")}</p>
                    </div>
                    <select
                      aria-label={t("settings.folders.appMonitor")}
                      className={styles.selectControl}
                      disabled={!monitorPreference}
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
                </div>

                <h3 className={styles.subhead}>{t("settings.desktop.folders")}</h3>
                <div className={styles.rows}>
                  {managedFolders.length > 0 ? (
                    managedFolders.map((folder) => (
                      <div className={styles.row} key={folder.id}>
                        <div className={styles.rowText}>
                          <strong>{folder.name}</strong>
                          <p>{folder.localPath ?? t("settings.folders.localPathAppOnly")}</p>
                        </div>
                        <div className={styles.rowControl}>
                          <button
                            aria-checked={folder.syncEnabled}
                            aria-label={folder.syncEnabled ? t("settings.folders.syncDisable") : t("settings.folders.syncEnable")}
                            className={`${styles.toggle}${folder.syncEnabled ? ` ${styles.toggleOn}` : ""}`}
                            onClick={() => void toggleManagedFolderSync(folder)}
                            role="switch"
                            type="button"
                          >
                            <span />
                          </button>
                          <Button onClick={() => void removeManagedFolder(folder)} size="sm" type="button" variant="quiet">
                            {t("settings.folders.disconnect")}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyRow}>{t("settings.folders.noFolder")}</p>
                  )}
                </div>
                <div className={styles.sectionFoot}>
                  <Button disabled={!ready} onClick={() => void selectManagedFolder()} size="sm" type="button" variant="primary">
                    {t("settings.folders.selectFolder")}
                  </Button>
                </div>

                <h3 className={styles.subhead}>{t("settings.backup.title")}</h3>
                <div className={styles.rows}>
                  <div className={styles.row}>
                    <div className={styles.rowText}>
                      <strong>{t("settings.backup.checkCache")}</strong>
                      <p>{t("settings.backup.checkCacheDesc")}</p>
                    </div>
                    <Button onClick={() => void checkLocalCache()} size="sm" type="button" variant="secondary">
                      {t("settings.value.check")}
                    </Button>
                  </div>
                  <div className={styles.row}>
                    <div className={styles.rowText}>
                      <strong>{t("settings.backup.create")}</strong>
                      <p>{t("settings.backup.createDesc")}</p>
                    </div>
                    <Button onClick={() => void backupLocalCache()} size="sm" type="button" variant="secondary">
                      {t("settings.value.backup")}
                    </Button>
                  </div>
                  <div className={styles.row}>
                    <div className={styles.rowText}>
                      <strong>{t("settings.backup.restore")}</strong>
                      <p>{backupListLabel ?? (lastBackupId ? t("settings.backup.restoreReady") : t("settings.backup.restoreNeed"))}</p>
                    </div>
                    <Button disabled={!lastBackupId} onClick={() => void restoreLocalCache()} size="sm" type="button" variant="secondary">
                      {t("settings.value.restore")}
                    </Button>
                  </div>
                  <div className={styles.row}>
                    <div className={styles.rowText}>
                      <strong>{t("settings.backup.outbox")}</strong>
                      <p>{t("settings.backup.outboxDesc")}</p>
                    </div>
                    <Button onClick={() => void checkSyncOutbox()} size="sm" type="button" variant="secondary">
                      {t("settings.value.confirm")}
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
