"use client";

import { AlertCircle, CalendarDays, CircleDashed, RefreshCcw } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { ScheduleOverviewPanel } from "./schedule-overview-panel";

export type CalendarPageState = "ready" | "empty" | "loading" | "error";

export type CalendarPagePanelProps = HTMLAttributes<HTMLElement> & {
  state?: CalendarPageState;
};

function CalendarStatePanel({ state }: { state: Exclude<CalendarPageState, "ready"> }) {
  const { t } = useI18n();
  const stateMeta = {
    empty: { action: "calendar.pageState.empty.action", description: "calendar.pageState.empty.description", icon: CalendarDays, title: "calendar.pageState.empty.title" },
    error: { action: "calendar.pageState.error.action", description: "calendar.pageState.error.description", icon: AlertCircle, title: "calendar.pageState.error.title" },
    loading: { action: "calendar.pageState.loading.action", description: "calendar.pageState.loading.description", icon: CircleDashed, title: "calendar.pageState.loading.title" },
  } as const;

  const meta = stateMeta[state];
  const Icon = meta.icon;
  const chipLabel = state === "loading" ? t("calendar.pageState.chip.loading") : state === "error" ? t("calendar.pageState.chip.error") : t("calendar.pageState.chip.empty");

  return (
    <GlassPanel className="calendar-page-state">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={20} strokeWidth={2.1} />
      </span>
      <div>
        <Chip selected={state === "loading"}>{chipLabel}</Chip>
        <h2>{t(meta.title)}</h2>
        <p>{t(meta.description)}</p>
      </div>
      <Button disabled={state === "loading"} icon={<RefreshCcw size={15} strokeWidth={2.1} />} variant={state === "error" ? "primary" : "quiet"}>
        {t(meta.action)}
      </Button>
    </GlassPanel>
  );
}

export function CalendarPagePanel({ className, state = "ready", ...props }: CalendarPagePanelProps) {
  const { t } = useI18n();
  return (
    <section className={cn("calendar-page", className)} aria-label={t("calendar.pagePanel.aria")} {...props}>
      {state === "ready" ? <ScheduleOverviewPanel /> : <CalendarStatePanel state={state} />}
    </section>
  );
}
