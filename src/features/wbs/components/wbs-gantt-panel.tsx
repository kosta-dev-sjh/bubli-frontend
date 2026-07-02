"use client";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { CalendarDays, CalendarRange, Eraser, EyeIcon, Milestone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  GanttCreateMarkerTrigger,
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttMarker,
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
import type { ScheduleResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

const rangeOptions: Array<{ icon: typeof Milestone; key: Range; label: string }> = [
  { icon: Milestone, key: "monthly", label: "월" },
  { icon: CalendarRange, key: "weekly", label: "주" },
  { icon: CalendarDays, key: "daily", label: "일" },
];

const wbsGanttStatuses: Record<WbsStatus, GanttStatus> = {
  DONE: { color: "var(--signal-ok)", id: "DONE", name: "완료" },
  IN_PROGRESS: { color: "var(--signal-todo)", id: "IN_PROGRESS", name: "진행" },
  TODO: { color: "var(--ink-faint)", id: "TODO", name: "대기" },
};

const DEFAULT_BAR_DAYS = 6;
const DEFAULT_NEW_ITEM_TITLE = "새 작업";

type LocalRange = { startAt: Date; endAt: Date };

type LocalMarker = { date: Date; id: string; label: string };

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
  onSelectItem,
  onWbsCreated,
  roomId,
  selectedWbsId,
  wbsItems,
}: {
  onNotice: (message: string) => void;
  onSelectItem: (id: string) => void;
  onWbsCreated: (item: WbsItemResponse, temporaryId?: string) => void;
  roomId: string;
  selectedWbsId: string | null;
  wbsItems: WbsItemResponse[];
}) {
  const [range, setRange] = useState<Range>("monthly");
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [localRanges, setLocalRanges] = useState<Record<string, LocalRange>>({});
  const [markers, setMarkers] = useState<LocalMarker[]>([]);

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

  const orderedGroups = useMemo(() => {
    const childrenByParent = wbsItems.reduce<Record<string, WbsItemResponse[]>>((acc, item) => {
      const key = item.parentId ?? "__root__";
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});

    Object.values(childrenByParent).forEach((items) => {
      items.sort((a, b) => a.orderNo - b.orderNo || a.createdAt.localeCompare(b.createdAt));
    });

    const collect = (id: string): WbsItemResponse[] =>
      (childrenByParent[id] ?? []).flatMap((child) => [child, ...collect(child.id)]);

    return (childrenByParent.__root__ ?? []).map((root) => ({
      items: [root, ...collect(root.id)],
      root,
    }));
  }, [wbsItems]);

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
        status: wbsGanttStatuses[item.status],
      });
    }
    return map;
  }, [localRanges, scheduleByWbsId, wbsItems]);

  const persistRange = (item: WbsItemResponse, nextRange: LocalRange) => {
    const schedule = scheduleByWbsId.get(item.id);
    const body = {
      allDay: true,
      endsAt: nextRange.endAt.toISOString(),
      startsAt: nextRange.startAt.toISOString(),
    };

    if (schedule) {
      void calendarApi
        .updateEvent(schedule.id, body)
        .then((updated) => {
          setSchedules((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
          onNotice("기간 저장됨");
        })
        .catch(() => onNotice("기간 서버 저장 대기"));
      return;
    }

    void calendarApi
      .createEvent({ ...body, roomId, title: item.title, wbsItemId: item.id })
      .then((created) => {
        setSchedules((current) => [...current, created]);
        onNotice("기간 저장됨");
      })
      .catch(() => onNotice("기간 서버 저장 대기"));
  };

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    const item = wbsItems.find((entry) => entry.id === id);
    if (!item) return;

    const nextRange = normalizeRange(startAt, endAt);
    setLocalRanges((current) => ({ ...current, [id]: nextRange }));
    onNotice("기간 저장 중");
    persistRange(item, nextRange);
  };

  const handleAddItem = (date: Date) => {
    const startAt = startOfDay(date);
    const nextRange = normalizeRange(startAt, addDays(startAt, DEFAULT_BAR_DAYS));
    const now = new Date().toISOString();
    const optimistic: WbsItemResponse = {
      createdAt: now,
      id: `local-wbs-${Date.now()}`,
      orderNo: wbsItems.length + 1,
      parentId: null,
      roomId,
      status: "TODO",
      title: DEFAULT_NEW_ITEM_TITLE,
      updatedAt: now,
    };

    setLocalRanges((current) => ({ ...current, [optimistic.id]: nextRange }));
    onWbsCreated(optimistic);
    onSelectItem(optimistic.id);
    onNotice("작업 추가 중");

    void wbsApi
      .createItem(roomId, { orderNo: optimistic.orderNo, title: optimistic.title })
      .then((created) => {
        setLocalRanges((current) => {
          const next = { ...current };
          delete next[optimistic.id];
          next[created.id] = nextRange;
          return next;
        });
        onWbsCreated(created, optimistic.id);
        onNotice("작업 추가됨");
        persistRange(created, nextRange);
      })
      .catch(() => {
        onSelectItem(optimistic.id);
        onNotice("작업 서버 저장 대기");
      });
  };

  const handleClearSchedule = (item: WbsItemResponse) => {
    const schedule = scheduleByWbsId.get(item.id);

    setLocalRanges((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });

    if (!schedule) return;

    setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
    onNotice("기간 초기화 중");

    void calendarApi
      .deleteEvent(schedule.id)
      .then(() => onNotice("기간 초기화됨"))
      .catch(() => {
        setSchedules((current) => [...current, schedule]);
        onNotice("기간 서버 저장 대기");
      });
  };

  const handleCreateMarker = (date: Date) => {
    setMarkers((current) => [
      ...current,
      { date, id: `marker-${Date.now()}`, label: `마일스톤 ${current.length + 1}` },
    ]);
  };

  const handleRemoveMarker = (id: string) => {
    setMarkers((current) => current.filter((marker) => marker.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div
        aria-label="간트 기간 단위 전환"
        className="flex w-max items-center gap-1 rounded-full border border-border/50 bg-background/90 p-1"
        role="tablist"
      >
        {rangeOptions.map((option) => {
          const Icon = option.icon;
          const selected = range === option.key;
          return (
            <button
              aria-selected={selected}
              className={
                selected
                  ? "flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-foreground text-xs font-semibold"
                  : "flex items-center gap-1 rounded-full px-3 py-1.5 text-muted-foreground text-xs font-medium"
              }
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

      <div className="min-h-0 flex-1" style={{ height: "clamp(360px, 52dvh, 460px)" }}>
        <GanttProvider className="border border-border/50" onAddItem={handleAddItem} range={range} zoom={100}>
          <GanttSidebar>
            {orderedGroups.map((group) => (
              <GanttSidebarGroup key={group.root.id} name="상위 작업">
                {group.items.map((item) => {
                  const feature = featureById.get(item.id);
                  if (!feature) return null;
                  return (
                    <GanttSidebarItem
                      className={selectedWbsId === item.id ? "bg-secondary" : undefined}
                      feature={feature}
                      key={item.id}
                      onSelectItem={onSelectItem}
                    />
                  );
                })}
              </GanttSidebarGroup>
            ))}
          </GanttSidebar>
          <GanttTimeline>
            <GanttHeader />
            <GanttFeatureList>
              {orderedGroups.map((group) => (
                <GanttFeatureListGroup key={group.root.id}>
                  {group.items.map((item) => {
                    const feature = featureById.get(item.id);
                    if (!feature) return null;
                    return (
                      <div className="flex" key={item.id}>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <button
                              aria-label={`${item.title} 설정 열기`}
                              className="block w-full text-left"
                              onClick={() => onSelectItem(item.id)}
                              type="button"
                            >
                              <GanttFeatureItem onMove={handleMoveFeature} {...feature} />
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              className="flex items-center gap-2"
                              onClick={() => onSelectItem(item.id)}
                            >
                              <EyeIcon className="text-muted-foreground" size={16} />
                              상세 보기
                            </ContextMenuItem>
                            <ContextMenuItem
                              className="flex items-center gap-2 text-destructive"
                              onClick={() => handleClearSchedule(item)}
                            >
                              <Eraser size={16} />
                              기간 초기화
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </div>
                    );
                  })}
                </GanttFeatureListGroup>
              ))}
            </GanttFeatureList>
            {markers.map((marker) => (
              <GanttMarker key={marker.id} {...marker} onRemove={handleRemoveMarker} />
            ))}
            <GanttToday />
            <GanttCreateMarkerTrigger onCreateMarker={handleCreateMarker} />
          </GanttTimeline>
        </GanttProvider>
      </div>
    </div>
  );
}
