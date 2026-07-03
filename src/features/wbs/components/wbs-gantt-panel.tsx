"use client";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { ArrowDown, ArrowUp, CalendarDays, CalendarRange, ChevronRight, FolderPlus, PencilIcon, Plus, TrashIcon } from "lucide-react";
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
  type GanttFeature,
  type Range,
} from "@/components/ui/gantt";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { GoogleCalendarConnectionResponse } from "@/types/api/calendar";
import type { ScheduleResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./wbs-gantt-panel.module.css";

const rangeOptions: Array<{ icon: typeof CalendarRange; key: Range; labelKey: MessageKey }> = [
  { icon: CalendarRange, key: "monthly", labelKey: "wbs.gantt.range.monthly" },
  { icon: CalendarRange, key: "weekly", labelKey: "wbs.gantt.range.weekly" },
  { icon: CalendarDays, key: "daily", labelKey: "wbs.gantt.range.daily" },
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
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const handledRangeRequestId = useRef<number | null>(null);
  const localIdCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;

    void calendarApi
      .getEvents({ roomId, ...scheduleRangeQuery() })
      .then((page) => {
        if (!cancelled) {
          setSchedules(page.items.filter((schedule) => schedule.wbsItemId));
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

  useEffect(() => {
    let cancelled = false;

    void calendarApi
      .getGoogleConnection()
      .then((connection: GoogleCalendarConnectionResponse | null) => {
        if (cancelled) return;
        const isActive = connection?.status === "ACTIVE";
        setCalendarSync(isActive ? "recording" : "off");
        setGoogleAccountEmail(isActive ? connection?.googleAccountEmail ?? null : null);
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

    void calendarApi
      .getGroupedEvents({ from, roomId, to })
      .then((groups) => {
        if (cancelled) return;
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

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);

    try {
      const response = await calendarApi.requestGoogleConnectUrl();
      window.location.href = response.authorizeUrl;
    } catch {
      setIsConnectingGoogle(false);
      onNotice(t("wbs.gantt.sync.connectFailed"));
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

  const orderedGroups = useMemo(() => {
    const collect = (id: string): WbsItemResponse[] =>
      (childrenByParent[id] ?? []).flatMap((child) => [child, ...collect(child.id)]);

    return (childrenByParent.__root__ ?? []).map((root) => ({
      items: [root, ...collect(root.id)],
      root,
    }));
  }, [childrenByParent]);

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

  const scrollToToday = () => {
    const root = panelRef.current?.querySelector<HTMLElement>('[data-roadmap-ui="gantt-root"]');
    const today = root?.querySelector<HTMLElement>('[data-roadmap-ui="gantt-today"]');
    if (!root || !today) return;

    const rootRect = root.getBoundingClientRect();
    const todayRect = today.getBoundingClientRect();
    const sidebarWidth = Number.parseFloat(getComputedStyle(root).getPropertyValue("--gantt-sidebar-width")) || 0;
    const viewportCenter = rootRect.left + sidebarWidth + (root.clientWidth - sidebarWidth) / 2;
    const todayCenter = todayRect.left + todayRect.width / 2;

    const maxScrollLeft = Math.max(0, root.scrollWidth - root.clientWidth);
    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, root.scrollLeft + todayCenter - viewportCenter));

    root.scrollTo({
      behavior: "smooth",
      left: nextScrollLeft,
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
        })
        .catch(() => onNotice(shouldUseWorkspacePreviewData() ? t("wbs.gantt.notice.rangeSaved") : t("wbs.gantt.notice.rangeServerPending")));
      return;
    }

    void calendarApi
      .createEvent({ ...body, roomId, title: item.title, wbsItemId: item.id })
      .then((created) => {
        setSchedules((current) => [...current, created]);
        onNotice(t("wbs.gantt.notice.rangeSaved"));
      })
      .catch(() => onNotice(shouldUseWorkspacePreviewData() ? t("wbs.gantt.notice.rangeSaved") : t("wbs.gantt.notice.rangeServerPending")));
  }, [onNotice, roomId, scheduleByWbsId, t]);

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

    onNotice(t("wbs.gantt.notice.rangeSaving"));
    applyRange(item, startAt, endAt);
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

    createItem(createDraft.parentId, createDraft.startAt, title);
    setCreateDraft(null);
  };

  const handleAddGroup = () => openCreateDraft(null, new Date());

  const getParentIdForNewTask = () => {
    if (orderedGroups.length === 0) return null;

    const item = selectedWbsId ? itemById.get(selectedWbsId) : null;

    if (!item) return null;
    return getParentIdForNewTaskFromRow(item);
  };

  const handleAddTask = () => {
    const parentId = getParentIdForNewTask();
    if (!parentId) return;

    const selectedFeature = selectedWbsId ? featureById.get(selectedWbsId) : null;
    openCreateDraft(parentId, selectedFeature?.startAt ?? new Date());
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
    onNotice(calendarDeleteFailed ? t("wbs.gantt.notice.deletedCalendarPending") : t("wbs.gantt.notice.deleted"));
  };

  const draftParentTitle = createDraft?.parentId ? itemById.get(createDraft.parentId)?.title ?? null : null;
  const selectedItemForTask = selectedWbsId ? itemById.get(selectedWbsId) ?? null : null;
  const canAddTaskToSelection = Boolean(selectedItemForTask);

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.toolbar}>
        <div aria-label={t("wbs.gantt.rangeSwitchAria")} className={styles.rangeSwitch} role="tablist">
          {rangeOptions.map((option) => {
            const Icon = option.icon;
            const selected = range === option.key;
            return (
              <button
                aria-selected={selected}
                key={option.key}
                onClick={() => setRange(option.key)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" size={13} strokeWidth={1.9} />
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        <button className={styles.toolButton} onClick={scrollToToday} type="button">
          <CalendarDays aria-hidden="true" size={13} strokeWidth={1.9} />
          {t("wbs.board.due.today")}
        </button>
        <button className={styles.toolButton} onClick={handleAddGroup} type="button">
          <FolderPlus aria-hidden="true" size={13} strokeWidth={1.9} />
          {t("wbs.gantt.addGroup")}
        </button>
        <button
          className={styles.toolButton}
          disabled={orderedGroups.length === 0 || !canAddTaskToSelection}
          onClick={handleAddTask}
          title={
            orderedGroups.length === 0
              ? t("wbs.gantt.addTaskDisabledTitle")
              : canAddTaskToSelection
                ? t("wbs.gantt.addTaskSelectedTitle")
                : t("wbs.gantt.addTaskNoSelectionTitle")
          }
          type="button"
        >
          <Plus aria-hidden="true" size={13} strokeWidth={1.9} />
          {t("wbs.gantt.addTask")}
        </button>

        <div
          aria-live="polite"
          className={styles.syncBlock}
          data-state={calendarSync === "recording" && pendingSyncCount > 0 ? "pending" : calendarSync}
          title={calendarSync === "recording" ? t("wbs.gantt.sync.titleRecording") : t("wbs.gantt.sync.titleOff")}
        >
          <span aria-hidden="true" className={styles.syncDot} />
          <span className={styles.syncCopy}>
            <strong>
              {calendarSync === "checking"
                ? t("wbs.gantt.sync.checking")
                : calendarSync === "off"
                  ? t("wbs.gantt.sync.off")
                  : pendingSyncCount > 0
                    ? t("wbs.gantt.sync.pending", { count: pendingSyncCount })
                    : t("wbs.gantt.sync.recording")}
            </strong>
            {calendarSync === "recording" && (googleAccountEmail || roomGroupEventCount !== null) ? (
              <small>
                {[
                  googleAccountEmail,
                  roomGroupEventCount !== null ? t("wbs.gantt.sync.roomGroup", { count: roomGroupEventCount }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            ) : null}
          </span>
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
      </div>

      {createDraft ? (
        <div className={styles.createInline}>
          <span className={styles.createInlineMeta}>
            {createDraft.parentId
              ? draftParentTitle
                ? t("wbs.gantt.createChildUnder", { title: draftParentTitle })
                : t("wbs.gantt.createChild")
              : t("wbs.gantt.createParent")}
          </span>
          <input
            aria-label={createDraft.parentId ? t("wbs.gantt.createChild") : t("wbs.gantt.createParent")}
            className={styles.createInlineInput}
            onChange={(event) => setCreateDraft((current) => (current ? { ...current, title: event.target.value } : current))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitCreateDraft();
              }
              if (event.key === "Escape") {
                setCreateDraft(null);
              }
            }}
            placeholder={createDraft.parentId ? t("wbs.gantt.createChildPlaceholder") : t("wbs.gantt.createParentPlaceholder")}
            ref={createInputRef}
            type="text"
            value={createDraft.title}
          />
          <button className={styles.createInlineButton} onClick={commitCreateDraft} type="button">
            {t("wbs.gantt.createCommit")}
          </button>
          <button className={styles.createInlineButtonSecondary} onClick={() => setCreateDraft(null)} type="button">
            {t("wbs.gantt.createCancel")}
          </button>
        </div>
      ) : null}

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
              return (
                <GanttSidebarItem
                  accentColor={accent}
                  actions={
                    <>
                      {childCount > 0 ? (
                        <button
                          aria-expanded={!isCollapsed}
                          aria-label={
                            isCollapsed
                              ? t("wbs.gantt.row.expandSubtasks", { title: item.title })
                              : t("wbs.gantt.row.collapseSubtasks", { title: item.title })
                          }
                          className={styles.rowActionButton}
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
                            strokeWidth={1.9}
                            style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                          />
                        </button>
                      ) : null}
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
                  feature={feature}
                  indentLevel={item.parentId ? 1 : 0}
                  key={item.id}
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
              );
            })}
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
                      <p className="flex-1 truncate text-[13px]" title={barTitle}>
                        {feature.name}
                      </p>
                    </GanttFeatureItem>
                  </div>
                );
              })}
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday className="bg-accent text-accent-foreground" />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
