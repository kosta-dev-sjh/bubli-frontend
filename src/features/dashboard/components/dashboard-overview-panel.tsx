"use client";

import { BellRing, CalendarDays, CheckCircle2, Clock3, LayoutDashboard, Sparkles } from "lucide-react";

import { WorkItemCard } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type TranslateFn = (key: MessageKey) => string;

type DashboardMetric = {
  labelKey: MessageKey;
  value: string;
  tone: "todo" | "warning" | "agent" | "timer";
  descriptionKey: MessageKey;
};

const metrics: DashboardMetric[] = [
  { descriptionKey: "dashboard.overview.metric.todoDesc", labelKey: "dashboard.overview.metric.todoLabel", tone: "todo", value: "8" },
  { descriptionKey: "dashboard.overview.metric.deadlineDesc", labelKey: "dashboard.overview.metric.deadlineLabel", tone: "warning", value: "5" },
  { descriptionKey: "dashboard.overview.metric.reviewDesc", labelKey: "dashboard.overview.metric.reviewLabel", tone: "agent", value: "3" },
  { descriptionKey: "dashboard.overview.metric.timerDesc", labelKey: "dashboard.overview.metric.timerLabel", tone: "timer", value: "03:42" },
];

function MetricCard({ metric, t }: { metric: DashboardMetric; t: TranslateFn }) {
  return (
    <GlassPanel className="dashboard-metric">
      <StatusBadge tone={metric.tone}>{t(metric.labelKey)}</StatusBadge>
      <strong>{metric.value}</strong>
      <span>{t(metric.descriptionKey)}</span>
    </GlassPanel>
  );
}

export function DashboardOverviewPanel() {
  const { t } = useI18n();

  return (
    <section className="dashboard-overview" aria-label={t("dashboard.overview.aria")}>
      <GlassPanel className="dashboard-overview__hero">
        <div className="dashboard-overview__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <LayoutDashboard size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("dashboard.overview.kicker")}</Chip>
            <h2>{t("dashboard.overview.title")}</h2>
            <p>
              {t("dashboard.overview.subtitle")}
            </p>
          </div>
        </div>
        <div className="dashboard-overview__actions">
          <Button icon={<Sparkles size={15} />} variant="primary">
            {t("dashboard.overview.dailyCta")}
          </Button>
          <Button icon={<LayoutDashboard size={15} />} variant="quiet">
            {t("dashboard.overview.configure")}
          </Button>
        </div>
      </GlassPanel>

      <div className="dashboard-overview__metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.labelKey} metric={metric} t={t} />
        ))}
      </div>

      <div className="dashboard-overview__grid">
        <GlassPanel className="dashboard-overview__panel">
          <div className="dashboard-overview__panel-head">
            <h3>{t("dashboard.overview.myTodo")}</h3>
            <Button size="sm" variant="ghost">
              {t("dashboard.overview.viewAll")}
            </Button>
          </div>
          <div className="dashboard-overview__stack">
            <WorkItemCard
              assignee={t("dashboard.overview.todo1Assignee")}
              code="D-2"
              dueLabel={t("dashboard.overview.todo1Due")}
              sourceLabel={t("dashboard.overview.todo1Source")}
              status="doing"
              title={t("dashboard.overview.todo1Title")}
            />
            <WorkItemCard
              assignee={t("dashboard.overview.todo2Assignee")}
              code={t("dashboard.overview.todo2Code")}
              dueLabel={t("dashboard.overview.todo2Due")}
              sourceLabel={t("dashboard.overview.todo2Source")}
              status="review"
              title={t("dashboard.overview.todo2Title")}
            />
          </div>
        </GlassPanel>

        <GlassPanel className="dashboard-overview__panel">
          <div className="dashboard-overview__panel-head">
            <h3>{t("dashboard.overview.reviewTitle")}</h3>
            <Button size="sm" variant="ghost">
              {t("dashboard.overview.viewCandidates")}
            </Button>
          </div>
          <div className="dashboard-check-list">
            <article>
              <BellRing size={16} strokeWidth={2.1} />
              <div>
                <b>{t("dashboard.overview.check1Title")}</b>
                <p>{t("dashboard.overview.check1Sub")}</p>
              </div>
            </article>
            <article>
              <CheckCircle2 size={16} strokeWidth={2.1} />
              <div>
                <b>{t("dashboard.overview.check2Title")}</b>
                <p>{t("dashboard.overview.check2Sub")}</p>
              </div>
            </article>
          </div>
        </GlassPanel>

        <GlassPanel className="dashboard-overview__panel dashboard-overview__panel--wide">
          <div className="dashboard-overview__panel-head">
            <h3>{t("dashboard.overview.todaySummary")}</h3>
            <Button size="sm" variant="ghost">
              {t("dashboard.overview.cardSettings")}
            </Button>
          </div>
          <div className="dashboard-handoff-row">
            <article>
              <span>{t("dashboard.overview.summaryTodo")}</span>
              <strong>{t("dashboard.overview.summaryTodoValue")}</strong>
              <p>{t("dashboard.overview.summaryTodoDesc")}</p>
            </article>
            <article>
              <span>{t("dashboard.overview.summarySchedule")}</span>
              <strong>{t("dashboard.overview.summaryScheduleValue")}</strong>
              <p>{t("dashboard.overview.summaryScheduleDesc")}</p>
            </article>
            <article>
              <span>{t("dashboard.overview.summaryTimer")}</span>
              <strong>{t("dashboard.overview.summaryTimerValue")}</strong>
              <p>{t("dashboard.overview.summaryTimerDesc")}</p>
            </article>
          </div>
        </GlassPanel>

        <GlassPanel className="dashboard-overview__policy">
          <h3>{t("dashboard.overview.policyTitle")}</h3>
          <div>
            <CalendarDays size={16} strokeWidth={2.1} />
            <p>{t("dashboard.overview.policy1")}</p>
          </div>
          <div>
            <Clock3 size={16} strokeWidth={2.1} />
            <p>{t("dashboard.overview.policy2")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
