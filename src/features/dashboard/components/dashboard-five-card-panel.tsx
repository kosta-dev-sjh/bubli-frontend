"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Clock3, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

export type DashboardFiveCardState = "ready" | "empty" | "loading" | "error";

type DashboardFocusCard = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  meta: string;
  tone: "todo" | "warning" | "agent" | "timer" | "personal";
  value: string;
};

const focusCards: DashboardFocusCard[] = [
  { descriptionKey: "dashboard.five.card.todoDesc", labelKey: "dashboard.five.card.todoLabel", meta: "tasks", tone: "todo", value: "8" },
  { descriptionKey: "dashboard.five.card.deadlineDesc", labelKey: "dashboard.five.card.deadlineLabel", meta: "schedules", tone: "warning", value: "5" },
  { descriptionKey: "dashboard.five.card.reviewDesc", labelKey: "dashboard.five.card.reviewLabel", meta: "agent_suggestions", tone: "agent", value: "3" },
  { descriptionKey: "dashboard.five.card.timerDesc", labelKey: "dashboard.five.card.timerLabel", meta: "time_logs", tone: "timer", value: "03:42" },
  { descriptionKey: "dashboard.five.card.roomDesc", labelKey: "dashboard.five.card.roomLabel", meta: "project_rooms", tone: "personal", value: "4" },
];

const iconMap = {
  agent: AlertCircle,
  personal: FolderKanban,
  timer: Clock3,
  todo: CheckCircle2,
  warning: CalendarDays,
};

const stateCopyKeys: Record<
  Exclude<DashboardFiveCardState, "ready">,
  { action: MessageKey; body: MessageKey; chip: MessageKey; title: MessageKey }
> = {
  empty: {
    action: "dashboard.five.state.emptyAction",
    body: "dashboard.five.state.emptyBody",
    chip: "dashboard.five.state.emptyChip",
    title: "dashboard.five.state.emptyTitle",
  },
  error: {
    action: "dashboard.five.state.errorAction",
    body: "dashboard.five.state.errorBody",
    chip: "dashboard.five.state.errorChip",
    title: "dashboard.five.state.errorTitle",
  },
  loading: {
    action: "dashboard.five.state.loadingAction",
    body: "dashboard.five.state.loadingBody",
    chip: "dashboard.five.state.loadingChip",
    title: "dashboard.five.state.loadingTitle",
  },
};

function DashboardFiveCardStatePanel({ state }: { state: Exclude<DashboardFiveCardState, "ready"> }) {
  const { t } = useI18n();
  const copy = stateCopyKeys[state];

  return (
    <GlassPanel className="dashboard-five-card-state">
      <Chip selected>{t(copy.chip)}</Chip>
      <h2>{t(copy.title)}</h2>
      <p>{t(copy.body)}</p>
      <Button disabled={state === "loading"} variant={state === "error" ? "primary" : "quiet"}>
        {t(copy.action)}
      </Button>
    </GlassPanel>
  );
}

export function DashboardFiveCardPanel({ state = "ready" }: { state?: DashboardFiveCardState }) {
  const { t } = useI18n();

  if (state !== "ready") {
    return <DashboardFiveCardStatePanel state={state} />;
  }

  return (
    <section className="dashboard-five-card" aria-label={t("dashboard.five.aria")}>
      <div className="dashboard-five-card__head">
        <div>
          <Chip selected>{t("dashboard.five.kicker")}</Chip>
          <h2>{t("dashboard.five.title")}</h2>
          <p>{t("dashboard.five.subtitle")}</p>
        </div>
        <Button variant="quiet">{t("dashboard.five.configure")}</Button>
      </div>
      <div className="dashboard-five-card__grid">
        {focusCards.map((card) => {
          const Icon = iconMap[card.tone];
          return (
            <GlassPanel className="dashboard-five-card__item" key={card.labelKey}>
              <div className="dashboard-five-card__topline">
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <StatusBadge tone={card.tone}>{card.meta}</StatusBadge>
              </div>
              <strong>{card.value}</strong>
              <b>{t(card.labelKey)}</b>
              <p>{t(card.descriptionKey)}</p>
            </GlassPanel>
          );
        })}
      </div>
    </section>
  );
}
