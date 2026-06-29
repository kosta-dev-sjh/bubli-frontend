"use client";

import { useEffect, useState } from "react";

import { chatApi } from "@/features/communication/api/chatApi";
import { ApiClientError } from "@/lib/api/errors";
import type { ChatRoomResponse } from "@/types/api/chat";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ChatRoomResponse[] }
  | { kind: "auth" }
  | { kind: "offline" };

function roomTypeLabel(room: ChatRoomResponse) {
  return room.type === "PROJECT_ROOM" ? "프로젝트룸" : "1:1";
}

function lastMessageLabel(room: ChatRoomResponse) {
  const body = room.lastMessage?.body;
  if (!body) return "새 메시지 없음";
  const text = typeof body.text === "string" ? body.text : typeof body.message === "string" ? body.message : null;
  return text ?? "최근 메시지";
}

export default function ChatPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let mounted = true;

    chatApi
      .listRooms()
      .then((rooms) => {
        if (mounted) setState({ kind: "ready", rooms });
      })
      .catch((error) => {
        if (!mounted) return;
        if (error instanceof ApiClientError && error.status === 401) {
          setState({ kind: "auth" });
          return;
        }
        setState({ kind: "offline" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="workspace-route" aria-labelledby="chat-title">
      <header className="workspace-route__header">
        <div>
          <p className="workspace-route__eyebrow">Messages</p>
          <h1 id="chat-title">소통</h1>
        </div>
      </header>

      {state.kind === "loading" && <div className="workspace-route__panel">불러오는 중</div>}
      {state.kind === "auth" && <div className="workspace-route__panel">로그인이 필요합니다</div>}
      {state.kind === "offline" && <div className="workspace-route__panel">API 연결 대기</div>}

      {state.kind === "ready" && state.rooms.length === 0 && (
        <div className="workspace-route__panel">
          <strong>대화 없음</strong>
        </div>
      )}

      {state.kind === "ready" && state.rooms.length > 0 && (
        <div className="workspace-route__list">
          {state.rooms.map((room) => (
            <article className="workspace-route__row" key={room.id}>
              <span className="workspace-route__dot" aria-hidden="true" />
              <span className="workspace-route__main">
                <strong>{room.name ?? roomTypeLabel(room)}</strong>
                <span>{lastMessageLabel(room)}</span>
              </span>
              <span className="workspace-route__meta">{roomTypeLabel(room)}</span>
              {room.unreadCount > 0 && <span className="workspace-route__status">{room.unreadCount}</span>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
