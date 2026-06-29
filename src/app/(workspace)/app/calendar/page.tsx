"use client";

import { useEffect, useMemo, useState } from "react";

import { calendarApi } from "@/features/calendar/api/calendarApi";
import { ApiClientError } from "@/lib/api/errors";
import type { CalendarEventResponse } from "@/types/api/calendar";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; events: CalendarEventResponse[] }
  | { kind: "auth" }
  | { kind: "offline" };

function timeLabel(event: CalendarEventResponse) {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: event.allDay ? undefined : "2-digit",
    minute: event.allDay ? undefined : "2-digit",
    month: "short",
  }).format(start);
}

export default function CalendarPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const range = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 14);
    return { end: end.toISOString(), start: start.toISOString() };
  }, []);

  useEffect(() => {
    let mounted = true;

    calendarApi
      .getEvents(range)
      .then((events) => {
        if (mounted) setState({ kind: "ready", events });
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
  }, [range]);

  return (
    <section className="workspace-route" aria-labelledby="calendar-title">
      <header className="workspace-route__header">
        <div>
          <p className="workspace-route__eyebrow">Schedule</p>
          <h1 id="calendar-title">일정</h1>
        </div>
        <a className="bubli-button bubli-button--quiet" href={calendarApi.getGoogleConnectUrl()}>
          캘린더 연결
        </a>
      </header>

      {state.kind === "loading" && <div className="workspace-route__panel">불러오는 중</div>}
      {state.kind === "auth" && <div className="workspace-route__panel">로그인이 필요합니다</div>}
      {state.kind === "offline" && <div className="workspace-route__panel">API 연결 대기</div>}

      {state.kind === "ready" && state.events.length === 0 && (
        <div className="workspace-route__panel">
          <strong>다가오는 일정 없음</strong>
        </div>
      )}

      {state.kind === "ready" && state.events.length > 0 && (
        <div className="workspace-route__list">
          {state.events.map((event) => (
            <article className="workspace-route__row" key={event.id}>
              <span className="workspace-route__dot" aria-hidden="true" />
              <span className="workspace-route__main">
                <strong>{event.title}</strong>
                <span>{event.roomId ? "프로젝트룸 일정" : "개인 일정"}</span>
              </span>
              <span className="workspace-route__meta">{timeLabel(event)}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
