"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
import { siteConfig } from "@/config/site";
import { authApi } from "@/features/auth/api/authApi";
import { notificationApi } from "@/features/notification/api/notificationApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { launchTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  ACTIVE_PROJECT_ROOM_CHANGE_EVENT,
  getActiveProjectRoomId,
  getActiveProjectRoomLabel,
  setActiveProjectRoomId,
} from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewRooms, workspacePreviewUser } from "@/lib/workspace-preview-data";
import type { AuthUser } from "@/types/api/auth";
import type { ContractDocumentType, ProjectRoomResponse } from "@/types/api/projectRoom";

type AppShellProps = {
  children: ReactNode;
};

type ShellState =
  | { kind: "loading" }
  | { kind: "ready"; notificationCount: number; rooms: ProjectRoomResponse[]; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline" };

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

function routeFallbackProject(activeRoom?: ProjectRoomResponse) {
  if (activeRoom) {
    return {
      description: "현재 룸",
      name: activeRoom.name,
      statusLabel: activeRoom.status === "ACTIVE" ? "진행 중" : "대기",
    };
  }

  return {
    description: "선택 안 함",
    name: "프로젝트룸 선택",
    statusLabel: "",
  };
}

function inferContractDocumentType(file: File): ContractDocumentType {
  const name = file.name.toLowerCase();
  return name.includes("requirement") || name.includes("요구") || name.includes("요건") ? "REQUIREMENT" : "CONTRACT";
}

export function AppShell({ children }: AppShellProps) {
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

    async function loadShell() {
      try {
        const [user, roomPage] = await Promise.all([authApi.getMe(), projectRoomApi.list()]);
        let notificationCount = 0;

        try {
          const notificationPage = await notificationApi.list();
          notificationCount = notificationPage.items.filter((item) => item.status === "UNREAD").length;
        } catch {
          notificationCount = 0;
        }

        if (mounted) setState({ kind: "ready", notificationCount, rooms: roomPage.items, user });
      } catch (error) {
        if (!mounted) return;
        if (error instanceof ApiClientError && error.status === 401) {
          setState({ kind: "auth" });
          return;
        }

        if (shouldUseWorkspacePreviewData()) {
          setState({ kind: "ready", notificationCount: 0, rooms: workspacePreviewRooms, user: workspacePreviewUser });
          return;
        }

        setState({ kind: "offline" });
      }
    }

    void loadShell();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (state.kind === "auth") {
      router.replace("/login");
    }
  }, [router, state.kind]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    void launchTauriAuthenticatedSurfaces().catch(() => undefined);
  }, [state.kind]);

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
    setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
  }, [selectedRoom, state.kind]);

  const topbarProject = useMemo(() => {
    if (state.kind === "loading") {
      return {
        description: "확인 중",
        name: "프로젝트룸 선택",
        statusLabel: "",
      };
    }

    if (state.kind === "auth") {
      return {
        description: "로그인 후 시작",
        name: "로그인 필요",
        statusLabel: "대기",
      };
    }

    if (state.kind === "offline") {
      return routeFallbackProject(activeRoom);
    }

    if (activeRoom) {
      return {
        description: "현재 룸",
        name: activeRoom.name,
        statusLabel: activeRoom.status === "ACTIVE" ? "진행 중" : "대기",
      };
    }

    const staleSelectedRoom = state.kind === "ready" && selectedRoomId && !selectedRoom;

    if (selectedRoomLabel && !staleSelectedRoom) {
      return {
        description: "현재 룸",
        name: selectedRoomLabel,
        statusLabel: "진행 중",
      };
    }

    return routeFallbackProject();
  }, [activeRoom, selectedRoom, selectedRoomId, selectedRoomLabel, state]);

  const topbarUser = useMemo(() => {
    if (state.kind !== "ready") {
      return {
        displayName: state.kind === "auth" ? "로그인" : "Bubli",
        email: state.kind === "offline" ? "서버 연결 대기" : "확인 중",
        initials: "B",
      };
    }

    return {
      displayName: state.user.name,
      email: state.user.email ?? "로그인 정보 없음",
      initials: initialsFromName(state.user.name),
    };
  }, [state]);

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
    router.push(`/app/project-rooms/${createdRoom.id}`);
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
      <aside className="bubli-sidebar">
        <Link className="bubli-brand" href="/app">
          {siteConfig.name}
        </Link>
        <div className="bubli-nav-wrap">
          <div className="bubli-nav-section-label">개인</div>
          <AppNav activeRoomId={activeRoom?.id ?? null} />
        </div>
      </aside>
      <main className="shell bubli-main">
        <WorkspaceTopbar
          notificationCount={state.kind === "ready" ? state.notificationCount : 0}
          onOpenProjectSwitcher={() => setProjectSwitcherOpen((current) => !current)}
          project={topbarProject}
          searchEnabled={false}
          surfaceLabel=""
          user={topbarUser}
        />
        {projectSwitcherOpen ? (
          <>
            <button
              aria-label="프로젝트룸 전환 닫기"
              className="workspace-switcher-backdrop"
              onClick={() => {
                setCreatePanelOpen(false);
                setProjectSwitcherOpen(false);
              }}
              type="button"
            />
            <section className="workspace-switcher" aria-label="프로젝트룸 전환">
              <div className="workspace-switcher__head">
                <div>
                  <strong>프로젝트룸</strong>
                  <span>룸을 고르면 작업 기준이 유지됩니다</span>
                </div>
                <button
                  aria-label="프로젝트룸 만들기"
                  className="workspace-switcher__add"
                  onClick={() => setCreatePanelOpen((current) => !current)}
                  type="button"
                >
                  +
                </button>
              </div>

              <div className="workspace-switcher__section">
                <span className="workspace-switcher__label">현재 참여 중인 룸</span>
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
                        <small>{room.clientName || "프로젝트룸"}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="workspace-switcher__empty">아직 프로젝트룸이 없습니다.</p>
                )}
              </div>

              {createPanelOpen ? (
                <form className="workspace-switcher__create" onSubmit={handleCreateRoom}>
                  <label>
                    <span>프로젝트룸 이름</span>
                    <input
                      autoFocus
                      onChange={(event) => setNewRoomName(event.target.value)}
                      placeholder="예: 브랜드 리뉴얼"
                      value={newRoomName}
                    />
                  </label>
                  <label>
                    <span>의뢰처</span>
                    <input onChange={(event) => setNewRoomClient(event.target.value)} placeholder="선택 입력" value={newRoomClient} />
                  </label>
                  <label>
                    <span>첨부 자료</span>
                    <input
                      accept=".pdf,.txt,.md,.doc,.docx"
                      multiple
                      onChange={(event) => setNewRoomFiles(Array.from(event.target.files ?? []))}
                      type="file"
                    />
                  </label>
                  <div className="workspace-switcher__file-hint">
                    {newRoomFiles.length ? `${newRoomFiles.length}개 선택됨` : "업무 범위 문서나 요구사항을 같이 올리면 분석 요청까지 이어집니다."}
                  </div>
                  {newRoomFiles.length ? (
                    <div className="workspace-switcher__files">
                      {newRoomFiles.map((file) => (
                        <span key={`${file.name}-${file.size}`}>{file.name}</span>
                      ))}
                    </div>
                  ) : null}
                  <button disabled={!newRoomName.trim() || isCreatingRoom} type="submit">
                    {isCreatingRoom ? "만드는 중" : newRoomFiles.length ? "만들고 자료 분석" : "프로젝트룸 만들기"}
                  </button>
                </form>
              ) : null}
            </section>
          </>
        ) : null}
        <div className="bubli-main-scroll">{children}</div>
      </main>
    </div>
  );
}
