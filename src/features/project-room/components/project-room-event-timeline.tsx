"use client";

import {
  BellRing,
  Bot,
  CheckCircle2,
  FileStack,
  MessageSquareText,
  Radio,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./project-room-event-timeline.module.css";

const events: Array<{
  titleKey: MessageKey;
  bodyKey: MessageKey;
  detailTitleKey: MessageKey;
  detailKey: MessageKey;
  actorKey: MessageKey;
  time: string;
  badgeKey: MessageKey;
  tone: "room" | "communication" | "agent" | "approved";
  icon: typeof FileStack;
}> = [
  {
    titleKey: "room.event.event1Title",
    bodyKey: "room.event.event1Body",
    detailTitleKey: "room.event.event1DetailTitle",
    detailKey: "room.event.event1Detail",
    actorKey: "room.event.event1Actor",
    time: "10:24",
    badgeKey: "room.event.event1Badge",
    tone: "room",
    icon: FileStack,
  },
  {
    titleKey: "room.event.event2Title",
    bodyKey: "room.event.event2Body",
    detailTitleKey: "room.event.event2DetailTitle",
    detailKey: "room.event.event2Detail",
    actorKey: "room.event.event2Actor",
    time: "10:31",
    badgeKey: "room.event.event2Badge",
    tone: "communication",
    icon: MessageSquareText,
  },
  {
    titleKey: "room.event.event3Title",
    bodyKey: "room.event.event3Body",
    detailTitleKey: "room.event.event3DetailTitle",
    detailKey: "room.event.event3Detail",
    actorKey: "room.event.event3Actor",
    time: "10:38",
    badgeKey: "room.event.event3Badge",
    tone: "agent",
    icon: Bot,
  },
  {
    titleKey: "room.event.event4Title",
    bodyKey: "room.event.event4Body",
    detailTitleKey: "room.event.event4DetailTitle",
    detailKey: "room.event.event4Detail",
    actorKey: "room.event.event4Actor",
    time: "10:44",
    badgeKey: "room.event.event4Badge",
    tone: "approved",
    icon: UserRoundPlus,
  },
];

const deliveryFlow: Array<[MessageKey, MessageKey]> = [
  ["room.event.flow1Title", "room.event.flow1Body"],
  ["room.event.flow2Title", "room.event.flow2Body"],
  ["room.event.flow3Title", "room.event.flow3Body"],
  ["room.event.flow4Title", "room.event.flow4Body"],
];

const rules: MessageKey[] = [
  "room.event.rule1",
  "room.event.rule2",
  "room.event.rule3",
  "room.event.rule4",
];

export function ProjectRoomEventTimeline() {
  const { t } = useI18n();
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Radio size={16} aria-hidden="true" />
          {t("room.event.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("room.event.title")}</h2>
            <p className={styles.summary}>{t("room.event.summary")}</p>
          </div>
          <StatusBadge tone="approved">{t("room.event.serverBadge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("room.event.chipAria")}>
          <Chip selected icon={<Radio size={14} aria-hidden="true" />}>
            {t("room.event.chipScreen")}
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>{t("room.event.chipQueue")}</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>{t("room.event.chipMember")}</Chip>
        </div>
      </header>

      <section className={styles.contentGrid} aria-label={t("room.event.timelineAria")}>
        <div className={styles.timeline}>
          {events.map((event, index) => {
            const Icon = event.icon;

            return (
              <article className={styles.eventCard} key={event.titleKey}>
                <div className={styles.eventRail} aria-hidden="true">
                  <span className={styles.eventIcon}>
                    <Icon size={21} />
                  </span>
                  {index < events.length - 1 ? <span className={styles.eventLine} /> : null}
                </div>
                <div className={styles.eventBody}>
                  <div className={styles.eventHead}>
                    <div className={styles.eventTitle}>
                      <h3>{t(event.titleKey)}</h3>
                      <p>{t(event.bodyKey)}</p>
                    </div>
                    <StatusBadge tone={event.tone}>{t(event.badgeKey)}</StatusBadge>
                  </div>
                  <div className={styles.eventMeta}>
                    <Chip>{t(event.actorKey)}</Chip>
                    <Chip>{event.time}</Chip>
                  </div>
                  <div className={styles.detailBox}>
                    <strong>{t(event.detailTitleKey)}</strong>
                    <span>{t(event.detailKey)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.side} aria-label={t("room.event.sideAria")}>
          <section className={styles.sideCard}>
            <h3>{t("room.event.deliveryTitle")}</h3>
            <ol className={styles.flowList}>
              {deliveryFlow.map(([titleKey, bodyKey], index) => (
                <li className={styles.flowItem} key={titleKey}>
                  <span className={styles.flowIndex}>{index + 1}</span>
                  <span className={styles.flowCopy}>
                    <strong>{t(titleKey)}</strong>
                    <span>{t(bodyKey)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("room.event.linkTitle")}</h3>
            <div className={styles.topicBox}>
              <strong>{t("room.event.linkRoomTitle")}</strong>
              <span>{t("room.event.linkRoomBody")}</span>
            </div>
            <div className={styles.topicBox}>
              <strong>{t("room.event.linkPersonalTitle")}</strong>
              <span>{t("room.event.linkPersonalBody")}</span>
            </div>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("room.event.checkTitle")}</h3>
            <ul className={styles.checks}>
              {rules.map((ruleKey) => (
                <li className={styles.checkItem} key={ruleKey}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{t(ruleKey)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
