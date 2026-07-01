"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { setActiveProjectRoomId } from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewRooms } from "@/lib/workspace-preview-data";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ProjectRoomResponse[] }
  | { kind: "auth" }
  | { kind: "offline" };

function statusLabel(room: ProjectRoomResponse) {
  if (room.status === "CLOSED") return "종료";
  if (room.paymentStatus === "OVERDUE") return "확인 필요";
  return "진행";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function roomMeta(room: ProjectRoomResponse) {
  const updatedAt = formatDate(room.updatedAt);
  if (room.clientName && updatedAt) return `${room.clientName} · ${updatedAt}`;
  return room.clientName ?? updatedAt;
}

export default function ProjectRoomsPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  function openProjectRoomCreate() {
    window.dispatchEvent(new Event("bubli:open-project-room-create"));
  }

  const loadRooms = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const page = await projectRoomApi.list();
      setState({ kind: "ready", rooms: page.items });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        setState({ kind: "ready", rooms: workspacePreviewRooms });
        return;
      }
      setState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRooms();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRooms]);

  return (
    <section className="workspace-route" aria-labelledby="project-rooms-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="project-rooms-title">프로젝트룸</h1>
        </div>
        <button className="bubli-button bubli-button--primary" onClick={openProjectRoomCreate} type="button">
          <Plus aria-hidden size={16} strokeWidth={2.2} />
          새 프로젝트룸
        </button>
      </header>

      {state.kind === "loading" && <div className="workspace-route__panel">불러오는 중</div>}

      {state.kind === "auth" && (
        <div className="workspace-route__panel">
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </div>
      )}

      {state.kind === "offline" && (
        <div className="workspace-route__panel">
          <strong>프로젝트룸을 불러오지 못했습니다</strong>
          <Button onClick={() => void loadRooms()} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            다시 연결
          </Button>
        </div>
      )}

      {state.kind === "ready" && state.rooms.length === 0 && (
        <div className="workspace-route__panel">
          <strong>프로젝트룸 시작 전</strong>
          <button className="bubli-button bubli-button--primary" onClick={openProjectRoomCreate} type="button">
            프로젝트룸 만들기
          </button>
        </div>
      )}

      {state.kind === "ready" && state.rooms.length > 0 && (
        <div className="workspace-route__list">
          {state.rooms.map((room) => (
            <Link
              className="workspace-route__row"
              href={`/app/project-rooms/${room.id}`}
              key={room.id}
              onClick={() => setActiveProjectRoomId(room.id, room.name)}
            >
              <span className="workspace-route__dot" aria-hidden="true" />
              <span className="workspace-route__main">
                <strong>{room.name}</strong>
                <span>{roomMeta(room)}</span>
              </span>
              <span className="workspace-route__status">{statusLabel(room)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
