"use client";

import { Check, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import type { CSSProperties } from "react";
import * as React from "react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./kanban.module.css";

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  labels?: string[];
  assignee?: string;
  assigneeId?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

export interface KanbanAssigneeOption {
  id: string;
  label: string;
  shortLabel?: string;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onColumnsChange?: (columns: KanbanColumn[]) => void;
  onTaskMove?: (taskId: string, fromColumnId: string, toColumnId: string) => void;
  onTaskAdd?: (columnId: string, title: string) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskAssigneeChange?: (taskId: string, assigneeId: string | null) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskTitleChange?: (taskId: string, title: string) => void;
  selectedTaskId?: string | null;
  columnColors?: Record<string, string>;
  className?: string;
  allowAddTask?: boolean;
  assigneeOptions?: KanbanAssigneeOption[];
  deletingTaskId?: string | null;
}

const defaultColumnColors: Record<string, string> = {
  backlog: "var(--color-rain-gray)",
  done: "var(--color-success)",
  "in-progress": "var(--color-pearl)",
  review: "var(--color-lilac)",
  todo: "var(--color-todo)",
};

type KanbanColumnStyle = CSSProperties & {
  "--kanban-column-color": string;
};

function getInitial(label: string | undefined, fallback: string) {
  if (!label) return fallback;

  return label.trim().slice(0, 1).toUpperCase();
}

function stopInteractive(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function KanbanBoard({
  columns: initialColumns,
  onColumnsChange,
  onTaskMove,
  onTaskAdd,
  onTaskClick,
  onTaskAssigneeChange,
  onTaskDelete,
  onTaskTitleChange,
  selectedTaskId,
  columnColors = defaultColumnColors,
  className,
  allowAddTask = true,
  assigneeOptions = [],
  deletingTaskId,
}: KanbanBoardProps) {
  const { t } = useI18n();
  const [columns, setColumns] = React.useState<KanbanColumn[]>(initialColumns);
  const [draggedTask, setDraggedTask] = React.useState<{
    task: KanbanTask;
    sourceColumnId: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);
  const [addingCardTo, setAddingCardTo] = React.useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [newCardTitle, setNewCardTitle] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const tempIdCounter = React.useRef(0);

  const [prevInitialColumns, setPrevInitialColumns] = React.useState(initialColumns);
  if (prevInitialColumns !== initialColumns) {
    setPrevInitialColumns(initialColumns);
    setColumns(initialColumns);
  }

  React.useEffect(() => {
    if (addingCardTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingCardTo]);

  const handleDragStart = (task: KanbanTask, columnId: string) => {
    setDraggedTask({ task, sourceColumnId: columnId });
  };

  const handleDragOver = (event: React.DragEvent, columnId: string) => {
    event.preventDefault();
    setDropTarget(columnId);
  };

  const handleDrop = (targetColumnId: string) => {
    if (!draggedTask || draggedTask.sourceColumnId === targetColumnId) {
      setDraggedTask(null);
      setDropTarget(null);
      return;
    }

    const newColumns = columns.map((column) => {
      if (column.id === draggedTask.sourceColumnId) {
        return { ...column, tasks: column.tasks.filter((task) => task.id !== draggedTask.task.id) };
      }
      if (column.id === targetColumnId) {
        return { ...column, tasks: [...column.tasks, draggedTask.task] };
      }
      return column;
    });

    setColumns(newColumns);
    onColumnsChange?.(newColumns);
    onTaskMove?.(draggedTask.task.id, draggedTask.sourceColumnId, targetColumnId);
    setDraggedTask(null);
    setDropTarget(null);
  };

  const handleAddCard = (columnId: string) => {
    const title = newCardTitle.trim();
    if (!title) return;

    tempIdCounter.current += 1;
    const newTask: KanbanTask = {
      id: `task-temp-${tempIdCounter.current}`,
      title,
    };

    const newColumns = columns.map((column) => (column.id === columnId ? { ...column, tasks: [...column.tasks, newTask] } : column));
    setColumns(newColumns);
    onColumnsChange?.(newColumns);
    onTaskAdd?.(columnId, title);
    setNewCardTitle("");
    setAddingCardTo(null);
  };

  const startEditing = (task: KanbanTask) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const commitEditing = (taskId: string) => {
    const title = editingTitle.trim();
    if (!title) return;

    setColumns((current) =>
      current.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, title } : task)),
      })),
    );
    onTaskTitleChange?.(taskId, title);
    cancelEditing();
  };

  const getColumnColor = (columnId: string) => columnColors[columnId] || "var(--color-rain-gray)";

  return (
    <div className={cn(styles.board, className)}>
      {columns.map((column) => {
        const isDropActive = dropTarget === column.id && draggedTask?.sourceColumnId !== column.id;
        const columnColor = getColumnColor(column.id);

        return (
          <section
            className={cn(styles.column, isDropActive && styles.columnActive)}
            key={column.id}
            onDragLeave={() => setDropTarget(null)}
            onDragOver={(event) => handleDragOver(event, column.id)}
            onDrop={() => handleDrop(column.id)}
            style={{ "--kanban-column-color": columnColor } as KanbanColumnStyle}
          >
            <header className={styles.columnHead}>
              <span aria-hidden="true" className={styles.statusDot} />
              <h2 className={styles.columnTitle}>{column.title}</h2>
              <span className={styles.count}>{column.tasks.length}</span>
            </header>

            <div className={styles.taskList}>
              {column.tasks.map((task) => {
                const isDragging = draggedTask?.task.id === task.id;
                const isSelected = selectedTaskId === task.id;
                const isEditing = editingTaskId === task.id;
                const assigneeLabel = task.assignee ?? assigneeOptions.find((option) => option.id === task.assigneeId)?.label;

                return (
                  <article
                    className={cn(
                      styles.taskCard,
                      isDragging && styles.taskCardDragging,
                      isSelected && styles.taskCardSelected,
                    )}
                    draggable={!isEditing}
                    key={task.id}
                    onClick={() => onTaskClick?.(task.id)}
                    onDragEnd={() => setDraggedTask(null)}
                    onDragStart={() => handleDragStart(task, column.id)}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.taskTitleSlot}>
                        {isEditing ? (
                          <input
                            aria-label={t("ui.kanban.editTaskName")}
                            className={styles.taskTitleInput}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onClick={stopInteractive}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") commitEditing(task.id);
                              if (event.key === "Escape") cancelEditing();
                            }}
                            onPointerDown={stopInteractive}
                            value={editingTitle}
                          />
                        ) : (
                          <h3 className={styles.taskTitle}>{task.title}</h3>
                        )}
                      </div>
                      <div className={styles.taskActions}>
                        {isEditing ? (
                          <>
                            <button
                              aria-label={t("ui.kanban.saveTaskName")}
                              className={styles.iconButton}
                              onClick={(event) => {
                                stopInteractive(event);
                                commitEditing(task.id);
                              }}
                              onPointerDown={stopInteractive}
                              type="button"
                            >
                              <Check aria-hidden="true" size={15} strokeWidth={2.3} />
                            </button>
                            <button
                              aria-label={t("ui.kanban.cancelEditTaskName")}
                              className={styles.iconButton}
                              onClick={(event) => {
                                stopInteractive(event);
                                cancelEditing();
                              }}
                              onPointerDown={stopInteractive}
                              type="button"
                            >
                              <X aria-hidden="true" size={15} strokeWidth={2.3} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              aria-label={t("ui.kanban.editTaskName")}
                              className={styles.iconButton}
                              onClick={(event) => {
                                stopInteractive(event);
                                startEditing(task);
                              }}
                              onPointerDown={stopInteractive}
                              type="button"
                            >
                              <Pencil aria-hidden="true" size={14} strokeWidth={2.2} />
                            </button>
                            {onTaskDelete ? (
                              <button
                                aria-label={t("ui.kanban.deleteTask")}
                                className={cn(styles.iconButton, styles.iconButtonDanger)}
                                disabled={deletingTaskId === task.id}
                                onClick={(event) => {
                                  stopInteractive(event);
                                  onTaskDelete(task.id);
                                }}
                                onPointerDown={stopInteractive}
                                type="button"
                              >
                                <Trash2 aria-hidden="true" size={14} strokeWidth={2.2} />
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>

                    {task.labels && task.labels.length > 0 ? (
                      <div className={styles.labelList}>
                        {task.labels.slice(0, 2).map((label) => (
                          <span className={styles.labelChip} key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {task.description ? <p className={styles.description}>{task.description}</p> : null}

                    <footer className={styles.cardFooter}>
                      <label className={styles.assigneeControl}>
                        <span className={styles.avatar}>
                          {assigneeLabel ? getInitial(assigneeLabel, t("ui.kanban.assigneeInitialFallback")) : <UserRound aria-hidden="true" size={14} strokeWidth={2.1} />}
                        </span>
                        <select
                          aria-label={t("ui.kanban.selectAssignee")}
                          className={styles.assigneeSelect}
                          onChange={(event) => onTaskAssigneeChange?.(task.id, event.target.value || null)}
                          onClick={stopInteractive}
                          onPointerDown={stopInteractive}
                          value={task.assigneeId ?? ""}
                        >
                          <option value="">{t("ui.kanban.unassigned")}</option>
                          {assigneeOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.shortLabel ?? option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </footer>
                  </article>
                );
              })}

              {allowAddTask ? (
                addingCardTo === column.id ? (
                  <div className={styles.addEditor}>
                    <input
                      className={styles.addInput}
                      onChange={(event) => setNewCardTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleAddCard(column.id);
                      }}
                      placeholder={t("ui.kanban.taskNamePlaceholder")}
                      ref={inputRef}
                      type="text"
                      value={newCardTitle}
                    />
                    <div className={styles.addActions}>
                      <button className={styles.addButton} onClick={() => handleAddCard(column.id)} type="button">
                        {t("ui.kanban.addCard")}
                      </button>
                      <button
                        aria-label={t("ui.kanban.cancelAddCard")}
                        className={styles.cancelButton}
                        onClick={() => {
                          setAddingCardTo(null);
                          setNewCardTitle("");
                        }}
                        type="button"
                      >
                        <X aria-hidden="true" size={15} strokeWidth={2.3} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className={styles.addCardButton} onClick={() => setAddingCardTo(column.id)} type="button">
                    <Plus aria-hidden="true" size={15} strokeWidth={2.2} />
                    {t("ui.kanban.addCardButton")}
                  </button>
                )
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
