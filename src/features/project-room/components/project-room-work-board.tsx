"use client";

import { Bot, GitBranch, GripVertical, Inbox, KanbanSquare, ListTodo, PanelRightOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, DragEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { todoApi } from "@/features/todo/api/todoApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { cn } from "@/lib/utils";
import type { AgentSuggestionResponse } from "@/types/api/agent";
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

const wbsStatusOptions: Array<{ label: string; status: WbsStatus }> = [
  { label: "대기", status: "TODO" },
  { label: "진행", status: "IN_PROGRESS" },
  { label: "완료", status: "DONE" },
];

const viewCopy = {
  kanban: {
    badge: "칸반",
    title: "TODO 상태판",
  },
  suggestions: {
    badge: "후보",
    title: "확정 전 후보",
  },
  wbs: {
    badge: "WBS",
    title: "작업 구조표",
  },
} as const;

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

function suggestionTypeLabel(type: AgentSuggestionResponse["suggestionType"]) {
  if (type === "WBS") return "WBS 후보";
  if (type === "TODO" || type === "TASK") return "할 일 후보";
  if (type === "SCHEDULE") return "일정 후보";
  if (type === "QUESTION") return "확인 질문";
  if (type === "REQUIREMENT") return "요구사항 후보";
  if (type === "CONTRACT_FIELD" || type === "CONTRACT_REVIEW") return "범위 확인";
  if (type === "REVIEW_ITEM") return "확인 항목";
  if (type === "DOCUMENT_DRAFT") return "문서 초안";
  if (type === "DAILY_SUMMARY") return "하루정리";
  return "후보";
}

function suggestionText(suggestion: AgentSuggestionResponse) {
  const preferred = ["title", "name", "label", "summary", "question", "description", "content"]
    .map((key) => suggestion.payloadJson[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return preferred ?? suggestionTypeLabel(suggestion.suggestionType);
}

function activeTaskStatus(status: TaskStatus) {
  return status === "BLOCKED" ? "REVIEW" : status;
}

function earliestDueLabel(tasks: TaskResponse[]) {
  const earliest = tasks
    .map((task) => task.dueAt)
    .filter((dueAt): dueAt is string => Boolean(dueAt))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  return formatDue(earliest);
}

function sourceLabel(task: TaskResponse, wbsTitle?: string | null) {
  if (task.wbsItemId && wbsTitle) return `WBS · ${wbsTitle}`;
  if (task.wbsItemId) return "WBS 연결";
  return "승인 할 일";
}

function getDropIndicators(status: TaskStatus) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-work-drop-status="${status}"]`));
}

function clearIndicators(indicators: HTMLElement[]) {
  indicators.forEach((indicator) => {
    indicator.dataset.active = "false";
  });
}

function nearestIndicator(event: DragEvent<HTMLElement>, indicators: HTMLElement[]) {
  return indicators.reduce(
    (closest, indicator) => {
      const box = indicator.getBoundingClientRect();
      const offset = event.clientY - (box.top + 42);

      if (offset < 0 && offset > closest.offset) {
        return { indicator, offset };
      }

      return closest;
    },
    {
      indicator: indicators[indicators.length - 1],
      offset: Number.NEGATIVE_INFINITY,
    },
  );
}

function DropIndicator({ beforeId, status }: { beforeId: string | null; status: TaskStatus }) {
  return (
    <span
      aria-hidden="true"
      className={styles.dropIndicator}
      data-active="false"
      data-before={beforeId ?? "-1"}
      data-work-drop-status={status}
    />
  );
}

function ProjectRoomWorkCard({
  onSelect,
  task,
  wbsTitle,
  onDragStart,
  selected,
}: {
  onDragStart: (event: DragEvent<HTMLElement>, task: LocalTask) => void;
  onSelect: (taskId: string) => void;
  selected: boolean;
  task: LocalTask;
  wbsTitle?: string | null;
}) {
  const dueLabel = formatDue(task.dueAt);

  return (
    <article
      className={cn(styles.card, selected && styles.cardSelected)}
      draggable
      onDragStart={(event) => onDragStart(event, task)}
      onClick={() => onSelect(task.id)}
    >
      <GripVertical aria-hidden="true" className={styles.grip} size={16} strokeWidth={2} />
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <strong>{task.title}</strong>
          <StatusBadge tone={taskTone(task.status)}>{statusLabel(task.status)}</StatusBadge>
        </div>
        <p>{[sourceLabel(task, wbsTitle), dueLabel].filter(Boolean).join(" · ")}</p>
      </div>
    </article>
  );
}

function WbsRow({
  childCount,
  code,
  dueLabel,
  item,
  linkedCount,
  level,
  onSelect,
  selected,
}: {
  childCount: number;
  code: string;
  dueLabel: string | null;
  item: WbsItemResponse;
  linkedCount: number;
  level: number;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  return (
    <button
      className={cn(styles.wbsRow, selected && styles.wbsRowSelected)}
      onClick={() => onSelect(item.id)}
      style={{ "--wbs-depth": level } as CSSProperties}
      type="button"
    >
      <span className={styles.wbsCode}>{code}</span>
      <span className={styles.wbsMain}>
        <strong>{item.title}</strong>
        <small>{item.parentId ? "하위 작업" : "상위 작업"}</small>
      </span>
      <StatusBadge tone={taskTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
      <span className={styles.wbsMetric}>{linkedCount}</span>
      <span className={styles.wbsDate}>{dueLabel ?? "-"}</span>
      <span className={styles.wbsMetric}>{childCount}</span>
    </button>
  );
}

function SuggestionRow({ suggestion }: { suggestion: AgentSuggestionResponse }) {
  return (
    <article className={styles.suggestion}>
      <span className={styles.suggestionIcon} aria-hidden="true">
        <Bot size={15} strokeWidth={2} />
      </span>
      <span>
        <strong>{suggestionText(suggestion)}</strong>
        <small>{suggestionTypeLabel(suggestion.suggestionType)}</small>
      </span>
      <StatusBadge tone="agent">후보</StatusBadge>
    </article>
  );
}

export function ProjectRoomWorkBoard({
  board,
  roomId,
  suggestions,
}: {
  board: WbsBoardResponse;
  roomId: string;
  suggestions: AgentSuggestionResponse[];
}) {
  const boardVersion = [
    roomId,
    board.tasks.map((task) => `${task.id}:${task.updatedAt}:${task.status}`).join("|"),
    board.wbsItems.map((item) => `${item.id}:${item.updatedAt}`).join("|"),
  ].join("::");

  return <ProjectRoomWorkBoardContent board={board} key={boardVersion} roomId={roomId} suggestions={suggestions} />;
}

function ProjectRoomWorkBoardContent({
  board,
  roomId,
  suggestions,
}: {
  board: WbsBoardResponse;
  roomId: string;
  suggestions: AgentSuggestionResponse[];
}) {
  const initialWbs = board.wbsItems[0] ?? null;
  const [tasks, setTasks] = useState<LocalTask[]>(board.tasks);
  const [wbsItems, setWbsItems] = useState<WbsItemResponse[]>(board.wbsItems);
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(initialWbs?.id ?? null);
  const [removedNotice, setRemovedNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(board.tasks[0]?.id ?? null);
  const [trashActive, setTrashActive] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "suggestions" | "wbs">("wbs");
  const [wbsDraft, setWbsDraft] = useState({ title: "" });
  const [wbsEditDraft, setWbsEditDraft] = useState<WbsEditDraft>(() => ({
    title: initialWbs?.title ?? "",
    wbsId: initialWbs?.id ?? null,
  }));

  const wbsTitleById = useMemo(() => Object.fromEntries(wbsItems.map((item) => [item.id, item.title])), [wbsItems]);
  const wbsTree = useMemo(() => {
    const childrenByParent = wbsItems.reduce<Record<string, WbsItemResponse[]>>((acc, item) => {
      const parentKey = item.parentId ?? "__root__";
      acc[parentKey] = [...(acc[parentKey] ?? []), item];
      return acc;
    }, {});

    Object.values(childrenByParent).forEach((items) => {
      items.sort((a, b) => a.orderNo - b.orderNo || a.createdAt.localeCompare(b.createdAt));
    });

    const rows: WbsItemResponse[] = [];
    const codeById: Record<string, string> = {};

    const visit = (parentKey: string, prefix: string) => {
      const children = childrenByParent[parentKey] ?? [];
      children.forEach((item, index) => {
        const code = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        codeById[item.id] = code;
        rows.push(item);
        visit(item.id, code);
      });
    };

    visit("__root__", "");

    return { codeById, rows };
  }, [wbsItems]);
  const childCountByWbsId = useMemo(() => {
    return wbsItems.reduce<Record<string, number>>((acc, item) => {
      if (item.parentId) {
        acc[item.parentId] = (acc[item.parentId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [wbsItems]);
  const wbsDepthById = useMemo(() => {
    const byId = new Map(wbsItems.map((item) => [item.id, item]));
    const depthOf = (item: WbsItemResponse, seen = new Set<string>()): number => {
      if (!item.parentId || seen.has(item.parentId)) return 0;
      const parent = byId.get(item.parentId);
      if (!parent) return 0;
      seen.add(item.id);
      return Math.min(3, depthOf(parent, seen) + 1);
    };

    return Object.fromEntries(wbsItems.map((item) => [item.id, depthOf(item)]));
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
  const linkedCountByWbsId = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      if (task.wbsItemId && !task.localRemoved) {
        acc[task.wbsItemId] = (acc[task.wbsItemId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [tasks]);
  const dueLabelByWbsId = useMemo(() => {
    return Object.fromEntries(
      wbsItems.map((item) => {
        const linkedTasks = tasks.filter((task) => task.wbsItemId === item.id && !task.localRemoved);
        return [item.id, earliestDueLabel(linkedTasks)];
      }),
    );
  }, [tasks, wbsItems]);

  const visibleTasks = tasks.filter((task) => !task.localRemoved);
  const selectedWbs = selectedWbsId ? wbsItems.find((item) => item.id === selectedWbsId) : null;
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
  const currentViewCopy = viewCopy[viewMode];
  const activeWbsEditDraft =
    selectedWbs && wbsEditDraft.wbsId === selectedWbs.id
      ? wbsEditDraft
      : {
          title: selectedWbs?.title ?? "",
          wbsId: selectedWbs?.id ?? null,
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
    setSelectedWbsId(optimistic.id);
    setWbsDraft({ title: "" });
    setSaveNotice("WBS 저장 중");

    try {
      const created = await wbsApi.createItem(roomId, {
        orderNo: optimistic.orderNo,
        parentId: optimistic.parentId,
        title,
      });
      setWbsItems((current) => current.map((item) => (item.id === optimistic.id ? created : item)));
      setSelectedWbsId(created.id);
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
    setSelectedWbsId(fallbackId);
    setSaveNotice("WBS 삭제 중");

    void wbsApi
      .deleteItem(selectedWbs.id)
      .then(() => {
        setSaveNotice("WBS 삭제됨");
      })
      .catch(() => {
        setWbsItems(previousItems);
        setSelectedWbsId(selectedWbs.id);
        setSaveNotice("WBS 서버 저장 대기");
      });
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

  const handleDragStart = (event: DragEvent<HTMLElement>, task: LocalTask) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
    event.dataTransfer.setData("application/x-bubli-task-id", task.id);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    const indicators = getDropIndicators(status);
    clearIndicators(indicators);
    nearestIndicator(event, indicators).indicator.dataset.active = "true";
    setActiveColumn(status);
  };

  const handleDragLeave = (status: TaskStatus) => {
    clearIndicators(getDropIndicators(status));
    setActiveColumn((current) => (current === status ? null : current));
  };

  const handleDrop = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("application/x-bubli-task-id") || event.dataTransfer.getData("text/plain");
    const indicators = getDropIndicators(status);
    const before = nearestIndicator(event, indicators).indicator.dataset.before ?? "-1";

    clearIndicators(indicators);
    setActiveColumn(null);

    if (!taskId) return;

    setTasks((current) => {
      const task = current.find((item) => item.id === taskId);
      if (!task) return current;

      const movedTask = { ...task, status };
      const rest = current.filter((item) => item.id !== taskId);

      if (task.status !== status) {
        void persistTaskStatus(task.id, status);
      }

      if (before === "-1" || before === taskId) {
        return [...rest, movedTask];
      }

      const insertAt = rest.findIndex((item) => item.id === before);
      if (insertAt < 0) {
        return [...rest, movedTask];
      }

      return [...rest.slice(0, insertAt), movedTask, ...rest.slice(insertAt)];
    });
  };

  const handleTrashDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("application/x-bubli-task-id") || event.dataTransfer.getData("text/plain");
    setTrashActive(false);

    if (!taskId) return;

    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        setRemovedNotice(`'${task.title}' 카드를 화면에서만 제거했습니다`);
        setSelectedTaskId((selected) => (selected === taskId ? null : selected));
        return { ...task, localRemoved: true };
      }),
    );
  };

  return (
    <div className={styles.shell}>
      <section className={styles.contextBand} aria-label="WBS와 작업판 연결 상태">
        <div className={styles.contextCopy}>
          <StatusBadge tone="room">{currentViewCopy.badge}</StatusBadge>
          <h2>{currentViewCopy.title}</h2>
        </div>
        <div className={styles.contextTools}>
          <div className={styles.viewSwitch} aria-label="작업판 보기 전환">
            <button aria-pressed={viewMode === "kanban"} onClick={() => setViewMode("kanban")} type="button">
              <KanbanSquare size={15} aria-hidden="true" />
              칸반
            </button>
            <button aria-pressed={viewMode === "wbs"} onClick={() => setViewMode("wbs")} type="button">
              <GitBranch size={15} aria-hidden="true" />
              WBS
            </button>
            <button aria-pressed={viewMode === "suggestions"} onClick={() => setViewMode("suggestions")} type="button">
              <Inbox size={15} aria-hidden="true" />
              후보
            </button>
          </div>
          <div className={styles.contextStats} aria-label="작업판 요약">
            <span>
              <GitBranch size={15} aria-hidden="true" /> 구조 {wbsItems.length}
            </span>
            <span>
              <ListTodo size={15} aria-hidden="true" /> 카드 {visibleTasks.length}
            </span>
            <span>
              <Bot size={15} aria-hidden="true" /> 후보 {suggestions.length}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.boardGrid} data-view={viewMode}>
        {viewMode === "wbs" ? (
          <section className={styles.wbsWorkspace} aria-label="WBS 보기">
            <section className={styles.pane} aria-label="WBS 작업 구조표">
              <div className={styles.paneHead}>
                <div>
                  <h2>작업 구조표</h2>
                  <p>선택한 줄의 연결 할 일을 바로 확인합니다.</p>
                </div>
                <StatusBadge tone="neutral">{wbsItems.length}</StatusBadge>
              </div>
              <div className={styles.wbsTableHead} aria-hidden="true">
                <span>번호</span>
                <span>작업명</span>
                <span>상태</span>
                <span>TODO</span>
                <span>기한</span>
                <span>하위</span>
              </div>
              <div className={styles.wbsList} role="list">
                {wbsTree.rows.length > 0 ? (
                  wbsTree.rows.map((item) => (
                    <WbsRow
                      childCount={childCountByWbsId[item.id] ?? 0}
                      code={wbsTree.codeById[item.id] ?? "-"}
                      dueLabel={dueLabelByWbsId[item.id] ?? null}
                      item={item}
                      key={item.id}
                      level={wbsDepthById[item.id] ?? 0}
                      linkedCount={linkedCountByWbsId[item.id] ?? 0}
                      onSelect={setSelectedWbsId}
                      selected={selectedWbsId === item.id}
                    />
                  ))
                ) : (
                  <p className={styles.empty}>현재 데이터가 없습니다</p>
                )}
              </div>
            </section>

            <section className={styles.wbsDetail} aria-label="선택한 WBS 상세">
              <div className={styles.paneHead}>
                <div>
                  <h2>{activeWbsTitle ?? "WBS 선택"}</h2>
                  <p>{selectedWbs?.parentId ? `상위: ${wbsTitleById[selectedWbs.parentId] ?? "상위 항목"}` : "최상위 작업"}</p>
                </div>
                {selectedWbs ? <StatusBadge tone={taskTone(selectedWbs.status)}>{statusLabel(selectedWbs.status)}</StatusBadge> : null}
              </div>

              <div className={styles.detailMetrics}>
                <span>
                  <strong>{selectedWbsTasks.length}</strong>
                  <small>연결 할 일</small>
                </span>
                <span>
                  <strong>{selectedWbs ? dueLabelByWbsId[selectedWbs.id] ?? "-" : "-"}</strong>
                  <small>가까운 마감</small>
                </span>
                <span>
                  <strong>{selectedWbs ? childCountByWbsId[selectedWbs.id] ?? 0 : 0}</strong>
                  <small>하위 작업</small>
                </span>
              </div>

              <div className={styles.linkedTasks}>
                <div className={styles.sectionLabel}>
                  <ListTodo aria-hidden="true" size={16} strokeWidth={2} />
                  <strong>연결된 할 일</strong>
                </div>
                {selectedWbsTasks.length > 0 ? (
                  selectedWbsTasks.map((task) => (
                    <article className={styles.linkedTask} key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{[task.description, formatDue(task.dueAt)].filter(Boolean).join(" · ")}</small>
                      </span>
                      <StatusBadge tone={taskTone(task.status)}>{statusLabel(task.status)}</StatusBadge>
                    </article>
                  ))
                ) : (
                  <p className={styles.empty}>현재 데이터가 없습니다</p>
                )}
              </div>

              <form className={styles.wbsEditor} onSubmit={handleUpdateWbs}>
                <div className={styles.sectionLabel}>
                  <GitBranch aria-hidden="true" size={16} strokeWidth={2} />
                  <strong>선택한 WBS 수정</strong>
                </div>
                {selectedWbs ? (
                  <>
                    <div className={styles.wbsFormGrid}>
                      <label>
                        <span>WBS 이름</span>
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
                    <div className={styles.wbsFormActions}>
                      <button className={styles.primaryAction} type="submit">
                        수정
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
                  <p className={styles.empty}>수정할 WBS를 선택하세요</p>
                )}
              </form>

              <form className={styles.wbsCreate} onSubmit={handleCreateWbs}>
                <div className={styles.sectionLabel}>
                  <GitBranch aria-hidden="true" size={16} strokeWidth={2} />
                  <strong>{selectedWbs ? "하위 WBS 추가" : "WBS 추가"}</strong>
                </div>
                <div className={styles.wbsFormGrid}>
                  <label>
                    <span>WBS 이름</span>
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
            </section>
          </section>
        ) : null}

        {viewMode === "kanban" ? (
          <section className={styles.kanbanPane} aria-label="드래그 가능한 칸반 작업판">
            <div className={styles.paneHead}>
              <div>
                <h2>칸반</h2>
                <p>WBS에서 확정된 할 일을 상태별로 옮깁니다.</p>
              </div>
              <KanbanSquare aria-hidden="true" size={19} strokeWidth={2} />
            </div>

            <div className={styles.columns}>
              {columns.map((column) => {
                const columnTasks = visibleTasks.filter((task) => activeTaskStatus(task.status) === column.status);
                return (
                  <section
                    aria-label={`${column.label} 칸반 열`}
                    className={cn(styles.column, activeColumn === column.status && styles.columnActive)}
                    key={column.status}
                    onDragLeave={() => handleDragLeave(column.status)}
                    onDragOver={(event) => handleDragOver(event, column.status)}
                    onDrop={(event) => handleDrop(event, column.status)}
                  >
                    <header className={styles.columnHead}>
                      <span>
                        <strong>{column.label}</strong>
                        <small>{column.description}</small>
                      </span>
                      <b>{columnTasks.length}</b>
                    </header>
                    <div className={styles.cardList}>
                      {columnTasks.map((task) => (
                        <div key={task.id}>
                          <DropIndicator beforeId={task.id} status={column.status} />
                          <ProjectRoomWorkCard
                            onDragStart={handleDragStart}
                            onSelect={setSelectedTaskId}
                            selected={Boolean(
                              selectedWbsId &&
                                (task.wbsItemId === selectedWbsId ||
                                  Boolean(task.wbsItemId && descendantIdsByWbsId[selectedWbsId]?.includes(task.wbsItemId))),
                            )}
                            task={task}
                            wbsTitle={task.wbsItemId ? wbsTitleById[task.wbsItemId] : null}
                          />
                        </div>
                      ))}
                      <DropIndicator beforeId={null} status={column.status} />
                      {columnTasks.length === 0 ? <p className={styles.empty}>여기에 놓으면 상태가 바뀝니다</p> : null}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className={styles.kanbanFooter}>
              <div
                className={cn(styles.trashZone, trashActive && styles.trashZoneActive)}
                onDragLeave={() => setTrashActive(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setTrashActive(true);
                }}
                onDrop={handleTrashDrop}
                role="region"
                aria-label="카드 화면 제거 영역"
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
                <span>
                  <strong>드래그 제거 영역</strong>
                  <small>보드 표시에서만 뺍니다</small>
                </span>
              </div>
              {removedNotice ? (
                <p className={styles.notice} aria-live="polite">
                  {removedNotice}
                </p>
              ) : null}
              {saveNotice ? (
                <p className={styles.notice} aria-live="polite">
                  {saveNotice}
                </p>
              ) : null}
            </div>

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
                  </div>
                </>
              ) : (
                <p className={styles.empty}>현재 데이터가 없습니다</p>
              )}
            </section>
          </section>
        ) : null}
      </div>

      {viewMode === "suggestions" ? (
        <section className={styles.suggestionTray} aria-label="확정 전 후보">
          <div className={styles.paneHead}>
            <div>
              <h2>확정 전 후보</h2>
              <p>아직 실제 작업이 아닙니다. 필요한 항목만 확인해 반영합니다.</p>
            </div>
            <Link className="bubli-button" href={`/app/agent?roomId=${roomId}`}>
              후보 확인
            </Link>
          </div>
          <div className={styles.suggestionList}>
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => <SuggestionRow key={suggestion.suggestionId} suggestion={suggestion} />)
            ) : (
              <p className={styles.empty}>현재 데이터가 없습니다</p>
            )}
          </div>
        </section>
      ) : null}

      {viewMode === "kanban" && selectedWbsId ? (
        <aside className={styles.selectedWbs} aria-label="선택한 WBS">
          <PanelRightOpen aria-hidden="true" size={17} strokeWidth={2} />
          <span>
            <strong>{activeWbsTitle ?? "WBS 선택 전"}</strong>
            <small>연결 할 일 {selectedWbsTasks.length}개가 칸반에서 강조됩니다</small>
          </span>
        </aside>
      ) : null}
    </div>
  );
}
