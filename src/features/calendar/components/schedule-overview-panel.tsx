"use client";

import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Link2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { ScheduleResponse } from "@/types/api/work";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ScheduleSource = "internal" | "google";
type ScheduleKind = "meeting" | "deadline" | "focus";

type ScheduleItem = {
  connectedItem: string;
  id: string;
  kind: ScheduleKind;
  projectRoomLabel: string;
  source: ScheduleSource;
  time: string;
  title: string;
};

type ScheduleOverviewPanelProps = {
  autoLoad?: boolean;
  initialSchedules?: ScheduleResponse[];
  roomId?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const kindMeta: Record<ScheduleKind, { labelKey: MessageKey; tone: "communication" | "warning" | "timer" }> = {
  deadline: { labelKey: "calendar.overview.kind.deadline", tone: "warning" },
  focus: { labelKey: "calendar.overview.kind.focus", tone: "timer" },
  meeting: { labelKey: "calendar.overview.kind.meeting", tone: "communication" },
};

function sourceCopy(t: TranslateFn, source: ScheduleSource): string {
  return source === "google" ? "Google Calendar" : t("calendar.overview.source.internal");
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}

function toIsoBoundary(date: Date, endOfDay = false): string {
  const copy = new Date(date);
  copy.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return copy.toISOString();
}

function sameDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function scheduleDate(schedule: ScheduleResponse): Date {
  return new Date(schedule.startsAt);
}

function formatScheduleTime(schedule: ScheduleResponse, locale: Locale, t: TranslateFn): string {
  if (schedule.allDay) {
    return t("calendar.time.allDay");
  }
  const startsAt = scheduleDate(schedule);
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
}

function inferScheduleKind(schedule: ScheduleResponse): ScheduleKind {
  if (schedule.googleEventId) return "meeting";
  if (schedule.taskId || schedule.wbsItemId) return "deadline";
  return "focus";
}

function connectedCopy(t: TranslateFn, schedule: ScheduleResponse): string {
  if (schedule.taskId) return t("calendar.overview.connectedTask", { id: schedule.taskId.slice(0, 8) });
  if (schedule.wbsItemId) return t("calendar.overview.connectedWbs", { id: schedule.wbsItemId.slice(0, 8) });
  return t("calendar.overview.connectedSchedule");
}

function roomCopy(t: TranslateFn, schedule: ScheduleResponse): string {
  if (!schedule.roomId) return t("calendar.source.personal");
  return t("calendar.overview.roomFallback", { id: schedule.roomId.slice(0, 8) });
}

function toScheduleItem(schedule: ScheduleResponse, t: TranslateFn, locale: Locale): ScheduleItem {
  return {
    connectedItem: connectedCopy(t, schedule),
    id: schedule.id,
    kind: inferScheduleKind(schedule),
    projectRoomLabel: roomCopy(t, schedule),
    source: schedule.googleEventId ? "google" : "internal",
    time: formatScheduleTime(schedule, locale, t),
    title: schedule.title,
  };
}

function sortSchedulesByStart(schedules: ScheduleResponse[]): ScheduleResponse[] {
  return [...schedules].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const { t } = useI18n();
  const meta = kindMeta[item.kind];

  return (
    <article className="schedule-row">
      <div className="schedule-row__time">
        <Clock3 size={15} strokeWidth={2.1} />
        <b>{item.time}</b>
      </div>
      <div className="schedule-row__body">
        <div className="schedule-row__meta">
          <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
          <span>{item.projectRoomLabel}</span>
          <span>{sourceCopy(t, item.source)}</span>
        </div>
        <h3>{item.title}</h3>
        <p>
          <Link2 size={14} strokeWidth={2.1} aria-hidden="true" />
          {item.connectedItem}
        </p>
      </div>
    </article>
  );
}

export function ScheduleOverviewPanel({ autoLoad = true, initialSchedules = [], roomId }: ScheduleOverviewPanelProps) {
  const { locale, t } = useI18n();
  const [schedules, setSchedules] = useState<ScheduleResponse[]>(initialSchedules);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const date = addDays(today, index);
        const count = schedules.filter((schedule) => sameDate(scheduleDate(schedule), date)).length;
        return {
          count,
          date,
          label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date),
          selected: index === 0,
        };
      }),
    [locale, schedules, today],
  );
  const todayCount = days[0]?.count ?? 0;
  const monthTitle = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long" }).format(today), [locale, today]);
  const scheduleItems = useMemo(() => sortSchedulesByStart(schedules).slice(0, 5).map((schedule) => toScheduleItem(schedule, t, locale)), [locale, schedules, t]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);

      calendarApi
        .getEvents({
          from: toIsoBoundary(today),
          roomId,
          size: 20,
          to: toIsoBoundary(addDays(today, 4), true),
        })
        .then((response) => {
          if (cancelled) return;
          setSchedules(sortSchedulesByStart(response.items));
        })
        .catch(() => {
          if (cancelled) return;
          setError(t("calendar.overview.loadError"));
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [autoLoad, roomId, t, today]);

  return (
    <section className="schedule-overview" aria-label={t("calendar.overview.aria")}>
      <GlassPanel className="schedule-overview__hero">
        <div className="schedule-overview__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarDays size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("calendar.overview.chip")}</Chip>
            <h2>{t("calendar.overview.heroTitle")}</h2>
            <p>{t("calendar.overview.heroDescription")}</p>
          </div>
        </div>
        <div className="schedule-overview__summary">
          <strong>{todayCount}</strong>
          <span>{t("calendar.overview.todayLabel")}</span>
          <p>{t("calendar.overview.todayHint")}</p>
        </div>
      </GlassPanel>

      <div className="schedule-overview__grid">
        <GlassPanel className="schedule-overview__calendar">
          <div className="schedule-overview__toolbar">
            <h3>{monthTitle}</h3>
            <Button icon={<ExternalLink size={15} />} size="sm" variant="quiet">
              {t("calendar.overview.connectGoogle")}
            </Button>
          </div>
          <div className="schedule-days" aria-label={t("calendar.overview.weekAria")}>
            {days.map((day) => (
              <button className={day.selected ? "schedule-day schedule-day--selected" : "schedule-day"} key={day.date.toISOString()} type="button">
                <span>{day.label}</span>
                <b>{day.date.getDate()}</b>
                <small>{t("calendar.grid.countUnit", { count: day.count })}</small>
              </button>
            ))}
          </div>
          <div className="schedule-overview__items">
            {isLoading ? <p className="schedule-overview__state">{t("calendar.state.loading")}</p> : null}
            {!isLoading && error ? <p className="schedule-overview__state schedule-overview__state--error">{error}</p> : null}
            {!isLoading && !error && scheduleItems.length === 0 ? <p className="schedule-overview__state">{t("calendar.overview.empty")}</p> : null}
            {!isLoading && !error
              ? scheduleItems.map((item) => (
                  <ScheduleRow item={item} key={item.id} />
                ))
              : null}
          </div>
        </GlassPanel>

        <GlassPanel className="schedule-overview__policy">
          <h3>{t("calendar.overview.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("calendar.overview.policy.server")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Video size={16} strokeWidth={2.1} />
            </span>
            <p>{t("calendar.overview.policy.voice")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
