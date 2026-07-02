"use client";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { CalendarDays, CalendarRange, ChevronRight, FolderPlus, PencilIcon, Plus, TrashIcon } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
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
    requestAnimationFrame(() => {
      const escapedId =
        typeof CSS !== "undefined" && CSS.escape ? CSS.escape(item.id) : item.id.replace(/["\\]/g, "\\$&");
      const element = document.querySelector<HTMLElement>(`[data-gantt-feature-id="${escapedId}"]`);
      const scroller = element?.closest<HTMLElement>('[data-roadmap-ui="gantt-root"]');
      if (!element || !scroller) return;

      const elementRect = element.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const sidebarWidth =
        Number.parseFloat(getComputedStyle(scroller).getPropertyValue("--gantt-sidebar-width")) || 0;
      const viewportCenter = scrollerRect.left + sidebarWidth + (scroller.clientWidth - sidebarWidth) / 2;
      const elementCenter = elementRect.left + elementRect.width / 2;

      scroller.scrollTo({
        behavior: "smooth",
        left: Math.max(0, scroller.scrollLeft + elementCenter - viewportCenter),
      });
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

  const getParentIdForChild = (item: WbsItemResponse) => item.parentId ?? item.id;

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

  const createItem = (parentId: string | null, date: Date) => {
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
      title: isGroup ? t("wbs.gantt.newGroup") : t("wbs.gantt.newTask"),
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

  const handleAddGroup = () => createItem(null, new Date());

  const getParentIdForNewTask = () => {
    if (orderedGroups.length === 0) return null;

    const item = selectedWbsId ? itemById.get(selectedWbsId) : null;

    if (!item) return orderedGroups[0]?.root.id ?? null;
    return getParentIdForChild(item);
  };

  const handleAddTask = () => {
    const parentId = getParentIdForNewTask();
    const selectedFeature = selectedWbsId ? featureById.get(selectedWbsId) : null;
    createItem(parentId, selectedFeature?.startAt ?? new Date());
  };

  const handleAddChildFromRow = (item: WbsItemResponse) => {
    const parentId = getParentIdForChild(item);
    const feature = featureById.get(parentId) ?? featureById.get(item.id);
    createItem(parentId, feature?.startAt ?? new Date());
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

    try {
      if (schedule) {
        await calendarApi.deleteEvent(schedule.id);
        setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
      }

      await wbsApi.deleteItem(item.id);
      setLocalRanges((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      onWbsDeleted(item.id);
      onNotice(t("wbs.gantt.notice.deleted"));
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        if (schedule) {
          setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
        }
        onWbsDeleted(item.id);
        onNotice(t("wbs.gantt.notice.deletedLocal"));
        return;
      }
      onNotice(t("wbs.gantt.notice.deleteFailed"));
    }
  };

  return (
    <div className={styles.panel}>
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
                <Icon aria-hidden="true" size={13} strokeWidth={2.1} />
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        <button className={styles.toolButton} onClick={handleAddGroup} type="button">
          <FolderPlus aria-hidden="true" size={13} strokeWidth={2.1} />
          {t("wbs.gantt.addGroup")}
        </button>
        <button
          className={styles.toolButton}
          disabled={orderedGroups.length === 0 || !selectedWbsId}
          onClick={handleAddTask}
          title={
            orderedGroups.length === 0
              ? t("wbs.gantt.addTaskDisabledTitle")
              : selectedWbsId
                ? t("wbs.gantt.addTaskSelectedTitle")
                : t("wbs.gantt.addTaskNoSelectionTitle")
          }
          type="button"
        >
          <Plus aria-hidden="true" size={13} strokeWidth={2.1} />
          {t("wbs.gantt.addTask")}
        </button>
      </div>

      <GanttProvider className={styles.ganttSurface} range={range} zoom={100}>
        <GanttSidebar>
          <GanttSidebarGroup name="">
            {visibleItems.map((item) => {
              const feature = featureById.get(item.id);
              if (!feature) return null;
              const parentItem = item.parentId ? itemById.get(item.parentId) : null;
              const parentIdForChild = getParentIdForChild(item);
              const parentTitle = itemById.get(parentIdForChild)?.title ?? item.title;
              const accent = resolveAccent(item);
              const childCount = childCountById.get(item.id) ?? 0;
              const isCollapsed = collapsedWbsIds.has(item.id);
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
                            strokeWidth={2.2}
                            style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                          />
                        </button>
                      ) : null}
                      <button
                        aria-label={t("wbs.gantt.row.addChildAria", { title: parentTitle })}
                        className={styles.rowActionButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddChildFromRow(item);
                        }}
                        title={t("wbs.gantt.row.addChildTitle")}
                        type="button"
                      >
                        <Plus aria-hidden="true" size={13} strokeWidth={2.2} />
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
                        <PencilIcon aria-hidden="true" size={13} strokeWidth={2.2} />
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
                        <TrashIcon aria-hidden="true" size={13} strokeWidth={2.2} />
                      </button>
                    </>
                  }
                  className={selectedWbsId === item.id ? styles.selectedRow : undefined}
                  feature={feature}
                  indentLevel={item.parentId ? 1 : 0}
                  key={item.id}
                  kindLabel={item.parentId ? t("wbs.gantt.row.kindChild") : t("wbs.gantt.row.kindParent")}
                  onSelectItem={() => focusItemOnTimeline(item)}
                  parentLabel={parentItem ? t("wbs.gantt.row.parentPrefix", { title: parentItem.title }) : null}
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
                return (
                  <div className="flex" key={item.id}>
                    <GanttFeatureItem key={featureKey} onMove={handleMoveFeature} {...feature} />
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
