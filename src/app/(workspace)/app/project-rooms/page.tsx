"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { setActiveProjectRoomId } from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewRooms } from "@/lib/workspace-preview-data";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ProjectRoomResponse[] }
  | { kind: "auth" }
  | { kind: "offline" };

function statusLabel(t: TranslateFn, room: ProjectRoomResponse) {
  if (room.status === "CLOSED") return t("room.list.statusClosed");
  if (room.paymentStatus === "OVERDUE") return t("room.list.statusNeedsCheck");
  return t("room.list.statusActive");
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
  const { t } = useI18n();
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
          <h1 id="project-rooms-title">{t("room.list.title")}</h1>
        </div>
        <button className="bubli-button bubli-button--primary" onClick={openProjectRoomCreate} type="button">
          <Plus aria-hidden size={16} strokeWidth={2.2} />
          {t("room.list.new")}
        </button>
      </header>

      {state.kind === "loading" && <div className="workspace-route__panel">{t("room.list.loading")}</div>}

      {state.kind === "auth" && (
        <div className="workspace-route__panel">
          <strong>{t("room.list.authTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("room.list.login")}
          </Link>
        </div>
      )}

      {state.kind === "offline" && (
        <div className="workspace-route__panel">
          <strong>{t("room.list.loadFailed")}</strong>
          <Button onClick={() => void loadRooms()} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            {t("room.list.reconnect")}
          </Button>
        </div>
      )}

      {state.kind === "ready" && state.rooms.length === 0 && (
        <div className="workspace-route__panel">
          <strong>{t("room.list.emptyTitle")}</strong>
          <button className="bubli-button bubli-button--primary" onClick={openProjectRoomCreate} type="button">
            {t("room.list.create")}
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
              <span className="workspace-route__status">{statusLabel(t, room)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
