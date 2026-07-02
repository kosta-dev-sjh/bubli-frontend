"use client";
// test

import {
  ArrowDownToLine,
  ArrowUpToLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
  Unplug,
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
  | { events: ScheduleResponse[]; kind: "ready"; loadWarning?: string | null; roomEvents: ProjectRoomEventEnvelope[] }
  | { kind: "auth" }
  | { kind: "offline" };

type RepeatInterval = "DAILY" | "WEEKLY" | "MONTHLY";
type CalendarSourceFilter = "all" | "external" | "personal" | "room";
type GoogleConnectionState =
  | { kind: "connected"; value: GoogleCalendarConnectionResponse }
  | { kind: "disconnected" }
  | { kind: "error" }
  | { kind: "loading" };
type SyncAction = "connect" | "disconnect" | "pull" | "push";

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

function toTimeValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "09:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const selectedRoomId = searchParams.get("roomId") ?? getActiveProjectRoomId();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [selectedDate, setSelectedDate] = useState(() => toDateValue(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStartTime, setDraftStartTime] = useState("10:30");
  const [draftEndTime, setDraftEndTime] = useState("11:00");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>("WEEKLY");
  const [repeatDays, setRepeatDays] = useState<string[]>(["MO", "WE", "FR"]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [sourceFilter, setSourceFilter] = useState<CalendarSourceFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionState>({ kind: "loading" });
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [syncAction, setSyncAction] = useState<SyncAction | null>(null);
  const range = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return { end: end.toISOString(), size: 80, start: start.toISOString() };
  }, [currentMonth]);

  const loadEvents = useCallback(async () => {
    setState({ kind: "loading" });
    setGoogleConnection({ kind: "loading" });

    try {
      const [scheduleResult, roomEventResult, googleConnectionResult] = await Promise.allSettled([
        calendarApi.getEvents({ ...range, roomId: selectedRoomId ?? undefined }),
        selectedRoomId ? calendarApi.getProjectRoomEvents(selectedRoomId, { limit: 100 }) : Promise.resolve(null),
        calendarApi.getGoogleConnection(),
      ]);

      if (scheduleResult.status === "rejected" && scheduleResult.reason instanceof ApiClientError && scheduleResult.reason.status === 401) {
        throw scheduleResult.reason;
      }

      setState({
        events: scheduleResult.status === "fulfilled" ? scheduleResult.value.items : [],
        kind: "ready",
        loadWarning: scheduleResult.status === "rejected" ? "일정 목록을 불러오지 못했습니다. 연결 버튼과 일정 추가는 계속 사용할 수 있습니다." : null,
        roomEvents: roomEventResult.status === "fulfilled" && roomEventResult.value ? roomEventResult.value.items : [],
      });
      if (googleConnectionResult.status === "fulfilled" && googleConnectionResult.value?.status === "ACTIVE") {
        setGoogleConnection({ kind: "connected", value: googleConnectionResult.value });
      } else {
        setGoogleConnection({ kind: googleConnectionResult.status === "rejected" ? "error" : "disconnected" });
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        setGoogleConnection({ kind: "disconnected" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        const events = buildPreviewEvents(selectedRoomId);
        setState({ events, kind: "ready", roomEvents: buildPreviewRoomEvents(selectedRoomId, events) });
        setGoogleConnection({ kind: "disconnected" });
        return;
      }
      setState({ kind: "offline" });
      setGoogleConnection({ kind: "error" });
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
  const googleConnected = googleConnection.kind === "connected";
  const googleConnectionLabel =
    googleConnection.kind === "connected"
      ? googleConnection.value.googleAccountEmail ?? "연결됨"
      : googleConnection.kind === "loading"
        ? "확인 중"
        : googleConnection.kind === "error"
          ? "상태 확인 필요"
          : "연결 전";

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

  const selectCalendarDate = (date: Date, hasEvents: boolean) => {
    setSelectedDate(toDateValue(date));
    setEditingEventId(null);
    setDraftTitle("");
    setDraftStartTime("10:30");
    setDraftEndTime("11:00");
    if (hasEvents) {
      setDetailPanelOpen(true);
      setComposerOpen(false);
    } else {
      setComposerOpen(true);
      setDetailPanelOpen(false);
    }
  };

  const openCreateComposer = () => {
    setEditingEventId(null);
    setDraftTitle("");
    setDraftStartTime("10:30");
    setDraftEndTime("11:00");
    setDraftNotice(null);
    setComposerOpen(true);
  };

  const openEditComposer = (event: ScheduleResponse) => {
    const startDate = new Date(event.startsAt);
    const endDate = event.endsAt ? new Date(event.endsAt) : null;
    setSelectedDate(toDateValue(startDate));
    setCurrentMonth(startOfMonth(startDate));
    setEditingEventId(event.id);
    setDraftTitle(event.title);
    setDraftStartTime(toTimeValue(event.startsAt));
    setDraftEndTime(event.endsAt && endDate && !Number.isNaN(endDate.getTime()) ? toTimeValue(event.endsAt) : toTimeValue(event.startsAt));
    setDraftNotice(null);
    setDetailPanelOpen(false);
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditingEventId(null);
    setDraftNotice(null);
  };

  const selectDateFromInput = (value: string) => {
    setSelectedDate(value);
    const nextDate = toSelectedDay(value);
    if (!Number.isNaN(nextDate.getTime())) {
      setCurrentMonth(startOfMonth(nextDate));
    }
  };

  const mergeSyncedEvents = (syncedEvents: ScheduleResponse[]) => {
    setState((current) => {
      if (current.kind !== "ready") return current;

      const byId = new Map(current.events.map((event) => [event.id, event]));
      for (const event of syncedEvents) {
        byId.set(event.id, event);
      }

      return { ...current, events: Array.from(byId.values()) };
    });
  };

  const toggleRepeatDay = (day: string) => {
    setRepeatDays((current) => (current.includes(day) ? current.filter((value) => value !== day) : [...current, day]));
  };

  const runGoogleAction = async (action: SyncAction) => {
    setSyncAction(action);
    setGoogleNotice(null);

    try {
      if (action === "connect") {
        const response = await calendarApi.requestGoogleConnectUrl();
        window.location.href = response.authorizeUrl;
        return;
      }

      if (action === "disconnect") {
        await calendarApi.disconnectGoogleConnection();
        setGoogleConnection({ kind: "disconnected" });
        setGoogleNotice("Google Calendar 연결을 해제했습니다.");
        return;
      }

      const syncRange = { from: range.start, to: range.end };
      const syncedEvents =
        action === "pull"
          ? await calendarApi.syncGoogleEvents(syncRange)
          : await calendarApi.pushUnsyncedGoogleEvents(syncRange);
      mergeSyncedEvents(syncedEvents);
      setGoogleNotice(action === "pull" ? `외부 일정 ${syncedEvents.length}건을 확인했습니다.` : `Bubli 일정 ${syncedEvents.length}건을 보냈습니다.`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setGoogleNotice("로그인 후 Google Calendar를 연결할 수 있습니다.");
      } else {
        setGoogleNotice("Google Calendar 작업을 완료하지 못했습니다.");
      }
    } finally {
      setSyncAction(null);
    }
  };

  const updateEventInState = (event: ScheduleResponse) => {
    setState((current) => {
      if (current.kind !== "ready") return current;

      const exists = current.events.some((item) => item.id === event.id);
      return {
        ...current,
        events: exists ? current.events.map((item) => (item.id === event.id ? event : item)) : [event, ...current.events],
      };
    });
  };

  const removeEventFromState = (eventId: string) => {
    setState((current) => (current.kind === "ready" ? { ...current, events: current.events.filter((event) => event.id !== eventId) } : current));
  };

  const handleSaveEvent = async () => {
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
      const body = {
        allDay: false,
        endsAt,
        roomId: selectedRoomId,
        startsAt,
        title,
      };
      if (editingEventId) {
        const currentEvent = events.find((event) => event.id === editingEventId);
        const shouldSyncGoogle = Boolean(currentEvent?.googleEventId || currentEvent?.syncStatus === "SYNCED");
        const updated = shouldSyncGoogle
          ? (await calendarApi.updateGoogleCalendarEvent(editingEventId, body)).schedule
          : await calendarApi.updateEvent(editingEventId, body);
        updateEventInState(updated);
        setDraftNotice("일정을 수정했습니다.");
      } else {
        const created = await calendarApi.createEvent(body);
        updateEventInState(created);
        setDraftNotice("일정을 추가했습니다.");
      }
      closeComposer();
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? "로그인이 필요합니다." : "일정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (event: ScheduleResponse) => {
    setDeletingEventId(event.id);
    setDraftNotice(null);

    try {
      const shouldSyncGoogle = Boolean(event.googleEventId || event.syncStatus === "SYNCED");
      if (shouldSyncGoogle) {
        await calendarApi.deleteGoogleCalendarEvent(event.id);
      } else {
        await calendarApi.deleteEvent(event.id);
      }
      removeEventFromState(event.id);
      if (editingEventId === event.id) {
        closeComposer();
      }
      const isLastEvent = selectedEvents.length === 1 && selectedEvents[0].id === event.id;
      setDeleteNotice("일정이 삭제되었습니다.");
      const noticeTimer = window.setTimeout(() => setDeleteNotice(null), 3000);
      if (isLastEvent) {
        window.setTimeout(() => {
          setDetailPanelOpen(false);
          window.clearTimeout(noticeTimer);
          setDeleteNotice(null);
        }, 1600);
      }
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? "로그인이 필요합니다." : "일정을 삭제하지 못했습니다.");
    } finally {
      setDeletingEventId(null);
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
                <strong>Google Calendar</strong>
                <span>{googleConnectionLabel}</span>
              </div>
              <div className={styles.syncActions} aria-label="Google Calendar 동기화">
                {!googleConnected ? (
                  <button className={styles.syncActionButton} disabled={syncAction === "connect"} onClick={() => void runGoogleAction("connect")} type="button">
                    <ExternalLink size={14} strokeWidth={2.1} />
                    <span>{syncAction === "connect" ? "이동 중" : "연결"}</span>
                  </button>
                ) : (
                  <>
                    <button className={styles.syncActionButton} disabled={syncAction !== null} onClick={() => void runGoogleAction("pull")} type="button">
                      <ArrowDownToLine size={14} strokeWidth={2.1} />
                      <span>{syncAction === "pull" ? "확인 중" : "가져오기"}</span>
                    </button>
                    <button className={styles.syncActionButton} disabled={syncAction !== null} onClick={() => void runGoogleAction("push")} type="button">
                      <ArrowUpToLine size={14} strokeWidth={2.1} />
                      <span>{syncAction === "push" ? "보내는 중" : "보내기"}</span>
                    </button>
                    <button className={styles.syncIconButton} disabled={syncAction !== null} onClick={() => void runGoogleAction("disconnect")} type="button">
                      <Unplug size={14} strokeWidth={2.1} />
                      <span>해제</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            {googleNotice ? <p className={styles.syncNotice}>{googleNotice}</p> : null}
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
                  <Button icon={<Plus size={15} strokeWidth={2.1} />} onClick={openCreateComposer} variant="quiet">
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
              {state.loadWarning ? <p className={styles.loadWarning}>{state.loadWarning}</p> : null}

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
                    <button aria-pressed={selected} className={className} key={dateValue} onClick={() => selectCalendarDate(date, count > 0)} type="button">
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

              <section className={styles.selectedEventPanel} aria-label="선택한 날짜 일정">
                <div>
                  <strong>{selectedDayLabel}</strong>
                  <span>{selectedEvents.length > 0 ? `${selectedEvents.length}건` : "일정 없음"}</span>
                </div>
                {deleteNotice && !detailPanelOpen ? <p className={styles.notice}>{deleteNotice}</p> : null}
                {selectedEvents.length > 0 ? (
                  <ul className={styles.selectedEventList}>
                    {selectedEvents.map((event) => {
                      const source = event.roomId ? "프로젝트룸" : event.googleEventId || event.syncStatus === "SYNCED" ? "외부" : "개인";
                      return (
                        <li key={event.id}>
                          <button className={styles.selectedEventEdit} onClick={() => openEditComposer(event)} type="button">
                            <span>{formatTime(event)}</span>
                            <strong>{event.title}</strong>
                            <small>{source}</small>
                          </button>
                          <button
                            aria-label={`${event.title} 삭제`}
                            className={styles.selectedEventDelete}
                            disabled={deletingEventId === event.id}
                            onClick={() => void handleDeleteEvent(event)}
                            type="button"
                          >
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <button className={styles.emptySelectedEvent} onClick={openCreateComposer} type="button">
                    이 날짜에 일정 추가
                  </button>
                )}
              </section>
            </GlassPanel>
          </div>

          {detailPanelOpen ? (
            <div className={styles.composerLayer} role="presentation" onMouseDown={() => setDetailPanelOpen(false)}>
              <GlassPanel
                aria-labelledby="calendar-detail-title"
                className={`${styles.createPanel} ${styles.composerPanel}`}
                role="dialog"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={styles.panelHeader}>
                  <div>
                    <h2 id="calendar-detail-title">{selectedDayLabel}</h2>
                    <p>{selectedEvents.length > 0 ? `일정 ${selectedEvents.length}건` : "일정 없음"}</p>
                  </div>
                  <button aria-label="닫기" className={styles.composerClose} onClick={() => setDetailPanelOpen(false)} type="button">
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>
                {deleteNotice ? <p className={styles.notice}>{deleteNotice}</p> : null}
                {selectedEvents.length > 0 ? (
                  <ul className={styles.selectedEventList}>
                    {selectedEvents.map((event) => {
                      const source = event.roomId ? "프로젝트룸" : event.googleEventId || event.syncStatus === "SYNCED" ? "외부" : "개인";
                      return (
                        <li key={event.id}>
                          <button className={styles.selectedEventEdit} onClick={() => openEditComposer(event)} type="button">
                            <span>{formatTime(event)}</span>
                            <strong>{event.title}</strong>
                            <small>{source}</small>
                          </button>
                          <button
                            aria-label={`${event.title} 삭제`}
                            className={styles.selectedEventDelete}
                            disabled={deletingEventId === event.id}
                            onClick={() => void handleDeleteEvent(event)}
                            type="button"
                          >
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                <Button
                  icon={<Plus size={15} strokeWidth={2.1} />}
                  onClick={() => { setDetailPanelOpen(false); openCreateComposer(); }}
                  variant="quiet"
                >
                  일정 추가
                </Button>
              </GlassPanel>
            </div>
          ) : null}

          {composerOpen ? (
            <div className={styles.composerLayer} role="presentation" onMouseDown={closeComposer}>
              <GlassPanel
                aria-labelledby="calendar-composer-title"
                className={`${styles.createPanel} ${styles.composerPanel}`}
                role="dialog"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className={styles.panelHeader}>
                  <div>
                    <h2 id="calendar-composer-title">{editingEventId ? "일정 수정" : "일정 추가"}</h2>
                    <p>선택한 날짜의 개인 일정이나 현재 프로젝트룸 일정을 관리합니다.</p>
                  </div>
                  <button aria-label="닫기" className={styles.composerClose} onClick={closeComposer} type="button">
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>

                <label className={styles.field}>
                  <span>제목</span>
                  <input placeholder="일정 제목" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
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
                        {Object.entries(repeatLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
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
                <Button icon={editingEventId ? <Pencil size={15} strokeWidth={2.1} /> : <Plus size={15} strokeWidth={2.1} />} loading={saving} onClick={handleSaveEvent} variant="primary">
                  {editingEventId ? "수정 저장" : "일정 추가"}
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
