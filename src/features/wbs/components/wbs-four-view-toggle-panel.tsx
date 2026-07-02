"use client";

import { CalendarRange, GitBranch, KanbanSquare, Milestone } from "lucide-react";
import { useMemo, useState } from "react";

import { WorkItemCard } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type WbsFourViewState = "ready" | "empty" | "loading" | "error";
export type WbsWorkView = "tree" | "kanban" | "timeline" | "gantt";

const viewOptions: Array<{ icon: typeof GitBranch; key: WbsWorkView; labelKey: MessageKey }> = [
  { icon: GitBranch, key: "tree", labelKey: "wbs.view.tree" },
  { icon: KanbanSquare, key: "kanban", labelKey: "wbs.view.kanban" },
  { icon: CalendarRange, key: "timeline", labelKey: "wbs.view.timeline" },
  { icon: Milestone, key: "gantt", labelKey: "wbs.view.gantt" },
];

const sampleTasks: Array<{ code: string; dueKey: MessageKey; status: "doing" | "review" | "waiting"; titleKey: MessageKey }> = [
  { code: "1.1", dueKey: "wbs.board.due.dMinus2", status: "doing", titleKey: "wbs.fourView.sampleTask1" },
  { code: "1.2", dueKey: "wbs.fourView.dueTomorrow", status: "review", titleKey: "wbs.fourView.sampleTask2" },
  { code: "2.1", dueKey: "wbs.fourView.dueJun25", status: "waiting", titleKey: "wbs.fourView.sampleTask3" },
];

function WbsFourViewStatePanel({ state, t }: { state: Exclude<WbsFourViewState, "ready">; t: TranslateFn }) {
  const copy = {
    empty: t("wbs.fourView.empty"),
    error: t("wbs.fourView.error"),
    loading: t("wbs.fourView.loading"),
  }[state];

  return (
    <GlassPanel className="wbs-four-view-state">
      <Chip selected>{state === "loading" ? t("wbs.fourView.stateLoading") : state === "empty" ? t("wbs.fourView.stateEmpty") : t("wbs.fourView.stateError")}</Chip>
      <h2>{t("wbs.fourView.stateTitle")}</h2>
      <p>{copy}</p>
      <Button disabled={state === "loading"} variant={state === "error" ? "primary" : "quiet"}>
        {state === "error" ? t("wbs.fourView.reload") : t("wbs.fourView.viewCandidates")}
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
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<WbsWorkView>(initialView);
  const activeCopy = useMemo(
    () =>
      ({
        gantt: {
          body: t("wbs.fourView.gantt.body"),
          title: t("wbs.view.gantt"),
        },
        kanban: {
          body: t("wbs.fourView.kanban.body"),
          title: t("wbs.view.kanban"),
        },
        timeline: {
          body: t("wbs.fourView.timeline.body"),
          title: t("wbs.view.timeline"),
        },
        tree: {
          body: t("wbs.fourView.tree.body"),
          title: t("wbs.view.tree"),
        },
      })[activeView],
    [activeView, t],
  );

  if (state !== "ready") {
    return <WbsFourViewStatePanel state={state} t={t} />;
  }

  return (
    <section className="wbs-four-view" aria-label={t("wbs.fourView.regionAria")}>
      <div className="wbs-four-view__head">
        <div>
          <Chip selected>{t("wbs.fourView.badge")}</Chip>
          <h2>{t("wbs.fourView.heading")}</h2>
          <p>{t("wbs.fourView.subtitle")}</p>
        </div>
        <div className="wbs-four-view__tabs" role="tablist" aria-label={t("wbs.fourView.tabsAria")}>
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
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <GlassPanel className="wbs-four-view__stage">
        <div className="wbs-four-view__stage-head">
          <div>
            <StatusBadge tone="todo">{t("wbs.fourView.stageTitle", { view: activeCopy.title })}</StatusBadge>
            <h3>{activeCopy.body}</h3>
          </div>
          <span>{t("wbs.fourView.sourceCount")}</span>
        </div>
        <div className={`wbs-four-view__preview wbs-four-view__preview--${activeView}`}>
          {sampleTasks.map((task) => (
            <WorkItemCard
              assignee={t("wbs.fourView.assigneeMe")}
              code={task.code}
              dueLabel={t(task.dueKey)}
              key={task.code}
              sourceLabel={activeView === "tree" ? `WBS ${task.code}` : activeCopy.title}
              status={task.status}
              title={t(task.titleKey)}
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
              <span>{t("wbs.fourView.column.waiting")}</span>
              <span>{t("wbs.fourView.column.doing")}</span>
              <span>{t("wbs.fourView.column.review")}</span>
              <span>{t("wbs.fourView.column.done")}</span>
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </section>
  );
}
