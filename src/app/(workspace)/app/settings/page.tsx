"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { activityApi } from "@/features/activity/api/activityApi";
import { ActivityDetectionPanel } from "@/features/activity/components";
import { authApi } from "@/features/auth/api/authApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { isBackendWidgetBubbleType, widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { Locale, MessageKey, TranslateVars } from "@/lib/i18n";
import {
  getActivityAutoCaptureStatus,
  notifyActivityConsentChanged,
  subscribeActivityAutoCaptureStatus,
  type ActivityAutoCaptureStatus,
} from "@/lib/local/activity-auto-capture";
import { recordCurrentActivityContext } from "@/lib/local/activity-client";
import { notifyManagedFolderConsentChanged } from "@/lib/local/managed-folder-auto-sync";
import {
  backupLocalSqlite,
  checkLocalSqliteIntegrity,
  listLocalSqliteBackups,
  restoreLocalSqliteBackup,
} from "@/lib/local/local-cache-client";
import {
  getPersonalLocalFileAnalysisStatus,
  getPersonalManagedFolderIndexProgress,
  listPersonalManagedFolders,
  removePersonalManagedFolder,
  scanPersonalManagedFolder,
  selectPersonalManagedFolder,
  setPersonalManagedFolderSync,
  syncPersonalLocalFileEventsToServer,
  watchPersonalManagedFolder,
} from "@/lib/local/managed-folder-client";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  tauriCommands,
  type AppMonitorInfo,
  type AppMonitorPreference,
  type LocalFileAnalysisStatusResult,
  type ManagedFolderIndexProgressResult,
  type SqliteIntegrityResult,
  type WidgetWindowMode,
} from "@/lib/tauri/commands";
import { toLocalWidgetBubbleType } from "@/lib/widget/widget-types";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { ActivityLogResponse } from "@/types/api/activity";
import type { AuthUser } from "@/types/api/auth";
import type { NotificationPreferencesResponse, NotificationPreferencesUpdateRequest } from "@/types/api/notification";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";
import type {
  ManagedFolderResponse,
  PrivacyConsentsResponse,
  PrivacyConsentsUpdateRequest,
  StorageUsageResponse,
  UserPreferenceResponse,
  UserPreferenceUpdateRequest,
} from "@/types/api/settings";
import type { WidgetBubbleSettingResponse, WidgetBubbleType } from "@/types/api/widget";
import type { LocalAdapterResult } from "@/types/local";

import styles from "./settings-page.module.css";

type SettingsData = {
  activityLogs: ActivityLogResponse[] | null;
  folders: ManagedFolderResponse[];
  googleCalendarConnectUrl: string | null;
  googleCalendarConnected: boolean;
  notifications: NotificationPreferencesResponse | null;
  preferences: UserPreferenceResponse | null;
  privacy: PrivacyConsentsResponse | null;
  rooms: ProjectRoomResponse[];
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
  activityLogs: null,
  folders: [],
  googleCalendarConnectUrl: null,
  googleCalendarConnected: false,
  notifications: null,
  preferences: null,
  privacy: null,
  rooms: [],
  storage: null,
  widgetBubbles: null,
};

// 기본 시작 화면 — 백엔드 user_preference.default_home_type 계약 값.
const homeTypeOptions: Array<{ labelKey: MessageKey; value: string }> = [
  { labelKey: "settings.pref.homePersonal", value: "PERSONAL" },
  { labelKey: "settings.pref.homeProjectRoom", value: "PROJECT_ROOM" },
];

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

// 웹/데스크톱 분리 규칙:
// - Tauri 데스크톱 앱에서만 "동작"하는 행은 `desktopOnly: true`로 표시한다.
//   웹에서는 해당 행의 컨트롤을 비활성화하고 "데스크톱 앱에서 사용하는 기능" 안내를 덧붙인다(죽은 토글 금지).
// - 데스크톱 전용 섹션(모니터, 위젯 버블, 관리 폴더, 로컬 백업)은 desktop 탭에만 두고,
//   desktop 탭의 컨트롤은 isTauriRuntime()에서만 렌더링한다. 웹의 desktop 탭은 안내 + 다운로드 링크만 보여준다.
// 새 설정 행을 추가할 때 데스크톱 전용이면 이 플래그만 붙이면 웹 처리가 자동으로 적용된다.
type ToggleRowConfig<TKey extends string> = {
  descriptionKey: MessageKey;
  desktopOnly?: boolean;
  key: TKey;
  titleKey: MessageKey;
};

const notificationRows: Array<ToggleRowConfig<keyof NotificationPreferencesResponse>> = [
  { key: "messageEnabled", titleKey: "settings.notif.message.title", descriptionKey: "settings.notif.message.desc" },
  { key: "commentEnabled", titleKey: "settings.notif.comment.title", descriptionKey: "settings.notif.comment.desc" },
  { key: "resourceVersionEnabled", titleKey: "settings.notif.resource.title", descriptionKey: "settings.notif.resource.desc" },
  { key: "agentEnabled", titleKey: "settings.notif.agent.title", descriptionKey: "settings.notif.agent.desc" },
  { key: "capacityEnabled", titleKey: "settings.notif.capacity.title", descriptionKey: "settings.notif.capacity.desc" },
];

// 두 동의 모두 데스크톱 전용 동작만 제어한다 — activity-auto-capture/managed-folder-auto-sync는
// isTauriRuntime()이 아니면 시작조차 하지 않는다. 동의 상태는 서버 계정 설정이라 웹에서도 보여주되,
// desktopOnly로 표시해 웹에서는 토글을 잠그고 안내만 노출한다.
const privacyRows: Array<ToggleRowConfig<keyof PrivacyConsentsResponse>> = [
  { key: "localFolderEnabled", titleKey: "settings.privacy.folder.title", descriptionKey: "settings.privacy.folder.desc", desktopOnly: true },
  { key: "activityDetectionEnabled", titleKey: "settings.privacy.activity.title", descriptionKey: "settings.privacy.activity.desc", desktopOnly: true },
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

// 서버 계약이 어긋나거나 값이 비어 있으면 "NaNKB" 대신 fallback을 노출한다.
function byteLabel(value: number | null | undefined, fallback = "—") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))}MB`;
  return `${Math.round(value / 1024)}KB`;
}

// 백엔드 StorageUsageResponse 합계 필드는 totalUsedBytes/totalLimitBytes다(usedBytes/limitBytes 아님).
function storageLabel(t: TranslateFn, storage: StorageUsageResponse | null) {
  const beforeCheck = t("settings.value.beforeCheck");
  if (!storage) return beforeCheck;
  if (!Number.isFinite(storage.totalUsedBytes) || !Number.isFinite(storage.totalLimitBytes)) return beforeCheck;
  return `${byteLabel(storage.totalUsedBytes, beforeCheck)} / ${byteLabel(storage.totalLimitBytes, beforeCheck)}`;
}

function localSqliteDiagnosticsLabel(result: SqliteIntegrityResult) {
  const freePages = Math.max(0, result.freelistCount);
  return `DB ${byteLabel(result.databaseSizeBytes)} · WAL ${byteLabel(result.walSizeBytes)} · ${result.pageCount} pages · free ${freePages} · ${result.journalMode}`;
}

// dev PR 185 이식: 아웃박스 동기화 결과에 로컬 파일 분석 상태를 함께 표기한다.
function localFileAnalysisStatusLabel(status: LocalFileAnalysisStatusResult) {
  const parts = [
    `analysis pending ${status.pendingCount}`,
    `failed ${status.failedCount}`,
    `retryable ${status.retryableFailedCount}`,
    `synced ${status.syncedCount}`,
  ];

  if (status.latestErrorMessage) {
    parts.push(`latest error: ${status.latestErrorMessage}`);
  }

  return parts.join(" / ");
}

// dev PR 216 이식: 버블 설정 값으로 데스크톱 위젯 창 모드를 결정한다.
function getWidgetWindowModeFromSetting(bubble: WidgetBubbleSettingResponse): WidgetWindowMode {
  if (bubble.minimized) return "MINIMIZED";
  if (bubble.ghostMode) return "GHOST";
  if (bubble.opacity !== null && bubble.opacity !== undefined && bubble.opacity < 0.95) return "TRANSLUCENT";
  return "DEFAULT";
}

// dev PR 186 이식: 서버 저장 응답에 백엔드 미지원(로컬 전용) 버블 항목을 보존해 합친다.
function mergeWidgetBubbleSettings(
  current: WidgetBubbleSettingResponse[],
  saved: WidgetBubbleSettingResponse[],
) {
  const savedBubbleTypes = new Set(saved.map((bubble) => bubble.bubbleType));
  const localOnlyBubbles = current.filter(
    (bubble) => !isBackendWidgetBubbleType(bubble.bubbleType) && !savedBubbleTypes.has(bubble.bubbleType),
  );

  return [...saved, ...localOnlyBubbles];
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

// 좌측 탭에서 한 번에 하나의 섹션만 보여준다. URL 해시(#account 등)로 새로고침/딥링크를 지원한다.
const sectionIds = ["account", "preferences", "notifications", "integrations", "privacy", "desktop"] as const;

type SectionId = (typeof sectionIds)[number];

type NavItem = { id: SectionId; labelKey: MessageKey };

function parseSectionHash(hash: string): SectionId | null {
  const value = hash.replace(/^#/, "");
  return (sectionIds as readonly string[]).includes(value) ? (value as SectionId) : null;
}

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
  // dev PR 212 이식: 활동 감지 패널의 삭제/기록/새로고침 진행 상태.
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [activityAction, setActivityAction] = useState<"record" | "refresh" | null>(null);
  const [activityAutoCaptureStatus, setActivityAutoCaptureStatus] = useState<ActivityAutoCaptureStatus>(() =>
    getActivityAutoCaptureStatus(),
  );
  // dev 이식: 관리 폴더별 인덱싱 진행률 캐시(로컬 폴더 감시 진행률).
  const [folderProgress, setFolderProgress] = useState<Record<string, ManagedFolderIndexProgressResult>>({});
  const [copiedBubliId, setCopiedBubliId] = useState(false);
  const [withdrawConfirming, setWithdrawConfirming] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const tabRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});

  // URL 해시 ↔ 선택 섹션 동기화 — 새로고침, 딥링크, 브라우저 뒤로가기를 지원한다.
  useEffect(() => {
    const applyHash = () => {
      const parsed = parseSectionHash(window.location.hash);
      if (!parsed) return;
      // 데스크톱 탭은 웹에서도 존재한다(안내 패널) — 해시 딥링크를 그대로 허용한다.
      setActiveSection(parsed);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => subscribeActivityAutoCaptureStatus(setActivityAutoCaptureStatus), []);

  const selectSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    // location.hash 대입 대신 replaceState — 스크롤 점프 없이 해시만 갱신한다.
    window.history.replaceState(null, "", `#${id}`);
  }, []);

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
      const [notifications, privacy, storage, activityLogs, widgetBubbles, localFolders, googleConnection, preferences, roomPage] = await Promise.allSettled([
        settingsApi.getNotificationPreferences(),
        settingsApi.getPrivacyConsents(),
        settingsApi.getStorageUsage(),
        // 오늘 활동 기록은 서버 데이터라 웹에서도 조회한다(dev PR 212 이식).
        activityApi.getToday(),
        // 위젯 버블/관리 폴더는 데스크톱 앱 전용 — 웹 load()에서는 Tauri 경로를 아예 타지 않는다.
        isTauriRuntime() ? widgetApi.getBubbles() : Promise.resolve(null),
        isTauriRuntime() ? listPersonalManagedFolders() : Promise.resolve(null),
        calendarApi.getGoogleConnection(),
        settingsApi.getPreferences(),
        projectRoomApi.list(),
      ]);
      const folderResult = settledValue(localFolders, null);
      const roomPageResult = settledValue(roomPage, null);

      setNameDraft(user.name);
      setState({
        kind: "ready",
        settings: {
          activityLogs: settledValue(activityLogs, null),
          folders:
            folderResult?.status === "ready"
              ? folderResult.data.folders.map(localManagedFolderToSettingsFolder)
              : [],
          googleCalendarConnectUrl: calendarApi.getGoogleConnectUrl(),
          googleCalendarConnected: googleConnection.status === "fulfilled" && googleConnection.value?.status === "ACTIVE",
          notifications: settledValue(notifications, null),
          preferences: settledValue(preferences, null),
          privacy: settledValue(privacy, null),
          rooms: roomPageResult?.items ?? [],
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
    if (!desktopRuntime) return false;
    try {
      await tauriCommands.watchAllManagedFolders();
      return true;
    } catch {
      return false;
    }
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
    try {
      await authApi.logout();
    } catch {
      // authApi.logout()이 finally에서 세션을 정리하므로 서버 오류여도 로그인 화면으로 이동한다.
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  // 서버 기본 화면 설정(/api/me/preferences) 저장 — 값이 있는 필드만 PATCH 한다.
  const savePreference = useCallback(
    async (patch: UserPreferenceUpdateRequest) => {
      if (state.kind !== "ready") return;

      try {
        const saved = await settingsApi.updatePreferences(patch);
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, preferences: saved },
        }));
        setMessage({ text: t("settings.msg.prefSaved"), tone: "approved" });
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setMessage({ text: t("settings.msg.prefSaveFailed"), tone: "warning" });
      }
    },
    [state.kind, t, updateReadyState],
  );

  const withdraw = useCallback(async () => {
    if (state.kind !== "ready") return;

    setWithdrawing(true);

    try {
      await authApi.withdrawMe();
      router.push("/login");
      router.refresh();
    } catch {
      setMessage({ text: t("settings.msg.withdrawFailed"), tone: "warning" });
      setWithdrawing(false);
      setWithdrawConfirming(false);
    }
  }, [router, state.kind, t]);

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
        // 동의 변경 즉시 반영: 자동 캡처/폴더 감시 루프에 알려 곧바로 반영한다. (dev PR 167/170 이식)
        if (key === "activityDetectionEnabled") {
          notifyActivityConsentChanged(saved.activityDetectionEnabled);
        }
        if (key === "localFolderEnabled") {
          notifyManagedFolderConsentChanged(saved.localFolderEnabled);
          if (saved.localFolderEnabled) {
            void restoreManagedFolderWatchers();
          }
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

      // dev PR 216 이식: 토글 결과를 데스크톱 위젯 창 열림/닫힘 상태와 즉시 동기화한다.
      const reconcileTauriWindow = (bubbleSetting: WidgetBubbleSettingResponse) => {
        if (!desktopRuntime) return;

        const localBubbleType = toLocalWidgetBubbleType(bubbleSetting.bubbleType);
        if (bubbleSetting.enabled && !bubbleSetting.minimized) {
          void tauriCommands
            .openWidgetWindow({
              bubbleType: localBubbleType,
              mode: getWidgetWindowModeFromSetting(bubbleSetting),
              selectedRoomId: getActiveProjectRoomId(),
              windowId: localBubbleType,
            })
            .catch(() => {
              setMessage({ text: t("settings.msg.bubbleSaveFailed"), tone: "warning" });
            });
        } else {
          void tauriCommands
            .closeWidgetWindow({ bubbleType: localBubbleType, windowId: localBubbleType })
            .catch(() => {
              setMessage({ text: t("settings.msg.bubbleSaveFailed"), tone: "warning" });
            });
        }
      };

      // dev PR 186 이식: 백엔드 미지원 버블은 서버 호출 없이 로컬 창 상태만 맞춘다.
      if (!isBackendWidgetBubbleType(nextBubble.bubbleType)) {
        reconcileTauriWindow(nextBubble);
        return;
      }

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
          settings: { ...ready.settings, widgetBubbles: mergeWidgetBubbleSettings(next, saved) },
        }));
        reconcileTauriWindow(saved.find((item) => item.bubbleType === nextBubble.bubbleType) ?? nextBubble);
      } catch {
        if (shouldUseWorkspacePreviewData()) return;
        setMessage({ text: t("settings.msg.bubbleSaveFailed"), tone: "warning" });
      }
    },
    [desktopRuntime, state, t, updateReadyState],
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

  // dev 이식(로컬 폴더 감시 진행률): 폴더별 인덱싱 진행률을 조회해 행 옆에 표기한다.
  const refreshManagedFolderProgress = useCallback(async (localFolderId: string, options?: { quiet?: boolean }) => {
    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.localFolderEnabled) : false;
    const result = await getPersonalManagedFolderIndexProgress({ consentGranted, localFolderId });
    if (result.status === "ready") {
      setFolderProgress((current) => ({ ...current, [localFolderId]: result.data }));
      if (!options?.quiet) {
        setMessage({
          text: t("settings.msg.indexProgress", {
            indexed: result.data.indexedFiles,
            total: result.data.totalFiles,
            pending: result.data.pendingEventCount,
          }),
          tone: "approved",
        });
      }
      return;
    }

    if (!options?.quiet) {
      setMessage({ text: localResultMessage(t, result), tone: "warning" });
    }
  }, [state, t]);

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
      void refreshManagedFolderProgress(folder.id);
    },
    [refreshManagedFolderProgress, restoreManagedFolderWatchers, state, t, updateReadyState],
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
      setFolderProgress((current) => {
        const next = { ...current };
        delete next[folder.id];
        return next;
      });
      setMessage({ text: t("settings.msg.folderRemoved"), tone: "approved" });
    },
    [state, t, updateReadyState],
  );

  // dev PR 213 이식: 관리 폴더별(또는 전체) 스캔 — 완료 후 진행률을 조용히 갱신한다.
  const scanManagedFolder = useCallback(async (localFolderId?: string) => {
    const folders = state.kind === "ready" ? state.settings.folders : [];
    const targetFolders = localFolderId ? folders.filter((folder) => folder.id === localFolderId) : folders;
    if (targetFolders.length === 0) {
      setMessage({ text: t("settings.msg.selectFolderFirst"), tone: "warning" });
      return;
    }

    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.localFolderEnabled) : false;
    const results = await Promise.all(
      targetFolders.map((folder) => scanPersonalManagedFolder({ consentGranted, localFolderId: folder.id })),
    );
    const readyResults = results.filter((result): result is Extract<typeof result, { status: "ready" }> => result.status === "ready");
    for (const folder of targetFolders) {
      void refreshManagedFolderProgress(folder.id, { quiet: true });
    }
    const firstFailed = results.find((result) => result.status !== "ready");

    setMessage(
      firstFailed
        ? { text: localResultMessage(t, firstFailed), tone: "warning" }
        : {
            text: t("settings.msg.folderChanges", {
              count: readyResults.reduce((total, result) => total + result.data.changedCount, 0),
            }),
            tone: "approved",
          },
    );
  }, [refreshManagedFolderProgress, state, t]);

  // dev PR 213 이식: 폴더별 감시 시작 — 인자가 없으면 전체 감시 복원으로 동작한다.
  const watchManagedFolder = useCallback(async (localFolderId?: string) => {
    const folders = state.kind === "ready" ? state.settings.folders : [];
    const targetFolder = localFolderId ? folders.find((folder) => folder.id === localFolderId) : folders[0];
    if (folders.length === 0 || (localFolderId && !targetFolder)) {
      setMessage({ text: t("settings.msg.selectFolderFirst"), tone: "warning" });
      return;
    }

    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.localFolderEnabled) : false;
    if (!consentGranted) {
      const result = await watchPersonalManagedFolder({ consentGranted, localFolderId: targetFolder?.id ?? folders[0].id });
      setMessage({ text: localResultMessage(t, result), tone: "warning" });
      return;
    }

    if (localFolderId) {
      const result = await watchPersonalManagedFolder({ consentGranted, localFolderId });
      if (result.status === "ready") {
        void refreshManagedFolderProgress(localFolderId, { quiet: true });
      }
      setMessage({
        text: result.status === "ready" ? t("settings.msg.watchOn") : localResultMessage(t, result),
        tone: result.status === "ready" ? "approved" : "warning",
      });
      return;
    }

    const restored = await restoreManagedFolderWatchers();
    setMessage(
      restored
        ? { text: t("settings.msg.watchOn"), tone: "approved" }
        : { text: t("settings.msg.availableInApp"), tone: "warning" },
    );
  }, [refreshManagedFolderProgress, restoreManagedFolderWatchers, state, t]);

  // dev 이식: 폴더 감시 이벤트 → 변경 알림 + 진행률 즉시 갱신.
  // (설정에서 로컬 파일 검색 UI는 제거했으므로 검색 재조회 분기는 이식하지 않는다.)
  useEffect(() => {
    if (!desktopRuntime) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listenManagedFolderWatchEvents((event) => {
      if (disposed) return;

      setMessage({ text: t("settings.msg.folderWatchDetected", { count: event.changedCount }), tone: "approved" });
      void refreshManagedFolderProgress(event.localFolderId, { quiet: true });
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
  }, [desktopRuntime, refreshManagedFolderProgress, t]);

  // dev PR 212 이식: 현재 앱/창 컨텍스트를 즉시 기록한다(데스크톱 전용 — 웹에서는 버튼이 비활성).
  const readActivity = useCallback(async () => {
    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.activityDetectionEnabled) : false;
    setActivityAction("record");
    try {
      const result = await recordCurrentActivityContext({
        consentGranted,
        roomId: getActiveProjectRoomId(),
      });
      if (result.status === "ready") {
        updateReadyState((ready) => ({
          ...ready,
          settings: { ...ready.settings, activityLogs: result.data.todayActivities },
        }));
        setMessage({
          text: result.data.windowTitle
            ? t("settings.msg.activityDetectedWindow", { app: result.data.appName, window: result.data.windowTitle })
            : t("settings.msg.activityDetected", { app: result.data.appName }),
          tone: "approved",
        });
        return;
      }

      setMessage({ text: localResultMessage(t, result), tone: "warning" });
    } finally {
      setActivityAction(null);
    }
  }, [state, t, updateReadyState]);

  // dev PR 212 이식: 오늘 활동 기록 새로고침 — 서버 데이터라 웹에서도 동작한다.
  const refreshActivityLogs = useCallback(async () => {
    if (state.kind !== "ready") return;

    setActivityAction("refresh");
    try {
      const activityLogs = await activityApi.getToday();
      updateReadyState((ready) => ({
        ...ready,
        settings: { ...ready.settings, activityLogs },
      }));
      setMessage({ text: t("settings.msg.todayActivityLoaded", { count: activityLogs.length }), tone: "approved" });
    } catch {
      setMessage({ text: t("settings.msg.activityLoadFailed"), tone: "warning" });
    } finally {
      setActivityAction(null);
    }
  }, [state.kind, t, updateReadyState]);

  // dev PR 212 이식: 활동 기록 삭제 — 낙관적으로 지우고 실패 시 서버 상태로 되돌린다.
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
        setMessage({ text: t("settings.msg.activityDeleted"), tone: "approved" });
      } catch {
        const activityLogs = await activityApi.getToday().catch(() => null);
        if (activityLogs) {
          updateReadyState((ready) => ({
            ...ready,
            settings: { ...ready.settings, activityLogs },
          }));
        }
        setMessage({ text: t("settings.msg.activityDeleteFailed"), tone: "warning" });
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

  const checkSyncOutbox = useCallback(async (localFolderId?: string) => {
    // dev PR 191/185 이식 + PR 213: 폴더 인자가 있으면 해당 폴더만, 없으면 전체 아웃박스를 동기화하고
    // 분석 상태를 함께 표기한다. 성공 시 관련 폴더 진행률을 조용히 갱신한다.
    const consentGranted = state.kind === "ready" ? Boolean(state.settings.privacy?.localFolderEnabled) : false;
    const result = await syncPersonalLocalFileEventsToServer(
      localFolderId ? { consentGranted, localFolderId } : { consentGranted },
    );
    if (result.status !== "ready") {
      setMessage({ text: localResultMessage(t, result), tone: "warning" });
      return;
    }

    const foldersToRefresh =
      localFolderId
        ? [localFolderId]
        : state.kind === "ready"
          ? state.settings.folders.map((folder) => folder.id)
          : [];
    for (const folderId of foldersToRefresh) {
      void refreshManagedFolderProgress(folderId, { quiet: true });
    }

    const analysisStatus = await getPersonalLocalFileAnalysisStatus({ consentGranted, maxAttempts: 3 });
    const analysisLabel =
      analysisStatus.status === "ready"
        ? ` / ${localFileAnalysisStatusLabel(analysisStatus.data)}`
        : "";
    setMessage({
      text: `${localResultMessage(t, result)}${analysisLabel}`,
      tone: result.data.analysisFailedCount > 0 || (analysisStatus.status === "ready" && analysisStatus.data.failedCount > 0) ? "warning" : "approved",
    });
  }, [refreshManagedFolderProgress, state, t]);

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
  const serverPreferences = readySettings.preferences;
  const preferenceRooms = readySettings.rooms;
  const currentHomeType = serverPreferences?.defaultHomeType ?? "PERSONAL";
  const currentDefaultRoomId = serverPreferences?.defaultProjectRoomId ?? "";

  const navItems: NavItem[] = [
    { id: "account", labelKey: "settings.nav.account" },
    { id: "preferences", labelKey: "settings.nav.preferences" },
    { id: "notifications", labelKey: "settings.nav.notifications" },
    { id: "integrations", labelKey: "settings.nav.integrations" },
    { id: "privacy", labelKey: "settings.nav.privacy" },
    // 데스크톱 탭은 웹에서도 항상 노출한다 — 웹에서는 컨트롤 없이 안내 + 다운로드 링크만 렌더링한다.
    { id: "desktop", labelKey: "settings.nav.desktop" },
  ];

  // 탭 리스트 키보드 이동 — 세로 내비(↑/↓)와 모바일 가로 칩(←/→)을 모두 지원한다.
  const handleTabListKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const ids = navItems.map((item) => item.id);
    const currentIndex = Math.max(0, ids.indexOf(activeSection));
    let nextIndex = -1;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (currentIndex + 1) % ids.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = ids.length - 1;

    if (nextIndex < 0) return;
    event.preventDefault();
    const nextId = ids[nextIndex];
    selectSection(nextId);
    tabRefs.current[nextId]?.focus();
  };

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
          <div aria-label={t("settings.nav.aria")} className={styles.nav} onKeyDown={handleTabListKeyDown} role="tablist">
            {navItems.map((item) => (
              <button
                aria-controls={`settings-panel-${item.id}`}
                aria-selected={activeSection === item.id}
                className={`${styles.navLink}${activeSection === item.id ? ` ${styles.navLinkActive}` : ""}`}
                id={`settings-tab-${item.id}`}
                key={item.id}
                onClick={() => selectSection(item.id)}
                ref={(node) => {
                  tabRefs.current[item.id] = node;
                }}
                role="tab"
                tabIndex={activeSection === item.id ? 0 : -1}
                type="button"
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <div className={styles.sections}>
            {activeSection === "account" ? (
            <GlassPanel
              aria-labelledby="settings-tab-account"
              className={styles.section}
              id="settings-panel-account"
              role="tabpanel"
            >
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
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.account.withdraw")}</strong>
                    <p>{t("settings.account.withdrawDesc")}</p>
                  </div>
                  <div className={styles.rowControl}>
                    <Button
                      disabled={!ready}
                      loading={withdrawing}
                      onClick={() => {
                        if (!withdrawConfirming) {
                          setWithdrawConfirming(true);
                          return;
                        }
                        void withdraw();
                      }}
                      size="sm"
                      type="button"
                      variant={withdrawConfirming ? "primary" : "quiet"}
                    >
                      {withdrawing
                        ? t("settings.account.withdrawing")
                        : withdrawConfirming
                          ? t("settings.account.withdrawConfirm")
                          : t("settings.account.withdraw")}
                    </Button>
                    {withdrawConfirming && !withdrawing ? (
                      <Button onClick={() => setWithdrawConfirming(false)} size="sm" type="button" variant="quiet">
                        {t("settings.account.withdrawCancel")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </GlassPanel>
            ) : null}

            {activeSection === "preferences" ? (
            <GlassPanel
              aria-labelledby="settings-tab-preferences"
              className={styles.section}
              id="settings-panel-preferences"
              role="tabpanel"
            >
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
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.pref.homeType")}</strong>
                    <p>{t("settings.pref.homeTypeDesc")}</p>
                  </div>
                  <div aria-label={t("settings.pref.homeType")} className={styles.segmented} role="radiogroup">
                    {homeTypeOptions.map((option) => (
                      <button
                        aria-checked={currentHomeType === option.value}
                        className={currentHomeType === option.value ? styles.segmentedActive : ""}
                        disabled={!ready || !serverPreferences}
                        key={option.value}
                        onClick={() => void savePreference({ defaultHomeType: option.value })}
                        role="radio"
                        type="button"
                      >
                        {t(option.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowText}>
                    <strong>{t("settings.pref.defaultRoom")}</strong>
                    <p>{t("settings.pref.defaultRoomDesc")}</p>
                  </div>
                  <select
                    aria-label={t("settings.pref.defaultRoom")}
                    className={styles.selectControl}
                    disabled={!ready || !serverPreferences || preferenceRooms.length === 0}
                    onChange={(event) => {
                      if (event.target.value) void savePreference({ defaultProjectRoomId: event.target.value });
                    }}
                    value={currentDefaultRoomId}
                  >
                    <option disabled value="">
                      {t("settings.pref.defaultRoomNone")}
                    </option>
                    {preferenceRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GlassPanel>
            ) : null}

            {activeSection === "notifications" ? (
            <GlassPanel
              aria-labelledby="settings-tab-notifications"
              className={styles.section}
              id="settings-panel-notifications"
              role="tabpanel"
            >
              <h2>{t("settings.nav.notifications")}</h2>
              <p className={styles.sectionDesc}>{t("settings.notif.sectionDesc")}</p>
              <div className={styles.rows}>
                {notificationRows.map((row) => {
                  // desktopOnly 행이 추가되면 privacy 탭과 동일하게 웹에서 잠그고 안내를 붙인다.
                  const webLocked = Boolean(row.desktopOnly) && !desktopRuntime;
                  return (
                    <div className={styles.row} key={row.key}>
                      <div className={styles.rowText}>
                        <strong>{t(row.titleKey)}</strong>
                        <p>{t(row.descriptionKey)}</p>
                        {webLocked ? <p className={styles.desktopOnlyNote}>{t("settings.row.desktopOnlyNote")}</p> : null}
                      </div>
                      <button
                        aria-checked={notificationSettings[row.key]}
                        aria-label={t(row.titleKey)}
                        className={`${styles.toggle}${notificationSettings[row.key] ? ` ${styles.toggleOn}` : ""}`}
                        disabled={!ready || !readySettings.notifications || webLocked}
                        onClick={() => void toggleNotification(row.key)}
                        role="switch"
                        type="button"
                      >
                        <span />
                      </button>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
            ) : null}

            {activeSection === "integrations" ? (
            <GlassPanel
              aria-labelledby="settings-tab-integrations"
              className={styles.section}
              id="settings-panel-integrations"
              role="tabpanel"
            >
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
            ) : null}

            {activeSection === "privacy" ? (
            <>
            <GlassPanel
              aria-labelledby="settings-tab-privacy"
              className={styles.section}
              id="settings-panel-privacy"
              role="tabpanel"
            >
              <h2>{t("settings.nav.privacy")}</h2>
              <p className={styles.sectionDesc}>{t("settings.privacy.desc")}</p>
              <div className={styles.rows}>
                {privacyRows.map((row) => {
                  // desktopOnly 행은 웹에서 상태만 보여주고 조작은 데스크톱 앱으로 안내한다.
                  const webLocked = Boolean(row.desktopOnly) && !desktopRuntime;
                  return (
                    <div className={styles.row} key={row.key}>
                      <div className={styles.rowText}>
                        <strong>{t(row.titleKey)}</strong>
                        <p>{t(row.descriptionKey)}</p>
                        {webLocked ? <p className={styles.desktopOnlyNote}>{t("settings.row.desktopOnlyNote")}</p> : null}
                      </div>
                      <button
                        aria-checked={privacySettings[row.key]}
                        aria-label={t(row.titleKey)}
                        className={`${styles.toggle}${privacySettings[row.key] ? ` ${styles.toggleOn}` : ""}`}
                        disabled={!ready || !readySettings.privacy || webLocked}
                        onClick={() => void togglePrivacy(row.key)}
                        role="switch"
                        type="button"
                      >
                        <span />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className={styles.guard}>{t("settings.privacy.guard")}</p>
            </GlassPanel>
            {/* dev PR 212 이식: 활동 감지 패널 — 데스크톱 전용 기능이므로 웹에서는 렌더하지 않는다.
                (웹은 위 동의 토글 + 데스크톱 안내로 충분, 죽은 히어로 배너 금지) */}
            {desktopRuntime ? (
            <ActivityDetectionPanel
              activityLogs={readySettings.activityLogs ?? []}
              consentGranted={Boolean(privacySettings.activityDetectionEnabled)}
              deletingActivityId={deletingActivityId}
              desktopRuntime={desktopRuntime}
              loading={activityAction}
              autoCaptureStatus={activityAutoCaptureStatus}
              onDeleteActivity={(activityLogId) => void deleteActivityLog(activityLogId)}
              onRecordActivity={() => void readActivity()}
              onRefreshActivity={() => void refreshActivityLogs()}
            />
            ) : null}
            </>
            ) : null}

            {/* 웹의 데스크톱 탭 — 데스크톱 전용 컨트롤은 렌더링하지 않고(죽은 토글 금지) 안내와 다운로드 링크만 보여준다. */}
            {activeSection === "desktop" && !desktopRuntime ? (
              <GlassPanel
                aria-labelledby="settings-tab-desktop"
                className={styles.section}
                id="settings-panel-desktop"
                role="tabpanel"
              >
                <h2>{t("settings.nav.desktop")}</h2>
                <p className={styles.sectionDesc}>{t("settings.desktop.webBody")}</p>
                <div className={styles.sectionFoot}>
                  <Link className="bubli-button bubli-button--primary" href="/download">
                    {t("settings.desktop.webDownloadCta")}
                  </Link>
                </div>
              </GlassPanel>
            ) : null}

            {activeSection === "desktop" && desktopRuntime ? (
              <GlassPanel
                aria-labelledby="settings-tab-desktop"
                className={styles.section}
                id="settings-panel-desktop"
                role="tabpanel"
              >
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

                {/* 위젯 버블 설정 — 데스크톱 위젯 전용이라 웹 설정에는 노출하지 않는다. */}
                <h3 className={styles.subhead}>{t("settings.widget.title")}</h3>
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

                <h3 className={styles.subhead}>{t("settings.desktop.folders")}</h3>
                <div className={styles.rows}>
                  {managedFolders.length > 0 ? (
                    managedFolders.map((folder) => (
                      <div className={styles.row} key={folder.id}>
                        <div className={styles.rowText}>
                          <strong>{folder.name}</strong>
                          <p>
                            {folder.localPath ?? t("settings.folders.localPathAppOnly")}
                            {folderProgress[folder.id]
                              ? ` · ${t("settings.folders.inlineProgress", {
                                  percent: folderProgress[folder.id].progressPercent,
                                  pending: folderProgress[folder.id].pendingEventCount,
                                })}`
                              : ""}
                          </p>
                        </div>
                        {/* dev PR 213 이식: 폴더별 진행률/스캔/감시/아웃박스 액션 — desktop 탭은 데스크톱 런타임에서만 렌더링된다. */}
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
                          <Button onClick={() => void refreshManagedFolderProgress(folder.id)} size="sm" type="button" variant="quiet">
                            {t("settings.folders.progress")}
                          </Button>
                          <Button onClick={() => void scanManagedFolder(folder.id)} size="sm" type="button" variant="quiet">
                            {t("settings.folders.scan")}
                          </Button>
                          <Button disabled={!folder.syncEnabled} onClick={() => void watchManagedFolder(folder.id)} size="sm" type="button" variant="quiet">
                            {t("settings.folders.watch")}
                          </Button>
                          <Button disabled={!folder.syncEnabled} onClick={() => void checkSyncOutbox(folder.id)} size="sm" type="button" variant="quiet">
                            {t("settings.backup.outbox")}
                          </Button>
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
                  <Button disabled={!ready} onClick={() => void scanManagedFolder()} size="sm" type="button" variant="quiet">
                    {t("settings.folders.scan")}
                  </Button>
                  <Button disabled={!ready} onClick={() => void watchManagedFolder()} size="sm" type="button" variant="quiet">
                    {t("settings.folders.watch")}
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
