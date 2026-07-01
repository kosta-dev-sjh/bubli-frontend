"use client";

import { CalendarRange, GitBranch, KanbanSquare, Milestone } from "lucide-react";
import { useMemo, useState } from "react";

import { WorkItemCard } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

export type WbsFourViewState = "ready" | "empty" | "loading" | "error";
export type WbsWorkView = "tree" | "kanban" | "timeline" | "gantt";

const viewOptions: Array<{ icon: typeof GitBranch; key: WbsWorkView; label: string }> = [
  { icon: GitBranch, key: "tree", label: "트리" },
  { icon: KanbanSquare, key: "kanban", label: "칸반" },
  { icon: CalendarRange, key: "timeline", label: "타임라인" },
  { icon: Milestone, key: "gantt", label: "간트" },
];

const sampleTasks = [
  { code: "1.1", dueLabel: "D-2", status: "doing" as const, title: "1차 번역본 검토" },
  { code: "1.2", dueLabel: "내일", status: "review" as const, title: "검수 기준 질문 정리" },
  { code: "2.1", dueLabel: "6월 25일", status: "waiting" as const, title: "용어집 초안 정리" },
];

function WbsFourViewStatePanel({ state }: { state: Exclude<WbsFourViewState, "ready"> }) {
  const copy = {
    empty: "승인된 WBS/TODO가 아직 없습니다. 에이전트 후보를 승인하면 작업판 보기에 나타납니다.",
    error: "작업판 데이터를 불러오지 못했습니다. 확정 데이터는 서버에 남아 있으므로 다시 조회할 수 있습니다.",
    loading: "WBS와 TODO를 작업판 보기로 정리하는 중입니다.",
  }[state];

  return (
    <GlassPanel className="wbs-four-view-state">
      <Chip selected>{state === "loading" ? "로딩" : state === "empty" ? "빈 상태" : "오류"}</Chip>
      <h2>WBS/작업판</h2>
      <p>{copy}</p>
      <Button disabled={state === "loading"} variant={state === "error" ? "primary" : "quiet"}>
        {state === "error" ? "다시 불러오기" : "후보 보기"}
      </Button>
    </GlassPanel>
  );
}

export function WbsFourViewTogglePanel({
  initialView = "tree",
  state = "ready",
}: {
  initialView?: WbsWorkView;
  state?: WbsFourViewState;
}) {
  const [activeView, setActiveView] = useState<WbsWorkView>(initialView);
  const activeCopy = useMemo(
    () =>
      ({
        gantt: {
          body: "작업 기간과 선후 관계를 가로 축으로 봅니다.",
          title: "간트",
        },
        kanban: {
          body: "대기, 진행 중, 검토, 완료 상태를 기준으로 TODO를 이동합니다.",
          title: "칸반",
        },
        timeline: {
          body: "오늘부터 마감일까지 필요한 작업과 일정을 시간순으로 봅니다.",
          title: "타임라인",
        },
        tree: {
          body: "큰 작업과 하위 작업의 포함 관계를 WBS 번호로 봅니다.",
          title: "트리",
        },
      })[activeView],
    [activeView],
  );

  if (state !== "ready") {
    return <WbsFourViewStatePanel state={state} />;
  }

  return (
    <section className="wbs-four-view" aria-label="WBS 작업판 보기 전환">
      <div className="wbs-four-view__head">
        <div>
          <Chip selected>WBS/작업판</Chip>
          <h2>같은 TODO를 네 가지 보기로 확인합니다</h2>
          <p>보기만 달라질 뿐, TODO 원본은 하나입니다. 작업판, 대시보드, 버블, 일정이 같은 항목을 봅니다.</p>
        </div>
        <div className="wbs-four-view__tabs" role="tablist" aria-label="작업판 보기 선택">
          {viewOptions.map((option) => {
            const Icon = option.icon;
            const selected = activeView === option.key;
            return (
              <button
                aria-selected={selected}
                className="wbs-four-view__tab"
                key={option.key}
                onClick={() => setActiveView(option.key)}
                role="tab"
                type="button"
              >
                <Icon size={15} strokeWidth={2.1} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <GlassPanel className="wbs-four-view__stage">
        <div className="wbs-four-view__stage-head">
          <div>
            <StatusBadge tone="todo">{activeCopy.title} 보기</StatusBadge>
            <h3>{activeCopy.body}</h3>
          </div>
          <span>TODO 원본 3건</span>
        </div>
        <div className={`wbs-four-view__preview wbs-four-view__preview--${activeView}`}>
          {sampleTasks.map((task) => (
            <WorkItemCard
              assignee="나"
              key={task.code}
              sourceLabel={activeView === "tree" ? `WBS ${task.code}` : activeCopy.title}
              {...task}
            />
          ))}
          {activeView === "timeline" || activeView === "gantt" ? (
            <div className="wbs-four-view__rail" aria-hidden="true">
              <span style={{ inlineSize: activeView === "gantt" ? "72%" : "48%" }} />
              <span style={{ inlineSize: activeView === "gantt" ? "46%" : "64%" }} />
              <span style={{ inlineSize: activeView === "gantt" ? "58%" : "35%" }} />
            </div>
          ) : null}
          {activeView === "kanban" ? (
            <div className="wbs-four-view__columns" aria-hidden="true">
              <span>대기</span>
              <span>진행</span>
              <span>검토</span>
              <span>완료</span>
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </section>
  );
}
