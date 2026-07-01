"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Repeat2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { ApiClientError } from "@/lib/api/errors";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewSchedules } from "@/lib/workspace-preview-data";
import type { GoogleCalendarConnectionResponse, ProjectRoomEventEnvelope, ProjectRoomEventType } from "@/types/api/calendar";
import type { ScheduleResponse } from "@/types/api/work";

import styles from "./calendar-page.module.css";

type PageState =
  | { kind: "loading" }
  | {
      events: ScheduleResponse[];
      googleConnection: GoogleCalendarConnectionResponse | null;
      kind: "ready";
      roomEvents: ProjectRoomEventEnvelope[];
    }
  | { kind: "auth" }
  | { kind: "offline" };

type RepeatInterval = "DAILY" | "WEEKLY" | "MONTHLY";
type CalendarSourceFilter = "all" | "external" | "personal" | "room";
type GoogleCalendarAction = "connect" | "disconnect" | "pull" | "push";

const dayLabels = [
  { label: "월", value: "MO" },
  { label: "화", value: "TU" },
  { label: "수", value: "WE" },
  { label: "목", value: "TH" },
  { label: "금", value: "FR" },
  { label: "토", value: "SA" },
  { label: "일", value: "SU" },
] as const;

const sourceFilters: Array<{ key: CalendarSourceFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "personal", label: "개인" },
  { key: "room", label: "프로젝트룸" },
  { key: "external", label: "외부" },
];

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function sameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const dayOffset = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - dayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toSelectedDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatTime(event: ScheduleResponse) {
  if (event.allDay) return "종일";
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(start);
}

function buildPreviewEvents(roomId: string | null) {
  const base = workspacePreviewSchedules(roomId);
  const now = new Date();
  const twoHours = new Date(now);
  twoHours.setHours(now.getHours() + 2, 0, 0, 0);
  const threeHours = new Date(now);
  threeHours.setHours(now.getHours() + 3, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);

  return [
    ...base,
    {
      allDay: false,
      createdAt: now.toISOString(),
      endsAt: threeHours.toISOString(),
      googleEventId: "preview-google-event-1",
      id: "preview-google-event-1",
      lastSyncedAt: now.toISOString(),
      ownerUserId: "preview-user",
      roomId: null,
      startsAt: twoHours.toISOString(),
      syncStatus: "SYNCED",
      taskId: null,
      title: "외부 클라이언트 미팅",
      updatedAt: now.toISOString(),
      wbsItemId: null,
    },
    {
      allDay: false,
      createdAt: now.toISOString(),
      endsAt: null,
      googleEventId: null,
      id: "preview-deadline-event-1",
      lastSyncedAt: null,
      ownerUserId: "preview-user",
      roomId: roomId ?? "preview-room",
      startsAt: tomorrow.toISOString(),
      syncStatus: "LOCAL_ONLY",
      taskId: "preview-task-1",
      title: "WBS 1차 검토 마감",
      updatedAt: now.toISOString(),
      wbsItemId: "preview-wbs-1",
    },
  ] satisfies ScheduleResponse[];
}

function buildPreviewRoomEvents(roomId: string | null, schedules: ScheduleResponse[]) {
  const roomEventTypes: ProjectRoomEventType[] = ["SCHEDULE_CREATED", "TASK_UPDATED", "RESOURCE_ANALYSIS_COMPLETED"];

  return schedules
    .filter((event) => event.roomId)
    .slice(0, 3)
    .map((event, index) => ({
      actor: {
        id: index === 2 ? null : "preview-user",
        name: index === 2 ? "에이전트" : "사용자",
        type: index === 2 ? "AGENT" : "USER",
      },
      eventId: `preview-room-event-${index + 1}`,
      eventType: roomEventTypes[index] ?? "SCHEDULE_UPDATED",
      occurredAt: event.startsAt,
      payload: { scheduleId: event.id, title: event.title },
      roomId: event.roomId ?? roomId ?? "preview-room",
      sequence: index + 1,
    })) satisfies ProjectRoomEventEnvelope[];
}

function mergeScheduleEvents(current: ScheduleResponse[], incoming: ScheduleResponse[]) {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) {
    byId.set(event.id, event);
  }
  return Array.from(byId.values()).sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const selectedRoomId = searchParams.get("roomId") ?? getActiveProjectRoomId();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [selectedDate, setSelectedDate] = useState(() => toDateValue(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [draftTitle, setDraftTitle] = useState("클라이언트 확인 미팅");
  const [draftStartTime, setDraftStartTime] = useState("10:30");
  const [draftEndTime, setDraftEndTime] = useState("11:00");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>("WEEKLY");
  const [repeatDays, setRepeatDays] = useState<string[]>(["MO", "WE", "FR"]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [sourceFilter, setSourceFilter] = useState<CalendarSourceFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [googleAction, setGoogleAction] = useState<GoogleCalendarAction | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const range = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return { end: end.toISOString(), size: 80, start: start.toISOString() };
  }, [currentMonth]);

  const loadEvents = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const [scheduleResult, roomEventResult, googleConnectionResult] = await Promise.allSettled([
        calendarApi.getEvents({ ...range, roomId: selectedRoomId ?? undefined }),
        selectedRoomId ? calendarApi.getProjectRoomEvents(selectedRoomId, { limit: 100 }) : Promise.resolve(null),
        calendarApi.getGoogleConnection(),
      ]);

      if (scheduleResult.status === "rejected") {
        throw scheduleResult.reason;
      }

      setState({
        events: scheduleResult.value.items,
        googleConnection: googleConnectionResult.status === "fulfilled" ? googleConnectionResult.value : null,
        kind: "ready",
        roomEvents: roomEventResult.status === "fulfilled" && roomEventResult.value ? roomEventResult.value.items : [],
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        const events = buildPreviewEvents(selectedRoomId);
        setState({ events, googleConnection: null, kind: "ready", roomEvents: buildPreviewRoomEvents(selectedRoomId, events) });
        return;
      }
      setState({ kind: "offline" });
    }
  }, [range, selectedRoomId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents]);

  const events = useMemo(() => (state.kind === "ready" ? state.events : []), [state]);
  const googleConnection = state.kind === "ready" ? state.googleConnection : null;
  const roomEvents = useMemo(() => (state.kind === "ready" ? state.roomEvents : []), [state]);
  const sourceCounts = useMemo(
    () => ({
      all: events.length,
      external: events.filter((event) => event.googleEventId || event.syncStatus === "SYNCED").length,
      personal: events.filter((event) => !event.roomId && !event.googleEventId && event.syncStatus !== "SYNCED").length,
      room: events.filter((event) => event.roomId).length,
    }),
    [events],
  );
  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        if (sourceFilter === "external") return Boolean(event.googleEventId || event.syncStatus === "SYNCED");
        if (sourceFilter === "room") return Boolean(event.roomId);
        if (sourceFilter === "personal") return !event.roomId && !event.googleEventId && event.syncStatus !== "SYNCED";
        return true;
      }),
    [events, sourceFilter],
  );
  const selectedEvents = useMemo(
    () => {
      const selectedDay = toSelectedDay(selectedDate);
      return visibleEvents
        .filter((event) => sameDate(new Date(event.startsAt), selectedDay))
        .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    },
    [visibleEvents, selectedDate],
  );
  const reviewCount = events.filter((event) => event.syncStatus === "SYNC_FAILED").length;
  const unsyncedCount = events.filter((event) => event.syncStatus === "LOCAL_ONLY" || event.syncStatus === "SYNC_FAILED").length;
  const googleConnected = googleConnection?.status === "ACTIVE";
  const googleStatusLabel = googleConnected ? (googleConnection.googleAccountEmail ?? "연결됨") : "연결 전";
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", year: "numeric" }).format(currentMonth);
  const selectedDayLabel = new Intl.DateTimeFormat("ko-KR", { day: "numeric", month: "long", weekday: "long" }).format(toSelectedDay(selectedDate));
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const leadingDays = (start.getDay() + 6) % 7;
    const totalDays = leadingDays + end.getDate();

    return Array.from({ length: Math.ceil(totalDays / 7) * 7 }, (_, index) => {
      if (index < leadingDays || index >= totalDays) return null;
      return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), index - leadingDays + 1);
    });
  }, [currentMonth]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(toSelectedDay(selectedDate));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [selectedDate]);
  const visibleCalendarDays = viewMode === "week" ? weekDays : calendarDays;

  const roomEventsForSelectedDate = useMemo(
    () => {
      const selectedDay = toSelectedDay(selectedDate);
      return roomEvents
        .filter((event) => sameDate(new Date(event.occurredAt), selectedDay))
        .sort((left, right) => right.sequence - left.sequence)
        .slice(0, 4);
    },
    [roomEvents, selectedDate],
  );

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(toDateValue(today));
  };

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
    setSelectedDate(toDateValue(nextMonth));
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(toDateValue(date));
    setComposerOpen(true);
  };

  const selectDateFromInput = (value: string) => {
    setSelectedDate(value);
    const nextDate = toSelectedDay(value);
    if (!Number.isNaN(nextDate.getTime())) {
      setCurrentMonth(startOfMonth(nextDate));
    }
  };

  const toggleRepeatDay = (day: string) => {
    setRepeatDays((current) => (current.includes(day) ? current.filter((value) => value !== day) : [...current, day]));
  };

  const handleConnectGoogle = async () => {
    setGoogleAction("connect");
    setDraftNotice(null);

    try {
      const response = await calendarApi.requestGoogleConnectUrl();
      window.location.href = response.authorizeUrl;
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? "로그인이 필요합니다." : "Google Calendar 연결 URL을 만들지 못했습니다.");
      setGoogleAction(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    setGoogleAction("disconnect");
    setDraftNotice(null);

    try {
      await calendarApi.disconnectGoogleConnection();
      setState((current) => (current.kind === "ready" ? { ...current, googleConnection: null } : current));
      setDraftNotice("Google Calendar 연결을 해제했습니다.");
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? "로그인이 필요합니다." : "Google Calendar 연결을 해제하지 못했습니다.");
    } finally {
      setGoogleAction(null);
    }
  };

  const handleSyncGoogle = async (direction: "pull" | "push") => {
    setGoogleAction(direction);
    setDraftNotice(null);

    try {
      const syncedEvents =
        direction === "pull"
          ? await calendarApi.syncGoogleEvents({ from: range.start, to: range.end })
          : await calendarApi.pushUnsyncedGoogleEvents({ from: range.start, to: range.end });

      setState((current) =>
        current.kind === "ready"
          ? {
              ...current,
              events: mergeScheduleEvents(current.events, syncedEvents),
            }
          : current,
      );
      setDraftNotice(direction === "pull" ? `Google Calendar에서 ${syncedEvents.length}개를 가져왔습니다.` : `Google Calendar로 ${syncedEvents.length}개를 내보냈습니다.`);
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? "로그인이 필요합니다." : "Google Calendar 동기화를 완료하지 못했습니다.");
    } finally {
      setGoogleAction(null);
    }
  };

  const handleCreateEvent = async () => {
    const title = draftTitle.trim();
    if (!title) {
      setDraftNotice("일정 제목을 먼저 적어주세요.");
      return;
    }

    const startsAt = toDateTime(selectedDate, draftStartTime);
    const endsAt = toDateTime(selectedDate, draftEndTime);
    setSaving(true);
    setDraftNotice(null);

    try {
      const created = await calendarApi.createEvent({
        allDay: false,
        endsAt,
        roomId: selectedRoomId,
        startsAt,
        title,
      });
      setState((current) => (current.kind === "ready" ? { ...current, events: [created, ...current.events] } : current));
      setDraftNotice("Bubli API로 일정을 만들었습니다.");
      setComposerOpen(false);
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? "로그인이 필요합니다." : "일정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="calendar-title">
      <header className={styles.header}>
        <div>
          <Chip selected icon={<CalendarDays size={15} strokeWidth={2.1} />}>
            일정
          </Chip>
          <h1 id="calendar-title">일정</h1>
          <p>개인 일정, 현재 프로젝트룸 일정, 외부 캘린더를 월/주 보기로 확인합니다.</p>
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className={styles.statePanel}>일정을 불러오는 중</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className={styles.statePanel}>
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && (
        <GlassPanel className={styles.statePanel}>
          <strong>일정을 불러오지 못했습니다</strong>
          <Button onClick={loadEvents} variant="quiet">
            다시 연결
          </Button>
        </GlassPanel>
      )}

      {state.kind === "ready" && (
        <>
          <GlassPanel className={styles.sourcePanel} aria-label="일정 출처와 외부 캘린더 연결">
            <div className={styles.sourceTabs} aria-label="일정 출처 필터">
              {sourceFilters.map(({ key, label }) => (
                <button
                  aria-pressed={sourceFilter === key}
                  className={styles.sourceButton}
                  key={key}
                  onClick={() => setSourceFilter(key)}
                  type="button"
                >
                  <span>{label}</span>
                  <strong>{sourceCounts[key]}</strong>
                </button>
              ))}
            </div>
            <div className={styles.syncCompact}>
              <div>
                <strong>외부 캘린더</strong>
                <span>{googleStatusLabel}</span>
              </div>
              <div className={styles.syncActions}>
                <Button disabled={googleAction !== null} icon={<ExternalLink size={15} strokeWidth={2.1} />} loading={googleAction === "connect"} onClick={handleConnectGoogle} variant="quiet">
                  {googleConnected ? "다시 연결" : "연결"}
                </Button>
                <Button disabled={!googleConnected || googleAction !== null} icon={<Repeat2 size={15} strokeWidth={2.1} />} loading={googleAction === "pull"} onClick={() => void handleSyncGoogle("pull")} variant="quiet">
                  가져오기
                </Button>
                <Button disabled={!googleConnected || googleAction !== null || unsyncedCount === 0} loading={googleAction === "push"} onClick={() => void handleSyncGoogle("push")} variant="quiet">
                  내보내기 {unsyncedCount}
                </Button>
                <Button disabled={!googleConnected || googleAction !== null} icon={<X size={15} strokeWidth={2.1} />} loading={googleAction === "disconnect"} onClick={() => void handleDisconnectGoogle()} variant="quiet">
                  해제
                </Button>
              </div>
            </div>
          </GlassPanel>

          <div className={styles.mainGrid}>
            <GlassPanel className={styles.calendarPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{viewMode === "month" ? "월간 일정" : "주간 일정"}</h2>
                  <p>날짜를 누르면 Mac 캘린더처럼 작은 입력 창에서 바로 추가합니다.</p>
                </div>
                <div className={styles.panelTools}>
                  <div className={styles.viewSwitch} aria-label="일정 보기 방식">
                    <button aria-pressed={viewMode === "month"} onClick={() => setViewMode("month")} type="button">
                      월
                    </button>
                    <button aria-pressed={viewMode === "week"} onClick={() => setViewMode("week")} type="button">
                      주
                    </button>
                  </div>
                  <StatusBadge tone={reviewCount > 0 ? "warning" : "success"}>
                    {reviewCount > 0 ? "확인 필요" : "동기화 정상"}
                  </StatusBadge>
                  <Button icon={<Plus size={15} strokeWidth={2.1} />} onClick={() => setComposerOpen(true)} variant="quiet">
                    새 일정
                  </Button>
                </div>
              </div>

              <div className={styles.monthHeader}>
                <button aria-label="이전 달" className={styles.monthNavButton} onClick={() => moveMonth(-1)} type="button">
                  <ChevronLeft size={18} strokeWidth={2.1} />
                </button>
                <strong key={monthLabel}>{monthLabel}</strong>
                <button aria-label="다음 달" className={styles.monthNavButton} onClick={() => moveMonth(1)} type="button">
                  <ChevronRight size={18} strokeWidth={2.1} />
                </button>
                <button className={styles.todayButton} onClick={goToToday} type="button">
                  오늘
                </button>
              </div>

              <div className={styles.selectedSummary} aria-live="polite">
                <strong>{selectedDayLabel}</strong>
                <span>{selectedEvents.length > 0 ? `일정 ${selectedEvents.length}건` : "일정 없음"}</span>
                {roomEventsForSelectedDate.length > 0 ? <span>룸 변경 {roomEventsForSelectedDate.length}건</span> : null}
              </div>

              <div className={styles.weekLabelGrid} aria-hidden="true">
                {dayLabels.map((day) => (
                  <span key={day.value}>{day.label}</span>
                ))}
              </div>

              <div className={viewMode === "week" ? `${styles.monthGrid} ${styles.weekGrid}` : styles.monthGrid} aria-label="날짜 선택">
                {visibleCalendarDays.map((date, index) => {
                  if (!date) return <span className={styles.daySpacer} key={`spacer-${index}`} />;

                  const dateValue = toDateValue(date);
                  const dayEvents = visibleEvents
                    .filter((event) => sameDate(new Date(event.startsAt), date))
                    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
                  const count = dayEvents.length;
                  const roomEventCount = roomEvents.filter((event) => sameDate(new Date(event.occurredAt), date)).length;
                  const selected = dateValue === selectedDate;
                  const today = sameDate(date, now);
                  const className = [
                    styles.dayButton,
                    selected ? styles.dayButtonSelected : "",
                    today ? styles.dayButtonToday : "",
                    roomEventCount > 0 ? styles.dayButtonHasRoomEvent : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button aria-pressed={selected} className={className} key={dateValue} onClick={() => selectCalendarDate(date)} type="button">
                      <span>{new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date)}</span>
                      <strong>{date.getDate()}</strong>
                      <small>{count > 0 ? `${count}건` : "비어 있음"}</small>
                      {count > 0 ? (
                        <ul className={styles.dayEventList} aria-label={`${date.getDate()}일 일정`}>
                          {dayEvents.slice(0, 3).map((event) => {
                            const source = event.roomId ? "room" : event.googleEventId || event.syncStatus === "SYNCED" ? "external" : "personal";
                            return (
                              <li className={`${styles.dayEventItem} ${styles[`dayEventItem_${source}`]}`} key={event.id}>
                                <span>{formatTime(event)}</span>
                                <b>{event.title}</b>
                              </li>
                            );
                          })}
                          {count > 3 ? <li className={styles.dayEventMore}>+{count - 3}</li> : null}
                        </ul>
                      ) : null}
                      {roomEventCount > 0 ? <i aria-label={`룸 이벤트 ${roomEventCount}건`} /> : null}
                    </button>
                  );
                })}
              </div>
            </GlassPanel>
          </div>

          {composerOpen ? (
            <div className={styles.composerLayer} role="presentation" onMouseDown={() => setComposerOpen(false)}>
              <GlassPanel
                aria-labelledby="calendar-composer-title"
                className={`${styles.createPanel} ${styles.composerPanel}`}
                role="dialog"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className={styles.panelHeader}>
                  <div>
                    <h2 id="calendar-composer-title">일정 추가</h2>
                    <p>선택한 날짜에 개인 일정이나 현재 프로젝트룸 일정을 추가합니다.</p>
                  </div>
                  <button aria-label="닫기" className={styles.composerClose} onClick={() => setComposerOpen(false)} type="button">
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>

                <label className={styles.field}>
                  <span>제목</span>
                  <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                </label>
                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>날짜</span>
                    <input type="date" value={selectedDate} onChange={(event) => selectDateFromInput(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>시작</span>
                    <input type="time" value={draftStartTime} onChange={(event) => setDraftStartTime(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>종료</span>
                    <input type="time" value={draftEndTime} onChange={(event) => setDraftEndTime(event.target.value)} />
                  </label>
                </div>

                <section className={styles.repeatBox} aria-label="반복 일정 설정">
                  <button
                    aria-pressed={repeatEnabled}
                    className={repeatEnabled ? `${styles.repeatToggle} ${styles.repeatToggleOn}` : styles.repeatToggle}
                    onClick={() => setRepeatEnabled((current) => !current)}
                    type="button"
                  >
                    <span>
                      <Repeat2 size={15} strokeWidth={2.1} aria-hidden="true" />
                      반복
                    </span>
                    <i aria-hidden="true" />
                  </button>
                  <div className={repeatEnabled ? styles.repeatControls : `${styles.repeatControls} ${styles.repeatControlsDisabled}`}>
                    <label className={styles.field}>
                      <span>주기</span>
                      <select
                        disabled={!repeatEnabled}
                        value={repeatInterval}
                        onChange={(event) => setRepeatInterval(event.target.value as RepeatInterval)}
                      >
                        <option value="DAILY">매일</option>
                        <option value="WEEKLY">매주</option>
                        <option value="MONTHLY">매월</option>
                      </select>
                    </label>
                    <div className={styles.dayChips} aria-label="반복 요일">
                      {dayLabels.map((day) => {
                        const selected = repeatDays.includes(day.value);
                        return (
                          <button
                            aria-pressed={selected}
                            className={selected ? `${styles.repeatDay} ${styles.repeatDaySelected}` : styles.repeatDay}
                            disabled={!repeatEnabled}
                            key={day.value}
                            onClick={() => toggleRepeatDay(day.value)}
                            type="button"
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {draftNotice ? <p className={styles.notice}>{draftNotice}</p> : null}
                <Button icon={<Plus size={15} strokeWidth={2.1} />} loading={saving} onClick={handleCreateEvent} variant="primary">
                  일정 추가
                </Button>
              </GlassPanel>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<GlassPanel className={styles.statePanel}>일정을 불러오는 중</GlassPanel>}>
      <CalendarPageContent />
    </Suspense>
  );
}
