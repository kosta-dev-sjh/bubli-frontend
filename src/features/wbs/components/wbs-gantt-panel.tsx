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
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { ScheduleResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./wbs-gantt-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const rangeOptions: Array<{ icon: typeof Milestone; key: Range; labelKey: MessageKey }> = [
  { icon: Milestone, key: "monthly", labelKey: "wbs.gantt.range.monthly" },
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

const statusOptions: Array<{ labelKey: MessageKey; status: WbsStatus }> = [
  { labelKey: "wbs.gantt.status.todo", status: "TODO" },
  { labelKey: "wbs.gantt.status.inProgress", status: "IN_PROGRESS" },
  { labelKey: "wbs.gantt.status.done", status: "DONE" },
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
  const { t } = useI18n();
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
        status: {
          color: wbsGanttStatusColors[item.status],
          id: item.status,
          name: t(wbsGanttStatusNameKeys[item.status]),
        },
      });
    }
    return map;
  }, [localRanges, scheduleByWbsId, t, wbsItems]);

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
      onNotice(t("wbs.gantt.notice.rangeSavedLocal"));
      return;
    }

    if (schedule) {
      void calendarApi
        .updateEvent(schedule.id, body)
        .then((updated) => {
          setSchedules((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
          onNotice(t("wbs.gantt.notice.rangeSaved"));
        })
        .catch(() => onNotice(shouldUseWorkspacePreviewData() ? t("wbs.gantt.notice.rangeSavedLocal") : t("wbs.gantt.notice.rangeServerPending")));
      return;
    }

    void calendarApi
      .createEvent({ ...body, roomId, title: item.title, wbsItemId: item.id })
      .then((created) => {
        setSchedules((current) => [...current, created]);
        onNotice(t("wbs.gantt.notice.rangeSaved"));
      })
      .catch(() => onNotice(shouldUseWorkspacePreviewData() ? t("wbs.gantt.notice.rangeSavedLocal") : t("wbs.gantt.notice.rangeServerPending")));
  };

  const applyRange = (item: WbsItemResponse, startAt: Date, endAt: Date | null) => {
    const nextRange = normalizeRange(startAt, endAt);
    setLocalRanges((current) => ({ ...current, [item.id]: nextRange }));
    persistRange(item, nextRange);
  };

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
    localIdCounter.current += 1;
    const optimistic: WbsItemResponse = {
      createdAt: now,
      id: `${LOCAL_ID_PREFIX}${localIdCounter.current}-${now}`,
      orderNo: wbsItems.length + 1,
      parentId,
      roomId,
      status: "TODO",
      title: isGroup ? t("wbs.gantt.newGroup") : t("wbs.gantt.newTask"),
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
        setEditor((current) => (current?.kind === "item" && current.id === optimistic.id ? { ...current, id: created.id } : current));
        onWbsCreated(created, optimistic.id);
        persistRange(created, nextRange);
      })
      .catch(() => {
        if (!shouldUseWorkspacePreviewData()) {
          onNotice(t("wbs.gantt.notice.serverSavePending"));
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
    onNotice(t("wbs.gantt.notice.rangeClearing"));

    void calendarApi
      .deleteEvent(schedule.id)
      .then(() => onNotice(t("wbs.gantt.notice.rangeCleared")))
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          onNotice(t("wbs.gantt.notice.rangeClearedLocal"));
          return;
        }
        setSchedules((current) => [...current, schedule]);
        onNotice(t("wbs.gantt.notice.rangeServerPending"));
      });
  };

  const handleDeleteItem = (item: WbsItemResponse) => {
    if (wbsItems.some((entry) => entry.parentId === item.id)) {
      onNotice(t("wbs.gantt.notice.groupHasTasks"));
      return;
    }

    const schedule = scheduleByWbsId.get(item.id);
    setEditor((current) => (current?.kind === "item" && current.id === item.id ? null : current));
    onWbsDeleted(item.id);
    onNotice(t("wbs.gantt.notice.deleting"));

    if (schedule) {
      setSchedules((current) => current.filter((entry) => entry.id !== schedule.id));
      void calendarApi.deleteEvent(schedule.id).catch(() => {
        // 일정 삭제 실패는 무시한다. WBS 삭제 결과를 우선한다.
      });
    }

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      onNotice(t("wbs.gantt.notice.deleted"));
      return;
    }

    void wbsApi
      .deleteItem(item.id)
      .then(() => onNotice(t("wbs.gantt.notice.deleted")))
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          onNotice(t("wbs.gantt.notice.deletedLocal"));
          return;
        }
        onWbsCreated(item);
        onNotice(t("wbs.gantt.notice.deleteFailed"));
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
      onNotice(t("wbs.gantt.notice.markerNameSaved"));
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
    onNotice(t("wbs.gantt.notice.saving"));

    if (item.id.startsWith(LOCAL_ID_PREFIX)) {
      onNotice(t("wbs.gantt.notice.savedLocal"));
      return;
    }

    void wbsApi
      .updateItem(item.id, { status, title })
      .then((updated) => {
        onWbsUpdated(updated);
        onNotice(t("wbs.gantt.notice.saved"));
      })
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          onNotice(t("wbs.gantt.notice.savedLocal"));
          return;
        }
        onWbsUpdated(item);
        onNotice(t("wbs.gantt.notice.saveFailed"));
      });
  };

  const handleCreateMarker = (date: Date) => {
    const marker: LocalMarker = {
      className: markerPalette[markers.length % markerPalette.length],
      date,
      id: `marker-${markers.length + 1}-${date.getTime()}`,
      label: t("wbs.gantt.markerLabel", { index: markers.length + 1 }),
    };
    setMarkers((current) => [...current, marker]);
    setEditor({ id: marker.id, kind: "marker", label: marker.label });
    onNotice(t("wbs.gantt.notice.markerAdded"));
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
          disabled={orderedGroups.length === 0}
          onClick={handleAddTask}
          title={orderedGroups.length === 0 ? t("wbs.gantt.addTaskDisabledTitle") : t("wbs.gantt.addTaskTitle")}
          type="button"
        >
          <Plus aria-hidden="true" size={13} strokeWidth={2.1} />
          {t("wbs.gantt.addTask")}
        </button>

        <p className={styles.hint}>{t("wbs.gantt.hint")}</p>
      </div>

      {editor ? (
        <div className={styles.editor}>
          {editor.kind === "marker" ? (
            <>
              <label className={styles.field}>
                {t("wbs.gantt.markerName")}
                <input
                  onChange={(event) => setEditor({ ...editor, label: event.target.value })}
                  onKeyDown={(event) => event.key === "Enter" && handleEditorSave()}
                  value={editor.label}
                />
              </label>
              <p className={styles.editorNote}>{t("wbs.gantt.markerNote")}</p>
            </>
          ) : (
            <>
              <label className={styles.field}>
                {editingIsGroup ? t("wbs.gantt.groupName") : t("wbs.gantt.taskName")}
                <input
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  onKeyDown={(event) => event.key === "Enter" && handleEditorSave()}
                  value={editor.title}
                />
              </label>
              <div className={styles.field}>
                {t("wbs.gantt.statusLabel")}
                <div className={styles.statusRow}>
                  {statusOptions.map((option) => (
                    <button
                      aria-pressed={editor.status === option.status}
                      key={option.status}
                      onClick={() => setEditor({ ...editor, status: option.status })}
                      type="button"
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <label className={styles.field}>
                {t("wbs.gantt.startDate")}
                <input
                  onChange={(event) => setEditor({ ...editor, start: event.target.value })}
                  type="date"
                  value={editor.start}
                />
              </label>
              <label className={styles.field}>
                {t("wbs.gantt.endDate")}
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
              {t("wbs.gantt.save")}
            </button>
            {editor.kind === "item" && editingItem ? (
              <button className={styles.dangerAction} onClick={() => handleDeleteItem(editingItem)} type="button">
                {t("wbs.gantt.delete")}
              </button>
            ) : null}
            <button aria-label={t("wbs.gantt.closeEditorAria")} className={styles.closeButton} onClick={() => setEditor(null)} type="button">
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
                            aria-label={t("wbs.gantt.editItemAria", { title: item.title })}
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
                            {t("wbs.gantt.menu.edit")}
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => onOpenSettings(item.id)}
                          >
                            <Palette className="text-muted-foreground" size={16} />
                            {t("wbs.gantt.menu.colorLink")}
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleClearSchedule(item)}
                          >
                            <Eraser className="text-muted-foreground" size={16} />
                            {t("wbs.gantt.menu.clearRange")}
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2 text-destructive"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <TrashIcon size={16} />
                            {t("wbs.gantt.menu.delete")}
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
