"use client";

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
import { normalizeLocale, useI18n, type Locale, type MessageKey } from "@/lib/i18n";
import { recordCurrentActivityContext } from "@/lib/local/activity-client";
import {
  backupLocalSqlite,
  checkLocalSqliteIntegrity,
  getLocalCacheReadiness,
  recoverLocalTimerState,
  restoreLocalSqliteBackup,
} from "@/lib/local/local-cache-client";
import {
  scanPersonalManagedFolder,
  searchPersonalLocalFiles,
  selectPersonalManagedFolder,
  syncPersonalLocalFileEventsToServer,
  watchPersonalManagedFolder,
} from "@/lib/local/managed-folder-client";
import { syncLocalWidgetUsageSummaryToServer } from "@/lib/widget/widget-local-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands, type AppMonitorInfo, type AppMonitorPreference } from "@/lib/tauri/commands";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
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

// 번역 함수 시그니처. 모듈 레벨 헬퍼에 t를 넘길 때 사용한다.
type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

type SettingsData = {
  folders: ManagedFolderResponse[];
  notifications: NotificationPreferencesResponse | null;
  privacy: PrivacyConsentsResponse | null;
  storage: StorageUsageResponse | null;
  googleCalendarConnectUrl: string | null;
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
  widgetBubbles: null,
  widgetUsage: null,
};

const bubbleTypeKey: Record<WidgetBubbleType, MessageKey> = {
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
  descKey: MessageKey;
  key: keyof NotificationPreferencesResponse;
  titleKey: MessageKey;
}> = [
  { key: "messageEnabled", titleKey: "settings.notif.message.title", descKey: "settings.notif.message.desc" },
  { key: "commentEnabled", titleKey: "settings.notif.comment.title", descKey: "settings.notif.comment.desc" },
  { key: "resourceVersionEnabled", titleKey: "settings.notif.resource.title", descKey: "settings.notif.resource.desc" },
  { key: "agentEnabled", titleKey: "settings.notif.agent.title", descKey: "settings.notif.agent.desc" },
  { key: "capacityEnabled", titleKey: "settings.notif.capacity.title", descKey: "settings.notif.capacity.desc" },
];

const privacyRows: Array<{
  descKey: MessageKey;
  key: keyof PrivacyConsentsResponse;
  titleKey: MessageKey;
}> = [
  { key: "localFolderEnabled", titleKey: "settings.privacy.folder.title", descKey: "settings.privacy.folder.desc" },
  { key: "activityDetectionEnabled", titleKey: "settings.privacy.activity.title", descKey: "settings.privacy.activity.desc" },
  { key: "personalAgentLocalMemoryEnabled", titleKey: "settings.privacy.memory.title", descKey: "settings.privacy.memory.desc" },
  { key: "widgetUsageLocalEventEnabled", titleKey: "settings.privacy.widget.title", descKey: "settings.privacy.widget.desc" },
];

// 언어 라벨은 각 언어의 자기 표기(endonym)이므로 번역하지 않는다.
const localeOptions: Array<{ label: string; value: Locale }> = [
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

function storageLabel(storage: StorageUsageResponse | null, notReadyLabel: string) {
  if (!storage) return notReadyLabel;
  return `${byteLabel(storage.usedBytes)} / ${byteLabel(storage.limitBytes)}`;
}

function userToProfileDraft(user: AuthUser) {
  return {
    locale: user.locale ?? "ko",
    name: user.name,
    timezone: user.timezone ?? "Asia/Seoul",
  };
}

function localResultMessage<TData, TSummary>(result: LocalAdapterResult<TData, TSummary>) {
  if (result.status === "ready") return result.message ?? "완료했습니다";
  if (result.status === "pending") return result.message;
  if (result.status === "unavailable") return "데스크탑 앱에서 사용할 수 있습니다";
  return result.message;
}

function monitorLabel(monitor: AppMonitorInfo, index: number, t: Translate) {
  const name = monitor.name?.trim() || t("settings.folders.monitorFallback", { index: index + 1 });
  const primaryLabel = monitor.isPrimary ? ` · ${t("settings.folders.primaryTag")}` : "";
  return `${name}${primaryLabel} - ${monitor.size.width}x${monitor.size.height} @ ${monitor.position.x},${monitor.position.y}`;
}

function statusTone(value: string) {
  if (value.includes("못") || value.includes("필요") || value.includes("대기")) return "warning" as const;
  return "approved" as const;
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, setLocale } = useI18n();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [profileDraft, setProfileDraft] = useState(defaultProfileDraft);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [localActionMessage, setLocalActionMessage] = useState<string | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<Array<{ localFileId: string; name: string; path: string }>>([]);
  const [lastBackupId, setLastBackupId] = useState<string | null>(null);
  const [desktopRuntime, setDesktopRuntime] = useState(false);
  const [monitorPreference, setMonitorPreference] = useState<AppMonitorPreference | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setSaveMessage(null);
    setLocalActionMessage(null);

    try {
      const user = await authApi.getMe();
      const [notifications, privacy, storage, widgetBubbles, widgetUsage] = await Promise.allSettled([
        settingsApi.getNotificationPreferences(),
        settingsApi.getPrivacyConsents(),
        settingsApi.getStorageUsage(),
        widgetApi.getBubbles(),
        widgetApi.getTodayUsageRollups(),
      ]);

      setProfileDraft(userToProfileDraft(user));
      // 앱 진입 시 서버 locale을 우선 반영한다.
      setLocale(normalizeLocale(user.locale));
      setState({
        kind: "ready",
        settings: {
          folders: [],
          notifications: settledValue(notifications, null),
          privacy: settledValue(privacy, null),
          storage: settledValue(storage, null),
          googleCalendarConnectUrl: calendarApi.getGoogleConnectUrl(),
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
  }, [setLocale]);

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
        if (!cancelled) setLocalActionMessage("모니터 목록을 불러올 수 없습니다");
      });

    return () => {
      cancelled = true;
    };
  }, [desktopRuntime]);

  const updateReadyState = useCallback((updater: (current: Extract<PageState, { kind: "ready" }>) => Extract<PageState, { kind: "ready" }>) => {
    setState((current) => (current.kind === "ready" ? updater(current) : current));
  }, []);

  // 언어 버튼: 클릭 즉시 화면 언어를 미리보기로 전환한다.
  const selectLocale = useCallback(
    (nextLocale: Locale) => {
      setProfileDraft((draft) => ({ ...draft, locale: nextLocale }));
      setLocale(nextLocale);
    },
    [setLocale],
  );

  const saveProfile = useCallback(async () => {
    if (state.kind !== "ready") return;

    const previousLocale = normalizeLocale(state.user.locale);
    const nextUser = {
      ...state.user,
      locale: profileDraft.locale,
      name: profileDraft.name.trim() || state.user.name,
      timezone: profileDraft.timezone,
    };

    updateReadyState((current) => ({ ...current, user: nextUser }));
    setSaveMessage("표시 설정을 저장했습니다");

    try {
      const saved = await authApi.updateMe({
        locale: nextUser.locale,
        name: nextUser.name,
        timezone: nextUser.timezone,
      });
      updateReadyState((current) => ({ ...current, user: saved }));
      // 저장 성공 시 전역 locale을 서버가 확정한 값으로 동기화한다.
      setLocale(normalizeLocale(saved.locale));
    } catch {
      if (shouldUseWorkspacePreviewData()) return;
      // 저장 실패 시 미리보기로 바꾼 언어를 기존 값으로 롤백한다.
      setLocale(previousLocale);
      setSaveMessage("저장하지 못했습니다. 서버 연결을 확인하세요");
    }
  }, [profileDraft, setLocale, state, updateReadyState]);

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
      setSaveMessage("알림 설정을 저장했습니다");

      try {
        const patch: NotificationPreferencesUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updateNotificationPreferences(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, notifications: saved },
        }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setSaveMessage("알림 설정을 저장하지 못했습니다");
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
      setSaveMessage("기기 권한 설정을 저장했습니다");

      try {
        const patch: PrivacyConsentsUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updatePrivacyConsents(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, privacy: saved },
        }));
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setSaveMessage("기기 권한 설정을 저장하지 못했습니다");
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
      setSaveMessage("버블 표시 설정을 저장했습니다");

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
        setSaveMessage("버블 표시 설정을 저장하지 못했습니다");
      }
    },
    [state, updateReadyState],
  );

  const selectManagedFolder = useCallback(async () => {
    if (state.kind !== "ready") return;

    const result = await selectPersonalManagedFolder();
    setLocalActionMessage(localResultMessage(result));
    if (result.status !== "ready") return;

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

    setLocalActionMessage("개인 폴더를 로컬 앱에 연결했습니다");
  }, [state.kind, updateReadyState]);

  const checkLocalCache = useCallback(async () => {
    const result = await Promise.resolve(checkLocalSqliteIntegrity());
    if (result.status === "ready") {
      setLocalActionMessage(result.data.ok ? "로컬 캐시 상태가 정상입니다" : "로컬 캐시 복구가 필요합니다");
      return;
    }
    setLocalActionMessage(localResultMessage(result));
  }, []);

  const backupLocalCache = useCallback(async () => {
    const result = await Promise.resolve(backupLocalSqlite());
    if (result.status === "ready") {
      setLastBackupId(result.data.backupId);
      setLocalActionMessage(`백업을 만들었습니다 · ${result.data.fileName}`);
      return;
    }
    setLocalActionMessage(localResultMessage(result));
  }, []);

  const restoreLocalCache = useCallback(async () => {
    if (!lastBackupId) {
      setLocalActionMessage("먼저 백업을 만든 뒤 복구할 수 있습니다");
      return;
    }

    const result = await Promise.resolve(restoreLocalSqliteBackup({ backupId: lastBackupId }));
    setLocalActionMessage(result.status === "ready" ? "백업 복구를 완료했습니다" : localResultMessage(result));
  }, [lastBackupId]);

  const scanManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders.find((folder) => folder.syncEnabled)?.id : undefined;
    if (!folderId) {
      setLocalActionMessage("먼저 개인 폴더를 선택하세요");
      return;
    }

    const result = await scanPersonalManagedFolder({ localFolderId: folderId });
    setLocalActionMessage(result.status === "ready" ? `폴더 변경 ${result.data.changedCount}건 감지` : localResultMessage(result));
  }, [state]);

  const watchManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders.find((folder) => folder.syncEnabled)?.id : undefined;
    if (!folderId) {
      setLocalActionMessage("먼저 개인 폴더를 선택하세요");
      return;
    }

    const result = await watchPersonalManagedFolder({ localFolderId: folderId });
    setLocalActionMessage(result.status === "ready" ? "폴더 감시를 켰습니다" : localResultMessage(result));
  }, [state]);

  const searchLocalFiles = useCallback(async () => {
    const query = folderSearchQuery.trim();
    if (!query) {
      setLocalActionMessage("검색어를 입력하세요");
      return;
    }

    const result = await searchPersonalLocalFiles({ limit: 20, query });
    if (result.status === "ready") {
      setLocalFiles(result.data.items.map((item) => ({ localFileId: item.localFileId, name: item.name, path: item.path })));
      setLocalActionMessage(`로컬 파일 ${result.data.items.length}건 검색됨`);
      return;
    }

    setLocalFiles([]);
    setLocalActionMessage(localResultMessage(result));
  }, [folderSearchQuery]);

  const readActivity = useCallback(async () => {
    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.activityDetectionEnabled) : false;
    const result = await recordCurrentActivityContext({ consentGranted });
    if (result.status === "ready") {
      setLocalActionMessage(`활동 감지 · ${result.data.appName}${result.data.windowTitle ? ` · ${result.data.windowTitle}` : ""}`);
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, [state]);

  const selectAppMonitor = useCallback(
    async (monitorId: string) => {
      if (!desktopRuntime) return;

      try {
        const preference = await tauriCommands.setPreferredAppMonitor({ monitorId });
        setMonitorPreference(preference);
        setLocalActionMessage("앱 표시 모니터를 저장했습니다");
      } catch {
        setLocalActionMessage("앱 표시 모니터를 저장하지 못했습니다");
      }
    },
    [desktopRuntime],
  );

  const openGoogleCalendarConnect = useCallback(() => {
    if (state.kind !== "ready" || !state.settings.googleCalendarConnectUrl) return;
    window.location.assign(state.settings.googleCalendarConnectUrl);
  }, [state]);

  const checkSyncOutbox = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
    const result = await syncPersonalLocalFileEventsToServer(folderId ? { localFolderId: folderId } : undefined);
    setLocalActionMessage(localResultMessage(result));
  }, [state]);

  const syncWidgetUsage = useCallback(async () => {
    const result = await syncLocalWidgetUsageSummaryToServer();
    setLocalActionMessage(localResultMessage(result));
  }, []);

  const recoverTimer = useCallback(async () => {
    const result = await Promise.resolve(recoverLocalTimerState());
    if (result.status === "ready") {
      setLocalActionMessage(result.data.recoveryRequired ? "타이머 복구가 필요합니다" : "타이머 상태가 정상입니다");
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, []);

  const readySettings = state.kind === "ready" ? state.settings : emptySettings;
  const notificationSettings = readySettings.notifications ?? defaultNotifications;
  const privacySettings = readySettings.privacy ?? defaultPrivacy;
  const activeFolders = readySettings.folders.filter((folder) => folder.syncEnabled);
  const widgetBubbles = readySettings.widgetBubbles ?? [];
  const enabledWidgetCount = widgetBubbles.filter((bubble) => bubble.enabled).length;
  const localCacheReadiness = getLocalCacheReadiness();

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
          {localActionMessage ? <StatusBadge tone={statusTone(localActionMessage)}>{localActionMessage}</StatusBadge> : null}
          {saveMessage ? <StatusBadge tone={statusTone(saveMessage)}>{saveMessage}</StatusBadge> : null}
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
              <small>{state.kind === "ready" ? state.user.email : t("settings.value.shownAfterConnect")}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.notifications")}</span>
              <strong>
                {state.kind === "ready"
                  ? t("settings.value.enabledCount", { count: enabledCount(notificationSettings) })
                  : t("settings.value.beforeCheck")}
              </strong>
              <small>{readySettings.notifications ? t("settings.value.serverSetting") : t("settings.status.waiting")}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.desktopApp")}</span>
              <strong>{desktopRuntime ? t("settings.value.running") : t("settings.value.appOnly")}</strong>
              <small>{desktopRuntime ? t("settings.value.tauriRunning") : t("settings.value.browserReadonly")}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>{t("settings.card.storage")}</span>
              <strong>{storageLabel(readySettings.storage, t("settings.value.beforeCheck"))}</strong>
              <small>{readySettings.storage ? t("settings.value.serverUsage") : t("settings.value.noData")}</small>
            </GlassPanel>
          </div>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>{t("settings.card.account")}</span>
                <h2>{t("settings.account.title")}</h2>
              </div>
              <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>
                {state.kind === "ready" ? t("settings.value.connected") : t("settings.value.beforeConnect")}
              </StatusBadge>
            </div>
            <div className={styles.accountGrid}>
              <div className={styles.identity}>
                <span>{t("settings.account.name")}</span>
                <strong>{state.kind === "ready" ? state.user.name : t("settings.value.shownAfterConnect")}</strong>
              </div>
              <div className={styles.identity}>
                <span>{t("settings.account.email")}</span>
                <strong>{state.kind === "ready" ? state.user.email : t("settings.value.shownAfterConnect")}</strong>
              </div>
              <div className={styles.identity}>
                <span>Bubli ID</span>
                <strong>{state.kind === "ready" ? state.user.bubliId : t("settings.value.noData")}</strong>
              </div>
              <div className={styles.actions}>
                <Button disabled={state.kind !== "ready"} onClick={() => void logout()} type="button" variant="quiet">
                  {t("settings.account.logout")}
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
                {t("settings.save")}
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
                      onClick={() => selectLocale(option.value)}
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
                  {readySettings.notifications
                    ? t("settings.value.enabledCount", { count: enabledCount(notificationSettings) })
                    : t("settings.status.waiting")}
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
                      <small>{t(row.descKey)}</small>
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
                  {readySettings.privacy
                    ? t("settings.value.consentCount", { count: enabledCount(privacySettings) })
                    : t("settings.status.waiting")}
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
                      <small>{t(row.descKey)}</small>
                    </span>
                    <span aria-checked={privacySettings[row.key]} className={`${styles.toggle}${privacySettings[row.key] ? ` ${styles.toggleOn}` : ""}`} role="switch">
                      <span />
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles.guard}>{t("settings.privacy.guard")}</p>
              <Button disabled={!desktopRuntime || state.kind !== "ready"} onClick={() => void readActivity()} type="button" variant="quiet">
                {t("settings.privacy.recordActivity")}
              </Button>
            </GlassPanel>
          </div>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>{t("settings.card.desktopApp")}</span>
                  <h2>{t("settings.folders.title")}</h2>
                </div>
                <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>
                  {desktopRuntime ? t("settings.value.appRunning") : t("settings.value.availableInApp")}
                </StatusBadge>
              </div>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>
                    <strong>{t("settings.folders.localSqlite")}</strong>
                    <small>
                      {localCacheReadiness.status === "ready"
                        ? t("settings.folders.cacheAvailable")
                        : t("settings.folders.cacheUnavailable")}
                    </small>
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
                        {monitorLabel(monitor, index, t)}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFolders.length > 0 ? (
                  activeFolders.map((folder) => (
                    <div className={styles.row} key={folder.id}>
                      <span>
                        <strong>{folder.name}</strong>
                        <small>{folder.localPath ?? t("settings.folders.localPathAppOnly")}</small>
                      </span>
                      <StatusBadge tone="approved">{t("settings.value.synced")}</StatusBadge>
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
                      <StatusBadge tone="neutral">{t("settings.value.local")}</StatusBadge>
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
                  {widgetBubbles.length > 0
                    ? t("settings.value.enabledCount", { count: enabledWidgetCount })
                    : t("settings.value.noData")}
                </StatusBadge>
              </div>
              {widgetBubbles.length > 0 ? (
                <div className={styles.bubbleGrid}>
                  {widgetBubbles.map((bubble) => (
                    <button className={styles.bubbleRow} key={bubble.id} onClick={() => void toggleWidgetBubble(bubble)} type="button">
                      <span>
                        <strong>{t(bubbleTypeKey[bubble.bubbleType])}</strong>
                        <small>
                          {bubble.minimized
                            ? t("settings.bubble.stateMinimized")
                            : bubble.ghostMode
                              ? t("settings.bubble.stateGhost")
                              : t("settings.bubble.stateDefault")}{" "}
                          · {bubble.alertEnabled ? t("settings.bubble.alertOn") : t("settings.bubble.alertOff")}
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
                  <strong>
                    {readySettings.widgetUsage
                      ? t("settings.value.minutes", { count: Math.round(readySettings.widgetUsage.totalVisibleSeconds / 60) })
                      : "-"}
                  </strong>
                </div>
              </div>
              <div className={styles.inlineActions}>
                <Link className="bubli-button" href="/app/desktop/widgets">
                  {t("settings.bubble.screen")}
                </Link>
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
              <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>
                {desktopRuntime ? t("settings.value.localRun") : t("settings.value.appRequired")}
              </StatusBadge>
            </div>
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
