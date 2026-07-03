"use client";

import { CalendarCheck2, CalendarClock, CheckCircle2, ExternalLink, ShieldCheck, Sparkles, Unplug } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type CalendarItem = {
  titleKey: MessageKey;
  source: "Bubli" | "Google Calendar";
  time: string;
  projectHintKey: MessageKey;
  status: "confirmed" | "external" | "candidate";
};

const calendarItems: CalendarItem[] = [
  {
    projectHintKey: "calendar.sync.item.deliverable.hint",
    source: "Bubli",
    status: "confirmed",
    time: "10:00",
    titleKey: "calendar.sync.item.deliverable.title",
  },
  {
    projectHintKey: "calendar.sync.item.clientMeeting.hint",
    source: "Google Calendar",
    status: "external",
    time: "13:30",
    titleKey: "calendar.sync.item.clientMeeting.title",
  },
  {
    projectHintKey: "calendar.sync.item.review.hint",
    source: "Bubli",
    status: "candidate",
    time: "16:00",
    titleKey: "calendar.sync.item.review.title",
  },
];

const statusMeta: Record<CalendarItem["status"], { labelKey: MessageKey; tone: "success" | "pending" | "personal" }> = {
  candidate: { labelKey: "calendar.sync.status.candidate", tone: "pending" },
  confirmed: { labelKey: "calendar.sync.status.confirmed", tone: "success" },
  external: { labelKey: "calendar.sync.status.external", tone: "personal" },
};

function CalendarSyncRow({ item }: { item: CalendarItem }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];

  return (
    <article className="google-calendar-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <CalendarClock size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="google-calendar-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{item.time}</span>
          <span>{item.source}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
        <p>{t(item.projectHintKey)}</p>
      </div>
    </article>
  );
}

export function GoogleCalendarSyncPanel() {
  const { t } = useI18n();
  return (
    <section className="google-calendar-sync" aria-label={t("calendar.sync.aria")}>
      <GlassPanel className="google-calendar-sync__hero">
        <div className="google-calendar-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarCheck2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("calendar.sync.chip")}</Chip>
            <h2>{t("calendar.sync.heroTitle")}</h2>
            <p>{t("calendar.sync.heroDescription")}</p>
          </div>
        </div>
        <div className="google-calendar-sync__status">
          <StatusBadge tone="success">{t("calendar.sync.connected")}</StatusBadge>
          <strong>{t("calendar.sync.todayCount")}</strong>
          <span>{t("calendar.sync.todayLabel")}</span>
          <ProgressBar label={t("calendar.sync.progressLabel")} value={91} />
        </div>
      </GlassPanel>

      <div className="google-calendar-sync__grid">
        <GlassPanel className="google-calendar-sync__panel">
          <div className="google-calendar-sync__panel-header">
            <div>
              <h3>{t("calendar.sync.todayTitle")}</h3>
              <p>{t("calendar.sync.todayDescription")}</p>
            </div>
          </div>

          <div className="google-calendar-sync__list">
            {calendarItems.map((item) => (
              <CalendarSyncRow item={item} key={`${item.source}-${item.titleKey}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="google-calendar-sync__policy">
          <h3>{t("calendar.sync.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("calendar.sync.policy.approve")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ExternalLink size={16} strokeWidth={2.1} />
            </span>
            <p>{t("calendar.sync.policy.external")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Unplug size={16} strokeWidth={2.1} />
            </span>
            <p>{t("calendar.sync.policy.persist")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("calendar.sync.policy.access")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="google-calendar-sync__footer">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Sparkles size={16} strokeWidth={2.1} />
        </span>
        <p>{t("calendar.sync.footer")}</p>
      </GlassPanel>
    </section>
  );
}
