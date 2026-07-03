"use client";

import {
  Archive,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  MonitorSmartphone,
  RadioTower,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./notification-routing-boundary-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type NotificationRoute = {
  description: string;
  icon: typeof Server;
  label: string;
  routeLabel: string;
  scope: string;
  tone: "approved" | "pending" | "personal" | "room";
};

type NotificationItem = {
  channel: string;
  label: string;
  message: string;
  sourceLabel: string;
  state: "unread" | "read" | "archived";
};

type DeliveryRule = {
  detail: string;
  label: string;
  tag: string;
};

function buildRoutes(t: TranslateFn): NotificationRoute[] {
  return [
    {
      description: t("notification.routing.route.common.desc"),
      icon: Server,
      label: t("notification.routing.route.common.label"),
      routeLabel: t("notification.routing.route.common.routeLabel"),
      scope: t("notification.routing.route.common.scope"),
      tone: "approved",
    },
    {
      description: t("notification.routing.route.queue.desc"),
      icon: RadioTower,
      label: t("notification.routing.route.queue.label"),
      routeLabel: t("notification.routing.route.queue.routeLabel"),
      scope: t("notification.routing.route.queue.scope"),
      tone: "pending",
    },
    {
      description: t("notification.routing.route.bubble.desc"),
      icon: BellRing,
      label: t("notification.routing.route.bubble.label"),
      routeLabel: t("notification.routing.route.bubble.routeLabel"),
      scope: t("notification.routing.route.bubble.scope"),
      tone: "personal",
    },
    {
      description: t("notification.routing.route.desktop.desc"),
      icon: MonitorSmartphone,
      label: t("notification.routing.route.desktop.label"),
      routeLabel: t("notification.routing.route.desktop.routeLabel"),
      scope: t("notification.routing.route.desktop.scope"),
      tone: "room",
    },
  ];
}

function buildNotificationItems(t: TranslateFn): NotificationItem[] {
  return [
    {
      channel: t("notification.routing.item.candidate.channel"),
      label: t("notification.routing.item.candidate.label"),
      message: t("notification.routing.item.candidate.message"),
      sourceLabel: t("notification.routing.item.candidate.source"),
      state: "unread",
    },
    {
      channel: t("notification.routing.item.todo.channel"),
      label: t("notification.routing.item.todo.label"),
      message: t("notification.routing.item.todo.message"),
      sourceLabel: t("notification.routing.item.todo.source"),
      state: "read",
    },
    {
      channel: t("notification.routing.item.chat.channel"),
      label: t("notification.routing.item.chat.label"),
      message: t("notification.routing.item.chat.message"),
      sourceLabel: t("notification.routing.item.chat.source"),
      state: "unread",
    },
    {
      channel: t("notification.routing.item.resource.channel"),
      label: t("notification.routing.item.resource.label"),
      message: t("notification.routing.item.resource.message"),
      sourceLabel: t("notification.routing.item.resource.source"),
      state: "archived",
    },
  ];
}

function buildDeliveryRules(t: TranslateFn): DeliveryRule[] {
  return [
    {
      detail: t("notification.routing.rule.state.detail"),
      label: t("notification.routing.rule.state.label"),
      tag: t("notification.routing.rule.state.tag"),
    },
    {
      detail: t("notification.routing.rule.bubble.detail"),
      label: t("notification.routing.rule.bubble.label"),
      tag: t("notification.routing.rule.bubble.tag"),
    },
    {
      detail: t("notification.routing.rule.permission.detail"),
      label: t("notification.routing.rule.permission.label"),
      tag: t("notification.routing.rule.permission.tag"),
    },
    {
      detail: t("notification.routing.rule.usage.detail"),
      label: t("notification.routing.rule.usage.label"),
      tag: t("notification.routing.rule.usage.tag"),
    },
  ];
}

const stateMeta: Record<NotificationItem["state"], { labelKey: MessageKey; tone: "approved" | "pending" | "neutral" }> = {
  archived: { labelKey: "notification.routing.state.archived", tone: "neutral" },
  read: { labelKey: "notification.routing.state.read", tone: "approved" },
  unread: { labelKey: "notification.routing.state.unread", tone: "pending" },
};

function RouteCard({ item }: { item: NotificationRoute }) {
  const Icon = item.icon;

  return (
    <article className={styles.routeCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.badges}>
          <StatusBadge tone={item.tone}>{item.scope}</StatusBadge>
          <StatusBadge tone="neutral">{item.routeLabel}</StatusBadge>
        </div>
        <h3>{item.label}</h3>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const { t } = useI18n();
  const meta = stateMeta[item.state];

  return (
    <article className={styles.notificationRow}>
      <div className={styles.rowIcon}>
        <BellRing size={16} strokeWidth={2.1} />
      </div>
      <div>
        <div className={styles.rowMeta}>
          <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
          <strong>{item.label}</strong>
          <span>{item.sourceLabel}</span>
        </div>
        <p>{item.message}</p>
      </div>
      <span className={styles.channel}>{item.channel}</span>
    </article>
  );
}

function DeliveryRuleCard({ rule }: { rule: DeliveryRule }) {
  return (
    <article className={styles.ruleCard}>
      <span className={styles.ruleTag}>{rule.tag}</span>
      <h4>{rule.label}</h4>
      <p>{rule.detail}</p>
    </article>
  );
}

export function NotificationRoutingBoundaryPanel() {
  const { t } = useI18n();
  const routes = buildRoutes(t);
  const notificationItems = buildNotificationItems(t);
  const deliveryRules = buildDeliveryRules(t);

  return (
    <section className={styles.panel} aria-label={t("notification.routing.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            {t("notification.routing.chip")}
          </Chip>
          <h2>{t("notification.routing.heroTitle")}</h2>
          <p>{t("notification.routing.heroDesc")}</p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">{t("notification.routing.personalQueue")}</StatusBadge>
          <strong>{t("notification.routing.channelCount", { count: 4 })}</strong>
          <span>{t("notification.routing.initialChannels")}</span>
          <ProgressBar label={t("notification.routing.policyRate")} value={86} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>{t("notification.routing.flowTitle")}</h3>
          <p>{t("notification.routing.flowDesc")}</p>
        </div>
        <div className={styles.routeGrid}>
          {routes.map((route, index) => (
            <div className={styles.routeSlot} key={route.label}>
              <RouteCard item={route} />
              {index < routes.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.listPanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("notification.routing.exampleTitle")}</h3>
            <p>{t("notification.routing.exampleDesc")}</p>
          </div>
          <div className={styles.notificationList}>
            {notificationItems.map((item) => (
              <NotificationRow item={item} key={`${item.channel}-${item.sourceLabel}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("notification.routing.ruleTitle")}</h3>
            <p>{t("notification.routing.ruleDesc")}</p>
          </div>
          <div className={styles.ruleList}>
            {deliveryRules.map((rule) => (
              <DeliveryRuleCard key={rule.label} rule={rule} />
            ))}
          </div>
          <div className={styles.notice}>
            <Archive size={16} strokeWidth={2.1} />
            <p>{t("notification.routing.archiveNote")}</p>
          </div>
          <div className={styles.notice}>
            <Clock3 size={16} strokeWidth={2.1} />
            <p>{t("notification.routing.offlineNote")}</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>{t("notification.routing.sameStandardChip")}</Chip>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footerPanel}>
        <Sparkles size={18} strokeWidth={2.1} />
        <p>{t("notification.routing.footerNote")}</p>
        <StatusBadge tone="personal">{t("notification.routing.footerBubbleData")}</StatusBadge>
        <StatusBadge tone="approved">{t("notification.routing.footerSameOrigin")}</StatusBadge>
        <StatusBadge tone="pending">{t("notification.routing.footerPersonalLink")}</StatusBadge>
      </GlassPanel>
    </section>
  );
}
