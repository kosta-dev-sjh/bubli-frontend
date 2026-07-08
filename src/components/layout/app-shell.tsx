"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { TopbarNotificationsPanel } from "@/components/layout/topbar-notifications-panel";
import { TopbarProfileMenu } from "@/components/layout/topbar-profile-menu";
import {
  TOPBAR_NOTIFICATIONS_PANEL_ID,
  TOPBAR_PROFILE_MENU_ID,
  WorkspaceTopbar,
} from "@/components/layout/workspace-topbar";
import { siteConfig } from "@/config/site";
import { authApi } from "@/features/auth/api/authApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { notificationApi } from "@/features/notification/api/notificationApi";
import { presenceApi } from "@/features/presence/api/presenceApi";
import {
  formatNotificationContent,
  isDisplayableNotification,
  isNotificationInboxItem,
  isUnreadNotificationInboxItem,
} from "@/features/notification/format-notification";
import { FirstRunController } from "@/features/onboarding";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged, readUserUpdatedDetail, useDataRefresh, USER_UPDATED_EVENT } from "@/lib/data-changed";
import { playNotificationSound, primeNotificationSound } from "@/lib/sound/notification-sound";
import { startCallRingtone, stopCallRingtone } from "@/lib/sound/call-sound";
import { useI18n } from "@/lib/i18n";
import type { TranslateVars, MessageKey } from "@/lib/i18n";
import {
  AUTH_SESSION_CHANGE_EVENT, getStoredAuthSession, restoreStoredAuthSessionFromTauri, clearStoredAuthSession,
} from "@/lib/auth/auth-session";
import { connectLiveKitRoom, disconnectLiveKitRoom, getActiveLiveKitVoiceRoomId, onActiveSpeakersChanged } from "@/lib/livekit-client";
import { voiceStore } from "@/lib/voice-store";
import { projectRoomRoute } from "@/lib/project-room-routes";
import { launchTauriAuthenticatedSurfaces, stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { openTauriChatWidget } from "@/lib/tauri/chat-widget-routing";
import { tauriCommands } from "@/lib/tauri/commands";
import { listenWidgetRoomContextChanged } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { readTauriStartupOptimizationConfig } from "@/lib/tauri/startup-optimization";
import { writeWindowsChatRoomsCache, writeWindowsProjectRoomsCache } from "@/lib/tauri/windows-route-cache";
import {
  ACTIVE_PROJECT_ROOM_CHANGE_EVENT,
  getActiveProjectRoomId,
  getActiveProjectRoomLabel,
  restoreActiveProjectRoomFromTauri,
  seedActiveProjectRoomId,
  setActiveProjectRoomId,
  syncActiveProjectRoomFromWidgetContext,
} from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewRooms, workspacePreviewUser } from "@/lib/workspace-preview-data";
import { getChatRealtimeClient } from "@/lib/websocket/chat-realtime";
import { websocketTopics } from "@/lib/websocket/topics";
import type { AuthUser } from "@/types/api/auth";
import type { NotificationResponse } from "@/types/api/notification";
import type { ContractDocumentType, ProjectRoomInvitationResponse, ProjectRoomResponse } from "@/types/api/projectRoom";

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const TAURI_SESSION_RESTORE_GRACE_ATTEMPTS = 6;
const TAURI_SESSION_RESTORE_GRACE_DELAY_MS = 250;
const TAURI_SESSION_RESTORE_COMMAND_TIMEOUT_MS = 1_000;
const MAX_MESSAGE_TOASTS = 3;

type AppShellProps = {
  children: ReactNode;
};

type ShellState =
  | { kind: "loading" }
  | { kind: "ready"; notifications: NotificationResponse[]; rooms: ProjectRoomResponse[]; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline"; user?: AuthUser };

type TopbarMenu = "notifications" | "profile" | null;

type NotificationToastKind = "chat-invite" | "friend-accepted" | "friend-request" | "message" | "room-invite";

function initialsFromName(name?: string | null) {
  const cleanName = name?.trim();

  if (!cleanName) {
    return "B";
  }

  const chars = Array.from(cleanName.replace(/\s+/g, ""));
  return chars.slice(0, 2).join("").toUpperCase();
}

function isActiveRoom(pathname: string, roomId: string) {
  return pathname.startsWith(`/app/project-rooms/${roomId}`);
}

// 룸을 바꿀 때, 지금 보고 있는 화면이 특정 룸에 묶여 있으면 그 룸 식별자도 새 룸으로 옮긴다.
// 안 그러면 URL에 박힌 옛 roomId가 우선순위를 잡아(각 페이지가 searchParams.get("roomId") ?? activeRoomId 순으로 읽음)
// 스위처로 룸을 바꿔도 화면은 옛 룸에 고정된다. 룸에 묶이지 않은 화면(홈, 다이렉트 메시지 등)은 건드리지 않는다.
function roomSwitchHref(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  nextRoomId: string,
): string | null {
  // 룸 채팅(/app/chat?mode=room): 룸을 바꾸면 채팅도 새 룸으로. 다이렉트 메시지(mode=direct, 1:1/그룹
  // 통합 탭)는 룸에 안 묶이므로 제외.
  if (pathname === "/app/chat") {
    if (searchParams.get("mode") === "direct") return null;
    if (searchParams.get("roomId") === nextRoomId) return null;
    return `/app/chat?mode=room&roomId=${encodeURIComponent(nextRoomId)}`;
  }

  // 경로 세그먼트형 룸 페이지(웹): /app/project-rooms/{roomId}/(work|resources|chat)
  const pathRoomMatch = pathname.match(/^\/app\/project-rooms\/([^/]+)(\/.*)?$/);
  if (pathRoomMatch) {
    const currentRoomId = decodeURIComponent(pathRoomMatch[1]);
    if (currentRoomId === nextRoomId) return null;
    const rest = pathRoomMatch[2] ?? "";
    const query = searchParams.toString();
    return `/app/project-rooms/${encodeURIComponent(nextRoomId)}${rest}${query ? `?${query}` : ""}`;
  }

  // 쿼리형 룸 페이지: ?roomId= (calendar, agent, project-room-resources, project-room-work 등)
  const queryRoomId = searchParams.get("roomId");
  if (queryRoomId && queryRoomId !== nextRoomId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("roomId", nextRoomId);
    return `${pathname}?${params.toString()}`;
  }

  return null;
}

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

function routeFallbackProject(t: TranslateFn, activeRoom?: ProjectRoomResponse) {
  if (activeRoom) {
    return {
      description: t("layout.project.currentRoom"),
      name: activeRoom.name,
      statusLabel: activeRoom.status === "ACTIVE" ? t("layout.project.inProgress") : t("layout.project.waiting"),
    };
  }

  return {
    description: t("layout.project.notSelected"),
    name: t("layout.project.selectRoom"),
    statusLabel: "",
  };
}

function inferContractDocumentType(file: File): ContractDocumentType {
  const name = file.name.toLowerCase();
  return name.includes("requirement") || name.includes("요구") || name.includes("요건") ? "REQUIREMENT" : "CONTRACT";
}

function waitForMs(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number, fallback: T) {
  let timeoutId: number | null = null;

  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function readWindowsWorkspaceHydrationTimeoutMs() {
  if (!isTauriRuntime()) return 0;

  const startupConfig = await readTauriStartupOptimizationConfig().catch(() => null);
  if (startupConfig?.profile !== "windows") return 0;
  return startupConfig.settingsTimeoutMs;
}

function boundWindowsWorkspaceHydration<T>(task: Promise<T>, timeoutMs: number, fallback: T) {
  if (timeoutMs <= 0) return task;
  return withTimeout(task, timeoutMs, fallback);
}

async function restoreInitialWorkspaceSession() {
  const storedSession = getStoredAuthSession();
  if (storedSession) {
    return storedSession;
  }

  let restoredSession = await withTimeout(
    restoreStoredAuthSessionFromTauri(),
    TAURI_SESSION_RESTORE_COMMAND_TIMEOUT_MS,
    null,
  );
  if (restoredSession || !isTauriRuntime()) {
    return restoredSession;
  }

  for (let attempt = 0; attempt < TAURI_SESSION_RESTORE_GRACE_ATTEMPTS; attempt += 1) {
    await waitForMs(TAURI_SESSION_RESTORE_GRACE_DELAY_MS);
    restoredSession = await withTimeout(
      restoreStoredAuthSessionFromTauri(),
      TAURI_SESSION_RESTORE_COMMAND_TIMEOUT_MS,
      null,
    );
    if (restoredSession) {
      return restoredSession;
    }
  }

  return null;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktopRuntime = isTauriRuntime();
  const [state, setState] = useState<ShellState>({ kind: "loading" });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => getActiveProjectRoomId());
  const [selectedRoomLabel, setSelectedRoomLabel] = useState<string | null>(() => getActiveProjectRoomLabel());
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [newRoomClient, setNewRoomClient] = useState("");
  const [newRoomFiles, setNewRoomFiles] = useState<File[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [authRecoveryNonce, setAuthRecoveryNonce] = useState(0);
  const readyUserId = state.kind === "ready" ? state.user.id : null;
  const [topbarMenu, setTopbarMenu] = useState<TopbarMenu>(null);
  const [myInvitations, setMyInvitations] = useState<ProjectRoomInvitationResponse[]>([]);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const roomsRef = useRef<ProjectRoomResponse[]>([]);

  // 1:1/그룹 보이스 통화 시작 시 수신되는 실시간 "전화 옴" 알림 — 수락/이따 참여/거절.
  const [incomingVoiceCall, setIncomingVoiceCall] = useState<{
    callerName: string;
    chatRoomId: string;
    notificationId: string;
  } | null>(null);
  const [voiceCallResponding, setVoiceCallResponding] = useState(false);
  // 발신 중 팝업에 잠깐 띄우는 상태 문구("상대가 거절했습니다" 등) — 몇 초 뒤 자동으로 사라진다.
  const [outgoingCallNotice, setOutgoingCallNotice] = useState<string | null>(null);

  // 카카오톡 스타일 실시간 미리보기 토스트 — 메시지뿐 아니라 친구 요청/수락, 룸 초대, 1:1·그룹 초대도
  // 화면 어디에 있든 우측 하단에 쌓이고, 클릭하면 종류에 맞는 화면으로 이동한다.
  const [messageToasts, setMessageToasts] = useState<
    { chatRoomId?: string; id: string; kind: NotificationToastKind; senderName: string; text: string }[]
  >([]);

  const voiceSnap = useSyncExternalStore(voiceStore.subscribe, voiceStore.getSnapshot, voiceStore.getServerSnapshot);
  const persistVoice = voiceSnap.voice.kind === "ready" ? voiceSnap.voice : null;
  // 내가 만든 통화방에 아직 나 혼자뿐이면(상대가 안 받음) "통화 중" 표시가 아니라 "발신 중" 표시를 보여줘야 한다.
  const isCallerRingingBack =
    persistVoice !== null &&
    persistVoice.room.status === "OPEN" &&
    readyUserId !== null &&
    persistVoice.room.createdByUserId === readyUserId &&
    persistVoice.room.participants.filter((p) => p.status === "JOINED").length <= 1;
  // 방 자체가 열려 있어도 내가 나간 상태(다른 사람은 통화 중)라면 내 화면에서는 통화 중으로 보이면 안 된다.
  const showVoiceFloat =
    persistVoice !== null &&
    persistVoice.room.status === "OPEN" &&
    persistVoice.room.participants.some((p) => p.userId === readyUserId && p.status === "JOINED") &&
    !isCallerRingingBack;
  const voiceChatLink = persistVoice
    ? persistVoice.room.roomId
      ? `/app/chat?roomId=${persistVoice.room.roomId}`
      : `/app/chat?mode=direct`
    : "/app/chat";

  // "말하는 중" 표시 — LiveKit이 로컬/원격 참여자 전원의 오디오 레벨을 추적해 알려주므로
  // 별도로 마이크 스트림을 열어 분석할 필요가 없다.
  useEffect(() => {
    if (!showVoiceFloat) {
      voiceStore.update({ isSpeaking: false });
      return;
    }
    return onActiveSpeakersChanged((speakingUserIds) => {
      voiceStore.update({ isSpeaking: Boolean(readyUserId && speakingUserIds.has(readyUserId)) });
    });
  }, [showVoiceFloat, readyUserId]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    document.documentElement.dataset.bubliSurface = "hybrid-app";
    document.body.dataset.bubliSurface = "hybrid-app";

    return () => {
      if (document.documentElement.dataset.bubliSurface === "hybrid-app") {
        delete document.documentElement.dataset.bubliSurface;
      }
      if (document.body.dataset.bubliSurface === "hybrid-app") {
        delete document.body.dataset.bubliSurface;
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let loadShellRun = 0;

    async function loadShell() {
      const runId = ++loadShellRun;
      const isCurrentRun = () => mounted && runId === loadShellRun;
      const redirectToLoginWhenTauri = () => {
        if (isTauriRuntime()) {
          router.replace("/login");
          window.setTimeout(() => {
            if (window.location.pathname.startsWith("/app")) {
              window.location.assign("/login");
            }
          }, 250);
        }
      };
      const setAuthOrDesktopRedirectState = () => {
        setState(isTauriRuntime() ? { kind: "loading" } : { kind: "auth" });
      };

      try {
        const restoredSession = await restoreInitialWorkspaceSession();
        if (!isCurrentRun()) return;

        if (!restoredSession) {
          if (shouldUseWorkspacePreviewData()) {
            setState({ kind: "ready", notifications: [], rooms: workspacePreviewRooms, user: workspacePreviewUser });
          } else {
            setAuthOrDesktopRedirectState();
          }
          redirectToLoginWhenTauri();

          return;
        }

        let user: AuthUser;
        try {
          user = await authApi.getMe();
        } catch (error) {
          if (!isCurrentRun()) return;

          if (error instanceof ApiClientError && error.status === 401) {
            setAuthOrDesktopRedirectState();
            if (!isTauriRuntime()) {
              clearStoredAuthSession();
            }
            redirectToLoginWhenTauri();
            return;
          }

          setState({ kind: "offline" });
          return;
        }
        if (!isCurrentRun()) return;

        setState((current) =>
          current.kind === "ready"
            ? { ...current, user }
            : { kind: "ready", notifications: [], rooms: roomsRef.current, user },
        );

        const applyWorkspaceHydration = async (
          roomPage: Awaited<ReturnType<typeof projectRoomApi.list>>,
          widgetContext: Awaited<ReturnType<typeof widgetApi.getContext>> | null,
        ) => {
          void writeWindowsProjectRoomsCache(roomPage.items);
          const contextRoom = widgetContext?.selectedRoomId
            ? roomPage.items.find((room) => room.id === widgetContext.selectedRoomId)
            : undefined;
          if (contextRoom) {
            seedActiveProjectRoomId(contextRoom.id, contextRoom.name);
            if (isCurrentRun()) {
              setSelectedRoomId(contextRoom.id);
              setSelectedRoomLabel(contextRoom.name);
            }
          }

          if (!contextRoom) {
            await restoreActiveProjectRoomFromTauri();
            if (!isCurrentRun()) return;
            const restoredRoomId = getActiveProjectRoomId();
            const restoredRoom = restoredRoomId ? roomPage.items.find((room) => room.id === restoredRoomId) : undefined;
            if (restoredRoom) {
              seedActiveProjectRoomId(restoredRoom.id, restoredRoom.name);
              void widgetApi.updateContext({ selectedRoomId: restoredRoom.id }).catch(() => undefined);
              if (isCurrentRun()) {
                setSelectedRoomId(restoredRoom.id);
                setSelectedRoomLabel(restoredRoom.name);
              }
            }
          }

          if (isTauriRuntime() && !getActiveProjectRoomId() && roomPage.items[0]) {
            const firstRoom = roomPage.items[0];
            seedActiveProjectRoomId(firstRoom.id, firstRoom.name);
            void widgetApi.updateContext({ selectedRoomId: firstRoom.id }).catch(() => undefined);
            if (!isCurrentRun()) return;
            setSelectedRoomId(firstRoom.id);
            setSelectedRoomLabel(firstRoom.name);
          }

          if (isCurrentRun()) setState({ kind: "ready", notifications: [], rooms: roomPage.items, user });
        };

        const queueWorkspaceHydration = () => {
          void Promise.allSettled([projectRoomApi.list(), widgetApi.getContext()]).then(
            async ([roomPageRetryResult, widgetContextRetryResult]) => {
              if (!isCurrentRun()) return;

              if (roomPageRetryResult.status === "rejected") {
                if (roomPageRetryResult.reason instanceof ApiClientError && roomPageRetryResult.reason.status === 401) {
                  setAuthOrDesktopRedirectState();
                  redirectToLoginWhenTauri();
                }
                return;
              }

              await applyWorkspaceHydration(
                roomPageRetryResult.value,
                widgetContextRetryResult.status === "fulfilled" ? widgetContextRetryResult.value : null,
              );
            },
          );
        };

        const workspaceHydrationTimeoutMs = await readWindowsWorkspaceHydrationTimeoutMs();
        const [roomPageResult, widgetContextResult] = await Promise.allSettled([
          boundWindowsWorkspaceHydration(projectRoomApi.list(), workspaceHydrationTimeoutMs, null),
          boundWindowsWorkspaceHydration(widgetApi.getContext(), workspaceHydrationTimeoutMs, null),
        ]);

        if (!isCurrentRun()) return;

        if (roomPageResult.status === "rejected") {
          if (roomPageResult.reason instanceof ApiClientError && roomPageResult.reason.status === 401) {
            setAuthOrDesktopRedirectState();
            redirectToLoginWhenTauri();
            return;
          }

          setState({ kind: "offline", user });
          return;
        }

        const roomPage = roomPageResult.value;
        if (!roomPage) {
          const restoredRoom = await restoreActiveProjectRoomFromTauri();
          if (isCurrentRun() && restoredRoom?.roomId) {
            setSelectedRoomId(restoredRoom.roomId);
            setSelectedRoomLabel(restoredRoom.roomLabel ?? null);
          }
          queueWorkspaceHydration();
          return;
        }

        const widgetContext = widgetContextResult.status === "fulfilled" ? widgetContextResult.value : null;
        await applyWorkspaceHydration(roomPage, widgetContext);

        void Promise.allSettled([notificationApi.list(), projectRoomApi.getMyInvitations("PENDING")]).then(
          ([notificationPageResult, invitationPageResult]) => {
            if (!isCurrentRun()) return;

            if (notificationPageResult.status === "fulfilled") {
              setState((current) =>
                current.kind === "ready" ? { ...current, notifications: notificationPageResult.value.items } : current,
              );
            }

            if (invitationPageResult.status === "fulfilled") {
              setMyInvitations(invitationPageResult.value.items);
            }
          },
        );
      } catch (error) {
        if (!isCurrentRun()) return;
        if (error instanceof ApiClientError && error.status === 401) {
          // 부트스트랩 후반(룸/위젯 컨텍스트 등) 개별 API의 401은 권한 문제일 수 있다.
          // 세션 삭제는 신원 확인(getMe)이 401일 때만 한다 — 여기서 지우면 멀쩡한 세션까지 로그아웃된다.
          setAuthOrDesktopRedirectState();
          redirectToLoginWhenTauri();
          return;
        }

        if (shouldUseWorkspacePreviewData()) {
          setState({ kind: "ready", notifications: [], rooms: workspacePreviewRooms, user: workspacePreviewUser });
          return;
        }

        setAuthOrDesktopRedirectState();
        redirectToLoginWhenTauri();
      }
    }

    function reloadShell() {
      void loadShell();
    }

    void loadShell();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, reloadShell);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, reloadShell);
    };
  }, [authRecoveryNonce, router]);

  // 프로필 저장(설정/온보딩) 즉시 반영 — 셸 재조회 없이 이벤트 페이로드로 탑바 사용자 표시를 갱신한다.
  useEffect(() => {
    function handleUserUpdated(event: Event) {
      const user = readUserUpdatedDetail(event);
      if (!user) return;
      setState((current) => {
        if (current.kind === "ready") return { ...current, user };
        if (current.kind === "offline") return { ...current, user };
        return current;
      });
    }

    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated);
    return () => window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated);
  }, []);

  // 룸 목록/알림/초대함만 가볍게 재조회한다(셸 전체 리로드 없이 스위처·벨 배지를 최신으로 유지).
  const shellReady = state.kind === "ready";
  const shellContextReady = state.kind === "ready";
  const refreshShellLists = useCallback(async () => {
    if (!shellReady) return;

    const [roomPage, notificationPage, invitationPage] = await Promise.allSettled([
      projectRoomApi.list(),
      notificationApi.list(),
      projectRoomApi.getMyInvitations("PENDING"),
    ]);

    if (roomPage.status === "fulfilled") {
      void writeWindowsProjectRoomsCache(roomPage.value.items);
      setState((current) => (current.kind === "ready" ? { ...current, rooms: roomPage.value.items } : current));
    }
    if (notificationPage.status === "fulfilled") {
      setState((current) => (current.kind === "ready" ? { ...current, notifications: notificationPage.value.items } : current));
    }
    if (invitationPage.status === "fulfilled") {
      setMyInvitations(invitationPage.value.items);
    }
  }, [shellReady]);

  const handleShellListsRefresh = useCallback(() => {
    void refreshShellLists();
  }, [refreshShellLists]);

  useEffect(() => {
    if (!shellReady) return;

    void chatApi
      .listRooms()
      .then((page) => writeWindowsChatRoomsCache(page.items))
      .catch(() => undefined);
  }, [shellReady]);

  const pushNotificationToast = useCallback((kind: NotificationToastKind, notification: NotificationResponse, chatRoomId?: string) => {
    const toastId = notification.id;
    const display = formatNotificationContent(t, notification);
    setMessageToasts((current) =>
      [
        ...current.filter((toast) => toast.id !== toastId),
        { chatRoomId, id: toastId, kind, senderName: display.title || notification.title, text: display.body ?? "" },
      ].slice(-MAX_MESSAGE_TOASTS),
    );
    window.setTimeout(() => {
      setMessageToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 6_000);
  }, [t]);

  // 새 채팅 메시지 등으로 생성된 알림을 실시간으로 받아 벨 배지/목록에 즉시 반영한다.
  // 창이 백그라운드에 있으면(Notification API 지원 시) 데스크톱 알림도 함께 띄운다.
  useEffect(() => {
    if (state.kind !== "ready") return;

    const client = getChatRealtimeClient();
    return client.subscribe(websocketTopics.notifications, (data) => {
      const notification = data as NotificationResponse | null;
      if (!notification || typeof notification.id !== "string") return;

      setState((current) =>
        current.kind === "ready"
          ? {
              ...current,
              notifications: [notification, ...current.notifications.filter((item) => item.id !== notification.id)],
            }
          : current,
      );
      notifyDataChanged("notification", { source: "app-shell" });
      const displayableNotification = isDisplayableNotification(notification);

      // 표시 대상 새 알림이 도착하면 사용자가 어디에 있든 즉시 소리로 알린다(미읽음 카운트 변화와 무관).
      // 자동재생 정책상 최초 사용자 제스처 전에는 조용히 무시된다(sound 모듈 내부 처리).
      if (displayableNotification) {
        playNotificationSound();
      }

      if (notification.sourceType === "VOICE_CALL" && notification.sourceId) {
        const call = {
          callerName: notification.title,
          chatRoomId: notification.sourceId,
          notificationId: notification.id,
        };
        // 데스크톱 앱에서는 위젯 바 창이 로그인 시 항상 함께 뜨고, 최소화/숨김 상태에서도
        // 웹뷰 자체는 계속 살아있어(위젯 유지 정책) 수신 전화 팝업을 그대로 띄운다. 예전엔
        // getWidgetWindowState의 windowVisible로 판단했는데, 바가 최소화돼 있으면 "꺼져있다"고
        // 오판해 앱 쪽에서도 중복으로 팝업이 떴다 — Tauri에서는 무조건 위젯에 맡긴다.
        if (!isTauriRuntime()) {
          // 같은 계정으로 데스크톱 앱(위젯)이 이미 떠 있으면 그쪽이 팝업을 전담하므로
          // 웹 탭까지 또 띄우지 않는다. 확인 자체가 실패하면(네트워크 등) 안 뜨는 것보다
          // 중복이 낫다는 원칙으로 그냥 띄운다(fail-open).
          void presenceApi
            .getDesktopActive()
            .then((presence) => {
              if (!presence.active) setIncomingVoiceCall(call);
            })
            .catch(() => setIncomingVoiceCall(call));
        }
      }

      // 상대가 내가 건 전화를 거절함 — 발신자(나) 쪽에서 자동으로 통화를 종료한다.
      // 백엔드는 참여 상태와 무관하게 발신자를 즉시 JOINED로 만들어(수락 대기 개념이 없어서)
      // 거절해도 방이 저절로 안 끝나므로, 이 알림이 유일한 "거절됨" 신호다.
      if (notification.sourceType === "VOICE_CALL_DECLINED" && notification.sourceId) {
        const activeVoice = voiceStore.getSnapshot().voice;
        if (
          activeVoice.kind === "ready" &&
          activeVoice.room.status === "OPEN" &&
          activeVoice.room.chatRoomId === notification.sourceId &&
          activeVoice.room.createdByUserId === readyUserId
        ) {
          const voiceRoomId = activeVoice.room.id;
          void voiceApi
            .end(voiceRoomId)
            .then((room) => voiceStore.update({ voice: { kind: "ready", room } }))
            .catch(() => undefined);
          if (getActiveLiveKitVoiceRoomId() === voiceRoomId) {
            void disconnectLiveKitRoom();
          }
          stopCallRingtone();
          setOutgoingCallNotice(t("layout.voiceCall.declinedNotice"));
          window.setTimeout(() => setOutgoingCallNotice(null), 3_000);
        }
        void notificationApi.markRead(notification.id).catch(() => undefined);
      }

      // 발신자가 내가 받기 전에 전화를 취소함 — 수신 전화 팝업을 계속 띄워둘 이유가 없다.
      if (notification.sourceType === "VOICE_CALL_CANCELED" && notification.sourceId) {
        setIncomingVoiceCall((current) => (current?.chatRoomId === notification.sourceId ? null : current));
        void notificationApi.markRead(notification.id).catch(() => undefined);
      }

      if (notification.sourceType === "MESSAGE" && notification.sourceId) {
        pushNotificationToast("message", notification, notification.sourceId);
      }
      if (notification.sourceType === "CHAT_INVITE" && notification.sourceId) {
        pushNotificationToast("chat-invite", notification, notification.sourceId);
      }
      if (notification.sourceType === "ROOM_INVITE") {
        pushNotificationToast("room-invite", notification);
      }
      if (notification.sourceType === "FRIEND_REQUEST") {
        pushNotificationToast("friend-request", notification);
        notifyDataChanged("friend", { source: "app-shell" });
      }
      if (notification.sourceType === "FRIEND_ACCEPTED") {
        pushNotificationToast("friend-accepted", notification);
        notifyDataChanged("friend", { source: "app-shell" });
      }

      // 탭이 숨겨졌거나 창이 포커스를 잃은 상태(다른 작업 중)면 OS 알림으로도 띄운다.
      // 데스크탑 앱에서는 위젯 바 창이 네이티브 팝업을 단독으로 담당하므로 여기서는 웹만 맡는다(중복 방지).
      if (isTauriRuntime() || typeof window === "undefined" || !("Notification" in window)) {
        return;
      }
      const userIsElsewhere = document.visibilityState === "hidden" || !document.hasFocus();
      if (!userIsElsewhere) {
        return;
      }
      if (!displayableNotification) {
        return;
      }
      const display = formatNotificationContent(t, notification);
      if (Notification.permission === "granted") {
        // OS 알림에도 버블리 마크가 뜨게 아이콘을 지정한다(데스크탑 앱은 앱 아이콘이 자동으로 붙는다).
        // 보이스 전화 알림은 몇 초 뒤 저절로 사라지지 않게(requireInteraction) 해서, 다른 작업
        // 중이라 놓치기 쉬운 상황에서도 사용자가 직접 닫거나 클릭할 때까지 화면에 남아 있게 한다.
        const osNotification = new Notification(display.title || notification.title, {
          body: display.body ?? undefined,
          icon: "/brand/icon-public-180.png",
          requireInteraction: notification.sourceType === "VOICE_CALL",
        });
        // 보이스 전화처럼 다른 작업 중에도 바로 봐야 하는 알림은 클릭하면 탭을 앞으로 가져온다.
        // 브라우저 보안상 스크립트가 임의로 창에 포커스를 뺏을 수는 없어서, 사용자가 OS 알림을
        // 직접 클릭하는 것으로 대신한다(웹에서 가능한 최대치).
        osNotification.onclick = () => {
          window.focus();
          osNotification.close();
        };
      } else if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    });
  }, [pushNotificationToast, readyUserId, state.kind, t]);

  // 상대(발신자)에게 거절/타임아웃을 알려야 마이크가 켜진 채로 대기하는 발신자 화면을 자동으로 끊을 수 있다.
  // createRoom("있으면 join, 없으면 create")으로 방 id를 구하면, 타이밍 등으로 기존 방을 못 찾을 때
  // 새 방을 만들어버려(그리고 "통화를 시작했습니다" 알림까지 잘못 나가) 거절 신호 자체가 새어나갔다.
  // 부작용 없는 조회 전용 엔드포인트로 방 id만 가져온다.
  const notifyIncomingVoiceCallDeclined = useCallback((call: { chatRoomId: string }) => {
    void voiceApi
      .getOpenRoomByChatRoomId(call.chatRoomId)
      .then((room) => voiceApi.decline(room.id))
      .catch(() => undefined);
  }, []);

  // 전화처럼 일정 시간 응답이 없으면 자동으로 닫는다 — 채팅방의 "보이스 참여" 버튼으로는 계속 참여 가능.
  // 타임아웃도 명시적 거절과 동일하게 발신자에게 알려야 한다 — 그냥 로컬 상태만 지우면 수신자
  // 화면에서는 팝업이 사라졌는데 발신자는 계속 "전화를 거는 중이에요"에 갇히는 버그가 생긴다.
  useEffect(() => {
    if (!incomingVoiceCall) return;
    const call = incomingVoiceCall;
    const timeoutId = window.setTimeout(() => {
      notifyIncomingVoiceCallDeclined(call);
      void notificationApi.markRead(call.notificationId).catch(() => undefined);
      setIncomingVoiceCall(null);
    }, 30_000);
    return () => window.clearTimeout(timeoutId);
  }, [incomingVoiceCall, notifyIncomingVoiceCallDeclined]);

  // 수신 전화 UI가 떠 있는 동안 통화음을 반복 재생하고, 사라지면(응답/거절/타임아웃) 멈춘다.
  useEffect(() => {
    if (!incomingVoiceCall) return;
    startCallRingtone();
    return () => stopCallRingtone();
  }, [incomingVoiceCall]);

  // 브라우저는 스크립트로 다른 탭/창에 있는 사용자를 강제로 이 탭에 포커스시킬 수 없다(OS
  // 알림 클릭 유도가 사실상 최대치). 그 다음으로 눈에 띄는 신호로, 이 탭이 안 보이는 동안엔
  // 탭 제목을 깜빡여 최소한 브라우저 탭 목록에서라도 바로 알아챌 수 있게 한다.
  useEffect(() => {
    if (!incomingVoiceCall) return;
    const callerName = incomingVoiceCall.callerName;
    const originalTitle = document.title;
    let flashOn = false;
    const applyTitle = () => {
      const userIsElsewhere = document.visibilityState === "hidden" || !document.hasFocus();
      if (!userIsElsewhere) {
        document.title = originalTitle;
        return;
      }
      flashOn = !flashOn;
      document.title = flashOn ? t("layout.voiceCall.incomingTitleFlash", { caller: callerName }) : originalTitle;
    };
    const intervalId = window.setInterval(applyTitle, 1_000);
    return () => {
      window.clearInterval(intervalId);
      document.title = originalTitle;
    };
  }, [incomingVoiceCall, t]);

  // 발신자(내가 건 전화) 링백 — 상대가 받거나 거절/타임아웃될 때까지 통화음을 반복 재생한다.
  // 채팅 화면을 벗어나도(다른 탭에 있어도) 앱 전역에서 계속 들려야 하므로 여기서도 재생한다.
  useEffect(() => {
    if (!isCallerRingingBack) return;
    startCallRingtone();
    const timeoutId = window.setTimeout(() => stopCallRingtone(), 45_000);
    return () => {
      window.clearTimeout(timeoutId);
      stopCallRingtone();
    };
  }, [isCallerRingingBack]);

  // 상대가 거절했다는 실시간 알림(websocket)이 유실되면(연결이 잠깐 끊기는 등) 발신 팝업이
  // 영영 안 닫힌다 — 거절 자체는 서버에 이미 반영됐는데(알림함엔 남음) 화면만 못 따라간다.
  // declineVoiceRoom은 방 상태를 안 바꾸고 알림만 만든다(끊는 건 이 알림을 받은 발신자 쪽
  // 클라이언트 책임) — 그래서 방 상태를 폴링해선 거절을 절대 못 잡는다(방은 계속 OPEN).
  // 대신 알림 목록에서 이 통화방으로 온 거절 알림 자체를 직접 찾는다.
  // 이펙트 의존성을 persistVoice "객체 전체"로 두면 안 된다 — 채팅 페이지가 링백 중 3초마다
  // 통화방 상태를 자체 폴링해서 voiceStore를 계속 새 객체로 갱신하는데(같은 방이어도 참조가
  // 매번 바뀐다), 그때마다 이 이펙트가 통째로 재시작되면서 setInterval이 한 주기(3초)도 못
  // 채우고 계속 리셋돼 안전망이 사실상 전혀 동작하지 않았다. 방을 식별하는 안정적인 값(id)만
  // 의존성으로 두고, 실제 방 정보는 이펙트가 시작될 때 한 번만 읽는다(같은 방인 동안은 안 바뀜).
  const outgoingVoiceRoomId = persistVoice?.room.id;
  const outgoingChatRoomId = persistVoice?.room.chatRoomId;
  useEffect(() => {
    if (!isCallerRingingBack || !outgoingVoiceRoomId || !outgoingChatRoomId) return;
    const voiceRoomId = outgoingVoiceRoomId;
    const chatRoomId = outgoingChatRoomId;
    const callStartedAt = persistVoice?.room.createdAt ? new Date(persistVoice.room.createdAt).getTime() : 0;
    const interval = window.setInterval(() => {
      void notificationApi
        .list({ page: 0, size: 10 })
        .then((page) => {
          const declined = page.items.find(
            (item) =>
              item.sourceType === "VOICE_CALL_DECLINED" &&
              item.sourceId === chatRoomId &&
              new Date(item.createdAt).getTime() >= callStartedAt,
          );
          if (!declined) return;
          void voiceApi
            .end(voiceRoomId)
            .then((room) => voiceStore.update({ voice: { kind: "ready", room } }))
            .catch(() => undefined);
          if (getActiveLiveKitVoiceRoomId() === voiceRoomId) void disconnectLiveKitRoom();
          stopCallRingtone();
          setOutgoingCallNotice(t("layout.voiceCall.declinedNotice"));
          window.setTimeout(() => setOutgoingCallNotice(null), 3_000);
          void notificationApi.markRead(declined.id).catch(() => undefined);
        })
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persistVoice는 일부러 뺐다(위 주석): 참조가 자주 바뀌어 폴링 안전망 자체를 무력화한다. 안정적인 id/chatRoomId만으로 재시작을 제어한다.
  }, [isCallerRingingBack, outgoingVoiceRoomId, outgoingChatRoomId, t]);

  const cancelOutgoingCall = useCallback(() => {
    if (!persistVoice) return;
    void voiceApi
      .end(persistVoice.room.id)
      .then((room) => voiceStore.update({ voice: { kind: "ready", room } }))
      .catch(() => undefined);
    if (getActiveLiveKitVoiceRoomId() === persistVoice.room.id) {
      void disconnectLiveKitRoom();
    }
    stopCallRingtone();
  }, [persistVoice]);

  const dismissIncomingVoiceCall = useCallback(() => {
    if (!incomingVoiceCall) return;
    const call = incomingVoiceCall;
    notifyIncomingVoiceCallDeclined(call);
    void notificationApi.markRead(call.notificationId).catch(() => undefined);
    setIncomingVoiceCall(null);
  }, [incomingVoiceCall, notifyIncomingVoiceCallDeclined]);

  const acceptIncomingVoiceCall = useCallback(async () => {
    if (!incomingVoiceCall || voiceCallResponding) return;
    const call = incomingVoiceCall;
    if (showVoiceFloat) {
      void notificationApi.markRead(call.notificationId).catch(() => undefined);
      setIncomingVoiceCall(null);
      return;
    }
    setVoiceCallResponding(true);
    try {
      const room = await voiceApi.createRoom({ chatRoomId: call.chatRoomId });
      // DB상 참여 상태는 실제 오디오 연결 성패와 무관하게 즉시 반영한다 —
      // LiveKit 연결이 실패해도 채팅방의 "보이스 참여" 버튼으로 재시도할 수 있어야 하므로.
      voiceStore.update({
        expanded: true,
        selectedChatRoomId: call.chatRoomId,
        voice: { kind: "ready", room },
      });
      // 오디오 연결(ICE/DTLS 협상)은 몇 초 걸릴 수 있어 기다리지 않고 먼저 화면을 옮긴다 —
      // 이걸 기다리게 하면 수락을 눌러도 오디오가 붙을 때까지 수신 전화 팝업에 갇혀 있어,
      // 보이스 방으로 들어가는 게 몇 초씩 늦어 보였다.
      void voiceApi
        .getToken(room.id)
        .then((token) => connectLiveKitRoom(room.id, token))
        .catch(() => {
          // 오디오 연결 실패는 조용히 무시 — 채팅방에서 "보이스 참여" 버튼으로 재시도 가능
        });
    } catch {
      // 룸 생성/조회 자체가 실패한 경우 — 채팅방으로 이동해 상태 확인하도록 둔다
    } finally {
      setVoiceCallResponding(false);
      void notificationApi.markRead(call.notificationId).catch(() => undefined);
      setIncomingVoiceCall(null);
      router.push("/app/chat?mode=direct");
    }
  }, [incomingVoiceCall, router, showVoiceFloat, voiceCallResponding]);

  // 룸 생성/이름 변경/종료/다시 열기/멤버 변경과 알림 상태 변경이 어디에서 일어나든 스위처·탑바에 즉시 반영하고,
  // 창 포커스 복귀 시에도(데스크톱 위젯/다른 탭에서의 변경 대비) 스로틀을 걸어 재검증한다.
  useDataRefresh({
    domains: ["project-room", "notification"],
    ignoreSource: "app-shell",
    minFocusIntervalMs: 20_000,
    onRefresh: handleShellListsRefresh,
  });

  useEffect(() => {
    let redirectFallbackId: number | null = null;

    if (state.kind === "auth") {
      if (isDesktopRuntime) {
        let cancelled = false;

        void restoreStoredAuthSessionFromTauri()
          .then((restoredSession) => {
            if (cancelled) return;
            if (restoredSession) {
              setState({ kind: "loading" });
              setAuthRecoveryNonce((current) => current + 1);
              return;
            }

            void stopTauriAuthenticatedSurfaces().catch((error) => {
              console.warn("Failed to stop Tauri authenticated surfaces after auth reset.", error);
            });
            router.replace("/login");
          })
          .catch(() => {
            if (cancelled) return;
            void stopTauriAuthenticatedSurfaces().catch((error) => {
              console.warn("Failed to stop Tauri authenticated surfaces after auth reset.", error);
            });
            router.replace("/login");
          });

        return () => {
          cancelled = true;
        };
      }

      router.replace("/login");
      redirectFallbackId = window.setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }, 500);
    }

    return () => {
      if (redirectFallbackId !== null) {
        window.clearTimeout(redirectFallbackId);
      }
    };
  }, [isDesktopRuntime, router, state.kind]);

  useEffect(() => {
    roomsRef.current = state.kind === "ready" ? state.rooms : [];
  }, [state]);

  useEffect(() => {
    if (!shellContextReady || !readyUserId || !isTauriRuntime() || runtimeSmokeEnabled) return;

    void launchTauriAuthenticatedSurfaces({
      retryPolicy: "cooldown",
      sessionAlreadyValidated: true,
    }).catch((error: unknown) => {
      console.warn("Failed to launch Tauri authenticated surfaces after shell ready.", error);
    });
  }, [readyUserId, shellContextReady]);

  useEffect(() => {
    function syncActiveProjectRoom(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as { roomId?: string | null; roomLabel?: string | null } | null) : null;
      setSelectedRoomId(detail?.roomId ?? getActiveProjectRoomId());
      setSelectedRoomLabel(detail?.roomLabel ?? getActiveProjectRoomLabel());
    }

    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, syncActiveProjectRoom);

    return () => {
      window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, syncActiveProjectRoom);
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let cancelled = false;
    let unlisten: (() => unknown) | null = null;
    const safeUnlisten = (nextUnlisten: () => unknown) => {
      try {
        void Promise.resolve(nextUnlisten()).catch((error) => {
          console.warn("Failed to remove Tauri widget room listener.", error);
        });
      } catch (error) {
        console.warn("Failed to remove Tauri widget room listener.", error);
      }
    };

    void listenWidgetRoomContextChanged((payload) => {
      const roomId = payload.selectedRoomId?.trim() || null;
      const room = roomId ? roomsRef.current.find((item) => item.id === roomId) : undefined;
      const roomLabel = room?.name ?? null;

      syncActiveProjectRoomFromWidgetContext(roomId, roomLabel);
      setSelectedRoomId(roomId);
      setSelectedRoomLabel(roomLabel);
    }).then((nextUnlisten) => {
      if (cancelled) {
        safeUnlisten(nextUnlisten);
        return;
      }
      unlisten = nextUnlisten;
    });

    return () => {
      cancelled = true;
      if (unlisten) {
        safeUnlisten(unlisten);
      }
    };
  }, []);

  useEffect(() => {
    function openProjectRoomCreate() {
      setProjectSwitcherOpen(true);
      setCreatePanelOpen(true);
    }

    function openProjectRoomSwitcher() {
      setProjectSwitcherOpen(true);
      setCreatePanelOpen(false);
    }

    window.addEventListener("bubli:open-project-room-create", openProjectRoomCreate);
    window.addEventListener("bubli:open-project-room-switcher", openProjectRoomSwitcher);

    return () => {
      window.removeEventListener("bubli:open-project-room-create", openProjectRoomCreate);
      window.removeEventListener("bubli:open-project-room-switcher", openProjectRoomSwitcher);
    };
  }, []);

  const rooms = state.kind === "ready" ? state.rooms : [];
  const notifications = state.kind === "ready" ? state.notifications : [];
  const visibleNotifications = notifications.filter(isNotificationInboxItem);
  const unreadNotificationCount = notifications.filter(isUnreadNotificationInboxItem).length;
  const roomFromPath = rooms.find((room) => isActiveRoom(pathname, room.id));
  const roomIdFromQuery = searchParams.get("roomId");
  const roomFromQuery = roomIdFromQuery ? rooms.find((room) => room.id === roomIdFromQuery) : undefined;
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const activeRoom = roomFromPath ?? roomFromQuery ?? selectedRoom;

  function setActiveProjectRoom(room: ProjectRoomResponse) {
    setSelectedRoomId(room.id);
    setSelectedRoomLabel(room.name);
    setActiveProjectRoomId(room.id, room.name);
    // 지금 보고 있는 화면이 특정 룸에 묶여 있으면(경로 세그먼트든 ?roomId= 쿼리든) URL의 룸 식별자도 새 룸으로 옮긴다.
    // 안 그러면 URL의 옛 roomId가 우선순위를 잡아(각 페이지가 searchParams.get("roomId") ?? activeRoomId 순으로 읽음)
    // 스위처로 룸을 바꿔도 캘린더·에이전트·채팅·자료보드 화면이 옛 룸에 고정된다.
    // 이 경로는 스위처·룸 생성·보이스 조인 같은 실제 사용자 전환에서만 불리므로, 마운트 시 동기화(딥링크)와 충돌하지 않는다.
    const nextHref = roomSwitchHref(pathname, searchParams, room.id);
    if (nextHref) {
      router.replace(nextHref);
    }
  }

  useEffect(() => {
    const routeRoom = roomFromPath ?? roomFromQuery;
    if (!routeRoom || routeRoom.id === selectedRoomId) return;
    setActiveProjectRoomId(routeRoom.id, routeRoom.name);
  }, [roomFromPath, roomFromQuery, selectedRoomId]);

  useEffect(() => {
    if (state.kind !== "ready" || !selectedRoom) return;
    if (getActiveProjectRoomId() === selectedRoom.id && getActiveProjectRoomLabel() === selectedRoom.name) return;
    setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
  }, [selectedRoom, state.kind]);

  // 브라우저/WKWebView 자동재생 정책: 사용자 제스처가 한 번이라도 있어야 이후 알림음 재생이 허용된다.
  // 최초 클릭/키입력/터치 시 한 번만 사전 로드해 두면, 실제 알림 시점에 소리가 막히지 않는다.
  useEffect(() => {
    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      primeNotificationSound();
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
      window.removeEventListener("touchstart", prime);
    };
    window.addEventListener("pointerdown", prime, { once: false });
    window.addEventListener("keydown", prime, { once: false });
    window.addEventListener("touchstart", prime, { once: false });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
      window.removeEventListener("touchstart", prime);
    };
  }, []);

  // 새 알림(미읽음 증가) 도착 → 버블 알림음(뽑!).
  // 첫 준비(baseline)에는 울리지 않는다 — 기존 미읽음 로드로 인한 오탐을 막는다.
  const prevUnreadNotificationCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.kind !== "ready") return;
    const prev = prevUnreadNotificationCountRef.current;
    prevUnreadNotificationCountRef.current = unreadNotificationCount;
    if (prev !== null && unreadNotificationCount > prev) {
      playNotificationSound();
    }
    // 데스크탑 앱 아이콘 배지(맥 독 숫자 / 윈도우 오버레이 점)도 함께 갱신한다.
    if (isTauriRuntime()) {
      void tauriCommands.setAppBadgeCount(unreadNotificationCount).catch(() => undefined);
    }
  }, [unreadNotificationCount, state.kind]);

  const topbarProject = useMemo(() => {
    if (state.kind === "loading") {
      return {
        description: t("layout.project.checking"),
        name: t("layout.project.selectRoom"),
        statusLabel: "",
      };
    }

    if (state.kind === "auth") {
      return {
        description: t("layout.project.loginToStart"),
        name: t("layout.project.loginRequired"),
        statusLabel: t("layout.project.waiting"),
      };
    }

    if (state.kind === "offline") {
      return routeFallbackProject(t, activeRoom);
    }

    if (activeRoom) {
      return {
        description: t("layout.project.currentRoom"),
        name: activeRoom.name,
        statusLabel: activeRoom.status === "ACTIVE" ? t("layout.project.inProgress") : t("layout.project.waiting"),
      };
    }

    const staleSelectedRoom = state.kind === "ready" && selectedRoomId && !selectedRoom;

    if (selectedRoomLabel && !staleSelectedRoom) {
      return {
        description: t("layout.project.currentRoom"),
        name: selectedRoomLabel,
        statusLabel: t("layout.project.inProgress"),
      };
    }

    return routeFallbackProject(t);
  }, [activeRoom, isDesktopRuntime, selectedRoom, selectedRoomId, selectedRoomLabel, state, t]);

  const topbarUser = useMemo(() => {
    if (state.kind === "offline" && state.user) {
      return {
        avatarUrl: state.user.avatarUrl,
        displayName: state.user.name,
        email: t("layout.user.serverWaiting"),
        initials: initialsFromName(state.user.name),
      };
    }

    if (state.kind !== "ready") {
      return {
        displayName: state.kind === "auth" && !isDesktopRuntime ? t("common.login") : "Bubli",
        email: state.kind === "offline" ? t("layout.user.serverWaiting") : t("layout.user.checking"),
        initials: "B",
      };
    }

    return {
      avatarUrl: state.user.avatarUrl,
      displayName: state.user.name,
      email: state.user.email ?? (state.user.bubliId ? `@${state.user.bubliId}` : t("layout.user.loggedIn")),
      initials: initialsFromName(state.user.name),
    };
  }, [isDesktopRuntime, state, t]);

  const closeTopbarMenus = useCallback(() => {
    setTopbarMenu(null);
  }, []);

  function toggleTopbarMenu(menu: Exclude<TopbarMenu, null>) {
    setTopbarMenu((current) => (current === menu ? null : menu));
  }

  function handleMarkNotificationRead(notificationId: string) {
    // 낙관적으로 상태를 갱신해 배지 수를 바로 줄이고, 서버 반영 실패는 다음 로드에서 복구된다.
    setState((current) =>
      current.kind === "ready"
        ? {
            ...current,
            notifications: current.notifications.map((item) =>
              item.id === notificationId && item.status === "UNREAD"
                ? { ...item, readAt: new Date().toISOString(), status: "READ" as const }
                : item,
            ),
          }
        : current,
    );
    void notificationApi
      .markRead(notificationId)
      .then(() => notifyDataChanged("notification", { source: "app-shell" }))
      .catch(() => undefined);
  }

  function handleMarkAllNotificationsRead() {
    // 낙관적으로 전부 읽음 처리해 배지를 바로 비우고, 서버 반영 실패는 다음 로드에서 복구된다.
    setState((current) =>
      current.kind === "ready"
        ? {
            ...current,
            notifications: current.notifications.map((item) =>
              item.status === "UNREAD" ? { ...item, readAt: new Date().toISOString(), status: "READ" as const } : item,
            ),
          }
        : current,
    );
    void notificationApi
      .markAllRead()
      .then(() => notifyDataChanged("notification", { source: "app-shell" }))
      .catch(() => undefined);
  }

  function handleArchiveAllNotifications() {
    // 낙관적으로 목록을 비우고 서버에 일괄 보관을 요청한다. 실패는 다음 로드에서 복구된다.
    setState((current) =>
      current.kind === "ready"
        ? {
            ...current,
            notifications: current.notifications.map((item) =>
              item.status === "ARCHIVED" ? item : { ...item, status: "ARCHIVED" as const },
            ),
          }
        : current,
    );
    void notificationApi
      .archiveAll()
      .then(() => notifyDataChanged("notification", { source: "app-shell" }))
      .catch(() => undefined);
  }

  // MESSAGE 알림의 sourceId는 항상 chat_rooms.id(채팅방 ID)다 — 프로젝트룸 채팅이면
  // 그 채팅방에 연결된 project room의 roomId로, 1:1/그룹이면 chatRoomId로 이동해야 한다.
  // (과거엔 이 둘을 구분 안 하고 항상 projectRoomRoute(sourceId, ...)로 보내 1:1/그룹
  //  알림 클릭 시 엉뚱한 화면으로 이동하던 버그가 있었다.)
  async function resolveChatRoomRoute(chatRoomId: string): Promise<{ isProjectRoom: boolean; roomId?: string; route: string }> {
    try {
      const page = await chatApi.listRooms({ size: 100 });
      const room = page.items.find((item) => item.id === chatRoomId);
      if (room?.chatType === "ROOM" && room.roomId) {
        return { isProjectRoom: true, roomId: room.roomId, route: projectRoomRoute(room.roomId, "chat") };
      }
      if (room?.chatType === "GROUP") {
        voiceStore.update({ selectedChatRoomId: chatRoomId });
        return { isProjectRoom: false, route: "/app/chat?mode=direct" };
      }
    } catch {
      // 조회 실패 시 1:1/그룹으로 간주하고 진행 — 최소한 소통 화면까지는 이동시킨다
    }
    voiceStore.update({ selectedChatRoomId: chatRoomId });
    return { isProjectRoom: false, route: "/app/chat?mode=direct" };
  }

  function dismissMessageToast(toastId: string) {
    setMessageToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  async function openMessageToast(toast: { chatRoomId?: string; id: string; kind: NotificationToastKind }) {
    dismissMessageToast(toast.id);

    if (toast.kind === "friend-request" || toast.kind === "friend-accepted") {
      router.push("/app/chat?mode=direct&friends=1");
      return;
    }
    if (toast.kind === "room-invite") {
      setTopbarMenu("notifications");
      return;
    }
    if (!toast.chatRoomId) return;
    const target = await resolveChatRoomRoute(toast.chatRoomId);
    router.push(target.route);
  }

  // 알림 "보러가기" 딥링크 — sourceType별 이동 경로(백엔드 NotificationResponse 계약: sourceType + sourceId):
  // - COMMENT/RESOURCE: sourceId를 자료 ID로 보고 자료를 조회해 룸 자료보드(?resourceId=)로,
  //   룸 정보가 없으면 개인 자료보드로 이동한다(조회 실패 시에도 개인 보드 폴백).
  //   자료보드는 ?resourceId=로 해당 자료 상세를 열고, 댓글 섹션은 기본 펼침(<details open>)이다.
  // - MESSAGE: 채팅방 종류에 맞는 소통 화면으로 이동(resolveChatRoomRoute 참고).
  // - AGENT: AI 요청함으로.
  // 클릭 즉시 읽음 처리(낙관적)하고 알림 패널을 닫는다.
  async function handleOpenNotification(notification: NotificationResponse) {
    if (notification.status === "UNREAD") {
      handleMarkNotificationRead(notification.id);
    }
    setTopbarMenu(null);

    const sourceId = notification.sourceId ?? null;

    if (notification.sourceType === "AGENT") {
      router.push("/app/agent");
      return;
    }
    if (notification.sourceType === "MESSAGE") {
      if (!sourceId) {
        router.push("/app/chat");
        return;
      }
      const target = await resolveChatRoomRoute(sourceId);
      const fallbackRoute = target.route;

      if (isTauriRuntime()) {
        const opened = await openTauriChatWidget({ eventType: "handoff:notification", roomId: sourceId });
        if (!opened) {
          router.replace(fallbackRoute);
        }
        return;
      }
      router.push(fallbackRoute);
      return;
    }
    if (notification.sourceType === "CHAT_INVITE") {
      if (!sourceId) {
        router.push("/app/chat");
        return;
      }
      const target = await resolveChatRoomRoute(sourceId);
      const fallbackRoute = target.route;

      if (isTauriRuntime()) {
        const opened = await openTauriChatWidget({ eventType: "handoff:notification", roomId: sourceId });
        if (!opened) {
          router.replace(fallbackRoute);
        }
        return;
      }
      router.push(fallbackRoute);
      return;
    }
    if (notification.sourceType === "FRIEND_REQUEST" || notification.sourceType === "FRIEND_ACCEPTED") {
      router.push("/app/chat?mode=direct&friends=1");
      return;
    }
    if (notification.sourceType === "ROOM_INVITE") {
      setTopbarMenu("notifications");
      return;
    }
    if (notification.sourceType === "COMMENT" || notification.sourceType === "RESOURCE") {
      if (!sourceId) {
        router.push("/app/resources");
        return;
      }
      try {
        const resource = await resourcesApi.get(sourceId);
        router.push(
          resource.roomId
            ? `${projectRoomRoute(resource.roomId, "resources")}&resourceId=${encodeURIComponent(resource.id)}`
            : `/app/resources?resourceId=${encodeURIComponent(resource.id)}`,
        );
      } catch {
        // 자료 조회 실패(권한/삭제 등) — 개인 자료보드로 폴백해 최소한 보드까지는 안내한다.
        router.push(`/app/resources?resourceId=${encodeURIComponent(sourceId)}`);
      }
    }
  }

  async function handleAcceptInvitation(invitation: ProjectRoomInvitationResponse) {
    if (acceptingInvitationId) return;
    setAcceptingInvitationId(invitation.id);

    try {
      await projectRoomApi.acceptInvitation(invitation.id);
      setMyInvitations((current) => current.filter((item) => item.id !== invitation.id));

      // 수락한 룸을 목록에 반영하고 곧바로 이동한다.
      const roomPage = await projectRoomApi.list().catch(() => null);
      if (roomPage) {
        setState((current) => (current.kind === "ready" ? { ...current, rooms: roomPage.items } : current));
        const joinedRoom = roomPage.items.find((room) => room.id === invitation.roomId);
        if (joinedRoom) setActiveProjectRoom(joinedRoom);
      }
      // 같은 창에 떠 있는 홈 카드/룸 목록 화면에도 즉시 알린다(셸 자신은 위에서 이미 갱신).
      notifyDataChanged("project-room", { source: "app-shell" });
      setTopbarMenu(null);
      router.push(projectRoomRoute(invitation.roomId, "work"));
    } catch {
      // 만료/취소된 초대일 수 있으므로 목록에서만 제거하지 않고 다음 로드에서 동기화한다.
    } finally {
      setAcceptingInvitationId(null);
    }
  }

  function handleArchiveNotification(notificationId: string) {
    // 낙관적으로 보관 처리해 목록에서 바로 숨기고, 서버 반영 실패는 다음 로드에서 복구된다.
    setState((current) =>
      current.kind === "ready"
        ? {
            ...current,
            notifications: current.notifications.filter((item) => item.id !== notificationId),
          }
        : current,
    );
    void notificationApi
      .archive(notificationId)
      .then(() => notifyDataChanged("notification", { source: "app-shell" }))
      .catch(() => undefined);
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // authApi.logout()이 finally에서 세션을 정리하므로 실패해도 로그인 화면으로 이동한다.
    }

    setTopbarMenu(null);
    router.replace("/login");
  }

  function resetCreateForm() {
    setNewRoomClient("");
    setNewRoomFiles([]);
    setNewRoomName("");
  }

  async function uploadNewRoomDocuments(roomId: string) {
    if (!newRoomFiles.length) return;

    for (const file of newRoomFiles) {
      try {
        await projectRoomApi.uploadContractDocument(roomId, file, inferContractDocumentType(file));
      } catch {
        // 프로젝트룸 생성은 유지하고, 자료 업로드 실패는 자료보드에서 다시 처리한다.
      }
    }
  }

  function finishCreatedRoom(createdRoom: ProjectRoomResponse) {
    setState((current) =>
      current.kind === "ready"
        ? { ...current, rooms: [createdRoom, ...current.rooms.filter((room) => room.id !== createdRoom.id)] }
        : current,
    );
    resetCreateForm();
    setActiveProjectRoom(createdRoom);
    setCreatePanelOpen(false);
    setProjectSwitcherOpen(false);
    // 홈 카드/룸 목록 화면 등 같은 창의 다른 표면에 생성 사실을 즉시 알린다.
    notifyDataChanged("project-room", { source: "app-shell" });
    router.push(projectRoomRoute(createdRoom.id, "work"));
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = newRoomName.trim();

    if (!cleanName || isCreatingRoom) return;

    setIsCreatingRoom(true);

    try {
      const createdRoom = await projectRoomApi.create({
        clientName: newRoomClient.trim() || null,
        name: cleanName,
        paymentStatus: "NOT_RECORDED",
      });

      await uploadNewRoomDocuments(createdRoom.id);
      finishCreatedRoom(createdRoom);
    } catch {
      return;
    } finally {
      setIsCreatingRoom(false);
    }
  }

  function selectProjectRoom(room: ProjectRoomResponse) {
    setActiveProjectRoom(room);
    setCreatePanelOpen(false);
    setProjectSwitcherOpen(false);
  }

  if (state.kind === "loading" || state.kind === "auth") {
    return (
      <main className="bubli-auth-gate bubli-auth-gate--standalone" role="status">
        {state.kind === "loading" ? t("common.loading") : t("layout.gate.redirecting")}
      </main>
    );
  }

  return (
    <div className="bubli-app-layout">
      <aside className="bubli-sidebar" data-tour="sidebar">
        <Link className="bubli-brand" href="/app">
          {siteConfig.name}
        </Link>
        <div className="bubli-nav-wrap">
          <div className="bubli-nav-section-label">{t("layout.sidebar.personal")}</div>
          <AppNav activeRoomId={activeRoom?.id ?? null} />
        </div>
      </aside>
      <main className="shell bubli-main">
        <WorkspaceTopbar
          notificationCount={unreadNotificationCount + myInvitations.length}
          notificationsOpen={topbarMenu === "notifications"}
          notificationsPanel={
            topbarMenu === "notifications" ? (
              <TopbarNotificationsPanel
                acceptingInvitationId={acceptingInvitationId}
                id={TOPBAR_NOTIFICATIONS_PANEL_ID}
                invitations={myInvitations}
                items={visibleNotifications}
                onAcceptInvitation={(invitation) => void handleAcceptInvitation(invitation)}
                onArchive={handleArchiveNotification}
                onArchiveAll={handleArchiveAllNotifications}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onMarkRead={handleMarkNotificationRead}
                onOpen={(notification) => void handleOpenNotification(notification)}
              />
            ) : null
          }
          onCloseMenus={closeTopbarMenus}
          onOpenNotifications={() => toggleTopbarMenu("notifications")}
          onOpenProfile={() => toggleTopbarMenu("profile")}
          onOpenProjectSwitcher={() => setProjectSwitcherOpen((current) => !current)}
          profileMenu={
            topbarMenu === "profile" ? (
              <TopbarProfileMenu id={TOPBAR_PROFILE_MENU_ID} onClose={closeTopbarMenus} onLogout={handleLogout} user={topbarUser} />
            ) : null
          }
          profileOpen={topbarMenu === "profile"}
          project={topbarProject}
          searchEnabled={false}
          surfaceLabel=""
          user={topbarUser}
        />
        {projectSwitcherOpen ? (
          <>
            <button
              aria-label={t("layout.switcher.closeAria")}
              className="workspace-switcher-backdrop"
              onClick={() => {
                setCreatePanelOpen(false);
                setProjectSwitcherOpen(false);
              }}
              type="button"
            />
            <section className="workspace-switcher" aria-label={t("layout.switcher.aria")}>
              <div className="workspace-switcher__head">
                <div>
                  <strong>{t("layout.switcher.title")}</strong>
                  <span>{t("layout.switcher.subtitle")}</span>
                </div>
                <button
                  aria-label={t("layout.switcher.createAria")}
                  className="workspace-switcher__add"
                  onClick={() => setCreatePanelOpen((current) => !current)}
                  type="button"
                >
                  +
                </button>
              </div>

              <div className="workspace-switcher__section">
                <span className="workspace-switcher__label">{t("layout.switcher.currentRooms")}</span>
                {rooms.length ? (
                  rooms.map((room) => (
                    <button
                      className="workspace-switcher__item"
                      data-active={activeRoom?.id === room.id ? "true" : undefined}
                      key={room.id}
                      onClick={() => selectProjectRoom(room)}
                      type="button"
                    >
                      <span className="workspace-switcher__avatar">{room.name.slice(0, 1)}</span>
                      <span>
                        <strong>{room.name}</strong>
                        <small>{room.clientName || t("layout.switcher.roomFallback")}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="workspace-switcher__empty">{t("layout.switcher.empty")}</p>
                )}
              </div>

              {createPanelOpen ? (
                <form className="workspace-switcher__create" onSubmit={handleCreateRoom}>
                  <label>
                    <span>{t("layout.switcher.nameLabel")}</span>
                    <input
                      autoFocus
                      onChange={(event) => setNewRoomName(event.target.value)}
                      placeholder={t("layout.switcher.namePlaceholder")}
                      value={newRoomName}
                    />
                  </label>
                  <label>
                    <span>{t("layout.switcher.clientLabel")}</span>
                    <input onChange={(event) => setNewRoomClient(event.target.value)} placeholder={t("layout.switcher.clientPlaceholder")} value={newRoomClient} />
                  </label>
                  <label>
                    <span>{t("layout.switcher.filesLabel")}</span>
                    <input
                      accept=".pdf,.txt,.md,.doc,.docx"
                      multiple
                      onChange={(event) => setNewRoomFiles(Array.from(event.target.files ?? []))}
                      type="file"
                    />
                  </label>
                  <div className="workspace-switcher__file-hint">
                    {newRoomFiles.length
                      ? t("layout.switcher.filesSelected", { count: newRoomFiles.length })
                      : t("layout.switcher.filesHint")}
                  </div>
                  {newRoomFiles.length ? (
                    <div className="workspace-switcher__files">
                      {newRoomFiles.map((file) => (
                        <span key={`${file.name}-${file.size}`}>{file.name}</span>
                      ))}
                    </div>
                  ) : null}
                  <button disabled={!newRoomName.trim() || isCreatingRoom} type="submit">
                    {isCreatingRoom
                      ? t("layout.switcher.creating")
                      : newRoomFiles.length
                        ? t("layout.switcher.createWithAnalysis")
                        : t("layout.switcher.create")}
                  </button>
                </form>
              ) : null}
            </section>
          </>
        ) : null}
        <div className="bubli-main-scroll">{children}</div>
        {/* 첫 사용 경험(직군 온보딩 + 튜토리얼) — 인증 완료 후에만, 홈 위 오버레이로 렌더한다. */}
        {state.kind === "ready" ? <FirstRunController user={state.user} /> : null}
      </main>
      {showVoiceFloat ? (
        <div className="voice-float" role="status" aria-label={t("layout.voice.active")}>
          <Link className="voice-float__btn" href={voiceChatLink} title={t("layout.voice.goToChat")}>
            <Phone aria-hidden size={21} strokeWidth={2} />
            <span className="voice-float__ring" aria-hidden />
            <span className="voice-float__ring voice-float__ring--2" aria-hidden />
          </Link>
          <span className="voice-float__label">{t("layout.voice.active")}</span>
        </div>
      ) : null}
      {incomingVoiceCall ? (
        <div className="voice-call-invite" role="dialog" aria-modal="true" aria-label={t("layout.voiceCall.aria")}>
          <div className="voice-call-invite__card">
            <div className="voice-call-invite__avatar" aria-hidden="true">
              <Phone size={26} strokeWidth={2} />
            </div>
            <strong className="voice-call-invite__caller">{incomingVoiceCall.callerName}</strong>
            <span className="voice-call-invite__hint">{t("layout.voiceCall.hint")}</span>
            <div className="voice-call-invite__actions">
              <button
                className="voice-call-invite__accept"
                disabled={voiceCallResponding}
                onClick={() => void acceptIncomingVoiceCall()}
                type="button"
              >
                {voiceCallResponding ? t("layout.voiceCall.connecting") : t("layout.voiceCall.accept")}
              </button>
              <button className="voice-call-invite__decline" disabled={voiceCallResponding} onClick={dismissIncomingVoiceCall} type="button">
                {t("layout.voiceCall.decline")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* 데스크톱 앱에서는 위젯이 발신(ringback) 팝업도 전담한다 — 수신 팝업과 같은 이유로
          여기서 또 띄우면 앱+위젯 두 개가 겹친다. */}
      {!isDesktopRuntime && !incomingVoiceCall && (isCallerRingingBack || outgoingCallNotice) && persistVoice ? (
        <div className="voice-call-invite" role="status" aria-label={t("layout.voiceCall.outgoingAria")}>
          <div className="voice-call-invite__card">
            <div className="voice-call-invite__avatar" aria-hidden="true">
              <Phone size={26} strokeWidth={2} />
            </div>
            <strong className="voice-call-invite__caller">{voiceSnap.calleeLabel ?? t("layout.voiceCall.outgoingHint")}</strong>
            <span className="voice-call-invite__hint">{outgoingCallNotice ?? t("layout.voiceCall.outgoingHint")}</span>
            {isCallerRingingBack ? (
              <div className="voice-call-invite__actions">
                <button className="voice-call-invite__decline" onClick={cancelOutgoingCall} type="button">
                  {t("layout.voiceCall.cancel")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {messageToasts.length > 0 ? (
        <div className="message-toast-stack" aria-live="polite">
          {messageToasts.map((toast) => (
            <div className="message-toast" key={toast.id} role="status">
              <button className="message-toast__body" onClick={() => void openMessageToast(toast)} type="button">
                <strong className="message-toast__sender">{toast.senderName}</strong>
                <span className="message-toast__text">{toast.text}</span>
                <span className="message-toast__view-detail">{t("layout.messageToast.viewDetail")}</span>
              </button>
              <button
                aria-label={t("layout.messageToast.dismiss")}
                className="message-toast__close"
                onClick={() => dismissMessageToast(toast.id)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
