"use client";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { ArrowDown, ArrowUp, CalendarDays, ChevronRight, PencilIcon, Plus, TrashIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  getGanttTodayScrollLeft,
  type GanttFeature,
  type Range,
} from "@/components/ui/gantt";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { startGoogleCalendarConnect } from "@/features/calendar/api/googleCalendarAuth";
import { useRoomCalendarAutoPush } from "@/features/calendar/api/use-room-calendar-auto-push";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { isWindowsTauriRuntime } from "@/lib/tauri/platform";
import { readTauriStartupOptimizationConfig } from "@/lib/tauri/startup-optimization";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { GoogleCalendarConnectionResponse, RoomCalendarResponse } from "@/types/api/calendar";
import type { ScheduleResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./wbs-gantt-panel.module.css";

const rangeOptions: Array<{ key: Range; labelKey: MessageKey }> = [
  { key: "monthly", labelKey: "wbs.gantt.range.monthly" },
  { key: "weekly", labelKey: "wbs.gantt.range.weekly" },
  { key: "daily", labelKey: "wbs.gantt.range.daily" },
];

const wbsGanttStatusColors: Record<WbsStatus, string> = {
  DONE: "var(--signal-ok)",
  IN_PROGRESS: "var(--signal-todo)",
  TODO: "var(--ink-faint)",
};

const wbsGanttStatusNameKeys: Record<WbsStatus, MessageKey> = {
  DONE: "wbs.gantt.status.done",
  IN_PROGRESS: "wbs.gantt.status.inProgress",
  TODO: "wbs.gantt.status.todo",
};

const DEFAULT_BAR_DAYS = 6;
const LOCAL_ID_PREFIX = "local-wbs-";

async function readWindowsWbsCalendarTimeoutMs() {
  if (!isWindowsTauriRuntime()) return 0;

  const startupConfig = await readTauriStartupOptimizationConfig().catch(() => null);
  if (startupConfig?.profile !== "windows") return 0;
  return startupConfig.settingsTimeoutMs;
}

function withWindowsWbsCalendarDeadline<T>(request: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  if (timeoutMs <= 0 || typeof window === "undefined") return request;

  let timeoutId: number | null = null;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  });
}

export type WbsGanttRange = { startAt: Date; endAt: Date };
export type WbsGanttRangeEditRequest = {
  endAt: Date;
  id: string;
  requestId: number;
  startAt: Date;
};

type LocalRange = WbsGanttRange;
type CreateDraft = {
  parentId: string | null;
  startAt: Date;
  title: string;
};

type CalendarSyncState = "checking" | "off" | "recording";

const pad2 = (value: number) => String(value).padStart(2, "0");
const formatBarDate = (date: Date) => `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;

function scheduleRangeQuery() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
    size: 500,
    to: new Date(now.getFullYear() + 2, 0, 1).toISOString(),
  };
}

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fallbackRange(item: WbsItemResponse): LocalRange {
  const created = toDate(item.createdAt) ?? new Date();
  const startAt = startOfDay(created);
  return { endAt: endOfDay(addDays(startAt, DEFAULT_BAR_DAYS)), startAt };
}

function normalizeRange(startAt: Date, endAt: Date | null): LocalRange {
  const start = startOfDay(startAt);
  const rawEnd = endAt ?? addDays(start, DEFAULT_BAR_DAYS);
  const end = endOfDay(rawEnd.getTime() <= start.getTime() ? addDays(start, 1) : rawEnd);
  return { endAt: end, startAt: start };
}

export function WbsGanttPanel({
  onNotice,
  onOpenSettings,
  onRangesResolved,
  onSelectItem,
  onWbsCreated,
  onWbsDeleted,
  onWbsReordered,
  rangeEditRequest,
  roomId,
  selectedWbsId,
  toolbarLeading,
  toolbarTrailing,
  wbsAccentById,
  wbsItems,
}: {
  onNotice: (message: string) => void;
  onOpenSettings: (id: string) => void;
  onRangesResolved?: (ranges: Record<string, WbsGanttRange>) => void;
  onSelectItem: (id: string) => void;
  onWbsCreated: (item: WbsItemResponse, temporaryId?: string) => void;
  onWbsDeleted: (id: string) => void;
  onWbsReordered?: (items: WbsItemResponse[]) => void;
  rangeEditRequest?: WbsGanttRangeEditRequest | null;
  roomId: string;
  selectedWbsId: string | null;
  toolbarLeading?: ReactNode;
  toolbarTrailing?: ReactNode;
  wbsAccentById?: Record<string, string>;
  wbsItems: WbsItemResponse[];
}) {
  const { t } = useI18n();
  const [range, setRange] = useState<Range>("monthly");
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [localRanges, setLocalRanges] = useState<Record<string, LocalRange>>({});
  const [collapsedWbsIds, setCollapsedWbsIds] = useState<Set<string>>(() => new Set());
  const [calendarSync, setCalendarSync] = useState<CalendarSyncState>("checking");
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);
  const [roomGroupEventCount, setRoomGroupEventCount] = useState<number | null>(null);
  // 룸별로 캐시해 룸을 오가도 이전 룸의 캘린더가 섞여 보이지 않게 한다.
  const [roomCalendarByRoom, setRoomCalendarByRoom] = useState<Record<string, RoomCalendarResponse>>({});
  const [isEnsuringRoomCalendar, setIsEnsuringRoomCalendar] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [isSyncPopoverOpen, setIsSyncPopoverOpen] = useState(false);
  // 팝오버를 연 시각. "방금/{n}분 전" 계산의 기준으로 써서 렌더 중 Date.now() 호출을 피한다.
  const [syncPopoverOpenedAt, setSyncPopoverOpenedAt] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const syncWrapRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const handledRangeRequestId = useRef<number | null>(null);
  const localIdCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const request = calendarApi.getEvents({ roomId, ...scheduleRangeQuery() });

    void readWindowsWbsCalendarTimeoutMs()
      .then((timeoutMs) => withWindowsWbsCalendarDeadline(request, timeoutMs, null))
      .then((page) => {
        if (!cancelled && page) {
          setSchedules(page.items.filter((schedule) => schedule.wbsItemId));
        }
        if (isWindowsTauriRuntime() && !page) {
          void request
            .then((latest) => {
              if (!cancelled) setSchedules(latest.items.filter((schedule) => schedule.wbsItemId));
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        // 일정 API를 쓸 수 없으면 로컬 기간으로만 동작한다.
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (createDraft) {
      createInputRef.current?.focus();
    }
  }, [createDraft]);

  // 동기화 상세 팝오버는 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!isSyncPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!syncWrapRef.current?.contains(event.target as Node)) {
        setIsSyncPopoverOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isSyncPopoverOpen]);

  useEffect(() => {
    let cancelled = false;
    const request = calendarApi.getGoogleConnection();

    void readWindowsWbsCalendarTimeoutMs()
      .then((timeoutMs) => withWindowsWbsCalendarDeadline<GoogleCalendarConnectionResponse | null>(request, timeoutMs, null))
      .then((connection: GoogleCalendarConnectionResponse | null) => {
        if (cancelled) return;
        const isActive = connection?.status === "ACTIVE";
        setCalendarSync(isActive ? "recording" : "off");
        setGoogleAccountEmail(isActive ? connection?.googleAccountEmail ?? null : null);
        if (isWindowsTauriRuntime() && !connection) {
          void request
            .then((latestConnection) => {
              if (cancelled) return;
              const latestIsActive = latestConnection?.status === "ACTIVE";
              setCalendarSync(latestIsActive ? "recording" : "off");
              setGoogleAccountEmail(latestIsActive ? latestConnection?.googleAccountEmail ?? null : null);
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // ApiClientError 404 = 연결 이력 없음. 그 외 오류도 표시상 '미연동'으로 둔다
        // (일정 저장 자체는 roomId 기준 /api/schedules로 계속 동작).
        setCalendarSync("off");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 연결 상태일 때 이 룸의 캘린더 그룹(로컬 일정 묶음) 건수를 함께 보여준다.
  useEffect(() => {
    // 미연결이면 조회하지 않는다. 건수 표시는 recording 상태에서만 렌더되므로 리셋은 불필요.
    if (calendarSync !== "recording") return;

    let cancelled = false;
    const { from, to } = scheduleRangeQuery();
    const request = calendarApi.getGroupedEvents({ from, roomId, to });

    void readWindowsWbsCalendarTimeoutMs()
      .then((timeoutMs) => withWindowsWbsCalendarDeadline(request, timeoutMs, null))
      .then((groups) => {
        if (isWindowsTauriRuntime() && !groups) {
          void request
            .then((latestGroups) => {
              if (cancelled) return;
              const latestRoomGroup = latestGroups.find((group) => group.groupType === "PROJECT_ROOM" && group.roomId === roomId);
              setRoomGroupEventCount(latestRoomGroup?.eventCount ?? 0);
            })
            .catch(() => undefined);
          return;
        }
        if (cancelled || !groups) return;
        const roomGroup = groups.find((group) => group.groupType === "PROJECT_ROOM" && group.roomId === roomId);
        setRoomGroupEventCount(roomGroup?.eventCount ?? 0);
      })
      .catch(() => {
        // 그룹 조회 실패는 건수 표시만 생략한다(연결 상태 표시는 유지).
      });

    return () => {
      cancelled = true;
    };
  }, [calendarSync, roomId]);

  // 자동 push용 기간은 마운트 시점 기준으로 고정한다(렌더마다 ISO 문자열이 바뀌지 않게).
  const autoPushRange = useMemo(() => scheduleRangeQuery(), []);

  // 자동 push가 끝나면 이번에 연동된 룸 일정(WBS 기간 일정)을 화면 상태에 합치고,
  // push로 룸 캘린더가 지연 생성됐을 수 있으니 매핑(이름)을 갱신해 팝오버 문구에 쓴다.
  const handleAutoPushed = useCallback(
    (roomEvents: ScheduleResponse[]) => {
      const wbsEvents = roomEvents.filter((event) => event.wbsItemId);
      if (wbsEvents.length > 0) {
        setSchedules((current) => {
          const byId = new Map(current.map((entry) => [entry.id, entry]));
          for (const event of wbsEvents) {
            byId.set(event.id, event);
          }
          return Array.from(byId.values());
        });
      }

      void calendarApi
        .getRoomCalendar(roomId)
        .then((response) => setRoomCalendarByRoom((current) => ({ ...current, [roomId]: response })))
        .catch(() => {
          // 매핑 조회 실패는 팝오버 문구만 생략한다.
        });
    },
    [roomId],
  );

  // 구글 연동이 활성인 멤버가 WBS 보드를 열면 세션당 한 번, 그리고 일정 변경 후
  // 5초 디바운스로 내가 만든 룸 일정의 미연동분을 내 구글 캘린더(룸 캘린더)로 push한다.
  const { lastPush, schedulePush } = useRoomCalendarAutoPush({
    enabled: calendarSync === "recording",
    from: autoPushRange.from,
    onPushed: handleAutoPushed,
    roomId,
    to: autoPushRange.to,
  });

  // GET이지만 백엔드가 룸 이름으로 구글 캘린더를 지연 생성하는 ensure 성격의 호출이라
  // 자동 조회하지 않고 팝오버의 버튼으로만 부른다.
  const handleEnsureRoomCalendar = async () => {
    setIsEnsuringRoomCalendar(true);

    try {
      const response = await calendarApi.getRoomCalendar(roomId);
      setRoomCalendarByRoom((current) => ({ ...current, [roomId]: response }));
      if (response.needsReconsent) {
        // 예전 권한으로 연결된 구글 계정은 캘린더 생성 권한이 없어 재동의가 필요하다.
        onNotice(t("wbs.gantt.sync.roomCalendarReconsent"));
      } else if (!response.googleCalendarId) {
        onNotice(t("wbs.gantt.sync.roomCalendarMissing"));
      }
    } catch {
      onNotice(t("wbs.gantt.sync.roomCalendarFailed"));
    } finally {
      setIsEnsuringRoomCalendar(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);

    try {
      const connection = await startGoogleCalendarConnect();
      if (connection?.status === "ACTIVE") {
        setCalendarSync("recording");
        setGoogleAccountEmail(connection.googleAccountEmail ?? null);
        const roomCalendar = await calendarApi.getRoomCalendar(roomId);
        setRoomCalendarByRoom((current) => ({ ...current, [roomId]: roomCalendar }));
        onNotice(
          roomCalendar.needsReconsent
            ? t("wbs.gantt.sync.roomCalendarReconsent")
            : t("wbs.gantt.sync.recording"),
        );
      }
    } catch {
      onNotice(t("wbs.gantt.sync.connectFailed"));
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // 예전 권한으로 연결된 계정: 연결 해제 후 재동의 플로우로 보낸다(캘린더 생성 권한 확보).
  const handleReconnectGoogle = async () => {
    setIsConnectingGoogle(true);

    try {
      await calendarApi.disconnectGoogleConnection().catch(() => undefined);
      const connection = await startGoogleCalendarConnect();
      if (connection?.status === "ACTIVE") {
        setCalendarSync("recording");
        setGoogleAccountEmail(connection.googleAccountEmail ?? null);
        const roomCalendar = await calendarApi.getRoomCalendar(roomId);
        setRoomCalendarByRoom((current) => ({ ...current, [roomId]: roomCalendar }));
        onNotice(
          roomCalendar.needsReconsent
            ? t("wbs.gantt.sync.roomCalendarReconsent")
            : t("wbs.gantt.sync.recording"),
        );
      }
    } catch {
      onNotice(t("wbs.gantt.sync.connectFailed"));
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const scheduleByWbsId = useMemo(() => {
    const map = new Map<string, ScheduleResponse>();
    for (const schedule of schedules) {
      if (!schedule.wbsItemId) continue;
      const existing = map.get(schedule.wbsItemId);
      // WBS 기간 전용 일정(taskId 없음)을 우선한다.
      if (!existing || (existing.taskId && !schedule.taskId)) {
        map.set(schedule.wbsItemId, schedule);
      }
    }
    return map;
  }, [schedules]);

  const itemById = useMemo(() => new Map(wbsItems.map((item) => [item.id, item])), [wbsItems]);

  const childrenByParent = useMemo(() => {
    const groups = wbsItems.reduce<Record<string, WbsItemResponse[]>>((acc, item) => {
      const key = item.parentId && itemById.has(item.parentId) ? item.parentId : "__root__";
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});

    Object.values(groups).forEach((items) => {
      items.sort((a, b) => a.orderNo - b.orderNo || a.createdAt.localeCompare(b.createdAt));
    });

    return groups;
  }, [itemById, wbsItems]);

  const visibleItems = useMemo(() => {
    const collectVisible = (item: WbsItemResponse): WbsItemResponse[] => {
      if (collapsedWbsIds.has(item.id)) {
        return [item];
      }

      return [item, ...(childrenByParent[item.id] ?? []).flatMap(collectVisible)];
    };

    return (childrenByParent.__root__ ?? []).flatMap(collectVisible);
  }, [childrenByParent, collapsedWbsIds]);

  const childCountById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of wbsItems) {
      if (!item.parentId) continue;
      map.set(item.parentId, (map.get(item.parentId) ?? 0) + 1);
    }
    return map;
  }, [wbsItems]);

  // 트리 들여쓰기용 깊이(부모 체인 길이). 중첩 하위 작업도 단계별로 들여쓴다.
  const depthById = useMemo(() => {
    const map = new Map<string, number>();

    const resolve = (item: WbsItemResponse): number => {
      const cached = map.get(item.id);
      if (cached !== undefined) return cached;

      const parent = item.parentId ? itemById.get(item.parentId) : undefined;
      const depth = parent ? Math.min(3, resolve(parent) + 1) : 0;
      map.set(item.id, depth);
      return depth;
    };

    for (const item of wbsItems) {
      resolve(item);
    }
    return map;
  }, [itemById, wbsItems]);

  // 프로젝트 전체 진행률: 하위가 없는 말단 작업 기준 DONE 비율.
  const overallProgress = useMemo(() => {
    const parentIds = new Set(wbsItems.filter((item) => item.parentId).map((item) => item.parentId as string));
    const leaves = wbsItems.filter((item) => !parentIds.has(item.id));
    return { done: leaves.filter((item) => item.status === "DONE").length, total: leaves.length };
  }, [wbsItems]);
  const overallProgressPercent =
    overallProgress.total > 0 ? Math.round((overallProgress.done / overallProgress.total) * 100) : 0;

  // 상위 작업 진행률: 모든 하위(자손) 작업 중 DONE 개수. Jira 타임라인의 진행 표시와 같은 기준.
  const progressById = useMemo(() => {
    const cache = new Map<string, { done: number; total: number }>();

    const collect = (id: string): { done: number; total: number } => {
      const cached = cache.get(id);
      if (cached) return cached;

      let done = 0;
      let total = 0;
      for (const child of childrenByParent[id] ?? []) {
        total += 1;
        if (child.status === "DONE") done += 1;
        const nested = collect(child.id);
        done += nested.done;
        total += nested.total;
      }

      const result = { done, total };
      cache.set(id, result);
      return result;
    };

    for (const item of wbsItems) {
      collect(item.id);
    }
    return cache;
  }, [childrenByParent, wbsItems]);

  const pendingSyncCount = useMemo(
    () => schedules.filter((schedule) => schedule.wbsItemId && schedule.syncStatus === "SYNC_FAILED").length,
    [schedules],
  );

  const resolveAccent = useCallback((item: WbsItemResponse) => {
    if (wbsAccentById?.[item.id]) return wbsAccentById[item.id];
    if (item.parentId && wbsAccentById?.[item.parentId]) return wbsAccentById[item.parentId];
    return wbsGanttStatusColors[item.status];
  }, [wbsAccentById]);

  const featureById = useMemo(() => {
    const map = new Map<string, GanttFeature>();
    for (const item of wbsItems) {
      const schedule = scheduleByWbsId.get(item.id);
      const scheduleStart = toDate(schedule?.startsAt);
      const scheduleEnd = toDate(schedule?.endsAt);
      const local = localRanges[item.id];
      const resolved = local ?? (scheduleStart ? normalizeRange(scheduleStart, scheduleEnd) : fallbackRange(item));

      map.set(item.id, {
        endAt: resolved.endAt,
        id: item.id,
        name: item.title,
        startAt: resolved.startAt,
        status: {
          color: resolveAccent(item),
          id: item.status,
          name: t(wbsGanttStatusNameKeys[item.status]),
        },
      });
    }
    return map;
  }, [localRanges, resolveAccent, scheduleByWbsId, t, wbsItems]);

  useEffect(() => {
    if (!onRangesResolved) return;

    onRangesResolved(
      Object.fromEntries(
        Array.from(featureById.values()).map((feature) => [
          feature.id,
          {
            endAt: feature.endAt ?? endOfDay(addDays(feature.startAt, DEFAULT_BAR_DAYS)),
            startAt: feature.startAt,
          },
        ]),
      ),
    );
  }, [featureById, onRangesResolved]);

  const openItemSettings = (item: WbsItemResponse) => {
    onSelectItem(item.id);
    onOpenSettings(item.id);
  };

  const focusItemOnTimeline = (item: WbsItemResponse) => {
    onSelectItem(item.id);
    const moveToFeature = () => {
      const escapedId =
        typeof CSS !== "undefined" && CSS.escape ? CSS.escape(item.id) : item.id.replace(/["\\]/g, "\\$&");
      const element = panelRef.current?.querySelector<HTMLElement>(`[data-gantt-feature-id="${escapedId}"]`);
      const scroller = element?.closest<HTMLElement>('[data-roadmap-ui="gantt-root"]');
      if (!element || !scroller) return;

      const elementRect = element.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const sidebarWidth =
        Number.parseFloat(getComputedStyle(scroller).getPropertyValue("--gantt-sidebar-width")) || 0;
      // 바가 이미 화면 안에 온전히 보이면 스크롤을 건드리지 않는다(선택할 때마다 튀는 것 방지).
      const visibleLeft = scrollerRect.left + sidebarWidth + 18;
      const visibleRight = scrollerRect.right - 18;

      if (elementRect.left >= visibleLeft && elementRect.right <= visibleRight) {
        return;
      }

      const viewportCenter = scrollerRect.left + sidebarWidth + (scroller.clientWidth - sidebarWidth) / 2;
      const elementCenter = elementRect.left + elementRect.width / 2;

      const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, scroller.scrollLeft + elementCenter - viewportCenter));

      scroller.scrollTo({
        behavior: "auto",
        left: nextScrollLeft,
        top: scroller.scrollTop,
      });
    };

    requestAnimationFrame(() => {
      moveToFeature();
      requestAnimationFrame(moveToFeature);
    });
  };

  // 마운트 시 초기 정렬(GanttProvider)과 같은 산술 계산으로 오늘 컬럼을 뷰포트 좌측 1/3 지점에 맞춘다.
  // 마커 rect 기반 계산은 레이아웃 타이밍에 따라 0을 돌려줘 버튼이 동작하지 않는 경우가 있었다.
  const scrollToToday = () => {
    const root = panelRef.current?.querySelector<HTMLElement>('[data-roadmap-ui="gantt-root"]');
    if (!root) return;

    root.scrollTo({
      behavior: "smooth",
      left: getGanttTodayScrollLeft(root, range),
      top: root.scrollTop,
    });
  };

  const toggleCollapsed = (itemId: string) => {
    setCollapsedWbsIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getParentIdForNewTaskFromRow = (item: WbsItemResponse) => item.parentId ?? item.id;

  const getFeatureForNewTaskFromRow = (item: WbsItemResponse) =>
    featureById.get(item.id) ?? (item.parentId ? featureById.get(item.parentId) : undefined);

  const persistRange = useCallback((item: WbsItemResponse, nextRange: LocalRange) => {
    const schedule = scheduleByWbsId.get(item.id);
    const body = {
      allDay: true,
      endsAt: nextRange.endAt.toISOString(),
      startsAt: nextRange.startAt.toISOString(),
    };

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      // 서버에 없는 로컬 항목은 화면 상태로만 유지한다.
      onNotice(t("wbs.gantt.notice.rangeSaved"));
      return;
    }

    if (schedule) {
      void calendarApi
        .updateEvent(schedule.id, body)
        .then((updated) => {
          setSchedules((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
          onNotice(t("wbs.gantt.notice.rangeSaved"));
          // 서버 저장 직후 동기화가 실패했을 수 있어 디바운스 push로 구글 사본을 맞춘다.
          schedulePush();
        })
        .catch(() => onNotice(shouldUseWorkspacePreviewData() ? t("wbs.gantt.notice.rangeSaved") : t("wbs.gantt.notice.rangeServerPending")));
      return;
    }

    void calendarApi
      .createEvent({ ...body, roomId, title: item.title, wbsItemId: item.id })
      .then((created) => {
        setSchedules((current) => [...current, created]);
        onNotice(t("wbs.gantt.notice.rangeSaved"));
        schedulePush();
      })
      .catch(() => onNotice(shouldUseWorkspacePreviewData() ? t("wbs.gantt.notice.rangeSaved") : t("wbs.gantt.notice.rangeServerPending")));
  }, [onNotice, roomId, schedulePush, scheduleByWbsId, t]);

  const applyRange = useCallback((item: WbsItemResponse, startAt: Date, endAt: Date | null) => {
    const nextRange = normalizeRange(startAt, endAt);
    setLocalRanges((current) => ({ ...current, [item.id]: nextRange }));
    persistRange(item, nextRange);
  }, [persistRange]);

  useEffect(() => {
    if (!rangeEditRequest || handledRangeRequestId.current === rangeEditRequest.requestId) return;

    const item = itemById.get(rangeEditRequest.id);
    if (!item) return;

    handledRangeRequestId.current = rangeEditRequest.requestId;
    queueMicrotask(() => {
      applyRange(item, rangeEditRequest.startAt, rangeEditRequest.endAt);
    });
  }, [applyRange, itemById, rangeEditRequest]);

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    const item = itemById.get(id);
    if (!item) return;

    // 프론트 우선: 드래그가 끝나는 즉시 로컬 기간을 확정해 화면에 유지한다.
    // 서버(schedule)·구글 캘린더 저장은 persistRange에서 뒤따르며, 실패해도 로컬 값을 되돌리지 않는다.
    applyRange(item, startAt, endAt);
    onNotice(t("wbs.gantt.notice.rangeSaved"));
  };

  const createItem = (parentId: string | null, date: Date, title: string) => {
    const startAt = startOfDay(date);
    const nextRange = normalizeRange(startAt, addDays(startAt, DEFAULT_BAR_DAYS));
    const now = new Date().toISOString();
    const isGroup = parentId === null;
    const nextOrderNo = wbsItems.filter((item) => (item.parentId ?? null) === parentId).length + 1;
    localIdCounter.current += 1;
    const optimistic: WbsItemResponse = {
      createdAt: now,
      id: `${LOCAL_ID_PREFIX}${localIdCounter.current}-${now}`,
      orderNo: nextOrderNo,
      parentId,
      roomId,
      status: "TODO",
      title,
      updatedAt: now,
    };

    setLocalRanges((current) => ({ ...current, [optimistic.id]: nextRange }));
    onWbsCreated(optimistic);
    onSelectItem(optimistic.id);
    onNotice(isGroup ? t("wbs.gantt.notice.groupAdded") : t("wbs.gantt.notice.taskAdded"));

    void wbsApi
      .createItem(roomId, { orderNo: optimistic.orderNo, parentId, title: optimistic.title })
      .then((created) => {
        setLocalRanges((current) => {
          const next = { ...current };
          delete next[optimistic.id];
          next[created.id] = nextRange;
          return next;
        });
        onWbsCreated(created, optimistic.id);
        onSelectItem(created.id);
        persistRange(created, nextRange);
      })
      .catch(() => {
        if (!shouldUseWorkspacePreviewData()) {
          onNotice(t("wbs.gantt.notice.serverSavePending"));
        }
      });
  };

  const openCreateDraft = (parentId: string | null, date: Date) => {
    setCreateDraft({
      parentId,
      startAt: startOfDay(date),
      title: "",
    });
  };

  const commitCreateDraft = () => {
    if (!createDraft) return;

    const title = createDraft.title.trim();
    if (!title) {
      onNotice(t("wbs.gantt.notice.nameRequired"));
      return;
    }

    const wasParent = createDraft.parentId === null;
    const parentStartAt = createDraft.startAt;
    createItem(createDraft.parentId, createDraft.startAt, title);
    // 상위 작업은 리스트 맨 아래 추가 행에서 연달아 입력할 수 있게 입력창을 비운 채 유지한다.
    // 하위 작업은 한 번 추가하면 닫아 부모 아래로 접힌다.
    if (wasParent) {
      setCreateDraft({ parentId: null, startAt: parentStartAt, title: "" });
    } else {
      setCreateDraft(null);
    }
  };

  const handleAddChildFromRow = (item: WbsItemResponse) => {
    const parentId = getParentIdForNewTaskFromRow(item);
    if (!parentId) return;

    const feature = getFeatureForNewTaskFromRow(item);
    openCreateDraft(parentId, feature?.startAt ?? new Date());
  };

  const siblingsOf = useCallback(
    (item: WbsItemResponse) => {
      const parentKey = item.parentId && itemById.has(item.parentId) ? item.parentId : "__root__";
      return childrenByParent[parentKey] ?? [];
    },
    [childrenByParent, itemById],
  );

  const handleReorderItem = (item: WbsItemResponse, direction: -1 | 1) => {
    const siblings = siblingsOf(item);
    const index = siblings.findIndex((entry) => entry.id === item.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;

    const reordered = [...siblings];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const orderNoById = new Map(reordered.map((entry, position) => [entry.id, position + 1]));

    const previousItems = wbsItems;
    const nextItems = wbsItems.map((entry) => {
      const orderNo = orderNoById.get(entry.id);
      return orderNo !== undefined && orderNo !== entry.orderNo ? { ...entry, orderNo } : entry;
    });

    onWbsReordered?.(nextItems);

    const serverItems = reordered
      .filter((entry) => !entry.id.startsWith(LOCAL_ID_PREFIX))
      .map((entry) => ({
        orderNo: orderNoById.get(entry.id) ?? entry.orderNo,
        parentId: item.parentId ?? null,
        wbsItemId: entry.id,
      }));

    if (serverItems.length === 0) {
      onNotice(t("wbs.gantt.notice.orderSavedLocal"));
      return;
    }

    onNotice(t("wbs.gantt.notice.orderSaving"));

    void wbsApi
      .reorderItems(roomId, { items: serverItems })
      .then(() => onNotice(t("wbs.gantt.notice.orderSaved")))
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          onNotice(t("wbs.gantt.notice.orderSavedLocal"));
          return;
        }
        onWbsReordered?.(previousItems);
        onNotice(t("wbs.gantt.notice.orderServerPending"));
      });
  };

  const handleDeleteItem = async (item: WbsItemResponse) => {
    if (wbsItems.some((entry) => entry.parentId === item.id)) {
      onNotice(t("wbs.gantt.notice.groupHasTasks"));
      return;
    }

    const schedule = scheduleByWbsId.get(item.id);
    onNotice(t("wbs.gantt.notice.deleting"));

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      setLocalRanges((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      if (schedule) {
        setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
      }
      onWbsDeleted(item.id);
      onNotice(t("wbs.gantt.notice.deleted"));
      return;
    }

    let calendarDeleteFailed = false;

    if (schedule) {
      try {
        await calendarApi.deleteEvent(schedule.id);
      } catch (error) {
        calendarDeleteFailed = !(error instanceof ApiClientError && error.status === 404);
      } finally {
        setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
      }
      // 홈 일정 카드/일정 화면이 이 삭제(또는 실패 시 서버 상태)를 다시 받아가도록 알린다.
      notifyDataChanged("schedule");
    }

    try {
      await wbsApi.deleteItem(item.id);
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        onWbsDeleted(item.id);
        onNotice(t("wbs.gantt.notice.deletedLocal"));
        return;
      }
      if (schedule) {
        setSchedules((current) => {
          if (current.some((entry) => entry.id === schedule.id)) return current;
          return [...current, schedule];
        });
      }

      onNotice(t("wbs.gantt.notice.deleteFailedWbsOnly"));
      return;
    }

    setLocalRanges((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    onWbsDeleted(item.id);
    if (schedule) {
      // 기간이 있던 항목을 지웠으면 남은 미연동분도 함께 밀어 구글 사본 상태를 맞춘다.
      schedulePush();
    }
    onNotice(calendarDeleteFailed ? t("wbs.gantt.notice.deletedCalendarPending") : t("wbs.gantt.notice.deleted"));
  };

  const draftParentTitle = createDraft?.parentId ? itemById.get(createDraft.parentId)?.title ?? null : null;
  const syncState = calendarSync === "recording" && pendingSyncCount > 0 ? "pending" : calendarSync;
  const syncStateText =
    calendarSync === "checking"
      ? t("wbs.gantt.sync.checking")
      : calendarSync === "off"
        ? t("wbs.gantt.sync.off")
        : pendingSyncCount > 0
          ? t("wbs.gantt.sync.pending", { count: pendingSyncCount })
          : t("wbs.gantt.sync.recording");
  const syncDetailText =
    calendarSync === "recording" && (googleAccountEmail || roomGroupEventCount !== null)
      ? [
          googleAccountEmail,
          roomGroupEventCount !== null ? t("wbs.gantt.sync.roomGroup", { count: roomGroupEventCount }) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  const syncHintText = calendarSync === "recording" ? t("wbs.gantt.sync.titleRecording") : t("wbs.gantt.sync.titleOff");
  const roomCalendar = roomCalendarByRoom[roomId] ?? null;
  // 연동 모델을 한 줄로: 원본은 Bubli, 구글에는 사본. 룸 캘린더 이름을 알면 함께 보여준다.
  const syncModelText =
    calendarSync === "recording"
      ? roomCalendar?.needsReconsent
        ? t("wbs.gantt.sync.modelReconsent")
        : roomCalendar?.googleCalendarId
          ? t("wbs.gantt.sync.modelNamed", { name: roomCalendar.calendarName })
          : t("wbs.gantt.sync.model")
      : null;
  const lastPushTimeText =
    lastPush && syncPopoverOpenedAt !== null
      ? (() => {
          const elapsedMinutes = Math.max(0, Math.floor((syncPopoverOpenedAt - new Date(lastPush.at).getTime()) / 60_000));
          return elapsedMinutes < 1 ? t("wbs.gantt.sync.justNow") : t("wbs.gantt.sync.minutesAgo", { count: elapsedMinutes });
        })()
      : null;
  const lastPushText =
    calendarSync === "recording" && lastPush && lastPushTimeText
      ? lastPush.roomEventCount > 0
        ? t("wbs.gantt.sync.lastPushed", { count: lastPush.roomEventCount, time: lastPushTimeText })
        : t("wbs.gantt.sync.lastPushedNone", { time: lastPushTimeText })
      : null;

  // createDraft 입력 UI — 리스트 안(맨 아래 상위 추가 행 / 부모 아래 하위 추가 행)에서 재사용한다.
  const renderCreateInline = () => (
    <div className={styles.createInline} data-wbs-create-inline="true">
      <span className={styles.createInlineMeta}>
        {createDraft?.parentId
          ? draftParentTitle
            ? t("wbs.gantt.createChildUnder", { title: draftParentTitle })
            : t("wbs.gantt.createChild")
          : t("wbs.gantt.createParent")}
      </span>
      <input
        aria-label={createDraft?.parentId ? t("wbs.gantt.createChild") : t("wbs.gantt.createParent")}
        className={styles.createInlineInput}
        onBlur={() => setCreateDraft(null)}
        onChange={(event) => setCreateDraft((current) => (current ? { ...current, title: event.target.value } : current))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitCreateDraft();
          }
          if (event.key === "Escape") {
            setCreateDraft(null);
          }
        }}
        placeholder={createDraft?.parentId ? t("wbs.gantt.createChildPlaceholder") : t("wbs.gantt.createParentPlaceholder")}
        ref={createInputRef}
        type="text"
        value={createDraft?.title ?? ""}
      />
      {/* 커밋 버튼은 입력 blur보다 먼저 처리돼야 하므로 pointerDown에서 실행한다(blur 취소 방지). */}
      <button
        className={styles.createInlineButton}
        onMouseDown={(event) => {
          event.preventDefault();
          commitCreateDraft();
        }}
        type="button"
      >
        {t("wbs.gantt.createCommit")}
      </button>
      <button
        className={styles.createInlineButtonSecondary}
        onMouseDown={(event) => {
          event.preventDefault();
          setCreateDraft(null);
        }}
        type="button"
      >
        {t("wbs.gantt.createCancel")}
      </button>
    </div>
  );

  const isCreatingParent = createDraft !== null && createDraft.parentId === null;

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          {toolbarLeading}
          <div aria-label={t("wbs.gantt.rangeSwitchAria")} className={styles.rangeSwitch} role="tablist">
            {rangeOptions.map((option) => {
              const selected = range === option.key;
              return (
                <button
                  aria-selected={selected}
                  key={option.key}
                  onClick={() => setRange(option.key)}
                  role="tab"
                  type="button"
                >
                  {t(option.labelKey)}
                </button>
              );
            })}
          </div>
          <button className={styles.ghostButton} onClick={scrollToToday} type="button">
            <CalendarDays aria-hidden="true" size={14} strokeWidth={1.9} />
            {t("wbs.board.due.today")}
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          {overallProgress.total > 0 ? (
            <span
              aria-label={t("room.workBoard.progressAria")}
              className={styles.progressChip}
              title={t("room.workBoard.progressCount", {
                done: overallProgress.done,
                percent: overallProgressPercent,
                total: overallProgress.total,
              })}
            >
              <span aria-hidden="true" className={styles.progressTrack}>
                <span className={styles.progressFill} style={{ inlineSize: `${overallProgressPercent}%` }} />
              </span>
              {t("room.workBoard.progressCount", {
                done: overallProgress.done,
                percent: overallProgressPercent,
                total: overallProgress.total,
              })}
            </span>
          ) : null}
          <div className={styles.syncWrap} ref={syncWrapRef}>
            <button
              aria-expanded={isSyncPopoverOpen}
              aria-haspopup="dialog"
              aria-label={syncStateText}
              className={styles.syncTrigger}
              data-state={syncState}
              onClick={() => {
                setSyncPopoverOpenedAt(Date.now());
                setIsSyncPopoverOpen((current) => !current);
              }}
              title={syncHintText}
              type="button"
            >
              <CalendarDays aria-hidden="true" size={14} strokeWidth={1.9} />
              <span aria-hidden="true" className={styles.syncDot} />
            </button>
            <span aria-live="polite" className="sr-only">
              {syncStateText}
            </span>
            {isSyncPopoverOpen ? (
              <div aria-label={syncStateText} className={styles.syncPopover} data-state={syncState} role="dialog">
                <strong>{syncStateText}</strong>
                {syncDetailText ? <small>{syncDetailText}</small> : null}
                {syncModelText ? <small>{syncModelText}</small> : null}
                {lastPushText ? <small>{lastPushText}</small> : null}
                <p>{syncHintText}</p>
                {roomCalendar?.needsReconsent ? (
                  <p className={styles.syncReconsentNote}>{t("wbs.gantt.sync.reconsentNote")}</p>
                ) : null}
                {calendarSync === "recording" && !roomCalendar?.googleCalendarId && !roomCalendar?.needsReconsent ? (
                  <button
                    className={styles.syncConnectButton}
                    disabled={isEnsuringRoomCalendar}
                    onClick={() => void handleEnsureRoomCalendar()}
                    type="button"
                  >
                    {isEnsuringRoomCalendar
                      ? t("wbs.gantt.sync.roomCalendarChecking")
                      : t("wbs.gantt.sync.roomCalendarAction")}
                  </button>
                ) : null}
                {roomCalendar?.needsReconsent ? (
                  <button
                    className={styles.syncConnectButton}
                    disabled={isConnectingGoogle}
                    onClick={() => void handleReconnectGoogle()}
                    type="button"
                  >
                    {isConnectingGoogle ? t("wbs.gantt.sync.connecting") : t("wbs.gantt.sync.reconnect")}
                  </button>
                ) : null}
                {calendarSync === "off" ? (
                  <button
                    className={styles.syncConnectButton}
                    disabled={isConnectingGoogle}
                    onClick={() => void handleConnectGoogle()}
                    type="button"
                  >
                    {isConnectingGoogle ? t("wbs.gantt.sync.connecting") : t("wbs.gantt.sync.connect")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {toolbarTrailing}
        </div>
      </div>

      <GanttProvider className={styles.ganttSurface} range={range} zoom={100}>
        <GanttSidebar>
          <GanttSidebarGroup name="">
            {visibleItems.map((item) => {
              const feature = featureById.get(item.id);
              if (!feature) return null;
              const accent = resolveAccent(item);
              const childCount = childCountById.get(item.id) ?? 0;
              const progress = childCount > 0 ? progressById.get(item.id) ?? null : null;
              const isCollapsed = collapsedWbsIds.has(item.id);
              const siblings = siblingsOf(item);
              const siblingIndex = siblings.findIndex((entry) => entry.id === item.id);
              // 하위 추가 입력은 해당 부모(=이 행) 바로 아래에 인라인으로 붙인다.
              const showChildDraft = createDraft?.parentId === item.id;
              return (
                <div key={item.id}>
                <GanttSidebarItem
                  accentColor={accent}
                  actions={
                    <>
                      {!item.parentId ? (
                        <button
                          aria-label={t("wbs.gantt.row.addChildAria", { title: item.title })}
                          className={styles.rowActionButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAddChildFromRow(item);
                          }}
                          title={t("wbs.gantt.row.addChildTitle")}
                          type="button"
                        >
                          <Plus aria-hidden="true" size={13} strokeWidth={1.9} />
                        </button>
                      ) : null}
                      <button
                        aria-label={t("wbs.gantt.row.moveUpAria", { title: item.title })}
                        className={styles.rowActionButton}
                        disabled={siblingIndex <= 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReorderItem(item, -1);
                        }}
                        title={t("wbs.gantt.row.moveUpTitle")}
                        type="button"
                      >
                        <ArrowUp aria-hidden="true" size={13} strokeWidth={1.9} />
                      </button>
                      <button
                        aria-label={t("wbs.gantt.row.moveDownAria", { title: item.title })}
                        className={styles.rowActionButton}
                        disabled={siblingIndex < 0 || siblingIndex >= siblings.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReorderItem(item, 1);
                        }}
                        title={t("wbs.gantt.row.moveDownTitle")}
                        type="button"
                      >
                        <ArrowDown aria-hidden="true" size={13} strokeWidth={1.9} />
                      </button>
                      <button
                        aria-label={t("wbs.gantt.row.editAria", { title: item.title })}
                        className={styles.rowActionButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          openItemSettings(item);
                        }}
                        type="button"
                      >
                        <PencilIcon aria-hidden="true" size={13} strokeWidth={1.9} />
                      </button>
                      <button
                        aria-label={t("wbs.gantt.row.deleteAria", { title: item.title })}
                        className={styles.rowActionButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteItem(item);
                        }}
                        type="button"
                      >
                        <TrashIcon aria-hidden="true" size={13} strokeWidth={1.9} />
                      </button>
                    </>
                  }
                  className={selectedWbsId === item.id ? styles.selectedRow : undefined}
                  expander={
                    childCount > 0 ? (
                      <button
                        aria-expanded={!isCollapsed}
                        aria-label={
                          isCollapsed
                            ? t("wbs.gantt.row.expandSubtasks", { title: item.title })
                            : t("wbs.gantt.row.collapseSubtasks", { title: item.title })
                        }
                        className={styles.expanderButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleCollapsed(item.id);
                        }}
                        title={isCollapsed ? t("wbs.gantt.row.expandTitle") : t("wbs.gantt.row.collapseTitle")}
                        type="button"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          size={13}
                          strokeWidth={2}
                          style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 160ms ease" }}
                        />
                      </button>
                    ) : null
                  }
                  feature={feature}
                  indentLevel={depthById.get(item.id) ?? (item.parentId ? 1 : 0)}
                  onSelectItem={() => focusItemOnTimeline(item)}
                  progress={
                    progress && progress.total > 0
                      ? {
                          done: progress.done,
                          label: t("wbs.gantt.row.progressLabel", { done: progress.done, total: progress.total }),
                          total: progress.total,
                        }
                      : null
                  }
                  statusIndicator={
                    childCount === 0
                      ? {
                          label: t(wbsGanttStatusNameKeys[item.status]),
                          state: item.status === "DONE" ? "done" : item.status === "IN_PROGRESS" ? "inProgress" : "todo",
                        }
                      : null
                  }
                />
                {showChildDraft ? (
                  <div className={styles.createInlineRow} data-wbs-create-child="true">
                    {renderCreateInline()}
                  </div>
                ) : null}
                </div>
              );
            })}
            <div className={styles.addRow} data-wbs-add-row="true">
              {isCreatingParent ? (
                renderCreateInline()
              ) : (
                <button
                  className={styles.addRowButton}
                  data-empty={visibleItems.length === 0 ? "true" : undefined}
                  onClick={() => openCreateDraft(null, new Date())}
                  type="button"
                >
                  <Plus aria-hidden="true" size={15} strokeWidth={2} />
                  {t("wbs.gantt.addRowLabel")}
                </button>
              )}
            </div>
          </GanttSidebarGroup>
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            <GanttFeatureListGroup hasHeader={false}>
              {visibleItems.map((item) => {
                const feature = featureById.get(item.id);
                if (!feature) return null;
                // 일정 로드/저장으로 기간이 바뀌면 바 내부 상태를 다시 맞추기 위해 key에 기간을 포함한다.
                const featureKey = `${item.id}:${feature.startAt.getTime()}:${feature.endAt.getTime()}`;
                const barTitle = t("wbs.gantt.bar.range", {
                  end: formatBarDate(feature.endAt),
                  name: feature.name,
                  start: formatBarDate(feature.startAt),
                });
                return (
                  <div className="flex" key={item.id}>
                    <GanttFeatureItem key={featureKey} onMove={handleMoveFeature} {...feature}>
                      <p className="flex-1 truncate text-sm" title={barTitle}>
                        {feature.name}
                      </p>
                    </GanttFeatureItem>
                  </div>
                );
              })}
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
