"use client";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { CalendarDays, CalendarRange, Eraser, FolderPlus, Milestone, Palette, PencilIcon, Plus, TrashIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { ScheduleResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./wbs-gantt-panel.module.css";

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

const statusOptions: Array<{ label: string; status: WbsStatus }> = [
  { label: "대기", status: "TODO" },
  { label: "진행", status: "IN_PROGRESS" },
  { label: "완료", status: "DONE" },
];

const markerPalette = [
  styles.markerTodo,
  styles.markerPearl,
  styles.markerLilac,
  styles.markerRain,
  styles.markerRose,
];

const DEFAULT_BAR_DAYS = 6;
const LOCAL_ID_PREFIX = "local-wbs-";

type LocalRange = { startAt: Date; endAt: Date };

type LocalMarker = { className: string; date: Date; id: string; label: string };

type EditorState =
  | { end: string; id: string; kind: "item"; start: string; status: WbsStatus; title: string }
  | { id: string; kind: "marker"; label: string };

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

function toInputDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromInputDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
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
  onWbsUpdated,
  roomId,
  selectedWbsId,
  wbsItems,
}: {
  onNotice: (message: string) => void;
  onOpenSettings: (id: string) => void;
  onSelectItem: (id: string) => void;
  onWbsCreated: (item: WbsItemResponse, temporaryId?: string) => void;
  onWbsDeleted: (id: string) => void;
  onWbsUpdated: (item: WbsItemResponse) => void;
  roomId: string;
  selectedWbsId: string | null;
  wbsItems: WbsItemResponse[];
}) {
  const [range, setRange] = useState<Range>("monthly");
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [localRanges, setLocalRanges] = useState<Record<string, LocalRange>>({});
  const [markers, setMarkers] = useState<LocalMarker[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
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

  const orderedGroups = useMemo(() => {
    const childrenByParent = wbsItems.reduce<Record<string, WbsItemResponse[]>>((acc, item) => {
      const key = item.parentId && itemById.has(item.parentId) ? item.parentId : "__root__";
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
  }, [itemById, wbsItems]);

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

  const rootIdOf = (id: string) => {
    let current = itemById.get(id);
    const seen = new Set<string>();
    while (current?.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = itemById.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current?.id ?? id;
  };

  const openItemEditor = (item: WbsItemResponse) => {
    const feature = featureById.get(item.id);
    const resolved = feature ?? { endAt: new Date(), startAt: new Date() };
    onSelectItem(item.id);
    setEditor({
      end: toInputDate(resolved.endAt),
      id: item.id,
      kind: "item",
      start: toInputDate(resolved.startAt),
      status: item.status,
      title: item.title,
    });
  };

  const persistRange = (item: WbsItemResponse, nextRange: LocalRange) => {
    const schedule = scheduleByWbsId.get(item.id);
    const body = {
      allDay: true,
      endsAt: nextRange.endAt.toISOString(),
      startsAt: nextRange.startAt.toISOString(),
    };

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      // 서버에 없는 로컬 항목은 화면 상태로만 유지한다.
      onNotice("기간 저장됨 (로컬)");
      return;
    }

    if (schedule) {
      void calendarApi
        .updateEvent(schedule.id, body)
        .then((updated) => {
          setSchedules((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
          onNotice("기간 저장됨");
        })
        .catch(() => onNotice(shouldUseWorkspacePreviewData() ? "기간 저장됨 (로컬)" : "기간 서버 저장 대기"));
      return;
    }

    void calendarApi
      .createEvent({ ...body, roomId, title: item.title, wbsItemId: item.id })
      .then((created) => {
        setSchedules((current) => [...current, created]);
        onNotice("기간 저장됨");
      })
      .catch(() => onNotice(shouldUseWorkspacePreviewData() ? "기간 저장됨 (로컬)" : "기간 서버 저장 대기"));
  };

  const applyRange = (item: WbsItemResponse, startAt: Date, endAt: Date | null) => {
    const nextRange = normalizeRange(startAt, endAt);
    setLocalRanges((current) => ({ ...current, [item.id]: nextRange }));
    persistRange(item, nextRange);
  };

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    const item = itemById.get(id);
    if (!item) return;

    onNotice("기간 저장 중");
    applyRange(item, startAt, endAt);
  };

  const createItem = (parentId: string | null, date: Date) => {
    const startAt = startOfDay(date);
    const nextRange = normalizeRange(startAt, addDays(startAt, DEFAULT_BAR_DAYS));
    const now = new Date().toISOString();
    const isGroup = parentId === null;
    localIdCounter.current += 1;
    const optimistic: WbsItemResponse = {
      createdAt: now,
      id: `${LOCAL_ID_PREFIX}${localIdCounter.current}-${now}`,
      orderNo: wbsItems.length + 1,
      parentId,
      roomId,
      status: "TODO",
      title: isGroup ? "새 그룹" : "새 작업",
      updatedAt: now,
    };

    setLocalRanges((current) => ({ ...current, [optimistic.id]: nextRange }));
    onWbsCreated(optimistic);
    setEditor({
      end: toInputDate(nextRange.endAt),
      id: optimistic.id,
      kind: "item",
      start: toInputDate(nextRange.startAt),
      status: "TODO",
      title: optimistic.title,
    });
    onSelectItem(optimistic.id);
    onNotice(isGroup ? "그룹 추가됨 — 이름을 입력하세요" : "작업 추가됨 — 이름을 입력하세요");

    void wbsApi
      .createItem(roomId, { orderNo: optimistic.orderNo, parentId, title: optimistic.title })
      .then((created) => {
        setLocalRanges((current) => {
          const next = { ...current };
          delete next[optimistic.id];
          next[created.id] = nextRange;
          return next;
        });
        setEditor((current) => (current?.kind === "item" && current.id === optimistic.id ? { ...current, id: created.id } : current));
        onWbsCreated(created, optimistic.id);
        persistRange(created, nextRange);
      })
      .catch(() => {
        if (!shouldUseWorkspacePreviewData()) {
          onNotice("서버 저장 대기 — 화면에는 유지됩니다");
        }
      });
  };

  const handleAddGroup = () => createItem(null, new Date());

  const handleAddTask = () => {
    const parentId = selectedWbsId && itemById.has(selectedWbsId) ? rootIdOf(selectedWbsId) : orderedGroups[0]?.root.id ?? null;
    createItem(parentId, new Date());
  };

  // 타임라인 빈 줄 호버 + 버튼: 클릭한 날짜에 작업을 추가한다.
  const handleAddItemAtDate = (date: Date) => {
    const parentId = selectedWbsId && itemById.has(selectedWbsId) ? rootIdOf(selectedWbsId) : orderedGroups[0]?.root.id ?? null;
    createItem(parentId, date);
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
        if (shouldUseWorkspacePreviewData()) {
          onNotice("기간 초기화됨 (로컬)");
          return;
        }
        setSchedules((current) => [...current, schedule]);
        onNotice("기간 서버 저장 대기");
      });
  };

  const handleDeleteItem = (item: WbsItemResponse) => {
    if (wbsItems.some((entry) => entry.parentId === item.id)) {
      onNotice("그룹에 작업이 남아 있습니다 — 작업을 먼저 삭제하세요");
      return;
    }

    const schedule = scheduleByWbsId.get(item.id);
    setEditor((current) => (current?.kind === "item" && current.id === item.id ? null : current));
    onWbsDeleted(item.id);
    onNotice("삭제 중");

    if (schedule) {
      setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
      void calendarApi.deleteEvent(schedule.id).catch(() => {
        // 일정 삭제 실패는 무시한다. WBS 삭제 결과를 우선한다.
      });
    }

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      onNotice("삭제됨");
      return;
    }

    void wbsApi
      .deleteItem(item.id)
      .then(() => onNotice("삭제됨"))
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          onNotice("삭제됨 (로컬)");
          return;
        }
        onWbsCreated(item);
        onNotice("삭제 실패 — 항목을 되돌렸습니다");
      });
  };

  const handleEditorSave = () => {
    if (!editor) return;

    if (editor.kind === "marker") {
      const label = editor.label.trim();
      if (label) {
        setMarkers((current) => current.map((marker) => (marker.id === editor.id ? { ...marker, label } : marker)));
      }
      setEditor(null);
      onNotice("마일스톤 이름 저장됨");
      return;
    }

    const item = itemById.get(editor.id);
    if (!item) {
      setEditor(null);
      return;
    }

    const title = editor.title.trim() || item.title;
    const status = editor.status;
    const start = fromInputDate(editor.start);
    const end = fromInputDate(editor.end);

    if (start) {
      applyRange(item, start, end);
    }

    const patched: WbsItemResponse = { ...item, status, title, updatedAt: new Date().toISOString() };
    onWbsUpdated(patched);
    setEditor(null);
    onNotice("저장 중");

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      onNotice("저장됨 (로컬)");
      return;
    }

    void wbsApi
      .updateItem(item.id, { status, title })
      .then((updated) => {
        onWbsUpdated(updated);
        onNotice("저장됨");
      })
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          onNotice("저장됨 (로컬)");
          return;
        }
        onWbsUpdated(item);
        onNotice("저장 실패 — 이전 값으로 되돌렸습니다");
      });
  };

  const handleCreateMarker = (date: Date) => {
    const marker: LocalMarker = {
      className: markerPalette[markers.length % markerPalette.length],
      date,
      id: `marker-${markers.length + 1}-${date.getTime()}`,
      label: `마일스톤 ${markers.length + 1}`,
    };
    setMarkers((current) => [...current, marker]);
    setEditor({ id: marker.id, kind: "marker", label: marker.label });
    onNotice("마일스톤 추가됨 — 이름을 입력하세요");
  };

  const handleRenameMarker = (id: string) => {
    const marker = markers.find((entry) => entry.id === id);
    if (marker) {
      setEditor({ id: marker.id, kind: "marker", label: marker.label });
    }
  };

  const handleRemoveMarker = (id: string) => {
    setEditor((current) => (current?.kind === "marker" && current.id === id ? null : current));
    setMarkers((current) => current.filter((marker) => marker.id !== id));
  };

  const editingItem = editor?.kind === "item" ? itemById.get(editor.id) : undefined;
  const editingIsGroup = editingItem ? editingItem.parentId === null : false;

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
          그룹 추가
        </button>
        <button
          className={styles.toolButton}
          disabled={orderedGroups.length === 0}
          onClick={handleAddTask}
          title={orderedGroups.length === 0 ? "먼저 그룹을 추가하세요" : "선택한 그룹에 작업을 추가합니다"}
          type="button"
        >
          <Plus aria-hidden="true" size={13} strokeWidth={2.1} />
          작업 추가
        </button>

        <p className={styles.hint}>바 클릭 = 편집 · 바 드래그 = 이동 · 바 양끝 = 기간 조절 · 타임라인 위쪽 + = 마일스톤(기준선)</p>
      </div>

      {editor ? (
        <div className={styles.editor}>
          {editor.kind === "marker" ? (
            <>
              <label className={styles.field}>
                마일스톤 이름
                <input
                  onChange={(event) => setEditor({ ...editor, label: event.target.value })}
                  onKeyDown={(event) => event.key === "Enter" && handleEditorSave()}
                  value={editor.label}
                />
              </label>
              <p className={styles.editorNote}>마일스톤은 이 화면에서만 보이는 날짜 기준선입니다.</p>
            </>
          ) : (
            <>
              <label className={styles.field}>
                {editingIsGroup ? "그룹 이름" : "작업 이름"}
                <input
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  onKeyDown={(event) => event.key === "Enter" && handleEditorSave()}
                  value={editor.title}
                />
              </label>
              <div className={styles.field}>
                상태
                <div className={styles.statusRow}>
                  {statusOptions.map((option) => (
                    <button
                      aria-pressed={editor.status === option.status}
                      key={option.status}
                      onClick={() => setEditor({ ...editor, status: option.status })}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className={styles.field}>
                시작일
                <input
                  onChange={(event) => setEditor({ ...editor, start: event.target.value })}
                  type="date"
                  value={editor.start}
                />
              </label>
              <label className={styles.field}>
                종료일
                <input
                  onChange={(event) => setEditor({ ...editor, end: event.target.value })}
                  type="date"
                  value={editor.end}
                />
              </label>
            </>
          )}

          <div className={styles.editorActions}>
            <button className={styles.primaryAction} onClick={handleEditorSave} type="button">
              저장
            </button>
            {editor.kind === "item" && editingItem ? (
              <button className={styles.dangerAction} onClick={() => handleDeleteItem(editingItem)} type="button">
                삭제
              </button>
            ) : null}
            <button aria-label="편집 닫기" className={styles.closeButton} onClick={() => setEditor(null)} type="button">
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ) : null}

      <GanttProvider
        className="h-[500px] rounded-xl border border-border/50"
        onAddItem={handleAddItemAtDate}
        range={range}
        zoom={100}
      >
        <GanttSidebar>
          {orderedGroups.map((group) => (
            <GanttSidebarGroup key={group.root.id} name={group.root.title}>
              {group.items.map((item) => {
                const feature = featureById.get(item.id);
                if (!feature) return null;
                return (
                  <GanttSidebarItem
                    className={selectedWbsId === item.id ? "bg-secondary" : undefined}
                    feature={feature}
                    key={item.id}
                    onSelectItem={() => openItemEditor(item)}
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
                  // 일정 로드/저장으로 기간이 바뀌면 바 내부 상태를 다시 맞추기 위해 key에 기간을 포함한다.
                  const featureKey = `${item.id}:${feature.startAt.getTime()}:${feature.endAt.getTime()}`;
                  return (
                    <div className="flex" key={item.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <button
                            aria-label={`${item.title} 편집`}
                            className="block w-full text-left"
                            onClick={() => openItemEditor(item)}
                            type="button"
                          >
                            <GanttFeatureItem key={featureKey} onMove={handleMoveFeature} {...feature} />
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => openItemEditor(item)}
                          >
                            <PencilIcon className="text-muted-foreground" size={16} />
                            편집
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => onOpenSettings(item.id)}
                          >
                            <Palette className="text-muted-foreground" size={16} />
                            색상·연결 할 일
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleClearSchedule(item)}
                          >
                            <Eraser className="text-muted-foreground" size={16} />
                            기간 초기화
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2 text-destructive"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <TrashIcon size={16} />
                            삭제
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
            <GanttMarker key={marker.id} {...marker} onRemove={handleRemoveMarker} onRename={handleRenameMarker} />
          ))}
          <GanttToday className="bg-accent text-accent-foreground" />
          <GanttCreateMarkerTrigger onCreateMarker={handleCreateMarker} />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
