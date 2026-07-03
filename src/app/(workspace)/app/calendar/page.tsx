"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
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
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
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

type CalendarSourceFilter = "all" | "external" | "personal" | "room";
type GoogleConnectionState =
  | { kind: "connected"; value: GoogleCalendarConnectionResponse }
  | { kind: "disconnected" }
  | { kind: "error" }
  | { kind: "loading" };
type SyncAction = "connect" | "disconnect" | "pull" | "push" | "sync";

type LastSyncSummary = { at: Date; pulled: number; pushed: number };

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const dayLabels = [
  { labelKey: "calendar.day.mon", value: "MO" },
  { labelKey: "calendar.day.tue", value: "TU" },
  { labelKey: "calendar.day.wed", value: "WE" },
  { labelKey: "calendar.day.thu", value: "TH" },
  { labelKey: "calendar.day.fri", value: "FR" },
  { labelKey: "calendar.day.sat", value: "SA" },
  { labelKey: "calendar.day.sun", value: "SU" },
] as const satisfies ReadonlyArray<{ labelKey: MessageKey; value: string }>;

const sourceFilters: Array<{ key: CalendarSourceFilter; labelKey: MessageKey }> = [
  { key: "all", labelKey: "calendar.source.all" },
  { key: "personal", labelKey: "calendar.source.personal" },
  { key: "room", labelKey: "calendar.source.room" },
  { key: "external", labelKey: "calendar.source.external" },
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

function formatClockTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatTime(t: TranslateFn, event: ScheduleResponse) {
  if (event.allDay) return t("calendar.time.allDay");
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return t("calendar.time.undecided");
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
  const { t } = useI18n();
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
  // 삭제는 결과를 먼저 알리고 확인받는 2단계 확인(프로젝트룸 설정 패널과 동일 패턴)으로 진행한다.
  const [confirmingDeleteEventId, setConfirmingDeleteEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [sourceFilter, setSourceFilter] = useState<CalendarSourceFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionState>({ kind: "loading" });
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [syncAction, setSyncAction] = useState<SyncAction | null>(null);
  const [lastSync, setLastSync] = useState<LastSyncSummary | null>(null);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
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
        loadWarning: scheduleResult.status === "rejected" ? t("calendar.notice.loadWarning") : null,
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
  }, [range, selectedRoomId, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents]);

  useEffect(() => {
    if (!syncMenuOpen) return;
    const close = () => setSyncMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [syncMenuOpen]);

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
      ? googleConnection.value.googleAccountEmail ?? t("calendar.google.connected")
      : googleConnection.kind === "loading"
        ? t("calendar.google.checking")
        : googleConnection.kind === "error"
          ? t("calendar.google.needsCheck")
          : t("calendar.google.beforeConnect");

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
    // 일정이 있는 날짜는 하단 선택 일정 패널에서 바로 확인/수정하고, 빈 날짜는 새 일정 작성기를 연다.
    setComposerOpen(!hasEvents);
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
        setGoogleNotice(t("calendar.notice.disconnected"));
        return;
      }

      const syncRange = { from: range.start, to: range.end };

      if (action === "sync") {
        // 한 버튼으로 가져오기(구글 → Bubli) 후 보내기(Bubli → 구글)를 순서대로 실행한다.
        const pulledEvents = await calendarApi.syncGoogleEvents(syncRange);
        mergeSyncedEvents(pulledEvents);
        const pushedEvents = await calendarApi.pushUnsyncedGoogleEvents(syncRange);
        mergeSyncedEvents(pushedEvents);
        setLastSync({ at: new Date(), pulled: pulledEvents.length, pushed: pushedEvents.length });
        setGoogleNotice(t("calendar.notice.syncDone", { pulled: pulledEvents.length, pushed: pushedEvents.length }));
        return;
      }

      const syncedEvents =
        action === "pull"
          ? await calendarApi.syncGoogleEvents(syncRange)
          : await calendarApi.pushUnsyncedGoogleEvents(syncRange);
      mergeSyncedEvents(syncedEvents);
      setLastSync((current) => ({
        at: new Date(),
        pulled: action === "pull" ? syncedEvents.length : current?.pulled ?? 0,
        pushed: action === "push" ? syncedEvents.length : current?.pushed ?? 0,
      }));
      setGoogleNotice(
        action === "pull"
          ? t("calendar.notice.pullDone", { count: syncedEvents.length })
          : t("calendar.notice.pushDone", { count: syncedEvents.length }),
      );
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setGoogleNotice(t("calendar.notice.loginNeeded"));
      } else {
        setGoogleNotice(t("calendar.notice.actionFailed"));
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
      setDraftNotice(t("calendar.draft.titleRequired"));
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
        setDraftNotice(t("calendar.draft.updated"));
      } else {
        const created = await calendarApi.createEvent(body);
        updateEventInState(created);
        setDraftNotice(t("calendar.draft.added"));
      }
      closeComposer();
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? t("calendar.draft.authRequired") : t("calendar.draft.saveFailed"));
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
      setDeleteNotice(t("calendar.draft.deleted"));
      window.setTimeout(() => setDeleteNotice(null), 3000);
    } catch (error) {
      setDraftNotice(error instanceof ApiClientError && error.status === 401 ? t("calendar.draft.authRequired") : t("calendar.draft.deleteFailed"));
    } finally {
      setDeletingEventId(null);
      setConfirmingDeleteEventId(null);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="calendar-title">
      <header className={styles.header}>
        <div>
          <Chip selected icon={<CalendarDays size={15} strokeWidth={2.1} />}>
            {t("calendar.kicker")}
          </Chip>
          <h1 id="calendar-title">{t("calendar.title")}</h1>
          <p>{t("calendar.subtitle")}</p>
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className={styles.statePanel}>{t("calendar.state.loading")}</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className={styles.statePanel}>
          <strong>{t("calendar.state.authTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("common.login")}
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && (
        <GlassPanel className={styles.statePanel}>
          <strong>{t("calendar.state.offlineTitle")}</strong>
          <Button onClick={loadEvents} variant="quiet">
            {t("calendar.state.reconnect")}
          </Button>
        </GlassPanel>
      )}

      {state.kind === "ready" && (
        <>
          <GlassPanel className={styles.sourcePanel} aria-label={t("calendar.sourcePanel.aria")}>
            <div className={styles.sourceTabs} aria-label={t("calendar.sourceTabs.aria")}>
              {sourceFilters.map(({ key, labelKey }) => (
                <button
                  aria-pressed={sourceFilter === key}
                  className={styles.sourceButton}
                  key={key}
                  onClick={() => setSourceFilter(key)}
                  type="button"
                >
                  <span>{t(labelKey)}</span>
                  <strong>{sourceCounts[key]}</strong>
                </button>
              ))}
            </div>
            <div className={styles.syncCompact}>
              <div>
                <strong>Google Calendar</strong>
                <span>{googleConnectionLabel}</span>
                {googleConnected && lastSync ? (
                  <span className={styles.syncStatusLine}>
                    {t("calendar.google.lastSync", { pulled: lastSync.pulled, pushed: lastSync.pushed, time: formatClockTime(lastSync.at) })}
                  </span>
                ) : null}
              </div>
              <div className={styles.syncActions} aria-label={t("calendar.google.syncAria")}>
                {!googleConnected ? (
                  <button className={styles.syncPrimaryButton} disabled={syncAction === "connect"} onClick={() => void runGoogleAction("connect")} type="button">
                    <ExternalLink size={14} strokeWidth={2.1} />
                    <span>{syncAction === "connect" ? t("calendar.google.moving") : t("calendar.google.connect")}</span>
                  </button>
                ) : (
                  <>
                    <button className={styles.syncPrimaryButton} disabled={syncAction !== null} onClick={() => void runGoogleAction("sync")} type="button">
                      <RefreshCw className={syncAction === "sync" ? styles.syncSpinner : undefined} size={14} strokeWidth={2.1} />
                      <span>{syncAction === "sync" ? t("calendar.google.syncing") : t("calendar.google.sync")}</span>
                    </button>
                    <div
                      className={styles.syncMenuWrap}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setSyncMenuOpen(false);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        aria-expanded={syncMenuOpen}
                        aria-haspopup="menu"
                        aria-label={t("calendar.google.more")}
                        className={styles.syncIconButton}
                        disabled={syncAction !== null}
                        onClick={() => setSyncMenuOpen((open) => !open)}
                        type="button"
                      >
                        <MoreHorizontal size={14} strokeWidth={2.1} />
                      </button>
                      {syncMenuOpen ? (
                        <div className={styles.syncMenu} role="menu">
                          <button
                            className={styles.syncMenuItem}
                            onClick={() => {
                              setSyncMenuOpen(false);
                              void runGoogleAction("pull");
                            }}
                            role="menuitem"
                            type="button"
                          >
                            <ArrowDownToLine size={14} strokeWidth={2.1} />
                            <span>{t("calendar.google.pullOnly")}</span>
                          </button>
                          <button
                            className={styles.syncMenuItem}
                            onClick={() => {
                              setSyncMenuOpen(false);
                              void runGoogleAction("push");
                            }}
                            role="menuitem"
                            type="button"
                          >
                            <ArrowUpToLine size={14} strokeWidth={2.1} />
                            <span>{t("calendar.google.pushOnly")}</span>
                          </button>
                          <button
                            className={styles.syncMenuItem}
                            onClick={() => {
                              setSyncMenuOpen(false);
                              void runGoogleAction("disconnect");
                            }}
                            role="menuitem"
                            type="button"
                          >
                            <Unplug size={14} strokeWidth={2.1} />
                            <span>{t("calendar.google.disconnect")}</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
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
                  <h2>{viewMode === "month" ? t("calendar.view.monthTitle") : t("calendar.view.weekTitle")}</h2>
                </div>
                <div className={styles.panelTools}>
                  <div className={styles.viewSwitch} aria-label={t("calendar.view.aria")}>
                    <button aria-pressed={viewMode === "month"} onClick={() => setViewMode("month")} type="button">
                      {t("calendar.view.month")}
                    </button>
                    <button aria-pressed={viewMode === "week"} onClick={() => setViewMode("week")} type="button">
                      {t("calendar.view.week")}
                    </button>
                  </div>
                  {reviewCount > 0 ? (
                    <StatusBadge tone="warning">{t("calendar.view.needsCheck")}</StatusBadge>
                  ) : googleConnected ? (
                    <StatusBadge tone="success">{t("calendar.view.synced")}</StatusBadge>
                  ) : null}
                  <Button icon={<Plus size={15} strokeWidth={2.1} />} onClick={openCreateComposer} variant="primary">
                    {t("calendar.view.newEvent")}
                  </Button>
                </div>
              </div>

              <div className={styles.monthHeader}>
                <button aria-label={t("calendar.nav.prevMonth")} className={styles.monthNavButton} onClick={() => moveMonth(-1)} type="button">
                  <ChevronLeft size={18} strokeWidth={2.1} />
                </button>
                <strong key={monthLabel}>{monthLabel}</strong>
                <button aria-label={t("calendar.nav.nextMonth")} className={styles.monthNavButton} onClick={() => moveMonth(1)} type="button">
                  <ChevronRight size={18} strokeWidth={2.1} />
                </button>
                <button className={styles.todayButton} onClick={goToToday} type="button">
                  {t("calendar.nav.today")}
                </button>
              </div>

              {state.loadWarning ? <p className={styles.loadWarning}>{state.loadWarning}</p> : null}

              <div className={styles.weekLabelGrid} aria-hidden="true">
                {dayLabels.map((day) => (
                  <span key={day.value}>{t(day.labelKey)}</span>
                ))}
              </div>

              <div className={viewMode === "week" ? `${styles.monthGrid} ${styles.weekGrid}` : styles.monthGrid} aria-label={t("calendar.grid.aria")}>
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
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  const className = [
                    styles.dayButton,
                    selected ? styles.dayButtonSelected : "",
                    today ? styles.dayButtonToday : "",
                    weekend ? styles.dayButtonWeekend : "",
                    roomEventCount > 0 ? styles.dayButtonHasRoomEvent : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button aria-pressed={selected} className={className} key={dateValue} onClick={() => selectCalendarDate(date, count > 0)} type="button">
                      <span className={styles.dayNumberRow}>
                        <strong>{date.getDate()}</strong>
                        {count > 0 ? <small>{t("calendar.grid.countUnit", { count })}</small> : null}
                      </span>
                      {count > 0 ? (
                        <ul className={styles.dayEventList} aria-label={t("calendar.grid.dayEventsAria", { day: date.getDate() })}>
                          {dayEvents.slice(0, 2).map((event) => {
                            const source = event.roomId ? "room" : event.googleEventId || event.syncStatus === "SYNCED" ? "external" : "personal";
                            return (
                              <li className={`${styles.dayEventItem} ${styles[`dayEventItem_${source}`]}`} key={event.id}>
                                <span>{formatTime(t, event)}</span>
                                <b>{event.title}</b>
                              </li>
                            );
                          })}
                          {count > 2 ? <li className={styles.dayEventMore}>{t("calendar.grid.moreCount", { count: count - 2 })}</li> : null}
                        </ul>
                      ) : null}
                      {roomEventCount > 0 ? <i aria-label={t("calendar.grid.roomEventsAria", { count: roomEventCount })} /> : null}
                    </button>
                  );
                })}
              </div>

              <section className={styles.selectedEventPanel} aria-label={t("calendar.selected.aria")}>
                <div>
                  <strong>{selectedDayLabel}</strong>
                  <span>{selectedEvents.length > 0 ? t("calendar.selected.count", { count: selectedEvents.length }) : t("calendar.summary.noEvent")}</span>
                </div>
                {deleteNotice ? <p className={styles.notice}>{deleteNotice}</p> : null}
                {selectedEvents.length > 0 ? (
                  <ul className={styles.selectedEventList}>
                    {selectedEvents.map((event) => {
                      const source = event.roomId
                        ? t("calendar.source.room")
                        : event.googleEventId || event.syncStatus === "SYNCED"
                          ? t("calendar.source.external")
                          : t("calendar.source.personal");
                      const confirmingDelete = confirmingDeleteEventId === event.id;

                      return (
                        <li key={event.id}>
                          <button className={styles.selectedEventEdit} onClick={() => openEditComposer(event)} type="button">
                            <span>{formatTime(t, event)}</span>
                            <strong>{event.title}</strong>
                            <small>{source}</small>
                          </button>
                          <button
                            aria-expanded={confirmingDelete}
                            aria-label={t("calendar.selected.deleteAria", { title: event.title })}
                            className={styles.selectedEventDelete}
                            disabled={deletingEventId === event.id}
                            onClick={() => setConfirmingDeleteEventId(confirmingDelete ? null : event.id)}
                            type="button"
                          >
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                          {confirmingDelete ? (
                            <div className={styles.deleteConfirm} role="alertdialog" aria-label={t("calendar.selected.deleteAria", { title: event.title })}>
                              <p>{t("calendar.delete.confirmBody", { title: event.title })}</p>
                              <div className={styles.deleteConfirmActions}>
                                <Button
                                  loading={deletingEventId === event.id}
                                  onClick={() => void handleDeleteEvent(event)}
                                  size="sm"
                                  variant="primary"
                                >
                                  {t("calendar.delete.confirmDelete")}
                                </Button>
                                <Button
                                  disabled={deletingEventId === event.id}
                                  onClick={() => setConfirmingDeleteEventId(null)}
                                  size="sm"
                                  variant="quiet"
                                >
                                  {t("calendar.delete.confirmKeep")}
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                <button className={styles.emptySelectedEvent} onClick={openCreateComposer} type="button">
                  {t("calendar.selected.addForDate")}
                </button>
              </section>
            </GlassPanel>
          </div>

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
                    <h2 id="calendar-composer-title">{editingEventId ? t("calendar.composer.editTitle") : t("calendar.composer.title")}</h2>
                    <p>{t("calendar.composer.subtitle")}</p>
                  </div>
                  <button aria-label={t("calendar.composer.close")} className={styles.composerClose} onClick={closeComposer} type="button">
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>

                <label className={styles.field}>
                  <span>{t("calendar.composer.titleLabel")}</span>
                  <input placeholder={t("calendar.composer.titlePlaceholder")} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                </label>
                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>{t("calendar.composer.dateLabel")}</span>
                    <input type="date" value={selectedDate} onChange={(event) => selectDateFromInput(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>{t("calendar.composer.startLabel")}</span>
                    <input type="time" value={draftStartTime} onChange={(event) => setDraftStartTime(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>{t("calendar.composer.endLabel")}</span>
                    <input type="time" value={draftEndTime} onChange={(event) => setDraftEndTime(event.target.value)} />
                  </label>
                </div>

                {draftNotice ? <p className={styles.notice}>{draftNotice}</p> : null}
                <Button icon={editingEventId ? <Pencil size={15} strokeWidth={2.1} /> : <Plus size={15} strokeWidth={2.1} />} loading={saving} onClick={handleSaveEvent} variant="primary">
                  {editingEventId ? t("calendar.composer.submitEdit") : t("calendar.composer.submit")}
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
  const { t } = useI18n();
  return (
    <Suspense fallback={<GlassPanel className={styles.statePanel}>{t("calendar.state.loading")}</GlassPanel>}>
      <CalendarPageContent />
    </Suspense>
  );
}
