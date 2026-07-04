"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
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
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { Locale, MessageKey, TranslateVars } from "@/lib/i18n";
import { useActiveProjectRoom } from "@/lib/use-active-project-room";
import { shouldUseWorkspacePreviewData, workspacePreviewSchedules } from "@/lib/workspace-preview-data";
import type {
  CalendarEventGroupResponse,
  GoogleCalendarConnectionResponse,
  GoogleCalendarListEntry,
  ProjectRoomEventEnvelope,
  ProjectRoomEventType,
} from "@/types/api/calendar";
import type { ScheduleResponse } from "@/types/api/work";

import styles from "./calendar-page.module.css";

type PageState =
  | { kind: "loading" }
  | { events: ScheduleResponse[]; kind: "ready"; roomEvents: ProjectRoomEventEnvelope[]; scheduleLoadFailed?: boolean }
  | { kind: "auth" }
  | { kind: "offline" };

// 출처 키 — 고정 출처(personal/room/external) 외에 구글 캘린더별 `gcal:<calendarId>` 키를 동적으로 만든다.
type CalendarSourceKey = string;

// 달력 격자/상세에 그리는 통합 일정 — 로컬 일정(schedule 보유, 수정 가능)과
// 구글 캘린더 원본 일정(schedule 없음, 읽기 전용)을 한 모양으로 합친다.
type CalendarDisplayEvent = {
  allDay: boolean;
  calendarColor: string | null;
  endsAt: string | null;
  key: string;
  schedule: ScheduleResponse | null;
  sourceKey: CalendarSourceKey;
  sourceLabel: string;
  startsAt: string;
  title: string;
};

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

// 날짜 레이블은 UI 언어를 따라간다 (대시보드와 같은 BCP 47 태그 매핑).
const LOCALE_TAGS: Record<Locale, string> = { en: "en-US", ja: "ja-JP", ko: "ko-KR" };

const GOOGLE_SOURCE_PREFIX = "gcal:";

function localScheduleSourceKey(event: ScheduleResponse): CalendarSourceKey {
  if (event.roomId) return "room";
  if (event.googleEventId || event.syncStatus === "SYNCED") {
    return event.googleCalendarId ? `${GOOGLE_SOURCE_PREFIX}${event.googleCalendarId}` : "external";
  }
  return "personal";
}

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

function formatTime(t: TranslateFn, localeTag: string, event: { allDay: boolean; startsAt: string }) {
  if (event.allDay) return t("calendar.time.allDay");
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return t("calendar.time.undecided");
  return new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(start);
}

function formatTimeRange(t: TranslateFn, localeTag: string, event: { allDay: boolean; endsAt?: string | null; startsAt: string }) {
  const startLabel = formatTime(t, localeTag, event);
  if (event.allDay || !event.endsAt) return startLabel;
  const end = new Date(event.endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  const endLabel = new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(end);
  return `${startLabel} - ${endLabel}`;
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
  const { locale, t } = useI18n();
  const localeTag = LOCALE_TAGS[locale] ?? "ko-KR";
  const searchParams = useSearchParams();
  const { roomId: activeRoomId } = useActiveProjectRoom();
  const selectedRoomId = searchParams.get("roomId") ?? activeRoomId;
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
  // 출처 칩은 다중 토글 — 꺼진 출처만 기록한다(기본은 전부 표시).
  // 브라우저 저장소 영속화는 tauri-boundaries 정책상 허용 목록 밖이라 세션(컴포넌트) 상태로만 유지한다.
  const [disabledSources, setDisabledSources] = useState<ReadonlySet<CalendarSourceKey>>(() => new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionState>({ kind: "loading" });
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [syncAction, setSyncAction] = useState<SyncAction | null>(null);
  const [lastSync, setLastSync] = useState<LastSyncSummary | null>(null);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  // 구글 캘린더 원본 일정(캘린더별 그룹) — 연동이 활성일 때 /api/calendar/groups로 실시간 조회한다.
  const [googleGroups, setGoogleGroups] = useState<CalendarEventGroupResponse[]>([]);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [googleEventsLoading, setGoogleEventsLoading] = useState(false);
  const [googleEventsError, setGoogleEventsError] = useState(false);
  const [expandedGoogleEventKey, setExpandedGoogleEventKey] = useState<string | null>(null);
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
        roomEvents: roomEventResult.status === "fulfilled" && roomEventResult.value ? roomEventResult.value.items : [],
        // 로컬(/api/schedules) 실패만 표시 — 배너 문구는 렌더 시점의 구글 연동 상태에 따라 나눈다.
        scheduleLoadFailed: scheduleResult.status === "rejected",
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

  // 구글 연동이 활성일 때, 보이는 기간(월/주 범위)의 모든 구글 캘린더 일정을 원본 그대로 가져온다.
  // 수동 동기화(pull) 없이도 격자에 바로 보이게 하는 경로다.
  const loadGoogleEvents = useCallback(async () => {
    setGoogleEventsLoading(true);
    setGoogleEventsError(false);

    // 로컬 일정은 /api/schedules로 이미 받으므로 그룹 API에서는 구글 캘린더 그룹만 필요하다(localLimit 최소화).
    const [groupsResult, calendarsResult] = await Promise.allSettled([
      calendarApi.getGroupedEvents({ from: range.start, localLimit: 1, to: range.end }),
      calendarApi.getGoogleCalendars(),
    ]);

    if (groupsResult.status === "fulfilled") {
      setGoogleGroups(groupsResult.value.filter((group) => group.groupType === "GOOGLE_CALENDAR"));
    } else {
      setGoogleEventsError(true);
    }
    // 캘린더 목록은 칩 색(backgroundColor) 표시에만 쓰므로 실패해도 그룹 표시는 유지한다.
    if (calendarsResult.status === "fulfilled") {
      setGoogleCalendars(calendarsResult.value);
    }
    setGoogleEventsLoading(false);
  }, [range]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents]);

  useEffect(() => {
    // 재조회 중(loading)에는 이전 결과를 유지해 화면 깜빡임을 줄인다.
    if (googleConnection.kind === "loading") return;

    const timeoutId = window.setTimeout(() => {
      if (googleConnection.kind === "connected") {
        void loadGoogleEvents();
        return;
      }
      // 연결 해제/오류가 확정되면 구글 원본 일정을 비운다.
      setGoogleGroups([]);
      setGoogleEventsError(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [googleConnection.kind, loadGoogleEvents]);

  useEffect(() => {
    if (!syncMenuOpen) return;
    const close = () => setSyncMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [syncMenuOpen]);

  const events = useMemo(() => (state.kind === "ready" ? state.events : []), [state]);
  const roomEvents = useMemo(() => (state.kind === "ready" ? state.roomEvents : []), [state]);
  // 로컬 일정 + 구글 캘린더 원본 일정을 한 목록으로 합친다.
  // 이미 동기화되어 로컬 일정으로 존재하는 구글 일정(googleEventId 일치)은 로컬 항목만 남겨 이중 표시를 막는다.
  const displayEvents = useMemo<CalendarDisplayEvent[]>(() => {
    const localGoogleEventIds = new Set(events.map((event) => event.googleEventId).filter(Boolean));
    const colorByCalendarId = new Map(googleCalendars.map((calendar) => [calendar.id, calendar.backgroundColor ?? null]));

    const merged: CalendarDisplayEvent[] = events.map((event) => {
      const sourceKey = localScheduleSourceKey(event);
      return {
        allDay: event.allDay,
        calendarColor: event.googleCalendarId ? colorByCalendarId.get(event.googleCalendarId) ?? null : null,
        endsAt: event.endsAt ?? null,
        key: `schedule:${event.id}`,
        schedule: event,
        sourceKey,
        sourceLabel:
          sourceKey === "room"
            ? t("calendar.source.room")
            : sourceKey === "personal"
              ? t("calendar.source.personal")
              : event.googleCalendarSummary ?? t("calendar.source.external"),
        startsAt: event.startsAt,
        title: event.title,
      };
    });

    for (const group of googleGroups) {
      const calendarId = group.googleCalendarId ?? group.groupId;
      const calendarColor = colorByCalendarId.get(calendarId) ?? null;
      for (const event of group.events) {
        if (event.sourceType !== "GOOGLE") continue;
        if (event.googleEventId && localGoogleEventIds.has(event.googleEventId)) continue;
        merged.push({
          allDay: event.allDay,
          calendarColor,
          endsAt: event.endsAt ?? null,
          key: `google:${calendarId}:${event.googleEventId ?? event.startsAt}`,
          schedule: null,
          sourceKey: `${GOOGLE_SOURCE_PREFIX}${calendarId}`,
          sourceLabel: group.groupName,
          startsAt: event.startsAt,
          title: event.title,
        });
      }
    }

    return merged;
  }, [events, googleCalendars, googleGroups, t]);
  // 출처 칩 — 고정 3종(전체/개인/프로젝트룸) 뒤에 구글 캘린더별 칩을 데이터 기준으로 만든다.
  const sourceChips = useMemo(() => {
    const chips: Array<{ color: string | null; count: number; key: CalendarSourceKey; label: string }> = [
      { color: null, count: displayEvents.length, key: "all", label: t("calendar.source.all") },
      { color: null, count: displayEvents.filter((event) => event.sourceKey === "personal").length, key: "personal", label: t("calendar.source.personal") },
      { color: null, count: displayEvents.filter((event) => event.sourceKey === "room").length, key: "room", label: t("calendar.source.room") },
    ];
    const googleChips = new Map<CalendarSourceKey, { color: string | null; count: number; key: CalendarSourceKey; label: string }>();
    for (const event of displayEvents) {
      if (event.sourceKey === "personal" || event.sourceKey === "room") continue;
      const existing = googleChips.get(event.sourceKey);
      if (existing) {
        existing.count += 1;
        if (existing.color === null) existing.color = event.calendarColor;
      } else {
        googleChips.set(event.sourceKey, {
          color: event.calendarColor,
          count: 1,
          key: event.sourceKey,
          label: event.sourceKey === "external" ? t("calendar.source.external") : event.sourceLabel,
        });
      }
    }
    return [...chips, ...Array.from(googleChips.values()).sort((left, right) => left.label.localeCompare(right.label))];
  }, [displayEvents, t]);
  const toggleSource = (key: CalendarSourceKey) => {
    if (key === "all") {
      setDisabledSources(new Set());
      return;
    }
    setDisabledSources((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const visibleEvents = useMemo(
    () => displayEvents.filter((event) => !disabledSources.has(event.sourceKey)),
    [displayEvents, disabledSources],
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
  const monthLabel = new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }).format(currentMonth);
  const selectedDayLabel = new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", weekday: "long" }).format(toSelectedDay(selectedDate));
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const leadingDays = (start.getDay() + 6) % 7;
    const totalDays = leadingDays + end.getDate();

    // 앞뒤 인접 달 날짜도 채워 달력을 항상 완전한 7열 격자로 유지한다(인접 달은 흐리게만 표시).
    return Array.from(
      { length: Math.ceil(totalDays / 7) * 7 },
      (_, index) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), index - leadingDays + 1),
    );
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
  // 연결 상태 라인 — 이메일만 보여주면 "연동 안 됨"으로 오해하기 쉬워 "연결됨 · {email}" 형태로 상태를 먼저 밝힌다.
  const googleConnectionLabel =
    googleConnection.kind === "connected"
      ? googleConnection.value.googleAccountEmail
        ? t("calendar.google.connectedAs", { email: googleConnection.value.googleAccountEmail })
        : t("calendar.google.connected")
      : googleConnection.kind === "loading"
        ? t("calendar.google.checking")
        : googleConnection.kind === "error"
          ? t("calendar.google.needsCheck")
          : t("calendar.google.beforeConnect");
  // 동기화 상태 점 — 연결됨(확인 필요 여부)·확인 중·연결 전을 색으로만 구분한다.
  const syncDotClass =
    googleConnection.kind === "connected"
      ? reviewCount > 0
        ? styles.syncDotWarn
        : styles.syncDotOk
      : googleConnection.kind === "loading"
        ? styles.syncDotLoading
        : styles.syncDotOff;

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
    setExpandedGoogleEventKey(null);
    setEditingEventId(null);
    setDraftTitle("");
    setDraftStartTime("10:30");
    setDraftEndTime("11:00");
    setDraftNotice(null);
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

      // 가져오기(pull)는 primary만 도는 백엔드 기본값 대신, 알고 있는 모든 캘린더를 명시해 전체를 동기화한다.
      const pullRange = {
        calendarIds: googleCalendars.length > 0 ? googleCalendars.map((calendar) => calendar.id) : undefined,
        from: range.start,
        to: range.end,
      };
      const pushRange = { from: range.start, to: range.end };

      if (action === "sync") {
        // 한 버튼으로 가져오기(구글 → Bubli) 후 보내기(Bubli → 구글)를 순서대로 실행한다.
        const pulledEvents = await calendarApi.syncGoogleEvents(pullRange);
        mergeSyncedEvents(pulledEvents);
        const pushedEvents = await calendarApi.pushUnsyncedGoogleEvents(pushRange);
        mergeSyncedEvents(pushedEvents);
        setLastSync({ at: new Date(), pulled: pulledEvents.length, pushed: pushedEvents.length });
        setGoogleNotice(t("calendar.notice.syncDone", { pulled: pulledEvents.length, pushed: pushedEvents.length }));
        void loadGoogleEvents();
        return;
      }

      const syncedEvents =
        action === "pull"
          ? await calendarApi.syncGoogleEvents(pullRange)
          : await calendarApi.pushUnsyncedGoogleEvents(pushRange);
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
      // 동기화 이후 구글 원본 그룹을 다시 받아 중복 제거·표시 상태를 맞춘다.
      void loadGoogleEvents();
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
      if (editingEventId) {
        // 백엔드 UpdateScheduleRequest에는 roomId가 없다(수정으로 일정의 소속 룸을 옮기지 않음).
        const updateBody = { allDay: false, endsAt, startsAt, title };
        const currentEvent = events.find((event) => event.id === editingEventId);
        const shouldSyncGoogle = Boolean(currentEvent?.googleEventId || currentEvent?.syncStatus === "SYNCED");
        const updated = shouldSyncGoogle
          ? (await calendarApi.updateGoogleCalendarEvent(editingEventId, updateBody)).schedule
          : await calendarApi.updateEvent(editingEventId, updateBody);
        updateEventInState(updated);
        setDraftNotice(t("calendar.draft.updated"));
      } else {
        const created = await calendarApi.createEvent({
          allDay: false,
          endsAt,
          roomId: selectedRoomId,
          startsAt,
          title,
        });
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
          <GlassPanel className={styles.shell} padded={false}>
            <div className={styles.toolbar}>
              <div className={styles.monthNav}>
                <button aria-label={t("calendar.nav.prevMonth")} className={styles.navButton} onClick={() => moveMonth(-1)} type="button">
                  <ChevronLeft size={17} strokeWidth={2.1} />
                </button>
                <strong className={styles.monthLabel} key={monthLabel}>
                  {monthLabel}
                </strong>
                <button aria-label={t("calendar.nav.nextMonth")} className={styles.navButton} onClick={() => moveMonth(1)} type="button">
                  <ChevronRight size={17} strokeWidth={2.1} />
                </button>
                <button className={styles.todayButton} onClick={goToToday} type="button">
                  {t("calendar.nav.today")}
                </button>
              </div>
              <div className={styles.toolbarActions}>
                <div aria-label={t("calendar.view.aria")} className={styles.viewSwitch}>
                  <button aria-pressed={viewMode === "month"} onClick={() => setViewMode("month")} type="button">
                    {t("calendar.view.month")}
                  </button>
                  <button aria-pressed={viewMode === "week"} onClick={() => setViewMode("week")} type="button">
                    {t("calendar.view.week")}
                  </button>
                </div>
                <div
                  className={styles.syncWrap}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSyncMenuOpen(false);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    aria-expanded={syncMenuOpen}
                    aria-haspopup="dialog"
                    aria-label={t("calendar.google.syncAria")}
                    className={styles.syncTrigger}
                    onClick={() => setSyncMenuOpen((open) => !open)}
                    type="button"
                  >
                    <RefreshCw className={syncAction ? styles.syncSpinner : undefined} size={15} strokeWidth={2.1} />
                    <i aria-hidden="true" className={`${styles.syncDot} ${syncDotClass}`} />
                  </button>
                  {syncMenuOpen ? (
                    <div aria-label={t("calendar.google.syncAria")} className={styles.syncPopover} role="dialog">
                      <div className={styles.syncPopoverHead}>
                        <strong>Google Calendar</strong>
                        <span>{googleConnectionLabel}</span>
                      </div>
                      {googleConnected ? (
                        <p className={styles.syncPopoverMeta}>
                          {lastSync
                            ? t("calendar.google.lastSync", { pulled: lastSync.pulled, pushed: lastSync.pushed, time: formatClockTime(lastSync.at) })
                            : t("calendar.google.noSyncYet")}
                        </p>
                      ) : (
                        <p className={styles.syncPopoverMeta}>{t("calendar.google.connectHint")}</p>
                      )}
                      <div className={styles.syncPopoverActions}>
                        {!googleConnected ? (
                          <button
                            className={styles.syncPopoverItem}
                            disabled={syncAction !== null}
                            onClick={() => void runGoogleAction("connect")}
                            type="button"
                          >
                            <ExternalLink size={14} strokeWidth={2.1} />
                            <span>{syncAction === "connect" ? t("calendar.google.moving") : t("calendar.google.connect")}</span>
                          </button>
                        ) : (
                          <>
                            <button
                              className={styles.syncPopoverItem}
                              disabled={syncAction !== null}
                              onClick={() => void runGoogleAction("sync")}
                              type="button"
                            >
                              <RefreshCw className={syncAction === "sync" ? styles.syncSpinner : undefined} size={14} strokeWidth={2.1} />
                              <span>{syncAction === "sync" ? t("calendar.google.syncing") : t("calendar.google.sync")}</span>
                            </button>
                            <button
                              className={styles.syncPopoverItem}
                              disabled={syncAction !== null}
                              onClick={() => {
                                setSyncMenuOpen(false);
                                void runGoogleAction("pull");
                              }}
                              type="button"
                            >
                              <ArrowDownToLine size={14} strokeWidth={2.1} />
                              <span>{t("calendar.google.pullOnly")}</span>
                            </button>
                            <button
                              className={styles.syncPopoverItem}
                              disabled={syncAction !== null}
                              onClick={() => {
                                setSyncMenuOpen(false);
                                void runGoogleAction("push");
                              }}
                              type="button"
                            >
                              <ArrowUpToLine size={14} strokeWidth={2.1} />
                              <span>{t("calendar.google.pushOnly")}</span>
                            </button>
                            <button
                              className={`${styles.syncPopoverItem} ${styles.syncPopoverQuiet}`}
                              disabled={syncAction !== null}
                              onClick={() => {
                                setSyncMenuOpen(false);
                                void runGoogleAction("disconnect");
                              }}
                              type="button"
                            >
                              <Unplug size={14} strokeWidth={2.1} />
                              <span>{t("calendar.google.disconnect")}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <Button icon={<Plus size={15} strokeWidth={2.1} />} onClick={openCreateComposer} variant="primary">
                  {t("calendar.view.newEvent")}
                </Button>
              </div>
            </div>

            <div aria-label={t("calendar.sourceTabs.aria")} className={styles.filterRow}>
              {sourceChips.map((chip) => (
                <button
                  aria-pressed={chip.key === "all" ? disabledSources.size === 0 : !disabledSources.has(chip.key)}
                  className={styles.filterChip}
                  key={chip.key}
                  onClick={() => toggleSource(chip.key)}
                  type="button"
                >
                  {chip.key.startsWith(GOOGLE_SOURCE_PREFIX) || chip.key === "external" ? (
                    <i aria-hidden="true" className={styles.chipDot} style={chip.color ? { background: chip.color } : undefined} />
                  ) : null}
                  <span>{chip.label}</span>
                  <strong>{chip.count}</strong>
                </button>
              ))}
            </div>

            {googleNotice ? <p className={styles.inlineNotice}>{googleNotice}</p> : null}
            {state.scheduleLoadFailed ? (
              <p className={styles.loadWarning}>
                {/* 어느 쪽이 실패했는지 분명히 — 구글 일정이 정상 표시 중이면 그 사실을 함께 알린다. */}
                {googleConnected && !googleEventsError ? t("calendar.notice.localLoadFailedGoogleOk") : t("calendar.notice.loadWarning")}
                <button className={styles.retryButton} onClick={() => void loadEvents()} type="button">
                  {t("calendar.google.retry")}
                </button>
              </p>
            ) : null}
            {googleConnected && googleEventsLoading ? <p className={styles.inlineNotice}>{t("calendar.google.eventsLoading")}</p> : null}
            {googleConnected && !googleEventsLoading && googleEventsError ? (
              <p className={styles.loadWarning}>
                {state.scheduleLoadFailed ? t("calendar.google.eventsError") : t("calendar.google.eventsErrorLocalOk")}
                <button className={styles.retryButton} onClick={() => void loadGoogleEvents()} type="button">
                  {t("calendar.google.retry")}
                </button>
              </p>
            ) : null}

            <div className={styles.gridWrap}>
              <div aria-hidden="true" className={styles.weekdayRow}>
                {dayLabels.map((day) => (
                  <span key={day.value}>{t(day.labelKey)}</span>
                ))}
              </div>
              <div aria-label={t("calendar.grid.aria")} className={viewMode === "week" ? `${styles.grid} ${styles.gridWeek}` : styles.grid}>
                {visibleCalendarDays.map((date) => {
                  const dateValue = toDateValue(date);
                  const outside = viewMode === "month" && date.getMonth() !== currentMonth.getMonth();

                  if (outside) {
                    return (
                      <span className={`${styles.cell} ${styles.cellOutside}`} key={dateValue}>
                        <span className={styles.cellDate}>{date.getDate()}</span>
                      </span>
                    );
                  }

                  const dayEvents = visibleEvents
                    .filter((event) => sameDate(new Date(event.startsAt), date))
                    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
                  const count = dayEvents.length;
                  const roomEventCount = roomEvents.filter((event) => sameDate(new Date(event.occurredAt), date)).length;
                  const selected = dateValue === selectedDate;
                  const today = sameDate(date, now);
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  const className = [
                    styles.cell,
                    selected ? styles.cellSelected : "",
                    today ? styles.cellToday : "",
                    weekend ? styles.cellWeekend : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button aria-pressed={selected} className={className} key={dateValue} onClick={() => selectCalendarDate(date, count > 0)} type="button">
                      <span className={styles.cellDate}>{date.getDate()}</span>
                      {count > 0 ? (
                        <ul aria-label={t("calendar.grid.dayEventsAria", { day: date.getDate() })} className={styles.cellEvents}>
                          {dayEvents.slice(0, 3).map((event) => {
                            const source = event.sourceKey === "room" ? "room" : event.sourceKey === "personal" ? "personal" : "external";
                            return (
                              <li className={`${styles.eventChip} ${styles[`eventChip_${source}`]}`} key={event.key}>
                                <span>{formatTime(t, localeTag, event)}</span>
                                <b>{event.title}</b>
                              </li>
                            );
                          })}
                          {count > 3 ? <li className={styles.eventMore}>{t("calendar.grid.moreCount", { count: count - 3 })}</li> : null}
                        </ul>
                      ) : null}
                      {roomEventCount > 0 ? (
                        <i aria-label={t("calendar.grid.roomEventsAria", { count: roomEventCount })} className={styles.roomDot} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <section aria-label={t("calendar.selected.aria")} className={styles.detail}>
              <div className={styles.detailHead}>
                <strong>{selectedDayLabel}</strong>
                <span>{selectedEvents.length > 0 ? t("calendar.selected.count", { count: selectedEvents.length }) : t("calendar.summary.noEvent")}</span>
              </div>
              {deleteNotice ? <p className={styles.notice}>{deleteNotice}</p> : null}
              {selectedEvents.length > 0 ? (
                <ul className={styles.detailList}>
                  {selectedEvents.map((event) => {
                    // 구글 캘린더 원본 일정(로컬 schedule 없음)은 읽기 전용 — 클릭하면 상세만 펼친다.
                    if (!event.schedule) {
                      const expanded = expandedGoogleEventKey === event.key;
                      return (
                        <li key={event.key}>
                          <button
                            aria-expanded={expanded}
                            className={styles.detailRow}
                            onClick={() => setExpandedGoogleEventKey(expanded ? null : event.key)}
                            type="button"
                          >
                            <span className={styles.detailTime}>{formatTime(t, localeTag, event)}</span>
                            <strong className={styles.detailTitle}>{event.title}</strong>
                            <small className={styles.detailSource}>
                              <i aria-hidden="true" className={styles.chipDot} style={event.calendarColor ? { background: event.calendarColor } : undefined} />
                              {event.sourceLabel}
                            </small>
                          </button>
                          <span aria-label={t("calendar.google.readOnlyBadge")} className={styles.detailLock} role="img" title={t("calendar.google.readOnlyBadge")}>
                            <Lock size={14} strokeWidth={2.1} />
                          </span>
                          {expanded ? (
                            <div className={styles.readOnlyDetail} role="note">
                              <strong>{event.title}</strong>
                              <p>
                                {formatTimeRange(t, localeTag, event)} · {event.sourceLabel}
                              </p>
                              <p>{t("calendar.google.readOnly")}</p>
                            </div>
                          ) : null}
                        </li>
                      );
                    }

                    const schedule = event.schedule;
                    const confirmingDelete = confirmingDeleteEventId === schedule.id;

                    return (
                      <li key={event.key}>
                        <button className={styles.detailRow} onClick={() => openEditComposer(schedule)} type="button">
                          <span className={styles.detailTime}>{formatTime(t, localeTag, event)}</span>
                          <strong className={styles.detailTitle}>{event.title}</strong>
                          <small className={styles.detailSource}>
                            {event.sourceKey.startsWith(GOOGLE_SOURCE_PREFIX) || event.sourceKey === "external" ? (
                              <i aria-hidden="true" className={styles.chipDot} style={event.calendarColor ? { background: event.calendarColor } : undefined} />
                            ) : null}
                            {event.sourceLabel}
                          </small>
                        </button>
                        <button
                          aria-expanded={confirmingDelete}
                          aria-label={t("calendar.selected.deleteAria", { title: schedule.title })}
                          className={styles.detailDelete}
                          disabled={deletingEventId === schedule.id}
                          onClick={() => setConfirmingDeleteEventId(confirmingDelete ? null : schedule.id)}
                          type="button"
                        >
                          <Trash2 size={15} strokeWidth={2.1} />
                        </button>
                        {confirmingDelete ? (
                          <div aria-label={t("calendar.selected.deleteAria", { title: schedule.title })} className={styles.deleteConfirm} role="alertdialog">
                            <p>{t("calendar.delete.confirmBody", { title: schedule.title })}</p>
                            <div className={styles.deleteConfirmActions}>
                              <Button
                                loading={deletingEventId === schedule.id}
                                onClick={() => void handleDeleteEvent(schedule)}
                                size="sm"
                                variant="primary"
                              >
                                {t("calendar.delete.confirmDelete")}
                              </Button>
                              <Button
                                disabled={deletingEventId === schedule.id}
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
              <button className={styles.detailAdd} onClick={openCreateComposer} type="button">
                {t("calendar.selected.addForDate")}
              </button>
            </section>
          </GlassPanel>

          {composerOpen ? (
            <div className={styles.composerLayer} role="presentation" onMouseDown={closeComposer}>
              <GlassPanel
                aria-labelledby="calendar-composer-title"
                className={styles.composerPanel}
                role="dialog"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className={styles.composerHead}>
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
