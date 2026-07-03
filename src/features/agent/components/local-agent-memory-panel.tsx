"use client";

import { Archive, CheckCircle2, Database, HardDrive, MessageCircle, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type MemoryItem = {
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  status: "local" | "summary" | "backup";
  valueKey: MessageKey;
};

const memoryItems: MemoryItem[] = [
  {
    descriptionKey: "agent.local.item1Desc",
    labelKey: "agent.local.item1Label",
    status: "local",
    valueKey: "agent.local.item1Value",
  },
  {
    descriptionKey: "agent.local.item2Desc",
    labelKey: "agent.local.item2Label",
    status: "summary",
    valueKey: "agent.local.item2Value",
  },
  {
    descriptionKey: "agent.local.item3Desc",
    labelKey: "agent.local.item3Label",
    status: "backup",
    valueKey: "agent.local.item3Value",
  },
];

const statusMeta: Record<MemoryItem["status"], { labelKey: MessageKey; tone: "personal" | "agent" | "success" }> = {
  backup: { labelKey: "agent.local.statusBackup", tone: "success" },
  local: { labelKey: "agent.local.statusLocal", tone: "personal" },
  summary: { labelKey: "agent.local.statusSummary", tone: "agent" },
};

function MemoryItemCard({ item, t }: { item: MemoryItem; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className="local-agent-memory-card">
      <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
      <h3>{t(item.labelKey)}</h3>
      <strong>{t(item.valueKey)}</strong>
      <p>{t(item.descriptionKey)}</p>
    </article>
  );
}

export function LocalAgentMemoryPanel() {
  const { t } = useI18n();

  return (
    <section className="local-agent-memory" aria-label={t("agent.local.aria")}>
      <GlassPanel className="local-agent-memory__hero">
        <div className="local-agent-memory__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("agent.local.chip")}</Chip>
            <h2>{t("agent.local.heroTitle")}</h2>
            <p>{t("agent.local.heroDesc")}</p>
          </div>
        </div>
        <div className="local-agent-memory__usage">
          <StatusBadge tone="personal">{t("agent.local.badge")}</StatusBadge>
          <strong>96</strong>
          <span>{t("agent.local.recentMessages")}</span>
          <ProgressBar label={t("agent.local.usageBar")} value={96} />
        </div>
      </GlassPanel>

      <div className="local-agent-memory__grid">
        <GlassPanel className="local-agent-memory__panel">
          <div className="local-agent-memory__panel-header">
            <div>
              <h3>{t("agent.local.memoryTitle")}</h3>
              <p>{t("agent.local.memoryDesc")}</p>
            </div>
            <Chip icon={<HardDrive size={14} />}>{t("agent.local.storageChip")}</Chip>
          </div>

          <div className="local-agent-memory__cards">
            {memoryItems.map((item) => (
              <MemoryItemCard item={item} key={item.labelKey} t={t} />
            ))}
          </div>

          <footer className="local-agent-memory__actions">
            <Button icon={<Archive size={15} />} size="sm" variant="primary">
              {t("agent.local.createBackup")}
            </Button>
            <Button icon={<RotateCcw size={15} />} size="sm" variant="quiet">
              {t("agent.local.integrityCheck")}
            </Button>
          </footer>
        </GlassPanel>

        <GlassPanel className="local-agent-memory__policy">
          <h3>{t("agent.local.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <MessageCircle size={16} strokeWidth={2.1} />
            </span>
            <p>{t("agent.local.policy1")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("agent.local.policy2")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>{t("agent.local.policy3")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("agent.local.policy4")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
