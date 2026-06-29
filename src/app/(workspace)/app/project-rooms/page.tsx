"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ProjectRoomResponse[] }
  | { kind: "auth" }
  | { kind: "offline" };

function statusLabel(room: ProjectRoomResponse) {
  if (room.status === "CLOSED") return "종료";
  if (room.paymentStatus === "OVERDUE") return "확인";
  return "진행";
}

function moneyLabel(amount?: number | null) {
  if (!amount) return null;
  return new Intl.NumberFormat("ko-KR").format(amount);
}

export default function ProjectRoomsPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let mounted = true;

    projectRoomApi
      .list()
      .then((page) => {
        if (mounted) setState({ kind: "ready", rooms: page.items });
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
    <section className="workspace-route" aria-labelledby="project-rooms-title">
      <header className="workspace-route__header">
        <div>
          <p className="workspace-route__eyebrow">Rooms</p>
          <h1 id="project-rooms-title">프로젝트룸</h1>
        </div>
        <Link className="bubli-button bubli-button--primary" href="/app/project-rooms/new">
          새 프로젝트룸
        </Link>
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
          <strong>API 연결 대기</strong>
          <span>백엔드가 켜지면 프로젝트룸을 불러옵니다.</span>
        </div>
      )}

      {state.kind === "ready" && state.rooms.length === 0 && (
        <div className="workspace-route__panel">
          <strong>프로젝트룸 없음</strong>
          <Link className="bubli-button bubli-button--primary" href="/app/project-rooms/new">
            만들기
          </Link>
        </div>
      )}

      {state.kind === "ready" && state.rooms.length > 0 && (
        <div className="workspace-route__list">
          {state.rooms.map((room) => (
            <Link className="workspace-route__row" href={`/app/project-rooms/${room.id}`} key={room.id}>
              <span className="workspace-route__dot" aria-hidden="true" />
              <span className="workspace-route__main">
                <strong>{room.name}</strong>
                <span>{room.clientName ?? "클라이언트 미입력"}</span>
              </span>
              <span className="workspace-route__meta">
                {moneyLabel(room.contractAmount) ? `${moneyLabel(room.contractAmount)}원` : "금액 미입력"}
              </span>
              <span className="workspace-route__status">{statusLabel(room)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
