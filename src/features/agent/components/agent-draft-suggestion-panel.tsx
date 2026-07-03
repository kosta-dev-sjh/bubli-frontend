"use client";

import { CheckCircle2, FileQuestion, Mail, MessageSquareQuote, PencilLine, Send, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type DraftSuggestion = {
  titleKey: MessageKey;
  type: "question" | "client" | "requirement";
  sourceKey: MessageKey;
  summaryKey: MessageKey;
  confidence: number;
};

const suggestions: DraftSuggestion[] = [
  {
    confidence: 88,
    sourceKey: "agent.draft.sourceDocsMinutes",
    summaryKey: "agent.draft.summaryRevision",
    titleKey: "agent.draft.titleRevision",
    type: "question",
  },
  {
    confidence: 82,
    sourceKey: "agent.draft.sourceRequirementDoc",
    summaryKey: "agent.draft.summaryClient",
    titleKey: "agent.draft.titleClient",
    type: "client",
  },
  {
    confidence: 76,
    sourceKey: "agent.draft.sourceMinutes",
    summaryKey: "agent.draft.summaryScope",
    titleKey: "agent.draft.titleScope",
    type: "requirement",
  },
];

const typeMeta: Record<DraftSuggestion["type"], { labelKey: MessageKey; tone: "agent" | "pending" | "room" }> = {
  client: { labelKey: "agent.draft.typeClient", tone: "room" },
  question: { labelKey: "agent.draft.typeQuestion", tone: "pending" },
  requirement: { labelKey: "agent.draft.typeRequirement", tone: "agent" },
};

function DraftSuggestionRow({ item, t }: { item: DraftSuggestion; t: TranslateFn }) {
  const type = typeMeta[item.type];
  const title = t(item.titleKey);

  return (
    <article className="agent-draft-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileQuestion size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="agent-draft-row__meta">
          <StatusBadge tone={type.tone}>{t(type.labelKey)}</StatusBadge>
          <span>{t(item.sourceKey)}</span>
        </div>
        <h3>{title}</h3>
        <p>{t(item.summaryKey)}</p>
        <ProgressBar label={t("agent.draft.confidence", { title })} value={item.confidence} />
      </div>
    </article>
  );
}

export function AgentDraftSuggestionPanel() {
  const { t } = useI18n();

  return (
    <section className="agent-draft" aria-label={t("agent.draft.aria")}>
      <GlassPanel className="agent-draft__hero">
        <div>
          <Chip icon={<WandSparkles size={14} />} selected>
            {t("agent.draft.chip")}
          </Chip>
          <h2>{t("agent.draft.heroTitle")}</h2>
          <p>{t("agent.draft.heroDesc")}</p>
        </div>
        <div className="agent-draft__summary">
          <StatusBadge tone="agent">{t("agent.draft.summaryBadge")}</StatusBadge>
          <strong>6</strong>
          <span>{t("agent.draft.summaryLabel")}</span>
          <ProgressBar label={t("agent.draft.reviewProgress")} value={58} />
        </div>
      </GlassPanel>

      <div className="agent-draft__grid">
        <GlassPanel className="agent-draft__preview">
          <div className="agent-draft__preview-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("agent.draft.previewTitle")}</h3>
              <p>{t("agent.draft.previewDesc")}</p>
            </div>
          </div>

          <div className="agent-draft__message">
            <StatusBadge tone="room">{t("agent.draft.messageBadge")}</StatusBadge>
            <h3>{t("agent.draft.messageTitle")}</h3>
            <p>{t("agent.draft.messageBody")}</p>
          </div>

          <div className="agent-draft__actions">
            <Button icon={<PencilLine size={15} />} variant="primary">
              {t("agent.draft.editSentence")}
            </Button>
            <Button icon={<Send size={15} />} variant="quiet">
              {t("agent.draft.copy")}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="agent-draft__list">
          <div className="agent-draft__list-top">
            <div>
              <h3>{t("agent.draft.listTitle")}</h3>
              <p>{t("agent.draft.listDesc")}</p>
            </div>
            <Chip>{t("agent.draft.userReview")}</Chip>
          </div>
          <div className="agent-draft__items">
            {suggestions.map((item) => (
              <DraftSuggestionRow item={item} key={`${item.type}-${item.titleKey}`} t={t} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="agent-draft__policy">
        <GlassPanel>
          <MessageSquareQuote size={18} strokeWidth={2.1} />
          <h3>{t("agent.draft.policyQuestionTitle")}</h3>
          <p>{t("agent.draft.policyQuestionDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <Mail size={18} strokeWidth={2.1} />
          <h3>{t("agent.draft.policyClientTitle")}</h3>
          <p>{t("agent.draft.policyClientDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <CheckCircle2 size={18} strokeWidth={2.1} />
          <h3>{t("agent.draft.policyApproveTitle")}</h3>
          <p>{t("agent.draft.policyApproveDesc")}</p>
        </GlassPanel>
      </div>
    </section>
  );
}
