"use client";

import { AlertCircle, Bell, MessageCircle, MonitorUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { chatApi } from "@/features/communication/api/chatApi";
import { notificationApi } from "@/features/notification/api/notificationApi";
import { ApiClientError } from "@/lib/api/errors";
import type { ChatRoomResponse } from "@/types/api/chat";
import type { NotificationResponse } from "@/types/api/notification";

type CommunicationState =
  | { kind: "loading" }
  | { kind: "ready"; notifications: NotificationResponse[]; rooms: ChatRoomResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

function roomTypeLabel(room: ChatRoomResponse) {
  return room.chatType === "ROOM" ? "프로젝트룸" : "1:1";
}

function sourceLabel(notification: NotificationResponse) {
  if (notification.sourceType === "MESSAGE") return "메시지";
  if (notification.sourceType === "COMMENT") return "댓글";
  if (notification.sourceType === "RESOURCE") return "자료";
  if (notification.sourceType === "AGENT") return "에이전트";
  return "알림";
}

function shortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "활동 전";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export default function DesktopCommunicationPage() {
  const [state, setState] = useState<CommunicationState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const [roomPage, notificationPage] = await Promise.all([chatApi.listRooms(), notificationApi.list()]);
      setState({ kind: "ready", notifications: notificationPage.items, rooms: roomPage.items });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      setState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "다시 시도해 주세요.",
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const summary = useMemo(() => {
    if (state.kind !== "ready") return null;

    const activeRooms = state.rooms.filter((room) => room.status === "ACTIVE");
    const unreadNotifications = state.notifications.filter((notification) => notification.status === "UNREAD");

    return {
      activeRooms,
      unreadNotifications,
    };
  }, [state]);

  return (
    <section className="workspace-route workspace-route--desktop-communication" aria-labelledby="desktop-communication-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="desktop-communication-title">알림</h1>
        </div>
        <div className="workspace-route__actions">
          <Link className="bubli-button" href="/app/chat">
            대화
          </Link>
        </div>
      </header>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-route__panel">
          <MonitorUp aria-hidden size={20} strokeWidth={2} />
          <strong>불러오는 중</strong>
        </GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>{state.message}</strong>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" && summary ? (
        <>
          <div className="workspace-route__cards">
            <section className="workspace-route__card" aria-label="열린 대화">
              <span className="workspace-route__label">대화</span>
              <strong>{summary.activeRooms.length}</strong>
              <span>열린 대화</span>
            </section>
            <section className="workspace-route__card" aria-label="읽지 않은 알림">
              <span className="workspace-route__label">알림</span>
              <strong>{summary.unreadNotifications.length}</strong>
              <span>읽지 않음</span>
            </section>
          </div>

          <div className="workspace-route__split">
            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <MessageCircle aria-hidden size={18} strokeWidth={2} />
                <strong>대화방</strong>
              </div>
              <div className="workspace-route__list">
                {state.rooms.slice(0, 6).map((room) => (
                  <Link className="workspace-route__row" href={`/app/chat${room.roomId ? `?roomId=${room.roomId}` : ""}`} key={room.id}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{room.name ?? roomTypeLabel(room)}</strong>
                      <span>{shortTime(room.updatedAt)}</span>
                    </span>
                    <StatusBadge tone={room.chatType === "ROOM" ? "room" : "communication"}>{roomTypeLabel(room)}</StatusBadge>
                  </Link>
                ))}
                {state.rooms.length === 0 ? (
                  <Link className="workspace-route__row" href="/app/project-rooms">
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>프로젝트룸 보기</strong>
                      <span>대화는 프로젝트룸과 1:1에서 시작됩니다</span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </GlassPanel>

            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <Bell aria-hidden size={18} strokeWidth={2} />
                <strong>알림</strong>
              </div>
              <div className="workspace-route__list">
                {state.notifications.slice(0, 6).map((notification) => (
                  <article className="workspace-route__row" key={notification.id}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{notification.title}</strong>
                      <span>{notification.body ?? shortTime(notification.createdAt)}</span>
                    </span>
                    <StatusBadge tone={notification.status === "UNREAD" ? "pending" : "neutral"}>{sourceLabel(notification)}</StatusBadge>
                  </article>
                ))}
                {state.notifications.length === 0 ? <span className="workspace-route__empty">알림 전</span> : null}
              </div>
            </GlassPanel>
          </div>
        </>
      ) : null}
    </section>
  );
}
