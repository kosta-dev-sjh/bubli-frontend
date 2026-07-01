"use client";

import { Bot, CheckCircle2, GitBranch, GripVertical, KanbanSquare, ListTodo, Trash2 } from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { AgentSuggestionResponse } from "@/types/api/agent";
import type { TaskResponse, TaskStatus, WbsBoardResponse, WbsItemResponse } from "@/types/api/work";

import styles from "./project-room-work-board.module.css";

type KanbanColumn = {
  description: string;
  label: string;
  status: TaskStatus;
};

type LocalTask = TaskResponse & {
  localRemoved?: boolean;
};

const columns: KanbanColumn[] = [
  { description: "확정됐지만 아직 시작 전", label: "대기", status: "TODO" },
  { description: "지금 진행 중인 일", label: "진행", status: "IN_PROGRESS" },
  { description: "검토나 막힘 확인", label: "검토", status: "REVIEW" },
  { description: "마무리된 일", label: "완료", status: "DONE" },
];

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
  if (type === "TODO" || type === "TASK") return "TODO 후보";
  if (type === "SCHEDULE") return "일정 후보";
  if (type === "QUESTION") return "확인 질문";
  if (type === "REQUIREMENT") return "요구사항 후보";
  if (type === "CONTRACT_FIELD" || type === "CONTRACT_REVIEW") return "계약 확인";
  if (type === "REVIEW_ITEM") return "확인 항목";
  if (type === "DOCUMENT_DRAFT") return "문서 초안";
  if (type === "DAILY_SUMMARY") return "하루정리";
  return "에이전트 후보";
}

function suggestionText(suggestion: AgentSuggestionResponse) {
  const preferred = ["title", "name", "label", "summary", "question", "description", "content"]
    .map((key) => suggestion.payloadJson[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return preferred ?? suggestionTypeLabel(suggestion.suggestionType);
}

function wbsDue(item: WbsItemResponse) {
  return formatDue(item.dueDate);
}

function activeTaskStatus(status: TaskStatus) {
  return status === "BLOCKED" ? "REVIEW" : status;
}

function sourceLabel(task: TaskResponse, wbsTitle?: string | null) {
  if (task.wbsItemId && wbsTitle) return `WBS · ${wbsTitle}`;
  if (task.wbsItemId) return "WBS 연결";
  return "승인 TODO";
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
  task,
  wbsTitle,
  onDragStart,
  selected,
}: {
  onDragStart: (event: DragEvent<HTMLElement>, task: LocalTask) => void;
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
  item,
  linkedCount,
  onSelect,
  selected,
}: {
  item: WbsItemResponse;
  linkedCount: number;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const dueLabel = wbsDue(item);

  return (
    <button className={cn(styles.wbsRow, selected && styles.wbsRowSelected)} onClick={() => onSelect(item.id)} type="button">
      <span className={styles.wbsRail} aria-hidden="true" />
      <span className={styles.wbsMain}>
        <strong>{item.title}</strong>
        <small>{[dueLabel, linkedCount > 0 ? `TODO ${linkedCount}` : null].filter(Boolean).join(" · ") || "연결 대기"}</small>
      </span>
      <StatusBadge tone={taskTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
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
      <StatusBadge tone="agent">에이전트 후보</StatusBadge>
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
    board.roomId,
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
  const [tasks, setTasks] = useState<LocalTask[]>(board.tasks);
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(board.wbsItems[0]?.id ?? null);
  const [removedNotice, setRemovedNotice] = useState<string | null>(null);
  const [trashActive, setTrashActive] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "wbs">("kanban");

  const wbsTitleById = useMemo(() => Object.fromEntries(board.wbsItems.map((item) => [item.id, item.title])), [board.wbsItems]);
  const linkedCountByWbsId = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      if (task.wbsItemId && !task.localRemoved) {
        acc[task.wbsItemId] = (acc[task.wbsItemId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [tasks]);

  const visibleTasks = tasks.filter((task) => !task.localRemoved);
  const selectedWbsTasks = selectedWbsId ? visibleTasks.filter((task) => task.wbsItemId === selectedWbsId) : [];
  const activeWbsTitle = selectedWbsId ? wbsTitleById[selectedWbsId] : null;

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
        return { ...task, localRemoved: true };
      }),
    );
  };

  return (
    <div className={styles.shell}>
      <section className={styles.contextBand} aria-label="WBS와 작업판 연결 상태">
        <div>
          <StatusBadge tone="room">프로젝트룸 작업판</StatusBadge>
          <h2>작업 구조와 실행 상태</h2>
          <p>WBS로 작업 범위를 확인하고, 칸반에서 승인된 TODO의 상태를 바꿉니다.</p>
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
          </div>
          <div className={styles.contextStats} aria-label="작업판 요약">
            <span>
              <GitBranch size={15} aria-hidden="true" /> WBS {board.wbsItems.length}
            </span>
            <span>
              <ListTodo size={15} aria-hidden="true" /> TODO {visibleTasks.length}
            </span>
            <span>
              <Bot size={15} aria-hidden="true" /> 후보 {suggestions.length}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.boardGrid} data-view={viewMode}>
        <aside className={styles.pane} aria-label="WBS 리스트">
          <div className={styles.paneHead}>
            <div>
              <h2>WBS</h2>
              <p>문서에서 확정된 작업 구조</p>
            </div>
            <StatusBadge tone="neutral">{board.wbsItems.length}</StatusBadge>
          </div>
          <div className={styles.wbsList}>
            {board.wbsItems.length > 0 ? (
              board.wbsItems.slice(0, 12).map((item) => (
                <WbsRow
                  item={item}
                  key={item.id}
                  linkedCount={linkedCountByWbsId[item.id] ?? 0}
                  onSelect={setSelectedWbsId}
                  selected={selectedWbsId === item.id}
                />
              ))
            ) : (
              <p className={styles.empty}>현재 데이터가 없습니다</p>
            )}
          </div>

          <div className={styles.selectedWbs}>
            <CheckCircle2 aria-hidden="true" size={17} strokeWidth={2} />
            <span>
              <strong>{activeWbsTitle ?? "WBS 선택 전"}</strong>
              <small>연결 TODO {selectedWbsTasks.length}개</small>
            </span>
          </div>
        </aside>

        <section className={styles.kanbanPane} aria-label="드래그 가능한 칸반 작업판">
          <div className={styles.paneHead}>
            <div>
              <h2>칸반/TODO</h2>
              <p>승인된 TODO의 상태를 드래그로 바꿉니다</p>
            </div>
            <KanbanSquare aria-hidden="true" size={19} strokeWidth={2} />
          </div>

          <div className={styles.columns}>
            {columns.map((column) => {
              const columnTasks = visibleTasks.filter((task) => activeTaskStatus(task.status) === column.status);
              return (
                <section
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
                          selected={Boolean(selectedWbsId && task.wbsItemId === selectedWbsId)}
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
            {removedNotice ? <p className={styles.notice}>{removedNotice}</p> : null}
          </div>
        </section>

        <aside className={styles.pane} aria-label="에이전트 후보">
          <div className={styles.paneHead}>
            <div>
              <h2>후보</h2>
              <p>승인 전 WBS/TODO</p>
            </div>
            <Link className="bubli-button" href={`/app/agent?roomId=${roomId}`}>
              확인
            </Link>
          </div>
          <div className={styles.suggestionList}>
            {suggestions.length > 0 ? (
              suggestions.slice(0, 4).map((suggestion) => <SuggestionRow key={suggestion.suggestionId} suggestion={suggestion} />)
            ) : (
              <p className={styles.empty}>현재 데이터가 없습니다</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
