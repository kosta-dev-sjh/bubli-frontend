"use client";

import { GitBranch, KanbanSquare, X } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  KanbanBoard,
  type KanbanAssigneeOption,
  type KanbanColumn as KanbanBoardColumn,
} from "@/components/ui/kanban";
import { StatusBadge } from "@/components/ui/status-badge";
import { todoApi } from "@/features/todo/api/todoApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { WbsGanttPanel } from "@/features/wbs/components/wbs-gantt-panel";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { ProjectRoomMemberResponse } from "@/types/api/projectRoom";
import type { TaskResponse, TaskStatus, WbsBoardResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./project-room-work-board.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type KanbanColumn = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  status: TaskStatus;
};

type LocalTask = TaskResponse & {
  localRemoved?: boolean;
};

type WbsEditDraft = {
  title: string;
  wbsId: string | null;
};

const columns: KanbanColumn[] = [
  { descriptionKey: "room.workBoard.colTodoDescription", labelKey: "room.workBoard.colTodoLabel", status: "TODO" },
  { descriptionKey: "room.workBoard.colInProgressDescription", labelKey: "room.workBoard.colInProgressLabel", status: "IN_PROGRESS" },
  { descriptionKey: "room.workBoard.colReviewDescription", labelKey: "room.workBoard.colReviewLabel", status: "REVIEW" },
  { descriptionKey: "room.workBoard.colDoneDescription", labelKey: "room.workBoard.colDoneLabel", status: "DONE" },
];

const kanbanColumnIdByStatus: Record<TaskStatus, string> = {
  BLOCKED: "review",
  DONE: "done",
  IN_PROGRESS: "in-progress",
  REVIEW: "review",
  TODO: "todo",
};

const kanbanStatusByColumnId: Record<string, TaskStatus> = {
  done: "DONE",
  "in-progress": "IN_PROGRESS",
  review: "REVIEW",
  todo: "TODO",
};

const wbsStatusOptions: Array<{ labelKey: MessageKey; status: WbsStatus }> = [
  { labelKey: "room.workBoard.wbsStatusTodo", status: "TODO" },
  { labelKey: "room.workBoard.wbsStatusInProgress", status: "IN_PROGRESS" },
  { labelKey: "room.workBoard.wbsStatusDone", status: "DONE" },
];

const hexPrefix = "#";

const wbsAccentOptions = [
  { labelKey: "room.workBoard.accentSky", pickerValue: `${hexPrefix}8ECDF6`, value: "var(--color-todo)" },
  { labelKey: "room.workBoard.accentWater", pickerValue: `${hexPrefix}D7EAF4`, value: "var(--color-water-blue)" },
  { labelKey: "room.workBoard.accentLilac", pickerValue: `${hexPrefix}E6DDF8`, value: "var(--color-lilac)" },
  { labelKey: "room.workBoard.accentPearl", pickerValue: `${hexPrefix}E8C4A0`, value: "var(--color-pearl)" },
  { labelKey: "room.workBoard.accentRainGray", pickerValue: `${hexPrefix}CDD8DF`, value: "var(--color-rain-gray)" },
] as const satisfies ReadonlyArray<{ labelKey: MessageKey; pickerValue: string; value: string }>;

function formatDue(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function statusLabel(t: TranslateFn, status?: string | null) {
  if (status === "DONE") return t("room.workBoard.statusDone");
  if (status === "IN_PROGRESS") return t("room.workBoard.statusInProgress");
  if (status === "REVIEW") return t("room.workBoard.statusReview");
  if (status === "BLOCKED") return t("room.workBoard.statusBlocked");
  return t("room.workBoard.statusWaiting");
}

function taskTone(status?: string | null) {
  if (status === "DONE") return "success";
  if (status === "REVIEW") return "agent";
  if (status === "BLOCKED") return "warning";
  if (status === "IN_PROGRESS") return "todo";
  return "neutral";
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeAccentColor(value: string) {
  if (isHexColor(value)) return value.toUpperCase();

  return wbsAccentOptions.some((option) => option.value === value) ? value : wbsAccentOptions[0].value;
}

function accentPickerValue(value: string) {
  if (isHexColor(value)) return value;

  return wbsAccentOptions.find((option) => option.value === value)?.pickerValue ?? wbsAccentOptions[0].pickerValue;
}

function createInitialWbsAccentMap(items: WbsItemResponse[]) {
  return Object.fromEntries(
    items
      .filter((item) => item.parentId)
      .map((item, index) => [item.id, wbsAccentOptions[index % wbsAccentOptions.length].value]),
  );
}

function activeTaskStatus(status: TaskStatus) {
  return status === "BLOCKED" ? "REVIEW" : status;
}

function sourceLabel(t: TranslateFn, task: TaskResponse, wbsTitle?: string | null) {
  if (task.wbsItemId && wbsTitle) return t("room.workBoard.sourceWbs", { title: wbsTitle });
  if (task.wbsItemId) return t("room.workBoard.sourceWbsLinked");
  return t("room.workBoard.sourceApprovedTodo");
}

export function ProjectRoomWorkBoard({
  board,
  members,
  roomId,
}: {
  board: WbsBoardResponse;
  members: ProjectRoomMemberResponse[];
  roomId: string;
}) {
  const boardVersion = [
    roomId,
    board.tasks.map((task) => `${task.id}:${task.updatedAt}:${task.status}`).join("|"),
    board.wbsItems.map((item) => `${item.id}:${item.updatedAt}`).join("|"),
  ].join("::");

  return <ProjectRoomWorkBoardContent board={board} key={boardVersion} members={members} roomId={roomId} />;
}

function ProjectRoomWorkBoardContent({
  board,
  members,
  roomId,
}: {
  board: WbsBoardResponse;
  members: ProjectRoomMemberResponse[];
  roomId: string;
}) {
  const { t } = useI18n();
  const initialWbs = board.wbsItems[0] ?? null;
  const [tasks, setTasks] = useState<LocalTask[]>(board.tasks);
  const [wbsItems, setWbsItems] = useState<WbsItemResponse[]>(board.wbsItems);
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(initialWbs?.id ?? null);
  const [, setSaveNotice] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(board.tasks[0]?.id ?? null);
  const [viewMode, setViewMode] = useState<"kanban" | "wbs">("wbs");
  const [wbsDraft, setWbsDraft] = useState({ title: "" });
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isWbsSettingsOpen, setIsWbsSettingsOpen] = useState(false);
  const [wbsAccentById, setWbsAccentById] = useState<Record<string, string>>(() => createInitialWbsAccentMap(board.wbsItems));
  const [wbsEditDraft, setWbsEditDraft] = useState<WbsEditDraft>(() => ({
    title: initialWbs?.title ?? "",
    wbsId: initialWbs?.id ?? null,
  }));

  const wbsTitleById = useMemo(() => Object.fromEntries(wbsItems.map((item) => [item.id, item.title])), [wbsItems]);
  const childCountByWbsId = useMemo(() => {
    return wbsItems.reduce<Record<string, number>>((acc, item) => {
      if (item.parentId) {
        acc[item.parentId] = (acc[item.parentId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [wbsItems]);
  const descendantIdsByWbsId = useMemo(() => {
    const childrenByParent = wbsItems.reduce<Record<string, string[]>>((acc, item) => {
      if (item.parentId) {
        acc[item.parentId] = [...(acc[item.parentId] ?? []), item.id];
      }
      return acc;
    }, {});

    const collect = (id: string): string[] => {
      const children = childrenByParent[id] ?? [];
      return children.flatMap((childId) => [childId, ...collect(childId)]);
    };

    return Object.fromEntries(wbsItems.map((item) => [item.id, collect(item.id)]));
  }, [wbsItems]);
  const visibleTasks = useMemo(() => tasks.filter((task) => !task.localRemoved), [tasks]);
  const activeMembers = useMemo(() => members.filter((member) => member.status === "ACTIVE"), [members]);
  const memberByUserId = useMemo(
    () => Object.fromEntries(activeMembers.map((member) => [member.userId, member])),
    [activeMembers],
  );
  const kanbanAssigneeOptions = useMemo<KanbanAssigneeOption[]>(
    () =>
      activeMembers.map((member) => ({
        id: member.userId,
        label: member.name,
        shortLabel: member.name.slice(0, 1).toUpperCase(),
      })),
    [activeMembers],
  );
  const selectedWbs = selectedWbsId ? wbsItems.find((item) => item.id === selectedWbsId) : null;
  const selectedWbsAccent = selectedWbsId ? wbsAccentById[selectedWbsId] ?? wbsAccentOptions[0].value : wbsAccentOptions[0].value;
  const selectedWbsTasks = selectedWbsId
    ? visibleTasks.filter((task) => {
        if (task.wbsItemId === selectedWbsId) return true;
        return Boolean(task.wbsItemId && descendantIdsByWbsId[selectedWbsId]?.includes(task.wbsItemId));
      })
    : [];
  const activeWbsTitle = selectedWbsId ? wbsTitleById[selectedWbsId] : null;
  const selectedWbsLinkedCount = selectedWbsId ? selectedWbsTasks.filter((task) => task.wbsItemId === selectedWbsId).length : 0;
  const selectedWbsChildCount = selectedWbsId ? childCountByWbsId[selectedWbsId] ?? 0 : 0;
  const canDeleteSelectedWbs = Boolean(selectedWbs && selectedWbsChildCount === 0 && selectedWbsLinkedCount === 0);
  const kanbanColumns = useMemo<KanbanBoardColumn[]>(
    () =>
      columns.map((column) => ({
        id: kanbanColumnIdByStatus[column.status],
        tasks: visibleTasks
          .filter((task) => activeTaskStatus(task.status) === column.status)
          .map((task) => {
            const wbsTitle = task.wbsItemId ? wbsTitleById[task.wbsItemId] : null;
            return {
              assignee: task.assigneeUserId ? memberByUserId[task.assigneeUserId]?.name ?? t("room.workBoard.assigneeFallback") : undefined,
              assigneeId: task.assigneeUserId ?? undefined,
              description: [sourceLabel(t, task, wbsTitle), formatDue(task.dueAt)].filter(Boolean).join(" · "),
              id: task.id,
              labels: wbsTitle ? [wbsTitle] : [],
              title: task.title,
            };
          }),
        title: t(column.labelKey),
      })),
    [memberByUserId, visibleTasks, wbsTitleById, t],
  );
  const activeWbsEditDraft =
    selectedWbs && wbsEditDraft.wbsId === selectedWbs.id
      ? wbsEditDraft
      : {
          title: selectedWbs?.title ?? "",
          wbsId: selectedWbs?.id ?? null,
        };

  const openWbsSettings = (id: string) => {
    setSelectedWbsId(id);
    setIsWbsSettingsOpen(true);
  };

  const handleCreateWbs = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = wbsDraft.title.trim();
    if (!title) return;

    const now = new Date().toISOString();
    const optimistic: WbsItemResponse = {
      createdAt: now,
      id: `local-wbs-${Date.now()}`,
      orderNo: wbsItems.length + 1,
      parentId: selectedWbsId,
      roomId,
      status: "TODO",
      title,
      updatedAt: now,
    };

    setWbsItems((current) => [...current, optimistic]);
    if (optimistic.parentId) {
      setWbsAccentById((current) => ({
        ...current,
        [optimistic.id]: current[optimistic.parentId ?? ""] ?? wbsAccentOptions[wbsItems.length % wbsAccentOptions.length].value,
      }));
    }
    setSelectedWbsId(optimistic.id);
    setIsWbsSettingsOpen(true);
    setWbsDraft({ title: "" });
    setSaveNotice(t("room.workBoard.noticeWbsSaving"));

    try {
      const created = await wbsApi.createItem(roomId, {
        orderNo: optimistic.orderNo,
        parentId: optimistic.parentId,
        title,
      });
      setWbsItems((current) => current.map((item) => (item.id === optimistic.id ? created : item)));
      setWbsAccentById((current) => {
        const next = { ...current };
        const color = next[optimistic.id];
        delete next[optimistic.id];
        if (created.parentId) {
          next[created.id] = color ?? next[created.parentId] ?? wbsAccentOptions[0].value;
        }
        return next;
      });
      setSelectedWbsId(created.id);
      setIsWbsSettingsOpen(true);
      setSaveNotice(t("room.workBoard.noticeWbsSaved"));
    } catch {
      setSaveNotice(t("room.workBoard.noticeWbsServerPending"));
    }
  };

  const handleUpdateWbs = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWbs) return;

    const title = activeWbsEditDraft.title.trim();
    if (!title) return;

    const patch = {
      title,
    };
    const previous = selectedWbs;

    setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? { ...item, ...patch } : item)));
    setSaveNotice(t("room.workBoard.noticeWbsUpdating"));

    try {
      const updated = await wbsApi.updateItem(selectedWbs.id, patch);
      setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? updated : item)));
      setSaveNotice(t("room.workBoard.noticeWbsUpdated"));
    } catch {
      if (selectedWbs.id.startsWith("local-wbs-") || shouldUseWorkspacePreviewData()) {
        setSaveNotice(t("room.workBoard.noticeWbsUpdatedLocal"));
        return;
      }
      setWbsItems((current) => current.map((item) => (item.id === previous.id ? previous : item)));
      setSaveNotice(t("room.workBoard.noticeWbsServerPending"));
    }
  };

  const updateSelectedWbsStatus = (status: WbsStatus) => {
    if (!selectedWbs) return;

    const previous = selectedWbs;
    setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? { ...item, status } : item)));
    setSaveNotice(t("room.workBoard.noticeWbsStatusSaving"));

    void wbsApi
      .updateItem(selectedWbs.id, { status })
      .then((updated) => {
        setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? updated : item)));
        setSaveNotice(t("room.workBoard.noticeWbsStatusSaved"));
      })
      .catch(() => {
        if (selectedWbs.id.startsWith("local-wbs-") || shouldUseWorkspacePreviewData()) {
          setSaveNotice(t("room.workBoard.noticeWbsStatusSavedLocal"));
          return;
        }
        setWbsItems((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        setSaveNotice(t("room.workBoard.noticeWbsServerPending"));
      });
  };

  const deleteSelectedWbs = () => {
    if (!selectedWbs || !canDeleteSelectedWbs) return;

    const previousItems = wbsItems;
    const fallbackId = selectedWbs.parentId ?? wbsItems.find((item) => item.id !== selectedWbs.id)?.id ?? null;

    setWbsItems((current) => current.filter((item) => item.id !== selectedWbs.id));
    setWbsAccentById((current) => {
      const next = { ...current };
      delete next[selectedWbs.id];
      return next;
    });
    setSelectedWbsId(fallbackId);
    setIsWbsSettingsOpen(Boolean(fallbackId));
    setSaveNotice(t("room.workBoard.noticeWbsDeleting"));

    void wbsApi
      .deleteItem(selectedWbs.id)
      .then(() => {
        setSaveNotice(t("room.workBoard.noticeWbsDeleted"));
      })
      .catch(() => {
        if (selectedWbs.id.startsWith("local-wbs-") || shouldUseWorkspacePreviewData()) {
          setSaveNotice(t("room.workBoard.noticeWbsDeletedLocal"));
          return;
        }
        setWbsItems(previousItems);
        setWbsAccentById((current) => ({ ...current, [selectedWbs.id]: selectedWbsAccent }));
        setSelectedWbsId(selectedWbs.id);
        setIsWbsSettingsOpen(true);
        setSaveNotice(t("room.workBoard.noticeWbsServerPending"));
      });
  };

  const updateSelectedWbsAccent = (color: string) => {
    if (!selectedWbsId) return;

    setWbsAccentById((current) => ({
      ...current,
      [selectedWbsId]: normalizeAccentColor(color),
    }));
  };

  const persistTaskStatus = async (taskId: string, status: TaskStatus) => {
    setSaveNotice(t("room.workBoard.noticeSaving"));

    try {
      await todoApi.update(taskId, { status });
      setSaveNotice(t("room.workBoard.noticeSaved"));
    } catch {
      setSaveNotice(t("room.workBoard.noticeServerPending"));
    }
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
    void persistTaskStatus(taskId, status);
  };

  const handleKanbanTaskMove = (taskId: string, _fromColumnId: string, toColumnId: string) => {
    const status = kanbanStatusByColumnId[toColumnId];
    if (!status) return;

    updateTaskStatus(taskId, status);
  };

  const handleKanbanTaskAdd = (columnId: string, title: string) => {
    const status = kanbanStatusByColumnId[columnId] ?? "TODO";
    setSaveNotice(t("room.workBoard.noticeTaskSaving"));

    void todoApi
      .createRoomTask(roomId, {
        status,
        title,
        wbsItemId: selectedWbsId ?? undefined,
      })
      .then((created) => {
        setTasks((current) => [...current, created]);
        setSelectedTaskId(created.id);
        setSaveNotice(t("room.workBoard.noticeTaskSaved"));
      })
      .catch(() => setSaveNotice(t("room.workBoard.noticeTaskServerPending")));
  };

  const updateTaskAssignee = (taskId: string, assigneeUserId: string | null) => {
    const previousTasks = tasks;

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, assigneeUserId } : task)));
    setSaveNotice(t("room.workBoard.noticeAssigneeSaving"));

    void todoApi
      .update(taskId, { assigneeUserId })
      .then((updated) => {
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...updated } : task)));
        setSaveNotice(t("room.workBoard.noticeAssigneeSaved"));
      })
      .catch(() => {
        setTasks(previousTasks);
        setSaveNotice(t("room.workBoard.noticeAssigneeServerPending"));
      });
  };

  const updateTaskTitle = (taskId: string, title: string) => {
    const previousTasks = tasks;

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, title } : task)));
    setSaveNotice(t("room.workBoard.noticeTitleSaving"));

    void todoApi
      .update(taskId, { title })
      .then((updated) => {
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...updated } : task)));
        setSaveNotice(t("room.workBoard.noticeTitleSaved"));
      })
      .catch(() => {
        setTasks(previousTasks);
        setSaveNotice(t("room.workBoard.noticeTitleServerPending"));
      });
  };

  const deleteTask = async (taskId: string) => {
    const previousTasks = tasks;

    setDeletingTaskId(taskId);
    setSaveNotice(t("room.workBoard.noticeTaskDeleting"));
    setTasks((current) => current.filter((task) => task.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    try {
      await todoApi.delete(taskId);
      setSaveNotice(t("room.workBoard.noticeTaskDeleted"));
    } catch {
      setTasks(previousTasks);
      setSaveNotice(t("room.workBoard.noticeTaskDeleteServerPending"));
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.contextBand} aria-label={t("room.workBoard.viewSwitchAria")}>
        <div className={styles.viewSwitch} role="group" aria-label={t("room.workBoard.viewSwitchAria")}>
          <button aria-pressed={viewMode === "wbs"} onClick={() => setViewMode("wbs")} type="button">
            <GitBranch size={15} aria-hidden="true" />
            WBS
          </button>
          <button aria-pressed={viewMode === "kanban"} onClick={() => setViewMode("kanban")} type="button">
            <KanbanSquare size={15} aria-hidden="true" />
            {t("room.workBoard.kanban")}
          </button>
        </div>
      </section>

      <div className={styles.boardGrid} data-view={viewMode}>
        {viewMode === "wbs" ? (
          <section className={styles.wbsWorkspace} aria-label={t("room.workBoard.wbsViewAria")}>
            <section className={styles.pane} aria-label={t("room.workBoard.ganttAria")}>
              <div className={cn(styles.paneHead, styles.ganttPaneHead)}>
                <div>
                  <h2>WBS</h2>
                </div>
                <StatusBadge tone="neutral">{wbsItems.length}</StatusBadge>
              </div>
              {wbsItems.length > 0 ? (
                <WbsGanttPanel
                  onNotice={setSaveNotice}
                  onOpenSettings={openWbsSettings}
                  onSelectItem={setSelectedWbsId}
                  onWbsCreated={(item, temporaryId) => {
                    setWbsItems((current) => {
                      if (temporaryId) {
                        return current.map((entry) => (entry.id === temporaryId ? item : entry));
                      }
                      if (current.some((entry) => entry.id === item.id)) return current;
                      return [...current, item];
                    });
                    setSelectedWbsId(item.id);
                  }}
                  onWbsDeleted={(id) => {
                    setWbsItems((current) => current.filter((entry) => entry.id !== id));
                    if (selectedWbsId === id) {
                      setSelectedWbsId(null);
                      setIsWbsSettingsOpen(false);
                    }
                  }}
                  onWbsUpdated={(item) => {
                    setWbsItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
                  }}
                  roomId={roomId}
                  selectedWbsId={selectedWbsId}
                  wbsItems={wbsItems}
                />
              ) : (
                <form className={cn(styles.wbsCreate, styles.inlineCreate)} onSubmit={handleCreateWbs}>
                  <div className={styles.wbsFormGrid}>
                    <label>
                      <span>{t("room.workBoard.firstGroup")}</span>
                      <input
                        aria-label={t("room.workBoard.wbsNameAria")}
                        onChange={(event) => setWbsDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder={t("room.workBoard.wbsNamePlaceholder")}
                        value={wbsDraft.title}
                      />
                    </label>
                  </div>
                  <div className={styles.wbsFormActions}>
                    <button className={styles.primaryAction} type="submit">
                      {t("room.workBoard.add")}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {isWbsSettingsOpen && selectedWbs ? (
              <section className={styles.wbsInspectorPopover} aria-label={t("room.workBoard.settingsAria")}>
                <div className={styles.inspectorSummary}>
                  <span
                    aria-hidden="true"
                    className={styles.inspectorRail}
                    style={{ "--wbs-accent": selectedWbsAccent } as CSSProperties}
                  />
                  <span className={styles.inspectorTitle}>
                    <strong>{activeWbsTitle ?? t("room.workBoard.selectRow")}</strong>
                    <small>{selectedWbs.parentId ? t("room.workBoard.groupSuffix", { name: wbsTitleById[selectedWbs.parentId] ?? t("room.workBoard.groupFallback") }) : t("room.workBoard.group")}</small>
                  </span>
                  <StatusBadge tone={taskTone(selectedWbs.status)}>{statusLabel(t, selectedWbs.status)}</StatusBadge>
                  <span className={styles.inspectorMeta}>
                    {t("room.workBoard.inspectorMeta", { tasks: selectedWbsTasks.length, children: childCountByWbsId[selectedWbs.id] ?? 0 })}
                  </span>
                  <button className={styles.inspectorClose} onClick={() => setIsWbsSettingsOpen(false)} type="button">
                    <X aria-hidden="true" size={15} strokeWidth={2.2} />
                    <span className="sr-only">{t("room.workBoard.closeSettings")}</span>
                  </button>
                </div>

              {selectedWbsTasks.length > 0 ? (
                <div className={styles.linkedTaskStrip} aria-label={t("room.workBoard.linkedTasksAria")}>
                  {selectedWbsTasks.slice(0, 3).map((task) => (
                    <article className={styles.linkedTask} key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{[task.description, formatDue(task.dueAt)].filter(Boolean).join(" · ")}</small>
                      </span>
                      <StatusBadge tone={taskTone(task.status)}>{statusLabel(t, task.status)}</StatusBadge>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className={styles.inspectorForms}>
                <form className={styles.wbsEditor} onSubmit={handleUpdateWbs}>
                  {selectedWbs ? (
                    <>
                      <div className={styles.wbsFormGrid}>
                        <label>
                          <span>{t("room.workBoard.taskName")}</span>
                          <input
                            aria-label={t("room.workBoard.wbsNameLabel")}
                            onChange={(event) => setWbsEditDraft({ ...activeWbsEditDraft, title: event.target.value })}
                            value={activeWbsEditDraft.title}
                          />
                        </label>
                      </div>
                      <div className={styles.statusActions} aria-label={t("room.workBoard.statusChangeAria")}>
                        {wbsStatusOptions.map((column) => (
                          <button
                            aria-pressed={selectedWbs.status === column.status}
                            key={column.status}
                            onClick={() => updateSelectedWbsStatus(column.status)}
                            type="button"
                          >
                            {t(column.labelKey)}
                          </button>
                        ))}
                      </div>
                      <div className={styles.colorControl}>
                        <span>{t("room.workBoard.lineColor")}</span>
                        <div className={styles.colorSwatches} aria-label={t("room.workBoard.lineColorSelectAria")} role="group">
                          {wbsAccentOptions.map((option) => (
                            <button
                              aria-label={t("room.workBoard.accentColorLabel", { name: t(option.labelKey) })}
                              aria-pressed={selectedWbsAccent === option.value}
                              className={styles.colorSwatch}
                              key={option.value}
                              onClick={() => updateSelectedWbsAccent(option.value)}
                              style={{ "--swatch-color": option.value } as CSSProperties}
                              type="button"
                            />
                          ))}
                          <label className={styles.customColor}>
                            <span>{t("room.workBoard.custom")}</span>
                            <input
                              aria-label={t("room.workBoard.customColorAria")}
                              onChange={(event) => updateSelectedWbsAccent(event.target.value)}
                              type="color"
                              value={accentPickerValue(selectedWbsAccent)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className={styles.wbsFormActions}>
                        <button className={styles.primaryAction} type="submit">
                          {t("room.workBoard.save")}
                        </button>
                        <button
                          className={styles.dangerAction}
                          disabled={!canDeleteSelectedWbs}
                          onClick={deleteSelectedWbs}
                          title={canDeleteSelectedWbs ? t("room.workBoard.deleteWbsTitle") : t("room.workBoard.deleteWbsDisabledTitle")}
                          type="button"
                        >
                          {t("room.workBoard.delete")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className={styles.empty}>{t("room.workBoard.selectRowInGantt")}</p>
                  )}
                </form>

                <form className={styles.wbsCreate} onSubmit={handleCreateWbs}>
                  <div className={styles.wbsFormGrid}>
                    <label>
                      <span>{selectedWbs ? t("room.workBoard.addTaskToGroup") : t("room.workBoard.addGroup")}</span>
                      <input
                        aria-label={t("room.workBoard.wbsNameAria")}
                        onChange={(event) => setWbsDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder={t("room.workBoard.wbsNamePlaceholder")}
                        value={wbsDraft.title}
                      />
                    </label>
                  </div>
                  <div className={styles.wbsFormActions}>
                    <button className={styles.primaryAction} type="submit">
                      {t("room.workBoard.addLine")}
                    </button>
                  </div>
                </form>
              </div>
            </section>
            ) : null}
          </section>
        ) : null}

        {viewMode === "kanban" ? (
          <section className={styles.kanbanPane} aria-label={t("room.workBoard.kanbanPaneAria")}>
            <div className={styles.paneHead}>
              <div>
                <h2>{t("room.workBoard.kanban")}</h2>
              </div>
              <KanbanSquare aria-hidden="true" size={19} strokeWidth={2} />
            </div>

            <KanbanBoard
              assigneeOptions={kanbanAssigneeOptions}
              columns={kanbanColumns}
              deletingTaskId={deletingTaskId}
              onTaskAssigneeChange={updateTaskAssignee}
              onTaskAdd={handleKanbanTaskAdd}
              onTaskClick={setSelectedTaskId}
              onTaskDelete={(taskId) => void deleteTask(taskId)}
              onTaskMove={handleKanbanTaskMove}
              onTaskTitleChange={updateTaskTitle}
              selectedTaskId={selectedTaskId}
            />
          </section>
        ) : null}
      </div>

    </div>
  );
}
