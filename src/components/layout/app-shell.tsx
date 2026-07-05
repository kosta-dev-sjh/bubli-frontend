"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { notificationApi } from "@/features/notification/api/notificationApi";
import { FirstRunController } from "@/features/onboarding";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged, readUserUpdatedDetail, useDataRefresh, USER_UPDATED_EVENT } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { TranslateVars, MessageKey } from "@/lib/i18n";
import { AUTH_SESSION_CHANGE_EVENT, getStoredAuthSession, restoreStoredAuthSessionFromTauri } from "@/lib/auth/auth-session";
import { projectRoomRoute } from "@/lib/project-room-routes";
import { launchTauriAuthenticatedSurfaces, stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { openTauriChatWidget } from "@/lib/tauri/chat-widget-routing";
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
import type { AuthUser } from "@/types/api/auth";
import type { NotificationResponse } from "@/types/api/notification";
import type { ContractDocumentType, ProjectRoomInvitationResponse, ProjectRoomResponse } from "@/types/api/projectRoom";

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const TAURI_SESSION_RESTORE_GRACE_ATTEMPTS = 6;
const TAURI_SESSION_RESTORE_GRACE_DELAY_MS = 250;

type AppShellProps = {
  children: ReactNode;
};

type ShellState =
  | { kind: "loading" }
  | { kind: "ready"; notifications: NotificationResponse[]; rooms: ProjectRoomResponse[]; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline"; user?: AuthUser };

type TopbarMenu = "notifications" | "profile" | null;

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

async function restoreInitialWorkspaceSession() {
  const storedSession = getStoredAuthSession();
  if (storedSession) {
    return storedSession;
  }

  let restoredSession = await restoreStoredAuthSessionFromTauri();
  if (restoredSession || !isTauriRuntime()) {
    return restoredSession;
  }

  for (let attempt = 0; attempt < TAURI_SESSION_RESTORE_GRACE_ATTEMPTS; attempt += 1) {
    await waitForMs(TAURI_SESSION_RESTORE_GRACE_DELAY_MS);
    restoredSession = await restoreStoredAuthSessionFromTauri();
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
  const [state, setState] = useState<ShellState>({ kind: "loading" });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => getActiveProjectRoomId());
  const [selectedRoomLabel, setSelectedRoomLabel] = useState<string | null>(() => getActiveProjectRoomLabel());
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [newRoomClient, setNewRoomClient] = useState("");
  const [newRoomFiles, setNewRoomFiles] = useState<File[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const readyUserId = state.kind === "ready" ? state.user.id : null;
  const [topbarMenu, setTopbarMenu] = useState<TopbarMenu>(null);
  const [myInvitations, setMyInvitations] = useState<ProjectRoomInvitationResponse[]>([]);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const roomsRef = useRef<ProjectRoomResponse[]>([]);

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

      try {
        const restoredSession = await restoreInitialWorkspaceSession();
        if (!isCurrentRun()) return;

        if (!restoredSession) {
          if (shouldUseWorkspacePreviewData()) {
            setState({ kind: "ready", notifications: [], rooms: workspacePreviewRooms, user: workspacePreviewUser });
          } else {
            setState({ kind: "auth" });
          }

          return;
        }

        let user: AuthUser;
        try {
          user = await authApi.getMe();
        } catch (error) {
          if (!isCurrentRun()) return;

          if (error instanceof ApiClientError && error.status === 401) {
            setState({ kind: "auth" });
            return;
          }

          setState({ kind: "offline" });
          return;
        }
        if (!isCurrentRun()) return;

        const [roomPageResult, widgetContextResult] = await Promise.allSettled([
          projectRoomApi.list(),
          widgetApi.getContext(),
        ]);

        if (!isCurrentRun()) return;

        if (roomPageResult.status === "rejected") {
          if (roomPageResult.reason instanceof ApiClientError && roomPageResult.reason.status === 401) {
            setState({ kind: "auth" });
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
          setState({ kind: "auth" });
          return;
        }

        if (shouldUseWorkspacePreviewData()) {
          setState({ kind: "ready", notifications: [], rooms: workspacePreviewRooms, user: workspacePreviewUser });
          return;
        }

        setState({ kind: "auth" });
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
  }, []);

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

  // 룸 생성/이름 변경/종료/다시 열기/멤버 변경이 어디에서 일어나든 스위처·탑바에 즉시 반영하고,
  // 창 포커스 복귀 시에도(데스크톱 위젯/다른 탭에서의 변경 대비) 스로틀을 걸어 재검증한다.
  useDataRefresh({
    domains: ["project-room"],
    ignoreSource: "app-shell",
    minFocusIntervalMs: 20_000,
    onRefresh: handleShellListsRefresh,
  });

  useEffect(() => {
    if (state.kind === "auth") {
      if (isTauriRuntime()) {
        void stopTauriAuthenticatedSurfaces().catch((error) => {
          console.warn("Failed to stop Tauri authenticated surfaces after auth reset.", error);
        });
      }
      router.replace("/login");
    }
  }, [router, state.kind]);

  useEffect(() => {
    roomsRef.current = state.kind === "ready" ? state.rooms : [];
  }, [state]);

  useEffect(() => {
    if (state.kind !== "ready" || !isTauriRuntime() || runtimeSmokeEnabled) return;

    void launchTauriAuthenticatedSurfaces({ sessionAlreadyValidated: true }).catch((error) => {
      console.warn("Failed to launch Tauri authenticated surfaces after shell ready.", error);
    });
  }, [state.kind, readyUserId]);

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
  }, [activeRoom, selectedRoom, selectedRoomId, selectedRoomLabel, state, t]);

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
        displayName: state.kind === "auth" ? t("common.login") : "Bubli",
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
  }, [state, t]);

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
    void notificationApi.markRead(notificationId).catch(() => undefined);
  }

  // 알림 "보러가기" 딥링크 — sourceType별 이동 경로(백엔드 NotificationResponse 계약: sourceType + sourceId):
  // - COMMENT/RESOURCE: sourceId를 자료 ID로 보고 자료를 조회해 룸 자료보드(?resourceId=)로,
  //   룸 정보가 없으면 개인 자료보드로 이동한다(조회 실패 시에도 개인 보드 폴백).
  //   자료보드는 ?resourceId=로 해당 자료 상세를 열고, 댓글 섹션은 기본 펼침(<details open>)이다.
  // - MESSAGE: 소통 화면으로(sourceId가 있으면 ?roomId=로 해당 룸 스코프).
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
      const fallbackRoute = sourceId
        ? projectRoomRoute(sourceId, "work")
        : "/app";

      if (isTauriRuntime()) {
        const opened = await openTauriChatWidget({ eventType: "handoff:notification", roomId: sourceId });
        if (!opened) {
          router.replace(fallbackRoute);
        }
        return;
      }
      router.push(sourceId ? `/app/chat?roomId=${encodeURIComponent(sourceId)}` : "/app/chat");
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
    void notificationApi.archive(notificationId).catch(() => undefined);
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
        <div className="bubli-main-scroll">
          {state.kind === "ready" || state.kind === "offline" ? (
            children
          ) : (
            // 비로그인 상태에서는 회원 전용 콘텐츠를 렌더하지 않는다. (로그인 페이지로 리다이렉트 중)
            <div className="bubli-auth-gate" role="status">
              {state.kind === "loading" || isTauriRuntime() ? t("common.loading") : t("layout.gate.redirecting")}
            </div>
          )}
        </div>
        {/* 첫 사용 경험(직군 온보딩 + 튜토리얼) — 인증 완료 후에만, 홈 위 오버레이로 렌더한다. */}
        {state.kind === "ready" ? <FirstRunController user={state.user} /> : null}
      </main>
    </div>
  );
}
