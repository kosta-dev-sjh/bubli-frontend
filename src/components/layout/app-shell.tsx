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

        const [roomPageResult, widgetContextResult] = await Promise.allSettled([
          projectRoomApi.list(),
          widgetApi.getContext(),
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
        const widgetContext = widgetContextResult.status === "fulfilled" ? widgetContextResult.value : null;
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
            await widgetApi.updateContext({ selectedRoomId: restoredRoom.id }).catch(() => undefined);
            if (isCurrentRun()) {
              setSelectedRoomId(restoredRoom.id);
              setSelectedRoomLabel(restoredRoom.name);
            }
          }
        }

        if (isTauriRuntime() && !getActiveProjectRoomId() && roomPage.items[0]) {
          const firstRoom = roomPage.items[0];
          seedActiveProjectRoomId(firstRoom.id, firstRoom.name);
          await widgetApi.updateContext({ selectedRoomId: firstRoom.id }).catch(() => undefined);
          if (!isCurrentRun()) return;
          setSelectedRoomId(firstRoom.id);
          setSelectedRoomLabel(firstRoom.name);
        }

        if (isCurrentRun()) setState({ kind: "ready", notifications: [], rooms: roomPage.items, user });

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
          setAuthOrDesktopRedirectState();
          if (!isTauriRuntime()) {
            clearStoredAuthSession();
          }
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

  function pushNotificationToast(kind: NotificationToastKind, notification: NotificationResponse, chatRoomId?: string) {
    const toastId = notification.id;
    setMessageToasts((current) =>
      [
        ...current.filter((toast) => toast.id !== toastId),
        { chatRoomId, id: toastId, kind, senderName: notification.title, text: notification.body ?? "" },
      ].slice(-MAX_MESSAGE_TOASTS),
    );
    window.setTimeout(() => {
      setMessageToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 6_000);
  }

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

      // 새 알림이 도착하면 사용자가 어디에 있든 즉시 소리로 알린다(미읽음 카운트 변화와 무관).
      // 자동재생 정책상 최초 사용자 제스처 전에는 조용히 무시된다(sound 모듈 내부 처리).
      playNotificationSound();

      if (notification.sourceType === "VOICE_CALL" && notification.sourceId) {
        const call = {
          callerName: notification.title,
          chatRoomId: notification.sourceId,
          notificationId: notification.id,
        };
        // 데스크톱 위젯(바)이 떠 있으면 그쪽에서 수신 전화 팝업을 보여주므로, 앱 쪽에서는
        // 중복으로 뜨지 않게 건너뛴다 — 위젯이 꺼져 있을 때만 앱이 이 역할을 대신한다.
        if (isTauriRuntime()) {
          tauriCommands
            .getWidgetWindowState({ bubbleType: "bar", windowId: "bar" })
            .then((state) => {
              if (!state.windowVisible) setIncomingVoiceCall(call);
            })
            .catch(() => setIncomingVoiceCall(call));
        } else {
          setIncomingVoiceCall(call);
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
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }
      const userIsElsewhere = document.visibilityState === "hidden" || !document.hasFocus();
      if (!userIsElsewhere) {
        return;
      }
      if (Notification.permission === "granted") {
        new Notification(notification.title, { body: notification.body ?? undefined });
      } else if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    });
  }, [state.kind]);

  // 전화처럼 일정 시간 응답이 없으면 자동으로 닫는다 — 채팅방의 "보이스 참여" 버튼으로는 계속 참여 가능.
  useEffect(() => {
    if (!incomingVoiceCall) return;
    const timeoutId = window.setTimeout(() => setIncomingVoiceCall(null), 30_000);
    return () => window.clearTimeout(timeoutId);
  }, [incomingVoiceCall]);

  // 수신 전화 UI가 떠 있는 동안 통화음을 반복 재생하고, 사라지면(응답/거절/타임아웃) 멈춘다.
  useEffect(() => {
    if (!incomingVoiceCall) return;
    startCallRingtone();
    return () => stopCallRingtone();
  }, [incomingVoiceCall]);

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
    // 상대(발신자)에게 거절했음을 알려야 마이크가 켜진 채로 대기하는 발신자 화면을 자동으로 끊을 수 있다.
    // createRoom("있으면 join, 없으면 create")으로 방 id를 구하면, 타이밍 등으로 기존 방을 못 찾을 때
    // 새 방을 만들어버려(그리고 "통화를 시작했습니다" 알림까지 잘못 나가) 거절 신호 자체가 새어나갔다.
    // 부작용 없는 조회 전용 엔드포인트로 방 id만 가져온다.
    void voiceApi
      .getOpenRoomByChatRoomId(call.chatRoomId)
      .then((room) => voiceApi.decline(room.id))
      .catch(() => undefined);
    void notificationApi.markRead(call.notificationId).catch(() => undefined);
    setIncomingVoiceCall(null);
  }, [incomingVoiceCall]);

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
  const unreadNotificationCount = notifications.filter((item) => item.status === "UNREAD").length;
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
    void notificationApi.markAllRead().catch(() => undefined);
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
            notifications: current.notifications.map((item) =>
              item.id === notificationId && item.status !== "ARCHIVED"
                ? { ...item, status: "ARCHIVED" as const }
                : item,
            ),
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
                items={notifications}
                onAcceptInvitation={(invitation) => void handleAcceptInvitation(invitation)}
                onArchive={handleArchiveNotification}
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
      {!incomingVoiceCall && (isCallerRingingBack || outgoingCallNotice) && persistVoice ? (
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
