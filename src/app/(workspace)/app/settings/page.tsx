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
import { recordCurrentActivityContext } from "@/lib/local/activity-client";
import {
  backupLocalSqlite,
  checkLocalSqliteIntegrity,
  getLocalCacheReadiness,
  recoverLocalTimerState,
  restoreLocalSqliteBackup,
} from "@/lib/local/local-cache-client";
import {
  getPersonalManagedFolderIndexProgress,
  openPersonalLocalFile,
  reindexPersonalLocalFile,
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

const widgetBubbleLabels: Record<WidgetBubbleType, string> = {
  AGENT: "에이전트",
  ALERT: "알림",
  CHAT: "대화",
  MEMO: "메모",
  RESOURCE: "자료",
  SCHEDULE: "일정",
  TIMER: "타이머",
  TODO: "할 일",
};

const notificationRows: Array<{
  description: string;
  key: keyof NotificationPreferencesResponse;
  title: string;
}> = [
  { key: "messageEnabled", title: "새 메시지", description: "프로젝트룸 대화와 1:1 대화" },
  { key: "commentEnabled", title: "댓글과 언급", description: "자료 댓글, 확인 요청, 멤버 언급" },
  { key: "resourceVersionEnabled", title: "자료 변경", description: "프로젝트룸 공용 자료의 새 버전" },
  { key: "agentEnabled", title: "에이전트 후보", description: "확인할 후보, WBS/TODO 후보" },
  { key: "capacityEnabled", title: "용량", description: "개인 자료 동기화 용량 경고" },
];

const privacyRows: Array<{
  description: string;
  key: keyof PrivacyConsentsResponse;
  title: string;
}> = [
  { key: "localFolderEnabled", title: "개인 폴더 동기화", description: "내가 선택한 로컬 폴더만 개인 자료로 색인" },
  { key: "activityDetectionEnabled", title: "활성 앱과 창 제목", description: "동의한 경우 앱 이름, 창 제목, 머문 시간만 사용" },
  { key: "personalAgentLocalMemoryEnabled", title: "개인 에이전트 기억", description: "개인 작업 맥락을 기기 안 캐시에 보관" },
  { key: "widgetUsageLocalEventEnabled", title: "버블 사용 기록", description: "위치, 표시 상태, 타이머 복구에 사용" },
];

const localeOptions = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
  { label: "日本語", value: "ja" },
];

const timezoneOptions = [
  { label: "서울 시간", value: "Asia/Seoul" },
  { label: "UTC", value: "UTC" },
  { label: "도쿄 시간", value: "Asia/Tokyo" },
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

function storageLabel(storage: StorageUsageResponse | null) {
  if (!storage) return "확인 전";
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

function monitorLabel(monitor: AppMonitorInfo, index: number) {
  const name = monitor.name?.trim() || `모니터 ${index + 1}`;
  const primaryLabel = monitor.isPrimary ? " · 기본" : "";
  return `${name}${primaryLabel} - ${monitor.size.width}x${monitor.size.height} @ ${monitor.position.x},${monitor.position.y}`;
}

function activityDurationLabel(seconds?: number | null) {
  if (!seconds || seconds < 0) return "방금 기록";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.max(1, Math.floor((seconds % 3600) / 60));

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분`;
}

function activityStartedLabel(value?: string | null) {
  if (!value) return "시간 미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusTone(value: string) {
  if (value.includes("못") || value.includes("필요") || value.includes("대기")) return "warning" as const;
  return "approved" as const;
}

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [profileDraft, setProfileDraft] = useState(defaultProfileDraft);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [localActionMessage, setLocalActionMessage] = useState<string | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<Array<{ localFileId: string; name: string; path: string }>>([]);
  const [folderProgress, setFolderProgress] = useState<Record<string, ManagedFolderIndexProgressResult>>({});
  const [lastBackupId, setLastBackupId] = useState<string | null>(null);
  const [desktopRuntime, setDesktopRuntime] = useState(false);
  const [monitorPreference, setMonitorPreference] = useState<AppMonitorPreference | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setSaveMessage(null);
    setLocalActionMessage(null);

    try {
      const user = await authApi.getMe();
      const [notifications, privacy, storage, activityLogs, widgetBubbles, widgetUsage] = await Promise.allSettled([
        settingsApi.getNotificationPreferences(),
        settingsApi.getPrivacyConsents(),
        settingsApi.getStorageUsage(),
        activityApi.getToday(),
        widgetApi.getBubbles(),
        widgetApi.getTodayUsageRollups(),
      ]);

      setProfileDraft(userToProfileDraft(user));
      setState({
        kind: "ready",
        settings: {
          folders: [],
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
        if (!cancelled) setLocalActionMessage("모니터 목록을 불러올 수 없습니다");
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
      setLocalActionMessage(`오늘 활동 ${activityLogs.length}건을 불러왔습니다`);
    } catch {
      setLocalActionMessage("활동 기록을 불러오지 못했습니다");
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
    setSaveMessage("표시 설정을 저장했습니다");

    try {
      const saved = await authApi.updateMe({
        locale: nextUser.locale,
        name: nextUser.name,
        timezone: nextUser.timezone,
      });
      updateReadyState((current) => ({ ...current, user: saved }));
    } catch {
      if (shouldUseWorkspacePreviewData()) return;
      setSaveMessage("저장하지 못했습니다. 서버 연결을 확인하세요");
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

  const refreshManagedFolderProgress = useCallback(async (localFolderId: string) => {
    const result = await getPersonalManagedFolderIndexProgress({ localFolderId });
    if (result.status === "ready") {
      setFolderProgress((current) => ({ ...current, [localFolderId]: result.data }));
      setLocalActionMessage(
        `색인 ${result.data.indexedFiles}/${result.data.totalFiles} · 동기화 대기 ${result.data.pendingEventCount}건`,
      );
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, []);

  const toggleManagedFolderSync = useCallback(
    async (folder: ManagedFolderResponse) => {
      const result = await setPersonalManagedFolderSync({
        enabled: !folder.syncEnabled,
        localFolderId: folder.id,
      });
      if (result.status !== "ready") {
        setLocalActionMessage(localResultMessage(result));
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
          ? `서버 반영 후보를 켰습니다 · 대기 ${result.data.pendingEventCount}건`
          : "서버 반영 후보를 껐습니다. 로컬 색인은 유지됩니다.",
      );
      void refreshManagedFolderProgress(folder.id);
    },
    [refreshManagedFolderProgress, updateReadyState],
  );

  const scanManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
    if (!folderId) {
      setLocalActionMessage("먼저 개인 폴더를 선택하세요");
      return;
    }

    const result = await scanPersonalManagedFolder({ localFolderId: folderId });
    if (result.status === "ready") void refreshManagedFolderProgress(folderId);
    setLocalActionMessage(result.status === "ready" ? `폴더 변경 ${result.data.changedCount}건 감지` : localResultMessage(result));
  }, [refreshManagedFolderProgress, state]);

  const watchManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders[0]?.id : undefined;
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

  const openLocalFile = useCallback(async (localFileId: string) => {
    const result = await openPersonalLocalFile({ localFileId });
    setLocalActionMessage(result.status === "ready" ? `${result.data.name} 파일을 열었습니다` : localResultMessage(result));
  }, []);

  const reindexLocalFile = useCallback(
    async (localFileId: string) => {
      const result = await reindexPersonalLocalFile({ localFileId });
      if (result.status !== "ready") {
        setLocalActionMessage(localResultMessage(result));
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
          ? `${result.data.name} 파일이 사라져 삭제 후보로 표시했습니다`
          : `${result.data.name} 파일을 다시 색인했습니다${result.data.changed ? " · 변경 후보 생성" : ""}`,
      );
    },
    [folderSearchQuery],
  );

  useEffect(() => {
    if (!desktopRuntime) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listenManagedFolderWatchEvents((event) => {
      if (disposed) return;

      setLocalActionMessage(`로컬 폴더 변경 ${event.changedCount}건 감지됨`);
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
      setLocalActionMessage(`활동 감지 · ${result.data.appName}${result.data.windowTitle ? ` · ${result.data.windowTitle}` : ""}`);
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, [state, updateReadyState]);

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
        setLocalActionMessage("활동 기록을 삭제했습니다");
      } catch {
        const activityLogs = await activityApi.getToday().catch(() => null);
        if (activityLogs) {
          updateReadyState((ready) => ({
            ...ready,
            settings: { ...ready.settings, activityLogs },
          }));
        }
        setLocalActionMessage("활동 기록을 삭제하지 못했습니다");
      } finally {
        setDeletingActivityId(null);
      }
    },
    [state.kind, updateReadyState],
  );

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
  const managedFolders = readySettings.folders;
  const widgetBubbles = readySettings.widgetBubbles ?? [];
  const enabledWidgetCount = widgetBubbles.filter((bubble) => bubble.enabled).length;
  const localCacheReadiness = getLocalCacheReadiness();
  const todayActivityLogs = readySettings.activityLogs ?? [];

  return (
    <section className={`workspace-route ${styles.route}`} aria-labelledby="settings-title">
      <header className={`${styles.routeHeader} workspace-route__header`}>
        <div>
          <span className={styles.kicker}>회원 설정</span>
          <h1 id="settings-title">설정</h1>
          <p>계정, 알림, 언어, 로컬 앱 권한을 실제 상태 기준으로 관리합니다.</p>
        </div>
        <div className={styles.headerStatus}>
          <StatusBadge tone={state.kind === "ready" ? "approved" : state.kind === "auth" ? "warning" : "neutral"}>
            {state.kind === "ready" ? "서버 연결됨" : state.kind === "auth" ? "로그인 필요" : "서버 연결 대기"}
          </StatusBadge>
          <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>{desktopRuntime ? "데스크탑 앱" : "브라우저"}</StatusBadge>
          {localActionMessage ? <StatusBadge tone={statusTone(localActionMessage)}>{localActionMessage}</StatusBadge> : null}
          {saveMessage ? <StatusBadge tone={statusTone(saveMessage)}>{saveMessage}</StatusBadge> : null}
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className={styles.notice}>설정을 불러오는 중입니다.</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className={styles.notice}>
          <div>
            <strong>로그인이 필요합니다</strong>
            <span>계정 설정과 알림 설정은 로그인 뒤 표시됩니다.</span>
          </div>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && (
        <GlassPanel className={styles.notice}>
          <div>
            <strong>서버 연결 대기</strong>
            <span>계정, 알림, 버블 서버 설정은 연결되면 표시됩니다. 로컬 앱 항목은 현재 실행 환경 기준입니다.</span>
          </div>
        </GlassPanel>
      )}

      {(state.kind === "ready" || state.kind === "offline") && (
        <div className={styles.page}>
          <div className={styles.statusGrid}>
            <GlassPanel className={styles.statusCard}>
              <span>계정</span>
              <strong>{state.kind === "ready" ? state.user.name : "연결 전"}</strong>
              <small>{state.kind === "ready" ? state.user.email : "서버 연결 후 표시"}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>알림</span>
              <strong>{state.kind === "ready" ? `${enabledCount(notificationSettings)}개 켜짐` : "확인 전"}</strong>
              <small>{readySettings.notifications ? "서버 설정" : "서버 연결 대기"}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>데스크탑 앱</span>
              <strong>{desktopRuntime ? "실행 중" : "앱 전용"}</strong>
              <small>{desktopRuntime ? "Tauri 실행 중" : "브라우저에서는 읽기 전용"}</small>
            </GlassPanel>
            <GlassPanel className={styles.statusCard}>
              <span>저장공간</span>
              <strong>{storageLabel(readySettings.storage)}</strong>
              <small>{readySettings.storage ? "서버 사용량" : "현재 데이터가 없습니다"}</small>
            </GlassPanel>
          </div>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>계정</span>
                <h2>로그인 정보</h2>
              </div>
              <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>{state.kind === "ready" ? "연결됨" : "연결 전"}</StatusBadge>
            </div>
            <div className={styles.accountGrid}>
              <div className={styles.identity}>
                <span>이름</span>
                <strong>{state.kind === "ready" ? state.user.name : "서버 연결 후 표시"}</strong>
              </div>
              <div className={styles.identity}>
                <span>이메일</span>
                <strong>{state.kind === "ready" ? state.user.email : "서버 연결 후 표시"}</strong>
              </div>
              <div className={styles.identity}>
                <span>Bubli ID</span>
                <strong>{state.kind === "ready" ? state.user.bubliId : "현재 데이터가 없습니다"}</strong>
              </div>
              <div className={styles.actions}>
                <Button disabled={state.kind !== "ready"} onClick={() => void logout()} type="button" variant="quiet">
                  로그아웃
                </Button>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>표시</span>
                <h2>언어와 화면</h2>
              </div>
              <Button disabled={state.kind !== "ready"} onClick={() => void saveProfile()} type="button" variant="primary">
                저장
              </Button>
            </div>
            <div className={styles.profileGrid}>
              <label className="workspace-route__field">
                <span>표시 이름</span>
                <input
                  disabled={state.kind !== "ready"}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, name: event.target.value }))}
                  value={profileDraft.name}
                />
              </label>
              <div className={styles.settingBlock}>
                <span>언어</span>
                <div aria-label="언어 선택" className={styles.segmented} role="radiogroup">
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
                <span>시간대</span>
                <select
                  disabled={state.kind !== "ready"}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, timezone: event.target.value }))}
                  value={profileDraft.timezone}
                >
                  {timezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.settingBlock}>
                <span>테마</span>
                <ThemeToggle />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>외부 연동</span>
                <h2>Google Calendar</h2>
              </div>
              <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>
                {state.kind === "ready" ? "연결 준비" : "서버 연결 대기"}
              </StatusBadge>
            </div>
            <div className={styles.integrationGrid}>
              <div className={styles.integrationLead}>
                <strong>일정은 Bubli에서 관리하고, 외부 캘린더와 함께 확인합니다.</strong>
                <span>프로젝트룸 일정과 개인 일정을 Google Calendar와 연결할 수 있습니다.</span>
              </div>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>
                    <strong>연결 상태</strong>
                    <small>{state.kind === "ready" ? "연결 또는 재연결을 시작할 수 있습니다" : "로그인 후 확인합니다"}</small>
                  </span>
                  <StatusBadge tone={state.kind === "ready" ? "approved" : "neutral"}>
                    {state.kind === "ready" ? "준비됨" : "대기"}
                  </StatusBadge>
                </div>
                <div className={styles.row}>
                  <span>
                    <strong>반영 범위</strong>
                    <small>일정과 마감만 연결합니다. 자료와 대화는 바꾸지 않습니다.</small>
                  </span>
                  <StatusBadge tone="personal">일정</StatusBadge>
                </div>
              </div>
            </div>
            <div className={styles.inlineActions}>
              <Button disabled={state.kind !== "ready"} onClick={openGoogleCalendarConnect} type="button" variant="primary">
                Google Calendar 연결
              </Button>
              <Link className="bubli-button" href="/app/calendar">
                일정 보기
              </Link>
            </div>
          </GlassPanel>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>알림</span>
                  <h2>받을 알림</h2>
                </div>
                <StatusBadge tone={readySettings.notifications ? "approved" : "neutral"}>
                  {readySettings.notifications ? `${enabledCount(notificationSettings)}개 켜짐` : "서버 연결 대기"}
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
                      <strong>{row.title}</strong>
                      <small>{row.description}</small>
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
                  <span className={styles.sectionLabel}>개인정보</span>
                  <h2>동의 상태</h2>
                </div>
                <StatusBadge tone={readySettings.privacy ? "personal" : "neutral"}>
                  {readySettings.privacy ? `${enabledCount(privacySettings)}개 동의` : "서버 연결 대기"}
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
                      <strong>{row.title}</strong>
                      <small>{row.description}</small>
                    </span>
                    <span aria-checked={privacySettings[row.key]} className={`${styles.toggle}${privacySettings[row.key] ? ` ${styles.toggleOn}` : ""}`} role="switch">
                      <span />
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles.guard}>화면 전체 내용과 키보드 입력은 수집하지 않습니다.</p>
              <div className={styles.inlineActions}>
                <Button disabled={!desktopRuntime || state.kind !== "ready"} onClick={() => void readActivity()} type="button" variant="quiet">
                  현재 활동 기록
                </Button>
                <Button disabled={state.kind !== "ready" || !privacySettings.activityDetectionEnabled} onClick={() => void refreshActivityLogs()} type="button" variant="secondary">
                  오늘 기록 새로고침
                </Button>
              </div>
              <div className={styles.activityList} aria-label="오늘 활동 기록">
                {todayActivityLogs.length > 0 ? (
                  todayActivityLogs.map((activity) => (
                    <div className={styles.activityRow} key={activity.id}>
                      <span>
                        <strong>{activity.appName || "앱 이름 없음"}</strong>
                        <small>
                          {[activity.windowTitle, activityStartedLabel(activity.startedAt), activityDurationLabel(activity.durationSeconds)]
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
                        삭제
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyRow}>오늘 서버에 반영된 활동 기록이 없습니다.</p>
                )}
              </div>
            </GlassPanel>
          </div>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>데스크탑 앱</span>
                  <h2>폴더와 SQLite</h2>
                </div>
                <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>{desktopRuntime ? "앱 실행 중" : "앱에서 사용 가능"}</StatusBadge>
              </div>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>
                    <strong>로컬 SQLite</strong>
                    <small>{localCacheReadiness.status === "ready" ? "로컬 캐시를 사용할 수 있습니다" : "브라우저에서는 사용할 수 없습니다"}</small>
                  </span>
                  <StatusBadge tone={localCacheReadiness.status === "ready" ? "approved" : "neutral"}>
                    {localCacheReadiness.status === "ready" ? "준비됨" : "앱 필요"}
                  </StatusBadge>
                </div>
                <div className={styles.row}>
                  <span>
                    <strong>앱 표시 모니터</strong>
                    <small>하이브리드 앱과 위젯을 선택한 모니터에 띄웁니다.</small>
                  </span>
                  <select
                    className={styles.inlineSelect}
                    disabled={!desktopRuntime || !monitorPreference}
                    onChange={(event) => void selectAppMonitor(event.target.value)}
                    value={monitorPreference?.preferredMonitorId ?? "primary"}
                  >
                    <option value="primary">기본 모니터</option>
                    {monitorPreference?.monitors.map((monitor, index) => (
                      <option key={monitor.id} value={monitor.id}>
                        {monitorLabel(monitor, index)}
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
                          {folder.localPath ?? "로컬 경로는 데스크탑 앱에서만 표시됩니다"}
                          {folderProgress[folder.id]
                            ? ` · 색인 ${folderProgress[folder.id].progressPercent}% · 대기 ${folderProgress[folder.id].pendingEventCount}건`
                            : ""}
                        </small>
                      </span>
                      <div className={styles.inlineActions}>
                        <StatusBadge tone={folder.syncEnabled ? "approved" : "neutral"}>
                          {folder.syncEnabled ? "동기화 켜짐" : "로컬만"}
                        </StatusBadge>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void refreshManagedFolderProgress(folder.id)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          진행률
                        </Button>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void toggleManagedFolderSync(folder)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          {folder.syncEnabled ? "동기화 끄기" : "동기화 켜기"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyRow}>현재 연결된 개인 폴더가 없습니다.</div>
                )}
              </div>
              <div className={styles.inlineActions}>
                <Button disabled={state.kind !== "ready" || !desktopRuntime} onClick={() => void selectManagedFolder()} type="button" variant="primary">
                  폴더 선택
                </Button>
                <Button disabled={state.kind !== "ready" || !desktopRuntime} onClick={() => void scanManagedFolder()} type="button" variant="quiet">
                  스캔
                </Button>
                <Button disabled={state.kind !== "ready" || !desktopRuntime} onClick={() => void watchManagedFolder()} type="button" variant="quiet">
                  감시
                </Button>
              </div>
              <div className={styles.searchLine}>
                <label className="workspace-route__field">
                  <span>로컬 파일 검색</span>
                  <input
                    disabled={!desktopRuntime}
                    onChange={(event) => setFolderSearchQuery(event.target.value)}
                    placeholder="파일명 일부"
                    value={folderSearchQuery}
                  />
                </label>
                <Button disabled={!desktopRuntime} onClick={() => void searchLocalFiles()} type="button" variant="quiet">
                  검색
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
                        <StatusBadge tone="neutral">로컬</StatusBadge>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void openLocalFile(file.localFileId)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          열기
                        </Button>
                        <Button
                          disabled={!desktopRuntime}
                          onClick={() => void reindexLocalFile(file.localFileId)}
                          size="sm"
                          type="button"
                          variant="quiet"
                        >
                          재색인
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
                  <span className={styles.sectionLabel}>버블</span>
                  <h2>버블과 복구</h2>
                </div>
                <StatusBadge tone={enabledWidgetCount > 0 ? "personal" : "neutral"}>
                  {widgetBubbles.length > 0 ? `${enabledWidgetCount}개 켜짐` : "현재 데이터가 없습니다"}
                </StatusBadge>
              </div>
              {widgetBubbles.length > 0 ? (
                <div className={styles.bubbleGrid}>
                  {widgetBubbles.map((bubble) => (
                    <button className={styles.bubbleRow} key={bubble.id} onClick={() => void toggleWidgetBubble(bubble)} type="button">
                      <span>
                        <strong>{widgetBubbleLabels[bubble.bubbleType]}</strong>
                        <small>
                          {bubble.minimized ? "최소화" : bubble.ghostMode ? "고스트" : "기본"} · 알림 {bubble.alertEnabled ? "켜짐" : "꺼짐"}
                        </small>
                      </span>
                      <span aria-checked={bubble.enabled} className={`${styles.toggle}${bubble.enabled ? ` ${styles.toggleOn}` : ""}`} role="switch">
                        <span />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyRow}>현재 데이터가 없습니다.</div>
              )}
              <div className={styles.metrics}>
                <div>
                  <span>오늘 열기</span>
                  <strong>{readySettings.widgetUsage ? readySettings.widgetUsage.totalOpenCount : "-"}</strong>
                </div>
                <div>
                  <span>오늘 조작</span>
                  <strong>{readySettings.widgetUsage ? readySettings.widgetUsage.totalInteractionCount : "-"}</strong>
                </div>
                <div>
                  <span>표시 시간</span>
                  <strong>{readySettings.widgetUsage ? `${Math.round(readySettings.widgetUsage.totalVisibleSeconds / 60)}분` : "-"}</strong>
                </div>
              </div>
              <div className={styles.inlineActions}>
                <Link className="bubli-button" href="/app/desktop/widgets">
                  버블 화면
                </Link>
                <Button disabled={!desktopRuntime} onClick={() => void syncWidgetUsage()} type="button" variant="quiet">
                  사용량 동기화
                </Button>
                <Button disabled={!desktopRuntime} onClick={() => void recoverTimer()} type="button" variant="quiet">
                  타이머 복구
                </Button>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionLabel}>백업</span>
                <h2>기기 데이터</h2>
              </div>
              <StatusBadge tone={desktopRuntime ? "personal" : "neutral"}>{desktopRuntime ? "로컬 실행" : "앱 필요"}</StatusBadge>
            </div>
            <div className={styles.recoveryGrid}>
              <button className={styles.row} disabled={!desktopRuntime} onClick={() => void checkLocalCache()} type="button">
                <span>
                  <strong>캐시 점검</strong>
                  <small>SQLite 무결성을 확인합니다.</small>
                </span>
                <StatusBadge tone="neutral">점검</StatusBadge>
              </button>
              <button className={styles.row} disabled={!desktopRuntime} onClick={() => void backupLocalCache()} type="button">
                <span>
                  <strong>백업 만들기</strong>
                  <small>로컬 캐시 스냅샷을 만듭니다.</small>
                </span>
                <StatusBadge tone="neutral">백업</StatusBadge>
              </button>
              <button className={styles.row} disabled={!desktopRuntime || !lastBackupId} onClick={() => void restoreLocalCache()} type="button">
                <span>
                  <strong>백업 복구</strong>
                  <small>{lastBackupId ? "방금 만든 백업으로 복구합니다." : "백업을 먼저 만들어야 합니다."}</small>
                </span>
                <StatusBadge tone="neutral">복구</StatusBadge>
              </button>
              <button className={styles.row} disabled={!desktopRuntime} onClick={() => void checkSyncOutbox()} type="button">
                <span>
                  <strong>동기화 대기열</strong>
                  <small>서버 전송 대기 상태를 확인합니다.</small>
                </span>
                <StatusBadge tone="neutral">확인</StatusBadge>
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </section>
  );
}
