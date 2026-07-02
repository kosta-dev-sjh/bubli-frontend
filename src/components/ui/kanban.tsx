"use client";

import { Check, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

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

function getInitial(label?: string) {
  if (!label) return "미";

  return label.trim().slice(0, 1).toUpperCase();
}

function stopInteractive(event: React.PointerEvent | React.MouseEvent) {
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
    <div className={cn("flex gap-4 overflow-x-auto pb-3", className)}>
      {columns.map((column) => {
        const isDropActive = dropTarget === column.id && draggedTask?.sourceColumnId !== column.id;
        const columnColor = getColumnColor(column.id);

        return (
          <div
            className={cn(
              "min-w-[260px] max-w-[292px] rounded-[18px] border p-3 transition-all duration-200",
              "border-[var(--color-border)] bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-md",
              isDropActive && "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-water-blue)_32%,transparent)]",
            )}
            key={column.id}
            onDragLeave={() => setDropTarget(null)}
            onDragOver={(event) => handleDragOver(event, column.id)}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: columnColor }}
                />
                <h2 className="truncate text-[15px] font-[850] leading-none text-[var(--color-text)]">{column.title}</h2>
                <span className="rounded-full bg-white/72 px-2 py-0.5 text-xs font-[760] text-[var(--color-brand)]">
                  {column.tasks.length}
                </span>
              </div>
            </div>

            <div className="flex min-h-[160px] flex-col gap-2.5">
              {column.tasks.map((task) => {
                const isDragging = draggedTask?.task.id === task.id;
                const isSelected = selectedTaskId === task.id;
                const isEditing = editingTaskId === task.id;
                const assigneeLabel = task.assignee ?? assigneeOptions.find((option) => option.id === task.assigneeId)?.label;

                return (
                  <article
                    className={cn(
                      "rounded-[14px] border bg-white/86 p-3 text-left shadow-[0_10px_24px_rgba(107,143,168,.12)] transition-all duration-150",
                      "border-[var(--color-border)] hover:-translate-y-0.5 hover:border-[var(--color-rain-gray)]",
                      isDragging && "opacity-60",
                      isSelected && "border-[var(--color-todo)] bg-[var(--color-bg)]",
                    )}
                    draggable={!isEditing}
                    key={task.id}
                    onClick={() => onTaskClick?.(task.id)}
                    onDragEnd={() => setDraggedTask(null)}
                    onDragStart={() => handleDragStart(task, column.id)}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            aria-label="작업명 수정"
                            className="min-h-9 w-full rounded-xl border border-[var(--color-water-blue)] bg-white px-3 text-[14px] font-[850] text-[var(--color-text)] outline-none focus:border-[var(--color-todo)]"
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
                          <h3 className="break-keep text-[14px] font-[850] leading-[1.38] text-[var(--color-text)]">{task.title}</h3>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              aria-label="작업명 저장"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-water-blue)] bg-white/90 text-[var(--color-brand)]"
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
                              aria-label="작업명 수정 취소"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/72 text-[var(--color-faint)]"
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
                              aria-label="작업명 수정"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[var(--color-brand)] transition-colors hover:border-[var(--color-water-blue)] hover:bg-[color-mix(in_srgb,var(--color-water-blue)_40%,transparent)]"
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
                                aria-label="작업 삭제"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[var(--color-faint)] transition-colors hover:border-[color-mix(in_srgb,var(--color-dust-rose)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-dust-rose)_10%,transparent)] hover:text-[var(--color-dust-rose)]"
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
                      <div className="mb-2 flex flex-wrap gap-1">
                        {task.labels.slice(0, 2).map((label) => (
                          <span
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px] font-[780] leading-none text-[var(--color-brand)]"
                            key={label}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {task.description ? (
                      <p className="mb-3 break-keep text-[12px] font-[680] leading-[1.45] text-[var(--color-muted)]">{task.description}</p>
                    ) : null}

                    <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2.5">
                      <label className="relative inline-flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-water-blue)] bg-[color-mix(in_srgb,var(--color-water-blue)_50%,transparent)] text-[11px] font-[850] text-[var(--color-brand)]">
                          {assigneeLabel ? getInitial(assigneeLabel) : <UserRound aria-hidden="true" size={14} strokeWidth={2.1} />}
                        </span>
                        <select
                          aria-label="담당자 선택"
                          className="max-w-[132px] appearance-none truncate rounded-full border border-[var(--color-border)] bg-white/76 px-3 py-1.5 text-[12px] font-[780] text-[var(--color-muted)] outline-none transition-colors hover:border-[var(--color-rain-gray)] focus:border-[var(--color-todo)]"
                          onChange={(event) => onTaskAssigneeChange?.(task.id, event.target.value || null)}
                          onClick={stopInteractive}
                          onPointerDown={stopInteractive}
                          value={task.assigneeId ?? ""}
                        >
                          <option value="">미지정</option>
                          {assigneeOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                );
              })}

              {allowAddTask ? (
                addingCardTo === column.id ? (
                  <div className="rounded-[14px] border border-[var(--color-water-blue)] bg-white/82 p-3 shadow-[0_10px_24px_rgba(107,143,168,.1)]">
                    <input
                      className="mb-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-[13px] font-[760] text-[var(--color-text)] outline-none placeholder:text-[var(--color-faint)] focus:border-[var(--color-todo)]"
                      onChange={(event) => setNewCardTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleAddCard(column.id);
                      }}
                      placeholder="작업명 입력"
                      ref={inputRef}
                      type="text"
                      value={newCardTitle}
                    />
                    <div className="flex gap-2">
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-full bg-[var(--color-todo)] px-3 text-xs font-[850] text-[var(--color-text)]"
                        onClick={() => handleAddCard(column.id)}
                        type="button"
                      >
                        추가
                      </button>
                      <button
                        aria-label="카드 추가 취소"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/72 text-[var(--color-faint)]"
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
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--color-rain-gray)] bg-white/42 text-sm font-[780] text-[var(--color-brand)] transition-colors hover:border-[var(--color-todo)] hover:bg-[color-mix(in_srgb,var(--color-water-blue)_30%,transparent)]"
                    onClick={() => setAddingCardTo(column.id)}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={15} strokeWidth={2.2} />
                    카드 추가
                  </button>
                )
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
