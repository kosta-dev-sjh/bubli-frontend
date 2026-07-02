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
  type GanttStatus,
  type Range,
} from "@/components/ui/gantt";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { ScheduleResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./wbs-gantt-panel.module.css";

const rangeOptions: Array<{ icon: typeof CalendarRange; key: Range; label: string }> = [
  { icon: CalendarRange, key: "monthly", label: "월" },
  { icon: CalendarRange, key: "weekly", label: "주" },
  { icon: CalendarDays, key: "daily", label: "일" },
];

const wbsGanttStatuses: Record<WbsStatus, GanttStatus> = {
  DONE: { color: "var(--signal-ok)", id: "DONE", name: "완료" },
  IN_PROGRESS: { color: "var(--signal-todo)", id: "IN_PROGRESS", name: "진행" },
  TODO: { color: "var(--ink-faint)", id: "TODO", name: "대기" },
};

const DEFAULT_BAR_DAYS = 6;
const LOCAL_ID_PREFIX = "local-wbs-";

type LocalRange = { startAt: Date; endAt: Date };

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
  onSelectItem,
  onWbsCreated,
  onWbsDeleted,
  roomId,
  selectedWbsId,
  wbsAccentById,
  wbsItems,
}: {
  onNotice: (message: string) => void;
  onOpenSettings: (id: string) => void;
  onSelectItem: (id: string) => void;
  onWbsCreated: (item: WbsItemResponse, temporaryId?: string) => void;
  onWbsDeleted: (id: string) => void;
  roomId: string;
  selectedWbsId: string | null;
  wbsAccentById?: Record<string, string>;
  wbsItems: WbsItemResponse[];
}) {
  const [range, setRange] = useState<Range>("monthly");
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [localRanges, setLocalRanges] = useState<Record<string, LocalRange>>({});
  const [collapsedWbsIds, setCollapsedWbsIds] = useState<Set<string>>(() => new Set());
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
    return wbsGanttStatuses[item.status].color;
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
        status: { ...wbsGanttStatuses[item.status], color: resolveAccent(item) },
      });
    }
    return map;
  }, [localRanges, resolveAccent, scheduleByWbsId, wbsItems]);

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
      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
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

  const persistRange = (item: WbsItemResponse, nextRange: LocalRange) => {
    const schedule = scheduleByWbsId.get(item.id);
    const body = {
      allDay: true,
      endsAt: nextRange.endAt.toISOString(),
      startsAt: nextRange.startAt.toISOString(),
    };

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      // 서버에 없는 로컬 항목은 화면 상태로만 유지한다.
      onNotice("기간 반영됨");
      return;
    }

    if (schedule) {
      void calendarApi
        .updateEvent(schedule.id, body)
        .then((updated) => {
          setSchedules((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
          onNotice("기간 반영됨");
        })
        .catch(() => onNotice(shouldUseWorkspacePreviewData() ? "기간 반영됨" : "기간 반영 대기"));
      return;
    }

    void calendarApi
      .createEvent({ ...body, roomId, title: item.title, wbsItemId: item.id })
      .then((created) => {
        setSchedules((current) => [...current, created]);
        onNotice("기간 반영됨");
      })
      .catch(() => onNotice(shouldUseWorkspacePreviewData() ? "기간 반영됨" : "기간 반영 대기"));
  };

  const applyRange = (item: WbsItemResponse, startAt: Date, endAt: Date | null) => {
    const nextRange = normalizeRange(startAt, endAt);
    setLocalRanges((current) => ({ ...current, [item.id]: nextRange }));
    persistRange(item, nextRange);
  };

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    const item = itemById.get(id);
    if (!item) return;

    onNotice("기간 반영 중");
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
      title: isGroup ? "새 상위 작업" : "새 작업",
      updatedAt: now,
    };

    setLocalRanges((current) => ({ ...current, [optimistic.id]: nextRange }));
    onWbsCreated(optimistic);
    onSelectItem(optimistic.id);
    onNotice(isGroup ? "상위 작업 추가됨" : "작업 추가됨");

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
          onNotice("서버 저장 대기 — 화면에는 유지됩니다");
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
      onNotice("하위 작업이 남아 있습니다 — 작업을 먼저 삭제하세요");
      return;
    }

    const schedule = scheduleByWbsId.get(item.id);
    onNotice("삭제 중");

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
      onNotice("삭제됨");
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
      onNotice("삭제됨");
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        if (schedule) {
          setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
        }
        onWbsDeleted(item.id);
        onNotice("삭제됨 (로컬)");
        return;
      }
      onNotice("삭제 실패 — 일정과 WBS가 서버에 남아 있습니다");
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div aria-label="간트 기간 단위 전환" className={styles.rangeSwitch} role="tablist">
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
                {option.label}
              </button>
            );
          })}
        </div>

        <button className={styles.toolButton} onClick={handleAddGroup} type="button">
          <FolderPlus aria-hidden="true" size={13} strokeWidth={2.1} />
          상위 작업 추가
        </button>
        <button
          className={styles.toolButton}
          disabled={orderedGroups.length === 0 || !selectedWbsId}
          onClick={handleAddTask}
          title={
            orderedGroups.length === 0
              ? "먼저 상위 작업을 추가하세요"
              : selectedWbsId
                ? "선택한 줄 아래에 하위 작업을 추가합니다"
                : "왼쪽 목록에서 작업 줄을 선택하세요"
          }
          type="button"
        >
          <Plus aria-hidden="true" size={13} strokeWidth={2.1} />
          선택 줄 하위 추가
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
                          aria-label={`${item.title} 하위 작업 ${isCollapsed ? "펼치기" : "접기"}`}
                          className={styles.rowActionButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleCollapsed(item.id);
                          }}
                          title={isCollapsed ? "하위 작업 펼치기" : "하위 작업 접기"}
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
                        aria-label={`${parentTitle} 아래 하위 작업 추가`}
                        className={styles.rowActionButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddChildFromRow(item);
                        }}
                        title="하위 작업 추가"
                        type="button"
                      >
                        <Plus aria-hidden="true" size={13} strokeWidth={2.2} />
                      </button>
                      <button
                        aria-label={`${item.title} 수정`}
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
                        aria-label={`${item.title} 삭제`}
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
                  kindLabel={item.parentId ? "하위" : "상위"}
                  onSelectItem={() => focusItemOnTimeline(item)}
                  parentLabel={parentItem ? `상위: ${parentItem.title}` : null}
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
