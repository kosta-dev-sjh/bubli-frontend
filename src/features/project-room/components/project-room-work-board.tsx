"use client";

import { GitBranch, KanbanSquare, ListTodo, X } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";

import { KanbanBoard, type KanbanColumn as KanbanBoardColumn } from "@/components/ui/kanban";
import { StatusBadge } from "@/components/ui/status-badge";
import { todoApi } from "@/features/todo/api/todoApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { WbsGanttPanel } from "@/features/wbs/components/wbs-gantt-panel";
import { cn } from "@/lib/utils";
import type { ProjectRoomMemberResponse } from "@/types/api/projectRoom";
import type { TaskResponse, TaskStatus, WbsBoardResponse, WbsItemResponse, WbsStatus } from "@/types/api/work";

import styles from "./project-room-work-board.module.css";

type KanbanColumn = {
  description: string;
  label: string;
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
  { description: "시작 전", label: "대기", status: "TODO" },
  { description: "진행 중", label: "진행", status: "IN_PROGRESS" },
  { description: "검토·막힘", label: "검토", status: "REVIEW" },
  { description: "마무리", label: "완료", status: "DONE" },
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

const kanbanLabelPalette = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500"];

const wbsStatusOptions: Array<{ label: string; status: WbsStatus }> = [
  { label: "대기", status: "TODO" },
  { label: "진행", status: "IN_PROGRESS" },
  { label: "완료", status: "DONE" },
];

const hexPrefix = "#";

const wbsAccentOptions = [
  { label: "하늘", pickerValue: `${hexPrefix}8ECDF6`, value: "var(--color-todo)" },
  { label: "물빛", pickerValue: `${hexPrefix}D7EAF4`, value: "var(--color-water-blue)" },
  { label: "라일락", pickerValue: `${hexPrefix}E6DDF8`, value: "var(--color-lilac)" },
  { label: "펄", pickerValue: `${hexPrefix}E8C4A0`, value: "var(--color-pearl)" },
  { label: "회청", pickerValue: `${hexPrefix}CDD8DF`, value: "var(--color-rain-gray)" },
] as const;

function formatDue(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function statusLabel(status?: string | null) {
  if (status === "DONE") return "완료";
  if (status === "IN_PROGRESS") return "진행";
  if (status === "REVIEW") return "검토";
  if (status === "BLOCKED") return "막힘";
  return "대기";
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

function sourceLabel(task: TaskResponse, wbsTitle?: string | null) {
  if (task.wbsItemId && wbsTitle) return `WBS · ${wbsTitle}`;
  if (task.wbsItemId) return "WBS 연결";
  return "승인 할 일";
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
  const selectedWbs = selectedWbsId ? wbsItems.find((item) => item.id === selectedWbsId) : null;
  const selectedWbsAccent = selectedWbsId ? wbsAccentById[selectedWbsId] ?? wbsAccentOptions[0].value : wbsAccentOptions[0].value;
  const selectedTask = selectedTaskId ? visibleTasks.find((task) => task.id === selectedTaskId) ?? null : null;
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
              assignee: task.assigneeUserId ? memberByUserId[task.assigneeUserId]?.name ?? "담당자" : undefined,
              description: [sourceLabel(task, wbsTitle), formatDue(task.dueAt)].filter(Boolean).join(" · "),
              id: task.id,
              labels: wbsTitle ? [wbsTitle] : [],
              title: task.title,
            };
          }),
        title: column.label,
      })),
    [memberByUserId, visibleTasks, wbsTitleById],
  );
  const kanbanLabelColors = useMemo(
    () =>
      Object.fromEntries(
        wbsItems.map((item, index) => [item.title, kanbanLabelPalette[index % kanbanLabelPalette.length]]),
      ),
    [wbsItems],
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
    setSaveNotice("WBS 저장 중");

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
      setSaveNotice("WBS 저장됨");
    } catch {
      setSaveNotice("WBS 서버 저장 대기");
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
    setSaveNotice("WBS 수정 중");

    try {
      const updated = await wbsApi.updateItem(selectedWbs.id, patch);
      setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? updated : item)));
      setSaveNotice("WBS 수정됨");
    } catch {
      setWbsItems((current) => current.map((item) => (item.id === previous.id ? previous : item)));
      setSaveNotice("WBS 서버 저장 대기");
    }
  };

  const updateSelectedWbsStatus = (status: WbsStatus) => {
    if (!selectedWbs) return;

    const previous = selectedWbs;
    setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? { ...item, status } : item)));
    setSaveNotice("WBS 상태 저장 중");

    void wbsApi
      .updateItem(selectedWbs.id, { status })
      .then((updated) => {
        setWbsItems((current) => current.map((item) => (item.id === selectedWbs.id ? updated : item)));
        setSaveNotice("WBS 상태 저장됨");
      })
      .catch(() => {
        setWbsItems((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        setSaveNotice("WBS 서버 저장 대기");
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
    setSaveNotice("WBS 삭제 중");

    void wbsApi
      .deleteItem(selectedWbs.id)
      .then(() => {
        setSaveNotice("WBS 삭제됨");
      })
      .catch(() => {
        setWbsItems(previousItems);
        setWbsAccentById((current) => ({ ...current, [selectedWbs.id]: selectedWbsAccent }));
        setSelectedWbsId(selectedWbs.id);
        setIsWbsSettingsOpen(true);
        setSaveNotice("WBS 서버 저장 대기");
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
    setSaveNotice("저장 중");

    try {
      await todoApi.update(taskId, { status });
      setSaveNotice("저장됨");
    } catch {
      setSaveNotice("서버 저장 대기");
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
    setSaveNotice("할 일 저장 중");

    void todoApi
      .createRoomTask(roomId, {
        status,
        title,
        wbsItemId: selectedWbsId ?? undefined,
      })
      .then((created) => {
        setTasks((current) => [...current, created]);
        setSelectedTaskId(created.id);
        setSaveNotice("할 일 저장됨");
      })
      .catch(() => setSaveNotice("할 일 서버 저장 대기"));
  };

  const updateTaskAssignee = (taskId: string, assigneeUserId: string | null) => {
    const previousTasks = tasks;

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, assigneeUserId } : task)));
    setSaveNotice("담당자 저장 중");

    void todoApi
      .update(taskId, { assigneeUserId })
      .then((updated) => {
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...updated } : task)));
        setSaveNotice("담당자 저장됨");
      })
      .catch(() => {
        setTasks(previousTasks);
        setSaveNotice("담당자 서버 저장 대기");
      });
  };

  const deleteSelectedTask = async () => {
    if (!selectedTask) return;

    const previousTasks = tasks;
    setDeletingTaskId(selectedTask.id);
    setSaveNotice("할 일 삭제 중");
    setTasks((current) => current.filter((task) => task.id !== selectedTask.id));
    setSelectedTaskId(null);

    try {
      await todoApi.delete(selectedTask.id);
      setSaveNotice("할 일 삭제됨");
    } catch {
      setTasks(previousTasks);
      setSelectedTaskId(selectedTask.id);
      setSaveNotice("할 일 서버 삭제 대기");
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.contextBand} aria-label="작업판 보기 전환">
        <div className={styles.viewSwitch} role="group" aria-label="작업판 보기 전환">
          <button aria-pressed={viewMode === "wbs"} onClick={() => setViewMode("wbs")} type="button">
            <GitBranch size={15} aria-hidden="true" />
            WBS
          </button>
          <button aria-pressed={viewMode === "kanban"} onClick={() => setViewMode("kanban")} type="button">
            <KanbanSquare size={15} aria-hidden="true" />
            칸반
          </button>
        </div>
      </section>

      <div className={styles.boardGrid} data-view={viewMode}>
        {viewMode === "wbs" ? (
          <section className={styles.wbsWorkspace} aria-label="WBS 보기">
            <section className={styles.pane} aria-label="WBS 간트">
              <div className={cn(styles.paneHead, styles.ganttPaneHead)}>
                <div>
                  <h2>WBS</h2>
                </div>
                <StatusBadge tone="neutral">{wbsItems.length}</StatusBadge>
              </div>
              {wbsItems.length > 0 ? (
                <WbsGanttPanel
                  onNotice={setSaveNotice}
                  onSelectItem={openWbsSettings}
                  onWbsCreated={(item, temporaryId) => {
                    setWbsItems((current) => {
                      if (temporaryId) {
                        return current.map((entry) => (entry.id === temporaryId ? item : entry));
                      }
                      if (current.some((entry) => entry.id === item.id)) return current;
                      return [...current, item];
                    });
                    setSelectedWbsId(item.id);
                    setIsWbsSettingsOpen(true);
                  }}
                  roomId={roomId}
                  selectedWbsId={selectedWbsId}
                  wbsItems={wbsItems}
                />
              ) : (
                <form className={cn(styles.wbsCreate, styles.inlineCreate)} onSubmit={handleCreateWbs}>
                  <div className={styles.wbsFormGrid}>
                    <label>
                      <span>작업 줄 추가</span>
                      <input
                        aria-label="추가할 WBS 이름"
                        onChange={(event) => setWbsDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="예: 1차 시안 정리"
                        value={wbsDraft.title}
                      />
                    </label>
                  </div>
                  <div className={styles.wbsFormActions}>
                    <button className={styles.primaryAction} type="submit">
                      추가
                    </button>
                  </div>
                </form>
              )}
            </section>

            {isWbsSettingsOpen && selectedWbs ? (
              <section className={styles.wbsInspectorPopover} aria-label="WBS 설정">
                <div className={styles.inspectorSummary}>
                  <span
                    aria-hidden="true"
                    className={styles.inspectorRail}
                    style={{ "--wbs-accent": selectedWbsAccent } as CSSProperties}
                  />
                  <span className={styles.inspectorTitle}>
                    <strong>{activeWbsTitle ?? "줄을 선택하세요"}</strong>
                    <small>{selectedWbs.parentId ? `상위 ${wbsTitleById[selectedWbs.parentId] ?? "작업"}` : "최상위 줄"}</small>
                  </span>
                  <StatusBadge tone={taskTone(selectedWbs.status)}>{statusLabel(selectedWbs.status)}</StatusBadge>
                  <span className={styles.inspectorMeta}>
                    할 일 {selectedWbsTasks.length} · 하위 {childCountByWbsId[selectedWbs.id] ?? 0}
                  </span>
                  <button className={styles.inspectorClose} onClick={() => setIsWbsSettingsOpen(false)} type="button">
                    <X aria-hidden="true" size={15} strokeWidth={2.2} />
                    <span className="sr-only">WBS 설정 닫기</span>
                  </button>
                </div>

              {selectedWbsTasks.length > 0 ? (
                <div className={styles.linkedTaskStrip} aria-label="연결된 할 일">
                  {selectedWbsTasks.slice(0, 3).map((task) => (
                    <article className={styles.linkedTask} key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{[task.description, formatDue(task.dueAt)].filter(Boolean).join(" · ")}</small>
                      </span>
                      <StatusBadge tone={taskTone(task.status)}>{statusLabel(task.status)}</StatusBadge>
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
                          <span>작업명</span>
                          <input
                            aria-label="WBS 이름"
                            onChange={(event) => setWbsEditDraft({ ...activeWbsEditDraft, title: event.target.value })}
                            value={activeWbsEditDraft.title}
                          />
                        </label>
                      </div>
                      <div className={styles.statusActions} aria-label="WBS 상태 변경">
                        {wbsStatusOptions.map((column) => (
                          <button
                            aria-pressed={selectedWbs.status === column.status}
                            key={column.status}
                            onClick={() => updateSelectedWbsStatus(column.status)}
                            type="button"
                          >
                            {column.label}
                          </button>
                        ))}
                      </div>
                      <div className={styles.colorControl}>
                        <span>줄 색</span>
                        <div className={styles.colorSwatches} aria-label="WBS 줄 색 선택" role="group">
                          {wbsAccentOptions.map((option) => (
                            <button
                              aria-label={`${option.label} 줄 색`}
                              aria-pressed={selectedWbsAccent === option.value}
                              className={styles.colorSwatch}
                              key={option.value}
                              onClick={() => updateSelectedWbsAccent(option.value)}
                              style={{ "--swatch-color": option.value } as CSSProperties}
                              type="button"
                            />
                          ))}
                          <label className={styles.customColor}>
                            <span>직접</span>
                            <input
                              aria-label="직접 줄 색 선택"
                              onChange={(event) => updateSelectedWbsAccent(event.target.value)}
                              type="color"
                              value={accentPickerValue(selectedWbsAccent)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className={styles.wbsFormActions}>
                        <button className={styles.primaryAction} type="submit">
                          저장
                        </button>
                        <button
                          className={styles.dangerAction}
                          disabled={!canDeleteSelectedWbs}
                          onClick={deleteSelectedWbs}
                          title={canDeleteSelectedWbs ? "선택한 WBS 삭제" : "연결된 하위 작업이나 할 일이 있으면 삭제할 수 없습니다"}
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className={styles.empty}>간트에서 줄을 선택하세요</p>
                  )}
                </form>

                <form className={styles.wbsCreate} onSubmit={handleCreateWbs}>
                  <div className={styles.wbsFormGrid}>
                    <label>
                      <span>{selectedWbs ? "하위 줄 추가" : "작업 줄 추가"}</span>
                      <input
                        aria-label="추가할 WBS 이름"
                        onChange={(event) => setWbsDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="예: 1차 시안 정리"
                        value={wbsDraft.title}
                      />
                    </label>
                  </div>
                  <div className={styles.wbsFormActions}>
                    <button className={styles.primaryAction} type="submit">
                      줄 추가
                    </button>
                  </div>
                </form>
              </div>
            </section>
            ) : null}
          </section>
        ) : null}

        {viewMode === "kanban" ? (
          <section className={styles.kanbanPane} aria-label="드래그 가능한 칸반 작업판">
            <div className={styles.paneHead}>
              <div>
                <h2>칸반</h2>
              </div>
              <KanbanSquare aria-hidden="true" size={19} strokeWidth={2} />
            </div>

            <KanbanBoard
              columns={kanbanColumns}
              labelColors={kanbanLabelColors}
              onTaskAdd={handleKanbanTaskAdd}
              onTaskClick={setSelectedTaskId}
              onTaskMove={handleKanbanTaskMove}
              selectedTaskId={selectedTaskId}
            />

            <section className={styles.taskInspector} aria-label="선택한 작업 상세">
              {selectedTask ? (
                <>
                  <div>
                    <span className={styles.sectionLabel}>
                      <ListTodo aria-hidden="true" size={16} strokeWidth={2} />
                      <strong>{selectedTask.title}</strong>
                    </span>
                    <p>{selectedTask.description || "현재 데이터가 없습니다"}</p>
                    <small>
                      {[selectedTask.wbsItemId ? wbsTitleById[selectedTask.wbsItemId] : null, formatDue(selectedTask.dueAt)]
                        .filter(Boolean)
                        .join(" · ") || "연결 정보 없음"}
                    </small>
                    <label className={styles.assigneeControl}>
                      <span>담당자</span>
                      <select
                        aria-label="작업 담당자"
                        onChange={(event) => updateTaskAssignee(selectedTask.id, event.target.value || null)}
                        value={selectedTask.assigneeUserId ?? ""}
                      >
                        <option value="">미지정</option>
                        {activeMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className={styles.statusActions} aria-label="작업 상태 변경">
                    {columns.map((column) => (
                      <button
                        aria-pressed={activeTaskStatus(selectedTask.status) === column.status}
                        key={column.status}
                        onClick={() => updateTaskStatus(selectedTask.id, column.status)}
                        type="button"
                      >
                        {column.label}
                      </button>
                    ))}
                    <button
                      className={styles.dangerAction}
                      disabled={deletingTaskId === selectedTask.id}
                      onClick={() => void deleteSelectedTask()}
                      type="button"
                    >
                      {deletingTaskId === selectedTask.id ? "삭제 중" : "삭제"}
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.empty}>현재 데이터가 없습니다</p>
              )}
            </section>
          </section>
        ) : null}
      </div>

    </div>
  );
}
