"use client";

import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Link2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ScheduleSource = "internal" | "google";
type ScheduleKind = "meeting" | "deadline" | "focus";

type ScheduleItem = {
  connectedItemKey: MessageKey;
  kind: ScheduleKind;
  projectRoomKey: MessageKey;
  source: ScheduleSource;
  time: string;
  titleKey: MessageKey;
};

const days = [
  { dayKey: "calendar.day.mon", date: "22", count: 4, selected: true },
  { dayKey: "calendar.day.tue", date: "23", count: 2 },
  { dayKey: "calendar.day.wed", date: "24", count: 3 },
  { dayKey: "calendar.day.thu", date: "25", count: 1 },
  { dayKey: "calendar.day.fri", date: "26", count: 5 },
] as const satisfies ReadonlyArray<{ dayKey: MessageKey; date: string; count: number; selected?: boolean }>;

const schedules: ScheduleItem[] = [
  {
    connectedItemKey: "calendar.overview.item.clientMeeting.connected",
    kind: "meeting",
    projectRoomKey: "calendar.overview.item.clientMeeting.room",
    source: "google",
    time: "10:30",
    titleKey: "calendar.overview.item.clientMeeting.title",
  },
  {
    connectedItemKey: "calendar.overview.item.delivery.connected",
    kind: "deadline",
    projectRoomKey: "calendar.overview.item.delivery.room",
    source: "internal",
    time: "15:00",
    titleKey: "calendar.overview.item.delivery.title",
  },
  {
    connectedItemKey: "calendar.overview.item.board.connected",
    kind: "focus",
    projectRoomKey: "calendar.overview.item.board.room",
    source: "internal",
    time: "17:00",
    titleKey: "calendar.overview.item.board.title",
  },
];

const kindMeta: Record<ScheduleKind, { labelKey: MessageKey; tone: "communication" | "warning" | "timer" }> = {
  deadline: { labelKey: "calendar.overview.kind.deadline", tone: "warning" },
  focus: { labelKey: "calendar.overview.kind.focus", tone: "timer" },
  meeting: { labelKey: "calendar.overview.kind.meeting", tone: "communication" },
};

function sourceCopy(t: TranslateFn, source: ScheduleSource): string {
  return source === "google" ? "Google Calendar" : t("calendar.overview.source.internal");
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
          <span>{t(item.projectRoomKey)}</span>
          <span>{sourceCopy(t, item.source)}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
        <p>
          <Link2 size={14} strokeWidth={2.1} aria-hidden="true" />
          {t(item.connectedItemKey)}
        </p>
      </div>
    </article>
  );
}

export function ScheduleOverviewPanel() {
  const { t } = useI18n();
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
          <strong>{t("calendar.overview.todayCount")}</strong>
          <span>{t("calendar.overview.todayLabel")}</span>
          <p>{t("calendar.overview.todayHint")}</p>
        </div>
      </GlassPanel>

      <div className="schedule-overview__grid">
        <GlassPanel className="schedule-overview__calendar">
          <div className="schedule-overview__toolbar">
            <h3>{t("calendar.overview.monthTitle")}</h3>
            <Button icon={<ExternalLink size={15} />} size="sm" variant="quiet">
              {t("calendar.overview.connectGoogle")}
            </Button>
          </div>
          <div className="schedule-days" aria-label={t("calendar.overview.weekAria")}>
            {days.map((day) => (
              <button className={"selected" in day && day.selected ? "schedule-day schedule-day--selected" : "schedule-day"} key={day.date} type="button">
                <span>{t(day.dayKey)}</span>
                <b>{day.date}</b>
                <small>{t("calendar.grid.countUnit", { count: day.count })}</small>
              </button>
            ))}
          </div>
          <div className="schedule-overview__items">
            {schedules.map((item) => (
              <ScheduleRow item={item} key={`${item.time}-${item.titleKey}`} />
            ))}
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
