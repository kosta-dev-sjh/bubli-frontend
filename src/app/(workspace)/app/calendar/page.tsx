"use client";

import {
  AlertCircle,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Link2,
  ListTodo,
  Plus,
  RefreshCw,
  Repeat2,
  ShieldCheck,
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
import type { ProjectRoomEventEnvelope, ProjectRoomEventType } from "@/types/api/calendar";
import type { ScheduleResponse, ScheduleSyncStatus } from "@/types/api/work";

import styles from "./calendar-page.module.css";

type PageState =
  | { kind: "loading" }
  | { events: ScheduleResponse[]; kind: "ready"; roomEvents: ProjectRoomEventEnvelope[] }
  | { kind: "auth" }
  | { kind: "offline" };

type RepeatInterval = "DAILY" | "WEEKLY" | "MONTHLY";
type TimelineStatus = "completed" | "active" | "pending" | "error";

const dayLabels = [
  { label: "월", value: "MO" },
  { label: "화", value: "TU" },
  { label: "수", value: "WE" },
  { label: "목", value: "TH" },
  { label: "금", value: "FR" },
  { label: "토", value: "SA" },
  { label: "일", value: "SU" },
] as const;

const repeatLabels: Record<RepeatInterval, string> = {
  DAILY: "매일",
  MONTHLY: "매월",
  WEEKLY: "매주",
};

const syncMeta: Record<ScheduleSyncStatus, { label: string; tone: "pending" | "personal" | "success" | "warning" }> = {
  LOCAL_ONLY: { label: "Bubli 일정", tone: "personal" },
  SYNC_FAILED: { label: "동기화 확인", tone: "warning" },
  SYNCED: { label: "Google 연결", tone: "success" },
};

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

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toSelectedDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function projectRoomEventLabel(type: ProjectRoomEventType) {
  if (type === "SCHEDULE_CREATED") return "일정 생성";
  if (type === "SCHEDULE_UPDATED") return "일정 수정";
  if (type === "SCHEDULE_DELETED") return "일정 삭제";
  if (type.startsWith("TASK_")) return "TODO 변경";
  if (type.startsWith("WBS_")) return "WBS 변경";
  if (type.startsWith("RESOURCE_")) return "자료 변경";
  if (type.startsWith("AGENT_")) return "에이전트 변경";
  if (type.startsWith("ROOM_MEMBER_")) return "멤버 변경";
  if (type === "ROOM_UPDATED") return "룸 변경";
  return "룸 이벤트";
}

function formatTime(event: ScheduleResponse) {
  if (event.allDay) return "종일";
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(start);
}

function formatDate(event: ScheduleResponse) {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return "날짜 미정";
  return new Intl.DateTimeFormat("ko-KR", { day: "numeric", month: "short", weekday: "short" }).format(start);
}

function timelineStatus(event: ScheduleResponse, now: Date): TimelineStatus {
  if (event.syncStatus === "SYNC_FAILED") return "error";
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : start;
  if (Number.isNaN(start.getTime())) return "pending";
  if (start <= now && now <= end) return "active";
  if (end < now) return "completed";
  return "pending";
}

function statusIcon(status: TimelineStatus) {
  if (status === "completed") return <Check size={13} strokeWidth={2.3} />;
  if (status === "error") return <X size={13} strokeWidth={2.3} />;
  return <Clock3 size={13} strokeWidth={2.3} />;
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
        name: index === 2 ? "에이전트" : "Maren",
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
  const [saving, setSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const range = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return { end: end.toISOString(), size: 80, start: start.toISOString() };
  }, [currentMonth]);

  const loadEvents = useCallback(async () => {
    setState({ kind: "loading" });

    if (shouldUseWorkspacePreviewData()) {
      const events = buildPreviewEvents(selectedRoomId);
      setState({ events, kind: "ready", roomEvents: buildPreviewRoomEvents(selectedRoomId, events) });
      return;
    }

    try {
      const [scheduleResult, roomEventResult] = await Promise.allSettled([
        calendarApi.getEvents({ ...range, roomId: selectedRoomId ?? undefined }),
        selectedRoomId ? calendarApi.getProjectRoomEvents(selectedRoomId, { limit: 100 }) : Promise.resolve(null),
      ]);

      if (scheduleResult.status === "rejected") {
        throw scheduleResult.reason;
      }

      setState({
        events: scheduleResult.value.items,
        kind: "ready",
        roomEvents: roomEventResult.status === "fulfilled" && roomEventResult.value ? roomEventResult.value.items : [],
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
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
  const roomEvents = useMemo(() => (state.kind === "ready" ? state.roomEvents : []), [state]);
  const selectedEvents = useMemo(
    () => {
      const selectedDay = toSelectedDay(selectedDate);
      return events
        .filter((event) => sameDate(new Date(event.startsAt), selectedDay))
        .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    },
    [events, selectedDate],
  );
  const googleCount = events.filter((event) => event.googleEventId || event.syncStatus === "SYNCED").length;
  const projectRoomCount = events.filter((event) => event.roomId).length;
  const reviewCount = events.filter((event) => event.syncStatus === "SYNC_FAILED").length;
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", year: "numeric" }).format(currentMonth);
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

  const handleConnectGoogle = () => {
    window.location.href = calendarApi.getGoogleConnectUrl();
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

    if (shouldUseWorkspacePreviewData()) {
      const previewEvent: ScheduleResponse = {
        allDay: false,
        createdAt: new Date().toISOString(),
        endsAt,
        googleEventId: null,
        id: `preview-created-${Date.now()}`,
        lastSyncedAt: null,
        ownerUserId: "preview-user",
        roomId: selectedRoomId,
        startsAt,
        syncStatus: "LOCAL_ONLY",
        taskId: null,
        title,
        updatedAt: new Date().toISOString(),
        wbsItemId: null,
      };
      setState((current) =>
        current.kind === "ready"
          ? {
              ...current,
              events: [previewEvent, ...current.events],
              roomEvents: previewEvent.roomId ? [...buildPreviewRoomEvents(previewEvent.roomId, [previewEvent]), ...current.roomEvents] : current.roomEvents,
            }
          : current,
      );
      setDraftNotice(repeatEnabled ? `${repeatLabels[repeatInterval]} 반복 설정을 일정 후보에 붙였습니다.` : "Bubli 일정 후보를 추가했습니다.");
      setSaving(false);
      return;
    }

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
          <p>프로젝트룸 일정, 개인 일정, 외부 캘린더 일정을 한 화면에서 봅니다.</p>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<RefreshCw size={15} strokeWidth={2.1} />} onClick={loadEvents} variant="quiet">
            새로고침
          </Button>
          <Button icon={<ExternalLink size={15} strokeWidth={2.1} />} onClick={handleConnectGoogle} variant="primary">
            Google Calendar 연결
          </Button>
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
          <Button icon={<RefreshCw size={15} strokeWidth={2.1} />} onClick={loadEvents} variant="quiet">
            다시 시도
          </Button>
        </GlassPanel>
      )}

      {state.kind === "ready" && (
        <>
          <section className={styles.summaryGrid} aria-label="일정 요약">
            <GlassPanel className={styles.summaryCard}>
              <span>이번 달 일정</span>
              <strong>{events.length}</strong>
              <p>개인 일정과 현재 프로젝트룸 일정을 함께 봅니다.</p>
            </GlassPanel>
            <GlassPanel className={styles.summaryCard}>
              <span>프로젝트룸</span>
              <strong>{projectRoomCount}</strong>
              <p>WBS, TODO, 마감일과 연결된 일정입니다.</p>
            </GlassPanel>
            <GlassPanel className={styles.summaryCard}>
              <span>Google Calendar</span>
              <strong>{googleCount}</strong>
              <p>Bubli에 연결된 외부 캘린더 일정입니다.</p>
            </GlassPanel>
            <GlassPanel className={styles.summaryCard}>
              <span>룸 이벤트</span>
              <strong>{roomEvents.length}</strong>
              <p>현재 프로젝트룸에서 일정과 작업이 바뀐 기록입니다.</p>
            </GlassPanel>
          </section>

          <div className={styles.mainGrid}>
            <GlassPanel className={styles.calendarPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>이번 달</h2>
                  <p>월을 넘기고 날짜를 고르면 하루 타임라인이 바뀝니다.</p>
                </div>
                <StatusBadge tone={reviewCount > 0 ? "warning" : "success"}>
                  {reviewCount > 0 ? "확인 필요" : "동기화 정상"}
                </StatusBadge>
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

              <div className={styles.weekLabelGrid} aria-hidden="true">
                {dayLabels.map((day) => (
                  <span key={day.value}>{day.label}</span>
                ))}
              </div>

              <div className={styles.monthGrid} aria-label="월간 날짜 선택">
                {calendarDays.map((date, index) => {
                  if (!date) return <span className={styles.daySpacer} key={`spacer-${index}`} />;

                  const dateValue = toDateValue(date);
                  const count = events.filter((event) => sameDate(new Date(event.startsAt), date)).length;
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
                      <small>{count}건</small>
                      {roomEventCount > 0 ? <i aria-label={`룸 이벤트 ${roomEventCount}건`} /> : null}
                    </button>
                  );
                })}
              </div>

              <div className={styles.timeline} aria-label="하루 일정 타임라인">
                {selectedEvents.length === 0 ? (
                  <div className={styles.emptyTimeline}>
                    <CalendarCheck2 size={18} strokeWidth={2.1} aria-hidden="true" />
                    <p>선택한 날에 표시할 일정이 없습니다.</p>
                  </div>
                ) : (
                  selectedEvents.map((event, index) => {
                    const status = timelineStatus(event, now);
                    const sync = syncMeta[event.syncStatus];
                    return (
                      <article className={styles.timelineItem} key={event.id}>
                        {index < selectedEvents.length - 1 ? <span className={styles.timelineLine} aria-hidden="true" /> : null}
                        <span className={`${styles.timelineIcon} ${styles[`timelineIcon_${status}`]}`} aria-hidden="true">
                          {statusIcon(status)}
                        </span>
                        <div className={styles.timelineBody}>
                          <div className={styles.timelineMeta}>
                            <b>{formatTime(event)}</b>
                            <StatusBadge tone={sync.tone}>{sync.label}</StatusBadge>
                            <span>{event.roomId ? "프로젝트룸" : "개인"}</span>
                          </div>
                          <h3>{event.title}</h3>
                          <p>
                            <Link2 size={14} strokeWidth={2.1} aria-hidden="true" />
                            {event.wbsItemId ? "WBS와 연결됨" : event.taskId ? "TODO와 연결됨" : formatDate(event)}
                          </p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {roomEventsForSelectedDate.length > 0 ? (
                <div className={styles.roomEventRail} aria-label="선택한 날의 프로젝트룸 이벤트">
                  {roomEventsForSelectedDate.map((event) => (
                    <article key={event.eventId}>
                      <span>{projectRoomEventLabel(event.eventType)}</span>
                      <strong>{event.actor.name}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
            </GlassPanel>

            <GlassPanel className={styles.createPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>일정 만들기</h2>
                  <p>프로젝트룸 일정은 WBS와 TODO에 붙일 수 있는 형태로 저장합니다.</p>
                </div>
                <Plus size={18} strokeWidth={2.1} aria-hidden="true" />
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

          <GlassPanel className={styles.policyPanel}>
            <article>
              <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>외부 캘린더 연결</strong>
                <p>연결된 일정은 Bubli 일정과 같은 기준으로 정리합니다.</p>
              </div>
            </article>
            <article>
              <ListTodo size={17} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>WBS와 TODO 연결</strong>
                <p>사용자가 승인한 일정 후보만 작업판, 대시보드, 일정 버블에 표시합니다.</p>
              </div>
            </article>
            <article>
              <CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>개인 일정과 프로젝트룸 일정 분리</strong>
                <p>`roomId`가 없으면 개인 일정, 있으면 현재 프로젝트룸 일정으로 표시합니다.</p>
              </div>
            </article>
            <article>
              <AlertCircle size={17} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>충돌은 자동 확정하지 않음</strong>
                <p>시간, 제목, 연결된 TODO가 다르면 확인 필요 상태로 남깁니다.</p>
              </div>
            </article>
          </GlassPanel>
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
