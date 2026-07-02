"use client";

import { CalendarCheck2, CheckCircle2, Clock3, Database, FileText, ListTodo, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type TranslateFn = (key: MessageKey) => string;

type SummarySource = {
  labelKey: MessageKey;
  valueKey: MessageKey;
  detailKey: MessageKey;
  tone: "todo" | "timer" | "pending" | "agent";
};

const summarySources: SummarySource[] = [
  {
    detailKey: "dashboard.daily.source.doneTodoDetail",
    labelKey: "dashboard.daily.source.doneTodoLabel",
    tone: "todo",
    valueKey: "dashboard.daily.source.doneTodoValue",
  },
  {
    detailKey: "dashboard.daily.source.timerDetail",
    labelKey: "dashboard.daily.source.timerLabel",
    tone: "timer",
    valueKey: "dashboard.daily.source.timerValue",
  },
  {
    detailKey: "dashboard.daily.source.activityDetail",
    labelKey: "dashboard.daily.source.activityLabel",
    tone: "pending",
    valueKey: "dashboard.daily.source.activityValue",
  },
  {
    detailKey: "dashboard.daily.source.agentDetail",
    labelKey: "dashboard.daily.source.agentLabel",
    tone: "agent",
    valueKey: "dashboard.daily.source.agentValue",
  },
];

function SummarySourceCard({ source, t }: { source: SummarySource; t: TranslateFn }) {
  return (
    <article className="daily-summary-source">
      <StatusBadge tone={source.tone}>{t(source.labelKey)}</StatusBadge>
      <strong>{t(source.valueKey)}</strong>
      <span>{t(source.detailKey)}</span>
    </article>
  );
}

export function DailySummaryPanel() {
  const { t } = useI18n();

  return (
    <section className="daily-summary" aria-label={t("dashboard.daily.aria")}>
      <GlassPanel className="daily-summary__hero">
        <div className="daily-summary__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("dashboard.daily.kicker")}</Chip>
            <h2>{t("dashboard.daily.heroTitle")}</h2>
            <p>
              {t("dashboard.daily.heroBody")}
            </p>
          </div>
        </div>
        <div className="daily-summary__score">
          <StatusBadge tone="pending">{t("dashboard.daily.reviewWaiting")}</StatusBadge>
          <strong>82%</strong>
          <span>{t("dashboard.daily.readiness")}</span>
          <ProgressBar label={t("dashboard.daily.readiness")} value={82} />
        </div>
      </GlassPanel>

      <div className="daily-summary__grid">
        <GlassPanel className="daily-summary__draft">
          <div className="daily-summary__draft-header">
            <div>
              <h3>{t("dashboard.daily.draftTitle")}</h3>
              <p>{t("dashboard.daily.draftHelper")}</p>
            </div>
            <Chip icon={<CalendarCheck2 size={14} />}>2026-06-22</Chip>
          </div>

          <div className="daily-summary__draft-body">
            <article>
              <span className="bubli-icon-tile" aria-hidden="true">
                <ListTodo size={16} strokeWidth={2.1} />
              </span>
              <p>{t("dashboard.daily.draftLine1")}</p>
            </article>
            <article>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Clock3 size={16} strokeWidth={2.1} />
              </span>
              <p>{t("dashboard.daily.draftLine2")}</p>
            </article>
            <article>
              <span className="bubli-icon-tile" aria-hidden="true">
                <FileText size={16} strokeWidth={2.1} />
              </span>
              <p>{t("dashboard.daily.draftLine3")}</p>
            </article>
          </div>

          <footer className="daily-summary__actions">
            <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
              {t("dashboard.daily.saveAfterCheck")}
            </Button>
            <Button size="sm" variant="quiet">
              {t("dashboard.daily.edit")}
            </Button>
          </footer>
        </GlassPanel>

        <GlassPanel className="daily-summary__source-panel">
          <h3>{t("dashboard.daily.inputBasis")}</h3>
          <div className="daily-summary__sources">
            {summarySources.map((source) => (
              <SummarySourceCard key={source.labelKey} source={source} t={t} />
            ))}
          </div>
          <div className="daily-summary__rule">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>
              {t("dashboard.daily.rule")}
            </p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
