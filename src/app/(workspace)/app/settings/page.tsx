"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { authApi } from "@/features/auth/api/authApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { backupLocalSqlite, checkLocalSqliteIntegrity, recoverLocalTimerState, restoreLocalSqliteBackup } from "@/lib/local/local-cache-client";
import { readCurrentActivityContext } from "@/lib/local/activity-client";
import { scanPersonalManagedFolder, searchPersonalLocalFiles, selectPersonalManagedFolder, watchPersonalManagedFolder } from "@/lib/local/managed-folder-client";
import { getLocalSyncOutboxSummary } from "@/lib/sync/local-sync-client";
import { shouldUseWorkspacePreviewData, workspacePreviewUser } from "@/lib/workspace-preview-data";
import type { AuthUser } from "@/types/api/auth";
import type { NotificationPreferencesResponse, NotificationPreferencesUpdateRequest } from "@/types/api/notification";
import type {
  ManagedFolderResponse,
  PrivacyConsentsResponse,
  PrivacyConsentsUpdateRequest,
  StorageUsageResponse,
} from "@/types/api/settings";
import type { LocalAdapterResult } from "@/types/local";
import type { WidgetBubbleSettingResponse, WidgetBubbleType } from "@/types/api/widget";

import styles from "./settings-page.module.css";

type SettingsData = {
  folders: ManagedFolderResponse[];
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

const previewNotifications: NotificationPreferencesResponse = {
  agentEnabled: true,
  capacityEnabled: true,
  commentEnabled: true,
  messageEnabled: true,
  resourceVersionEnabled: true,
};

const defaultPrivacy: PrivacyConsentsResponse = {
  activityDetectionEnabled: false,
  localFolderEnabled: false,
  personalAgentLocalMemoryEnabled: false,
  widgetUsageLocalEventEnabled: false,
};

const previewPrivacy: PrivacyConsentsResponse = {
  activityDetectionEnabled: false,
  localFolderEnabled: true,
  personalAgentLocalMemoryEnabled: true,
  widgetUsageLocalEventEnabled: true,
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

const previewWidgetBubbles: WidgetBubbleSettingResponse[] = [
  { alertEnabled: true, bubbleType: "TODO", enabled: true, ghostMode: false, id: "preview-todo", minimized: false, x: 32, y: 32 },
  { alertEnabled: true, bubbleType: "SCHEDULE", enabled: true, ghostMode: false, id: "preview-schedule", minimized: false, x: 256, y: 32 },
  { alertEnabled: false, bubbleType: "TIMER", enabled: true, ghostMode: false, id: "preview-timer", minimized: true, x: 480, y: 32 },
  { alertEnabled: true, bubbleType: "CHAT", enabled: true, ghostMode: false, id: "preview-chat", minimized: false, x: 32, y: 260 },
  { alertEnabled: false, bubbleType: "MEMO", enabled: false, ghostMode: false, id: "preview-memo", minimized: false, x: 256, y: 260 },
  { alertEnabled: true, bubbleType: "AGENT", enabled: true, ghostMode: true, id: "preview-agent", minimized: false, x: 480, y: 260 },
  { alertEnabled: true, bubbleType: "RESOURCE", enabled: true, ghostMode: false, id: "preview-resource", minimized: false, x: 704, y: 260 },
  { alertEnabled: true, bubbleType: "ALERT", enabled: true, ghostMode: false, id: "preview-alert", minimized: false, x: 704, y: 32 },
];

const localSettings: SettingsData = {
  folders: [],
  notifications: previewNotifications,
  privacy: previewPrivacy,
  storage: { limitBytes: 2 * 1024 * 1024 * 1024, usedBytes: 384 * 1024 * 1024 },
  widgetBubbles: previewWidgetBubbles,
};

const notificationRows: Array<{
  description: string;
  key: keyof NotificationPreferencesResponse;
  title: string;
}> = [
  { key: "messageEnabled", title: "새 메시지", description: "프로젝트룸 대화와 1:1 대화 알림" },
  { key: "commentEnabled", title: "댓글과 멤버 언급", description: "자료 댓글, 확인 요청, 멤버 언급" },
  { key: "resourceVersionEnabled", title: "자료 변경", description: "프로젝트룸 공용 자료의 새 버전" },
  { key: "agentEnabled", title: "에이전트 후보", description: "확인할 후보, WBS/TODO 후보 생성" },
  { key: "capacityEnabled", title: "용량", description: "개인 자료 동기화 용량 경고" },
];

const privacyRows: Array<{
  description: string;
  key: keyof PrivacyConsentsResponse;
  title: string;
}> = [
  { key: "localFolderEnabled", title: "개인 폴더 동기화", description: "내가 선택한 로컬 폴더만 개인 자료로 색인" },
  { key: "activityDetectionEnabled", title: "활동 맥락", description: "동의한 경우 앱 이름, 창 제목, 머문 시간만 사용" },
  { key: "personalAgentLocalMemoryEnabled", title: "개인 에이전트 기억", description: "개인 작업 맥락을 기기 안 캐시에 보관" },
  { key: "widgetUsageLocalEventEnabled", title: "위젯 사용 기록", description: "타이머, 위젯 위치, 표시 상태 복구" },
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

const localUser: AuthUser = {
  bubliId: workspacePreviewUser.bubliId,
  email: workspacePreviewUser.email,
  googleSub: workspacePreviewUser.googleSub,
  id: workspacePreviewUser.id,
  locale: workspacePreviewUser.locale ?? "ko",
  name: workspacePreviewUser.name,
  timezone: workspacePreviewUser.timezone ?? "Asia/Seoul",
};

const stateFallbackSettings: SettingsData = {
  folders: [],
  notifications: {
    ...defaultNotifications,
  },
  privacy: {
    ...defaultPrivacy,
  },
  storage: null,
  widgetBubbles: [],
};

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function enabledCount(record: object | null) {
  if (!record) return 0;
  return Object.values(record).filter((value) => value === true).length;
}

function byteLabel(value: number) {
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  if (value >= 1024 * 1024) {
    return `${Math.round(value / (1024 * 1024))}MB`;
  }

  return `${Math.round(value / 1024)}KB`;
}

function storageLabel(storage: StorageUsageResponse | null) {
  if (!storage) return "사용량 확인 전";
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

export default function SettingsPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [profileDraft, setProfileDraft] = useState({ locale: "ko", name: "", timezone: "Asia/Seoul" });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [localActionMessage, setLocalActionMessage] = useState<string | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<Array<{ localFileId: string; name: string; path: string }>>([]);
  const [lastBackupId, setLastBackupId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setSaveMessage(null);
    setLocalActionMessage(null);

    if (shouldUseWorkspacePreviewData()) {
      setProfileDraft(userToProfileDraft(localUser));
      setState({ kind: "ready", settings: localSettings, user: localUser });
      return;
    }

    try {
      const user = await authApi.getMe();
      const [notifications, privacy, folders, storage, widgetBubbles] = await Promise.allSettled([
        settingsApi.getNotificationPreferences(),
        settingsApi.getPrivacyConsents(),
        settingsApi.getManagedFolders(),
        settingsApi.getStorageUsage(),
        widgetApi.getBubbles(),
      ]);

      setProfileDraft(userToProfileDraft(user));
      setState({
        kind: "ready",
        settings: {
          folders: settledValue(folders, []),
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
      setState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const updateReadyState = useCallback((updater: (current: Extract<PageState, { kind: "ready" }>) => Extract<PageState, { kind: "ready" }>) => {
    setState((current) => (current.kind === "ready" ? updater(current) : current));
  }, []);

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

    if (shouldUseWorkspacePreviewData()) return;

    try {
      const saved = await authApi.updateMe({
        locale: nextUser.locale,
        name: nextUser.name,
        timezone: nextUser.timezone,
      });
      updateReadyState((current) => ({ ...current, user: saved }));
    } catch {
      setSaveMessage("저장하지 못했습니다. 서버 연결을 확인하세요");
    }
  }, [profileDraft, state, updateReadyState]);

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

      if (shouldUseWorkspacePreviewData()) return;

      try {
        const patch: NotificationPreferencesUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updateNotificationPreferences(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, notifications: saved },
        }));
      } catch {
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

      if (shouldUseWorkspacePreviewData()) return;

      try {
        const patch: PrivacyConsentsUpdateRequest = { [key]: next[key] };
        const saved = await settingsApi.updatePrivacyConsents(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, privacy: saved },
        }));
      } catch {
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

      if (shouldUseWorkspacePreviewData()) return;

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

    if (shouldUseWorkspacePreviewData()) return;

    try {
      const saved = await settingsApi.createManagedFolder({
        localPath: folder.path,
        name: folder.name,
        syncEnabled: true,
      });
      updateReadyState((ready) => ({
        ...ready,
        settings: {
          ...ready.settings,
          folders: [saved, ...ready.settings.folders.filter((item) => item.id !== saved.id)],
        },
      }));
      setLocalActionMessage("개인 폴더를 연결했습니다");
    } catch {
      setLocalActionMessage("폴더는 선택됐지만 서버 등록을 마치지 못했습니다");
    }
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
    if (result.status === "ready") {
      setLocalActionMessage("백업 복구를 완료했습니다");
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, [lastBackupId]);

  const scanManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders.find((folder) => folder.syncEnabled)?.id : undefined;
    if (!folderId) {
      setLocalActionMessage("먼저 개인 폴더를 선택하세요");
      return;
    }

    const result = await scanPersonalManagedFolder({ localFolderId: folderId });
    if (result.status === "ready") {
      setLocalActionMessage(`폴더 변경 ${result.data.changedCount}건 감지`);
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, [state]);

  const watchManagedFolder = useCallback(async () => {
    const folderId = state.kind === "ready" ? state.settings.folders.find((folder) => folder.syncEnabled)?.id : undefined;
    if (!folderId) {
      setLocalActionMessage("먼저 개인 폴더를 선택하세요");
      return;
    }

    const result = await watchPersonalManagedFolder({ localFolderId: folderId });
    if (result.status === "ready") {
      setLocalActionMessage(result.data.watching ? "폴더 실시간 감시를 켰습니다" : "폴더 감시를 멈췄습니다");
      return;
    }

    setLocalActionMessage(localResultMessage(result));
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
    const result = await readCurrentActivityContext({ consentGranted });
    if (result.status === "ready") {
      setLocalActionMessage(`활동 감지 · ${result.data.appName}${result.data.windowTitle ? ` · ${result.data.windowTitle}` : ""}`);
      return;
    }

    setLocalActionMessage(localResultMessage(result));
  }, [state]);

  const checkSyncOutbox = useCallback(async () => {
    const result = await getLocalSyncOutboxSummary();
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

  const readySettings = state.kind === "ready" ? state.settings : stateFallbackSettings;
  const notificationSettings = readySettings.notifications ?? defaultNotifications;
  const privacySettings = readySettings.privacy ?? defaultPrivacy;
  const activeFolders = readySettings.folders.filter((folder) => folder.syncEnabled);
  const widgetBubbles = readySettings.widgetBubbles ?? [];
  const enabledWidgetCount = widgetBubbles.filter((bubble) => bubble.enabled).length;

  return (
    <section className="workspace-route" aria-labelledby="settings-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="settings-title">설정</h1>
          <p>표시 방식, 알림, 데스크탑 앱 권한, 개인 자료 동기화 기준을 관리합니다.</p>
        </div>
        <div className={styles.headerStatus}>
          {localActionMessage ? <StatusBadge tone={localActionMessage.includes("못") || localActionMessage.includes("필요") ? "warning" : "approved"}>{localActionMessage}</StatusBadge> : null}
          {saveMessage ? <StatusBadge tone={saveMessage.includes("못했습니다") ? "warning" : "approved"}>{saveMessage}</StatusBadge> : null}
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className="workspace-route__panel">불러오는 중</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className="workspace-route__panel">
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && (
        <GlassPanel className="workspace-route__panel">
          <strong>설정을 표시할 수 없습니다</strong>
          <span>연결이 돌아오면 계정 설정과 기기 권한 상태가 자동으로 표시됩니다.</span>
        </GlassPanel>
      )}

      {(state.kind === "ready" || state.kind === "offline") && (
        <div className={styles.page}>
          <GlassPanel className={`${styles.section} ${styles.profileSection}`}>
            <div className={styles.sectionHead}>
              <div>
                <span className="workspace-route__label">내 화면</span>
                <h2>프로필과 표시</h2>
              </div>
              <StatusBadge tone={state.kind === "ready" ? "approved" : "warning"}>{state.kind === "ready" ? "저장 가능" : "읽기 전용"}</StatusBadge>
            </div>
            <div className={styles.profileGrid}>
              <label className="workspace-route__field">
                <span>이름</span>
                <input
                  disabled={state.kind !== "ready"}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, name: event.target.value }))}
                  value={profileDraft.name}
                />
              </label>
              <label className="workspace-route__field">
                <span>언어</span>
                <select
                  disabled={state.kind !== "ready"}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, locale: event.target.value }))}
                  value={profileDraft.locale}
                >
                  {localeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
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
              <div className={styles.identity}>
                <span>{state.kind === "ready" ? state.user.email : "서버 연결 후 표시"}</span>
                <strong>{state.kind === "ready" ? state.user.bubliId : "Bubli ID"}</strong>
              </div>
            </div>
            <div className={styles.displayTools}>
              <div>
                <strong>화면 테마</strong>
                <span>비회원 페이지와 같은 밝은 톤을 기본으로 두고, 필요할 때만 전환합니다.</span>
              </div>
              <ThemeToggle />
            </div>
            <div className={styles.actions}>
              <Button disabled={state.kind !== "ready"} onClick={() => void saveProfile()} type="button" variant="primary">
                저장
              </Button>
            </div>
          </GlassPanel>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className="workspace-route__label">알림</span>
                  <h2>받을 알림</h2>
                </div>
                <StatusBadge tone={enabledCount(notificationSettings) > 0 ? "approved" : "neutral"}>{enabledCount(notificationSettings)}개 켜짐</StatusBadge>
              </div>
              <div className={styles.rows}>
                {notificationRows.map((row) => (
                  <button className={styles.row} key={row.key} onClick={() => void toggleNotification(row.key)} type="button">
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
                  <span className="workspace-route__label">데스크탑 앱</span>
                  <h2>버블 표시</h2>
                </div>
                <StatusBadge tone={enabledWidgetCount > 0 ? "personal" : "neutral"}>{enabledWidgetCount}개 켜짐</StatusBadge>
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
                <p className={styles.empty}>데스크탑 앱을 열면 버블 표시 설정을 불러옵니다.</p>
              )}
              <Link className="bubli-button" href="/app/desktop/widgets">
                버블 상태 보기
              </Link>
            </GlassPanel>
          </div>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className="workspace-route__label">기기 권한</span>
                  <h2>데스크탑 앱 권한</h2>
                </div>
                <StatusBadge tone={enabledCount(privacySettings) > 0 ? "personal" : "neutral"}>{enabledCount(privacySettings)}개 동의</StatusBadge>
              </div>
              <div className={styles.rows}>
                {privacyRows.map((row) => (
                  <button className={styles.row} key={row.key} onClick={() => void togglePrivacy(row.key)} type="button">
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
                <Button onClick={() => void readActivity()} type="button" variant="quiet">
                  활동 읽기
                </Button>
              </div>
            </GlassPanel>
          </div>

          <div className={styles.grid}>
            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className="workspace-route__label">개인 자료</span>
                  <h2>로컬 폴더 동기화</h2>
                </div>
                <StatusBadge tone={activeFolders.length > 0 ? "personal" : "neutral"}>{activeFolders.length > 0 ? `${activeFolders.length}개 폴더` : "앱 필요"}</StatusBadge>
              </div>
              {activeFolders.length > 0 ? (
                <div className={styles.rows}>
                  {activeFolders.map((folder) => (
                    <div className={styles.row} key={folder.id}>
                      <span>
                        <strong>{folder.name}</strong>
                        <small>{folder.localPath ?? "로컬 경로는 데스크탑 앱에서만 표시됩니다"}</small>
                      </span>
                      <StatusBadge tone="approved">동기화</StatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>개인 자료는 업로드가 아니라 데스크탑 앱에서 선택한 폴더 동기화로 채웁니다.</p>
              )}
              <div className={styles.inlineActions}>
                <Button disabled={state.kind !== "ready"} onClick={() => void selectManagedFolder()} type="button" variant="primary">
                  폴더 선택
                </Button>
                <Button disabled={state.kind !== "ready"} onClick={() => void scanManagedFolder()} type="button" variant="quiet">
                  다시 스캔
                </Button>
                <Button disabled={state.kind !== "ready"} onClick={() => void watchManagedFolder()} type="button" variant="quiet">
                  폴더 감시
                </Button>
                <Link className="bubli-button" href="/app/resources">
                  개인 자료로 이동
                </Link>
              </div>
              <label className="workspace-route__field">
                <span>로컬 파일 검색</span>
                <input
                  onChange={(event) => setFolderSearchQuery(event.target.value)}
                  placeholder="파일명 일부"
                  value={folderSearchQuery}
                />
              </label>
              <div className={styles.inlineActions}>
                <Button onClick={() => void searchLocalFiles()} type="button" variant="quiet">
                  로컬 검색
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
                      <StatusBadge tone="neutral">로컬</StatusBadge>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassPanel>

            <GlassPanel className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className="workspace-route__label">동기화</span>
                  <h2>저장공간과 복구</h2>
                </div>
                <StatusBadge tone={readySettings.storage ? "approved" : "neutral"}>{storageLabel(readySettings.storage)}</StatusBadge>
              </div>
              <div className={styles.syncNote}>
                <strong>SQLite 캐시</strong>
                <span>타이머, 위젯 상태, 개인 폴더 색인은 데스크탑 앱 안에서 복구할 수 있게 보관합니다.</span>
              </div>
              <div className={styles.syncNote}>
                <strong>서버 동기화</strong>
                <span>대화, 프로젝트룸 자료, 일정은 서버 API 기준으로 맞추고 기기 캐시는 보조로만 씁니다.</span>
              </div>
              <div className={styles.inlineActions}>
                <Button onClick={() => void checkLocalCache()} type="button" variant="quiet">
                  캐시 점검
                </Button>
                <Button onClick={() => void backupLocalCache()} type="button" variant="quiet">
                  백업 만들기
                </Button>
                <Button disabled={!lastBackupId} onClick={() => void restoreLocalCache()} type="button" variant="quiet">
                  백업 복구
                </Button>
                <Button onClick={() => void checkSyncOutbox()} type="button" variant="quiet">
                  대기열 상태
                </Button>
                <Button onClick={() => void recoverTimer()} type="button" variant="quiet">
                  타이머 복구
                </Button>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </section>
  );
}
