"use client";

import { Bot, CheckCircle2, Database, FileText, MessageSquareText, RefreshCw, Server, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type MemoryItem = {
  titleKey: MessageKey;
  rangeKey: MessageKey;
  status: "ready" | "running" | "review";
  detailKey: MessageKey;
};

const memoryItems: MemoryItem[] = [
  {
    detailKey: "agent.room.mem1Detail",
    rangeKey: "agent.room.mem1Range",
    status: "ready",
    titleKey: "agent.room.mem1Title",
  },
  {
    detailKey: "agent.room.mem2Detail",
    rangeKey: "agent.room.mem2Range",
    status: "review",
    titleKey: "agent.room.mem2Title",
  },
  {
    detailKey: "agent.room.mem3Detail",
    rangeKey: "agent.room.mem3Range",
    status: "running",
    titleKey: "agent.room.mem3Title",
  },
];

const statusMeta: Record<MemoryItem["status"], { labelKey: MessageKey; tone: "success" | "pending" | "agent" }> = {
  ready: { labelKey: "agent.room.statusReady", tone: "success" },
  review: { labelKey: "agent.room.statusReview", tone: "pending" },
  running: { labelKey: "agent.room.statusRunning", tone: "agent" },
};

function MemoryRow({ item, t }: { item: MemoryItem; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className="room-memory-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="room-memory-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(item.rangeKey)}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
        <p>{t(item.detailKey)}</p>
      </div>
    </article>
  );
}

export function RoomMemorySummaryPanel() {
  const { t } = useI18n();

  return (
    <section className="room-memory" aria-label={t("agent.room.aria")}>
      <GlassPanel className="room-memory__hero">
        <div>
          <Chip icon={<Bot size={14} />} selected>
            {t("agent.room.chip")}
          </Chip>
          <h2>{t("agent.room.heroTitle")}</h2>
          <p>{t("agent.room.heroDesc")}</p>
        </div>
        <div className="room-memory__summary">
          <StatusBadge tone="agent">{t("agent.room.summaryBadge")}</StatusBadge>
          <strong>68</strong>
          <span>{t("agent.room.readMessages")}</span>
          <ProgressBar label={t("agent.room.summaryProgress")} value={72} />
        </div>
      </GlassPanel>

      <div className="room-memory__grid">
        <GlassPanel className="room-memory__command">
          <div className="room-memory__command-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("agent.room.commandTitle")}</h3>
              <p>{t("agent.room.commandDesc")}</p>
            </div>
          </div>

          <div className="room-memory__chat">
            <span>{t("agent.room.me")}</span>
            <p>{t("agent.room.chatCommand")}</p>
          </div>
          <div className="room-memory__agent">
            <StatusBadge tone="agent">{t("agent.room.agentResponse")}</StatusBadge>
            <h3>{t("agent.room.agentReply")}</h3>
            <p>{t("agent.room.agentReplyDesc")}</p>
          </div>

          <div className="room-memory__actions">
            <Button icon={<CheckCircle2 size={15} />} variant="primary">
              {t("agent.room.reviewCandidates")}
            </Button>
            <Button icon={<RefreshCw size={15} />} variant="quiet">
              {t("agent.room.reorganize")}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="room-memory__list">
          <div className="room-memory__list-top">
            <div>
              <h3>{t("agent.room.longTermTitle")}</h3>
              <p>{t("agent.room.longTermDesc")}</p>
            </div>
            <Chip>{t("agent.room.rangeRecord")}</Chip>
          </div>
          <div className="room-memory__items">
            {memoryItems.map((item) => (
              <MemoryRow item={item} key={`${item.rangeKey}-${item.titleKey}`} t={t} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="room-memory__policy">
        <GlassPanel>
          <Server size={18} strokeWidth={2.1} />
          <h3>{t("agent.room.chatOriginTitle")}</h3>
          <p>{t("agent.room.chatOriginDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <MessageSquareText size={18} strokeWidth={2.1} />
          <h3>{t("agent.room.appQuickTitle")}</h3>
          <p>{t("agent.room.appQuickDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <Database size={18} strokeWidth={2.1} />
          <h3>{t("agent.room.summaryKeepTitle")}</h3>
          <p>{t("agent.room.summaryKeepDesc")}</p>
        </GlassPanel>
      </div>
    </section>
  );
}
