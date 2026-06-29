"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
import { siteConfig } from "@/config/site";
import { authApi } from "@/features/auth/api/authApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import type { AuthUser } from "@/types/api/auth";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type AppShellProps = {
  children: ReactNode;
};

type ShellState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ProjectRoomResponse[]; user: AuthUser }
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

export function AppShell({ children }: AppShellProps) {
  const [state, setState] = useState<ShellState>({ kind: "loading" });

  const loadShell = useCallback(async () => {
    try {
      const [user, roomPage] = await Promise.all([authApi.getMe(), projectRoomApi.list()]);
      setState({ kind: "ready", rooms: roomPage.items, user });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      setState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    void loadShell();
  }, [loadShell]);

  const firstRoom = state.kind === "ready" ? state.rooms[0] : undefined;
  const topbarProject = useMemo(() => {
    if (state.kind === "loading") {
      return {
        description: "연결 확인 중",
        name: "작업공간",
        statusLabel: "확인 중",
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
      return {
        description: "API 연결 대기",
        name: "작업공간",
        statusLabel: "대기",
      };
    }

    return {
      description: firstRoom ? "프로젝트룸" : "프로젝트룸 없음",
      name: firstRoom?.name ?? "작업공간",
      statusLabel: firstRoom?.status === "ACTIVE" ? "진행 중" : "대기",
    };
  }, [firstRoom, state]);

  const topbarUser = useMemo(() => {
    if (state.kind !== "ready") {
      return {
        displayName: state.kind === "auth" ? "로그인" : "Bubli",
        email: state.kind === "offline" ? "API 연결 대기" : "계정 확인 중",
        initials: "B",
      };
    }

    return {
      displayName: state.user.name,
      email: state.user.email,
      initials: initialsFromName(state.user.name),
    };
  }, [state]);

  return (
    <div className="bubli-app-layout">
      <aside className="bubli-sidebar">
        <Link className="bubli-brand" href="/app">
          {siteConfig.name}
        </Link>
        <div className="bubli-nav-wrap">
          <AppNav />
        </div>
      </aside>
      <main className="shell bubli-main">
        <WorkspaceTopbar
          notificationCount={0}
          project={topbarProject}
          searchPlaceholder="검색"
          surfaceLabel="작업공간"
          user={topbarUser}
        />
        {children}
      </main>
    </div>
  );
}
