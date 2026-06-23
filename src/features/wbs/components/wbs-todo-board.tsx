import { CalendarDays, KanbanSquare, LayoutDashboard, MonitorUp } from "lucide-react";

import { SuggestionCard } from "@/components/domain/suggestion-card";
import { WorkItemCard } from "@/components/domain/work-item-card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

const flowSteps = [
  {
    body: "자료에서 큰 작업과 하위 작업을 후보로 나눕니다.",
    title: "WBS 후보",
  },
  {
    body: "사용자가 후보를 검토하고 승인해야 업무에 반영됩니다.",
    title: "사용자 확정",
  },
  {
    body: "확정된 작업은 복사하지 않고 하나의 TODO로 관리합니다.",
    title: "하나의 TODO",
  },
  {
    body: "같은 TODO가 작업판, 대시보드, 버블, 캘린더에 표시됩니다.",
    title: "실행 화면 연결",
  },
];

const treeItems = [
  { code: "1", title: "번역 프로젝트 관리", count: "8개 작업" },
  { code: "1.1", title: "착수와 계획 수립", count: "4개 작업" },
  { code: "1.2", title: "번역본 작성", count: "6개 작업" },
  { code: "1.3", title: "검수와 납품", count: "5개 작업" },
  { code: "2", title: "요구사항 확인", count: "3개 후보" },
];

const columns = [
  {
    items: [
      {
        code: "1.2.1",
        dueLabel: "D-2",
        sourceLabel: "회의록_0618.md에서 승인",
        status: "waiting" as const,
        title: "검수 기준 질문 정리",
      },
    ],
    title: "대기",
  },
  {
    items: [
      {
        code: "1.2.2",
        dueLabel: "오늘",
        sourceLabel: "번역계약서_v2.pdf에서 승인",
        status: "doing" as const,
        title: "1차 번역본 검토",
      },
      {
        code: "1.2.3",
        dueLabel: "오늘",
        sourceLabel: "요구사항_초안.docx에서 승인",
        status: "doing" as const,
        title: "용어집 초안 정리",
      },
    ],
    title: "진행 중",
  },
  {
    items: [
      {
        code: "1.3.1",
        dueLabel: "6월 24일",
        sourceLabel: "회의록_0618.md에서 승인",
        status: "review" as const,
        title: "중간보고 일정 확인",
      },
    ],
    title: "검토",
  },
  {
    items: [
      {
        code: "1.1.1",
        dueLabel: "완료",
        sourceLabel: "프로젝트룸 생성 시 승인",
        status: "done" as const,
        title: "프로젝트 자료 구조 만들기",
      },
    ],
    title: "완료",
  },
];

const targets = [
  { icon: KanbanSquare, text: "상태 변경과 담당 작업 확인", title: "작업판" },
  { icon: LayoutDashboard, text: "내 TODO와 확인 필요 항목 표시", title: "대시보드" },
  { icon: MonitorUp, text: "작업 중 TODO 버블로 빠르게 확인", title: "버블" },
  { icon: CalendarDays, text: "마감과 일정 후보 연결", title: "캘린더" },
];

export function WbsTodoBoard() {
  return (
    <section className="work-board" aria-label="WBS와 TODO 작업판">
      <div className="work-board__flow" aria-label="WBS 후보에서 실행 화면까지의 흐름">
        {flowSteps.map((step) => (
          <GlassPanel className="work-board__flow-step" key={step.title}>
            <b>{step.title}</b>
            <span>{step.body}</span>
          </GlassPanel>
        ))}
      </div>

      <div className="work-board__focus">
        <GlassPanel className="work-board__todo">
          <StatusBadge tone="todo">하나의 TODO</StatusBadge>
          <h2>1차 번역본 검토</h2>
          <p>담당자 정현 · D-2 · 번역계약서_v2.pdf에서 승인된 작업</p>
        </GlassPanel>
        <div className="work-board__targets">
          {targets.map((target) => {
            const Icon = target.icon;
            return (
              <div className="work-board__target" key={target.title}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <b>{target.title}</b>
                <span>{target.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="work-board__grid">
        <aside className="work-board__pane" aria-label="WBS 트리">
          <div className="work-board__pane-head">
            <div>
              <h2>WBS 트리</h2>
              <p>작업 범위를 큰 단위와 하위 작업으로 봅니다.</p>
            </div>
          </div>
          <ul className="work-board__tree">
            {treeItems.map((item) => (
              <li key={item.code}>
                <b>
                  {item.code}. {item.title}
                </b>
                {item.count}
              </li>
            ))}
          </ul>
        </aside>

        <section className="work-board__pane" aria-label="작업판">
          <div className="work-board__pane-head">
            <div>
              <h2>작업판</h2>
              <p>승인된 TODO의 상태를 칸반 기준으로 확인합니다.</p>
            </div>
            <StatusBadge tone="approved">승인된 작업</StatusBadge>
          </div>
          <div className="work-board__kanban">
            {columns.map((column) => (
              <div className="work-board__column" key={column.title}>
                <h3>{column.title}</h3>
                {column.items.map((item) => (
                  <WorkItemCard assignee="정현" key={item.code} {...item} />
                ))}
              </div>
            ))}
          </div>
        </section>

        <aside className="work-board__pane" aria-label="에이전트 후보">
          <div className="work-board__pane-head">
            <div>
              <h2>에이전트 후보</h2>
              <p>승인 전에는 작업판에 반영하지 않습니다.</p>
            </div>
          </div>
          <div className="work-board__candidate-note">후보는 사용자가 승인한 뒤에만 WBS/작업판, 일정, 대시보드와 버블에 연결됩니다.</div>
          <SuggestionCard
            confidence={92}
            description="회의록에서 검수 기준 확인 작업을 하위 TODO 후보로 제안합니다."
            source="회의록_0618.md"
            title="검수 기준 확인"
          />
          <SuggestionCard
            confidence={86}
            description="요구사항 문서의 용어집 정리를 WBS 하위 작업 후보로 제안합니다."
            source="요구사항_초안.docx"
            title="용어집 정리"
          />
        </aside>
      </div>
    </section>
  );
}
