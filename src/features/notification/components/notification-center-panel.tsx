"use client";

import { Bell, BellRing, CalendarClock, CheckCircle2, EyeOff, MessageCircle, Pin, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type NotificationKind = "todo" | "agent" | "communication" | "schedule";
type NotificationState = "unread" | "read" | "dismissed";

type NotificationItem = {
  description: string;
  kind: NotificationKind;
  originLabel: string;
  projectRoom: string;
  state: NotificationState;
  title: string;
  time: string;
};

function buildNotifications(t: TranslateFn): NotificationItem[] {
  return [
    {
      description: t("notification.center.sample.agent.desc"),
      kind: "agent",
      originLabel: t("notification.center.sample.agent.origin"),
      projectRoom: t("notification.center.sample.agent.room"),
      state: "unread",
      time: t("notification.center.sample.agent.time"),
      title: t("notification.center.sample.agent.title"),
    },
    {
      description: t("notification.center.sample.todo.desc"),
      kind: "todo",
      originLabel: t("notification.center.sample.todo.origin"),
      projectRoom: t("notification.center.sample.todo.room"),
      state: "unread",
      time: t("notification.center.sample.todo.time"),
      title: t("notification.center.sample.todo.title"),
    },
    {
      description: t("notification.center.sample.mention.desc"),
      kind: "communication",
      originLabel: t("notification.center.sample.mention.origin"),
      projectRoom: t("notification.center.sample.mention.room"),
      state: "read",
      time: t("notification.center.sample.mention.time"),
      title: t("notification.center.sample.mention.title"),
    },
    {
      description: t("notification.center.sample.schedule.desc"),
      kind: "schedule",
      originLabel: t("notification.center.sample.schedule.origin"),
      projectRoom: t("notification.center.sample.schedule.room"),
      state: "dismissed",
      time: t("notification.center.sample.schedule.time"),
      title: t("notification.center.sample.schedule.title"),
    },
  ];
}

const kindMeta: Record<NotificationKind, { icon: typeof Bell; labelKey: MessageKey; tone: "todo" | "agent" | "communication" | "warning" }> = {
  agent: { icon: Sparkles, labelKey: "notification.kind.agent", tone: "agent" },
  communication: { icon: MessageCircle, labelKey: "notification.kind.communication", tone: "communication" },
  schedule: { icon: CalendarClock, labelKey: "notification.kind.schedule", tone: "warning" },
  todo: { icon: CheckCircle2, labelKey: "notification.kind.todo", tone: "todo" },
};

const stateCopy: Record<NotificationState, { labelKey: MessageKey; tone: "neutral" | "pending" | "success" }> = {
  dismissed: { labelKey: "notification.state.dismissed", tone: "neutral" },
  read: { labelKey: "notification.state.read", tone: "success" },
  unread: { labelKey: "notification.state.unread", tone: "pending" },
};

function NotificationRow({ item }: { item: NotificationItem }) {
  const { t } = useI18n();
  const meta = kindMeta[item.kind];
  const state = stateCopy[item.state];
  const Icon = meta.icon;

  return (
    <article className="notification-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={17} strokeWidth={2.1} />
      </span>
      <div className="notification-row__body">
        <div className="notification-row__head">
          <div>
            <div className="notification-row__meta">
              <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
              <span>{item.projectRoom}</span>
              <span>{item.time}</span>
            </div>
            <h3>{item.title}</h3>
          </div>
          <StatusBadge tone={state.tone}>{t(state.labelKey)}</StatusBadge>
        </div>
        <p>{item.description}</p>
        <footer className="notification-row__footer">
          <span>{t("notification.center.linkedItem", { label: item.originLabel })}</span>
          <div>
            <Button icon={<Pin size={14} />} size="sm" variant="ghost">
              {t("notification.center.pin")}
            </Button>
            <Button icon={<EyeOff size={14} />} size="sm" variant="quiet">
              {t("notification.center.hide")}
            </Button>
          </div>
        </footer>
      </div>
    </article>
  );
}

export function NotificationCenterPanel() {
  const { t } = useI18n();
  const notifications = buildNotifications(t);
  const unreadCount = notifications.filter((item) => item.state === "unread").length;

  return (
    <section className="notification-center" aria-label={t("notification.center.sectionAria")}>
      <GlassPanel className="notification-center__hero">
        <div className="notification-center__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <BellRing size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("notification.center.chip")}</Chip>
            <h2>{t("notification.center.heroTitle")}</h2>
            <p>{t("notification.center.heroDesc")}</p>
          </div>
        </div>
        <div className="notification-center__summary" aria-label={t("notification.center.summaryAria")}>
          <strong>{unreadCount}</strong>
          <span>{t("notification.center.newToCheck")}</span>
          <p>{t("notification.center.summaryDesc")}</p>
        </div>
      </GlassPanel>

      <div className="notification-center__grid">
        <GlassPanel className="notification-center__list">
          <div className="notification-center__toolbar">
            <h3>{t("notification.center.today")}</h3>
            <div>
              <Chip selected>{t("notification.center.filterAll")}</Chip>
              <Chip>{t("notification.center.filterUnread")}</Chip>
              <Chip>{t("notification.center.filterPinned")}</Chip>
            </div>
          </div>
          <div className="notification-center__items">
            {notifications.map((item) => (
              <NotificationRow item={item} key={`${item.originLabel}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="notification-center__policy">
          <h3>{t("notification.center.policyTitle")}</h3>
          <dl>
            <div>
              <dt>{t("notification.center.policy.origin")}</dt>
              <dd>{t("notification.center.policy.originDesc")}</dd>
            </div>
            <div>
              <dt>{t("notification.center.policy.userState")}</dt>
              <dd>{t("notification.center.policy.userStateDesc")}</dd>
            </div>
            <div>
              <dt>{t("notification.center.policy.desktop")}</dt>
              <dd>{t("notification.center.policy.desktopDesc")}</dd>
            </div>
          </dl>
        </GlassPanel>
      </div>
    </section>
  );
}
