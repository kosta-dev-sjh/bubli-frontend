"use client";

import { CalendarDays, KanbanSquare, LayoutDashboard, MonitorUp } from "lucide-react";

import { SuggestionCard } from "@/components/domain/suggestion-card";
import { WorkItemCard } from "@/components/domain/work-item-card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const flowSteps: Array<{ bodyKey: MessageKey; titleKey: MessageKey }> = [
  { bodyKey: "wbs.board.flow.candidateBody", titleKey: "wbs.board.flow.candidateTitle" },
  { bodyKey: "wbs.board.flow.confirmBody", titleKey: "wbs.board.flow.confirmTitle" },
  { bodyKey: "wbs.board.flow.singleBody", titleKey: "wbs.board.flow.singleTitle" },
  { bodyKey: "wbs.board.flow.linkBody", titleKey: "wbs.board.flow.linkTitle" },
];

const treeItems: Array<{ code: string; titleKey: MessageKey; countKey: MessageKey }> = [
  { code: "1", titleKey: "wbs.board.tree1.title", countKey: "wbs.board.tree1.count" },
  { code: "1.1", titleKey: "wbs.board.tree11.title", countKey: "wbs.board.tree11.count" },
  { code: "1.2", titleKey: "wbs.board.tree12.title", countKey: "wbs.board.tree12.count" },
  { code: "1.3", titleKey: "wbs.board.tree13.title", countKey: "wbs.board.tree13.count" },
  { code: "2", titleKey: "wbs.board.tree2.title", countKey: "wbs.board.tree2.count" },
];

type BoardCard = { code: string; dueKey: MessageKey; sourceKey: MessageKey; status: "waiting" | "doing" | "review" | "done"; titleKey: MessageKey };

const columns: Array<{ items: BoardCard[]; titleKey: MessageKey }> = [
  {
    items: [
      {
        code: "1.2.1",
        dueKey: "wbs.board.due.dMinus2",
        sourceKey: "wbs.board.card.reviewQuestions.source",
        status: "waiting",
        titleKey: "wbs.board.card.reviewQuestions.title",
      },
    ],
    titleKey: "wbs.board.column.waiting",
  },
  {
    items: [
      {
        code: "1.2.2",
        dueKey: "wbs.board.due.today",
        sourceKey: "wbs.board.card.firstDraft.source",
        status: "doing",
        titleKey: "wbs.board.card.firstDraft.title",
      },
      {
        code: "1.2.3",
        dueKey: "wbs.board.due.today",
        sourceKey: "wbs.board.card.glossary.source",
        status: "doing",
        titleKey: "wbs.board.card.glossary.title",
      },
    ],
    titleKey: "wbs.board.column.doing",
  },
  {
    items: [
      {
        code: "1.3.1",
        dueKey: "wbs.board.due.jun24",
        sourceKey: "wbs.board.card.interimReport.source",
        status: "review",
        titleKey: "wbs.board.card.interimReport.title",
      },
    ],
    titleKey: "wbs.board.column.review",
  },
  {
    items: [
      {
        code: "1.1.1",
        dueKey: "wbs.board.due.done",
        sourceKey: "wbs.board.card.structure.source",
        status: "done",
        titleKey: "wbs.board.card.structure.title",
      },
    ],
    titleKey: "wbs.board.column.done",
  },
];

const targets: Array<{ icon: typeof KanbanSquare; textKey: MessageKey; titleKey: MessageKey }> = [
  { icon: KanbanSquare, textKey: "wbs.board.target.board.text", titleKey: "wbs.board.target.board.title" },
  { icon: LayoutDashboard, textKey: "wbs.board.target.dashboard.text", titleKey: "wbs.board.target.dashboard.title" },
  { icon: MonitorUp, textKey: "wbs.board.target.bubble.text", titleKey: "wbs.board.target.bubble.title" },
  { icon: CalendarDays, textKey: "wbs.board.target.schedule.text", titleKey: "wbs.board.target.schedule.title" },
];

export function WbsTodoBoard() {
  const { t } = useI18n();

  return (
    <section className="work-board" aria-label={t("wbs.board.regionAria")}>
      <div className="work-board__focus">
        <GlassPanel className="work-board__todo">
          <StatusBadge tone="todo">{t("wbs.board.focusBadge")}</StatusBadge>
          <h2>{t("wbs.board.focusTitle")}</h2>
          <p>{t("wbs.board.focusMeta")}</p>
        </GlassPanel>
        <div className="work-board__targets">
          {targets.map((target) => {
            const Icon = target.icon;
            return (
              <div className="work-board__target" key={target.titleKey}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <b>{t(target.titleKey)}</b>
                <span>{t(target.textKey)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="work-board__flow" aria-label={t("wbs.board.flowAria")}>
        {flowSteps.map((step, index) => (
          <GlassPanel className="work-board__flow-step" key={step.titleKey}>
            <StatusBadge tone={index === 2 ? "todo" : "personal"}>{String(index + 1).padStart(2, "0")}</StatusBadge>
            <div>
              <b>{t(step.titleKey)}</b>
              <span>{t(step.bodyKey)}</span>
            </div>
          </GlassPanel>
        ))}
      </div>

      <div className="work-board__grid">
        <aside className="work-board__pane" aria-label={t("wbs.board.treeAria")}>
          <div className="work-board__pane-head">
            <div>
              <h2>{t("wbs.board.treeTitle")}</h2>
              <p>{t("wbs.board.treeDesc")}</p>
            </div>
          </div>
          <ul className="work-board__tree">
            {treeItems.map((item) => (
              <li key={item.code}>
                <b>
                  {item.code}. {t(item.titleKey)}
                </b>
                {t(item.countKey)}
              </li>
            ))}
          </ul>
        </aside>

        <section className="work-board__pane" aria-label={t("wbs.board.boardAria")}>
          <div className="work-board__pane-head">
            <div>
              <h2>{t("wbs.board.boardTitle")}</h2>
              <p>{t("wbs.board.boardDesc")}</p>
            </div>
            <StatusBadge tone="approved">{t("wbs.board.approvedBadge")}</StatusBadge>
          </div>
          <div className="work-board__kanban">
            {columns.map((column) => (
              <div className="work-board__column" key={column.titleKey}>
                <h3>{t(column.titleKey)}</h3>
                {column.items.map((item) => (
                  <WorkItemCard
                    assignee={t("wbs.board.assigneeMe")}
                    code={item.code}
                    dueLabel={t(item.dueKey)}
                    key={item.code}
                    sourceLabel={t(item.sourceKey)}
                    status={item.status}
                    title={t(item.titleKey)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        <aside className="work-board__pane" aria-label={t("wbs.board.candidateAria")}>
          <div className="work-board__pane-head">
            <div>
              <h2>{t("wbs.board.candidateTitle")}</h2>
              <p>{t("wbs.board.candidateDesc")}</p>
            </div>
          </div>
          <div className="work-board__candidate-note">{t("wbs.board.candidateNote")}</div>
          <SuggestionCard
            confidence={92}
            description={t("wbs.board.suggestion1.description")}
            source="회의록_0618.md"
            title={t("wbs.board.suggestion1.title")}
          />
          <SuggestionCard
            confidence={86}
            description={t("wbs.board.suggestion2.description")}
            source="요구사항_정리.docx"
            title={t("wbs.board.suggestion2.title")}
          />
        </aside>
      </div>
    </section>
  );
}
