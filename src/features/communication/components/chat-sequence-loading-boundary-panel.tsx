"use client";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Database,
  History,
  Laptop,
  MessageSquareText,
  RadioTower,
  Server,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./chat-sequence-loading-boundary-panel.module.css";

type SequenceStep = {
  descriptionKey: MessageKey;
  icon: typeof Server;
  labelKey: MessageKey;
  metricKey: MessageKey;
  ownerKey: MessageKey;
  tone: "room" | "personal" | "approved" | "pending";
};

type MessageTrace = {
  bodyKey: MessageKey;
  clientMessageIdKey: MessageKey;
  roomSequence: number;
  state: "serverSaved" | "cached" | "read";
  writerKey: MessageKey;
};

type SyncRule = {
  detailKey: MessageKey;
  labelKey: MessageKey;
  tokenKey: MessageKey;
};

const sequenceSteps: SequenceStep[] = [
  {
    descriptionKey: "chat.sequencePanel.step1Desc",
    icon: Server,
    labelKey: "chat.sequencePanel.step1Label",
    metricKey: "chat.sequencePanel.step1Metric",
    ownerKey: "chat.sequencePanel.step1Owner",
    tone: "room",
  },
  {
    descriptionKey: "chat.sequencePanel.step2Desc",
    icon: Laptop,
    labelKey: "chat.sequencePanel.step2Label",
    metricKey: "chat.sequencePanel.step2Metric",
    ownerKey: "chat.sequencePanel.step2Owner",
    tone: "personal",
  },
  {
    descriptionKey: "chat.sequencePanel.step3Desc",
    icon: ArrowDownToLine,
    labelKey: "chat.sequencePanel.step3Label",
    metricKey: "chat.sequencePanel.step3Metric",
    ownerKey: "chat.sequencePanel.step3Owner",
    tone: "pending",
  },
  {
    descriptionKey: "chat.sequencePanel.step4Desc",
    icon: CheckCircle2,
    labelKey: "chat.sequencePanel.step4Label",
    metricKey: "chat.sequencePanel.step4Metric",
    ownerKey: "chat.sequencePanel.step4Owner",
    tone: "approved",
  },
];

const messageTrace: MessageTrace[] = [
  {
    bodyKey: "chat.sequencePanel.trace1Body",
    clientMessageIdKey: "chat.sequencePanel.trace1Id",
    roomSequence: 128,
    state: "read",
    writerKey: "chat.sequencePanel.trace1Writer",
  },
  {
    bodyKey: "chat.sequencePanel.trace2Body",
    clientMessageIdKey: "chat.sequencePanel.trace2Id",
    roomSequence: 129,
    state: "serverSaved",
    writerKey: "chat.sequencePanel.trace2Writer",
  },
  {
    bodyKey: "chat.sequencePanel.trace3Body",
    clientMessageIdKey: "chat.sequencePanel.trace3Id",
    roomSequence: 130,
    state: "cached",
    writerKey: "chat.sequencePanel.trace3Writer",
  },
];

const syncRules: SyncRule[] = [
  {
    detailKey: "chat.sequencePanel.rule1Detail",
    labelKey: "chat.sequencePanel.rule1Label",
    tokenKey: "chat.sequencePanel.rule1Token",
  },
  {
    detailKey: "chat.sequencePanel.rule2Detail",
    labelKey: "chat.sequencePanel.rule2Label",
    tokenKey: "chat.sequencePanel.rule2Token",
  },
  {
    detailKey: "chat.sequencePanel.rule3Detail",
    labelKey: "chat.sequencePanel.rule3Label",
    tokenKey: "chat.sequencePanel.rule3Token",
  },
  {
    detailKey: "chat.sequencePanel.rule4Detail",
    labelKey: "chat.sequencePanel.rule4Label",
    tokenKey: "chat.sequencePanel.rule4Token",
  },
];

const stateMeta: Record<MessageTrace["state"], { labelKey: MessageKey; tone: "approved" | "pending" | "personal" }> = {
  cached: { labelKey: "chat.sequencePanel.state.cached", tone: "personal" },
  read: { labelKey: "chat.sequencePanel.state.read", tone: "approved" },
  serverSaved: { labelKey: "chat.sequencePanel.state.serverSaved", tone: "pending" },
};

function SequenceStepCard({ step }: { step: SequenceStep }) {
  const { t } = useI18n();
  const Icon = step.icon;

  return (
    <article className={styles.stepCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.badges}>
          <StatusBadge tone={step.tone}>{t(step.ownerKey)}</StatusBadge>
          <StatusBadge tone="neutral">{t(step.metricKey)}</StatusBadge>
        </div>
        <h3>{t(step.labelKey)}</h3>
        <p>{t(step.descriptionKey)}</p>
      </div>
    </article>
  );
}

function TraceRow({ item }: { item: MessageTrace }) {
  const { t } = useI18n();
  const meta = stateMeta[item.state];

  return (
    <article className={styles.traceRow}>
      <div className={styles.sequenceBadge}>
        <span>#{item.roomSequence}</span>
      </div>
      <div>
        <div className={styles.traceMeta}>
          <strong>{t(item.writerKey)}</strong>
          <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
          <code>{t(item.clientMessageIdKey)}</code>
        </div>
        <p>{t(item.bodyKey)}</p>
      </div>
    </article>
  );
}

function RuleCard({ rule }: { rule: SyncRule }) {
  const { t } = useI18n();

  return (
    <article className={styles.ruleCard}>
      <code>{t(rule.tokenKey)}</code>
      <h4>{t(rule.labelKey)}</h4>
      <p>{t(rule.detailKey)}</p>
    </article>
  );
}

export function ChatSequenceLoadingBoundaryPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("chat.sequencePanel.aria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<MessageSquareText size={14} />} selected>
            {t("chat.sequencePanel.heroChip")}
          </Chip>
          <h2>{t("chat.sequencePanel.heroTitle")}</h2>
          <p>
            {t("chat.sequencePanel.heroBody")}
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">{t("chat.sequencePanel.heroBadge")}</StatusBadge>
          <strong>130</strong>
          <span>{t("chat.sequencePanel.heroMetric")}</span>
          <ProgressBar label={t("chat.sequencePanel.heroProgress")} value={92} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>{t("chat.sequencePanel.flowTitle")}</h3>
          <p>{t("chat.sequencePanel.flowBody")}</p>
        </div>
        <div className={styles.stepGrid}>
          {sequenceSteps.map((step, index) => (
            <div className={styles.stepSlot} key={step.labelKey}>
              <SequenceStepCard step={step} />
              {index < sequenceSteps.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.tracePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("chat.sequencePanel.traceTitle")}</h3>
            <p>{t("chat.sequencePanel.traceBody")}</p>
          </div>
          <div className={styles.traceList}>
            {messageTrace.map((item) => (
              <TraceRow item={item} key={item.roomSequence} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("chat.sequencePanel.ruleTitle")}</h3>
            <p>{t("chat.sequencePanel.ruleBody")}</p>
          </div>
          <div className={styles.ruleList}>
            {syncRules.map((rule) => (
              <RuleCard key={rule.labelKey} rule={rule} />
            ))}
          </div>
          <div className={styles.topicBox}>
            <RadioTower size={16} strokeWidth={2.1} />
            <span>{t("chat.sequencePanel.topicChat")}</span>
            <ArrowLeftRight size={14} strokeWidth={2.1} />
            <span>{t("chat.sequencePanel.topicRoom")}</span>
          </div>
          <div className={styles.notice}>
            <BellRing size={16} strokeWidth={2.1} />
            <p>{t("chat.sequencePanel.noticeSplit")}</p>
          </div>
          <div className={styles.notice}>
            <History size={16} strokeWidth={2.1} />
            <p>{t("chat.sequencePanel.noticeCache")}</p>
          </div>
          <Chip icon={<Database size={14} />}>{t("chat.sequencePanel.originChip")}</Chip>
        </GlassPanel>
      </div>
    </section>
  );
}
