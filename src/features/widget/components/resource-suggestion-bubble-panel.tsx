"use client";

import { ArrowRight, EyeOff, FileSearch, Pin, ShieldCheck, Sparkles, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type SuggestedResource = {
  id: string;
  title: MessageKey;
  source: MessageKey;
  reason: MessageKey;
  status: "candidate" | "pinned" | "hidden";
  confidence: number;
};

const resources: SuggestedResource[] = [
  {
    id: "item1",
    confidence: 86,
    reason: "widget.rs.item1.reason",
    source: "widget.rs.item1.source",
    status: "candidate",
    title: "widget.rs.item1.title",
  },
  {
    id: "item2",
    confidence: 74,
    reason: "widget.rs.item2.reason",
    source: "widget.rs.item2.source",
    status: "pinned",
    title: "widget.rs.item2.title",
  },
  {
    id: "item3",
    confidence: 61,
    reason: "widget.rs.item3.reason",
    source: "widget.rs.item3.source",
    status: "hidden",
    title: "widget.rs.item3.title",
  },
];

const statusMeta: Record<SuggestedResource["status"], { label: MessageKey; tone: "agent" | "memo" | "neutral" }> = {
  candidate: { label: "widget.rs.status.candidate", tone: "agent" },
  hidden: { label: "widget.rs.status.hidden", tone: "neutral" },
  pinned: { label: "widget.rs.status.pinned", tone: "memo" },
};

function ResourceSuggestionRow({ item }: { item: SuggestedResource }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];
  const title = t(item.title);

  return (
    <article className="resource-suggestion-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileSearch size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-suggestion-row__meta">
          <StatusBadge tone={status.tone}>{t(status.label)}</StatusBadge>
          <span>{t(item.source)}</span>
        </div>
        <h3>{title}</h3>
        <p>{t(item.reason)}</p>
        <ProgressBar label={t("widget.rs.relevance", { title })} value={item.confidence} />
      </div>
    </article>
  );
}

export function ResourceSuggestionBubblePanel() {
  const { t } = useI18n();
  return (
    <section className="resource-suggestion" aria-label={t("widget.rs.sectionAria")}>
      <GlassPanel className="resource-suggestion__hero">
        <div>
          <Chip icon={<Sparkles size={14} />} selected>
            {t("widget.rs.chip")}
          </Chip>
          <h2>{t("widget.rs.heroTitle")}</h2>
          <p>{t("widget.rs.heroBody")}</p>
        </div>
        <div className="resource-suggestion__summary">
          <StatusBadge tone="agent">{t("widget.rs.summaryBadge")}</StatusBadge>
          <strong>5</strong>
          <span>{t("widget.rs.summaryCaption")}</span>
          <ProgressBar label={t("widget.rs.checkRate")} value={68} />
        </div>
      </GlassPanel>

      <div className="resource-suggestion__grid">
        <GlassPanel className="resource-suggestion__bubble">
          <div className="resource-suggestion__bubble-top">
            <div>
              <h3>{t("widget.rs.bubbleTitle")}</h3>
              <p>{t("widget.rs.bubbleBody")}</p>
            </div>
            <Chip>{t("widget.rs.personalArea")}</Chip>
          </div>

          <div className="resource-suggestion__bubble-preview">
            <div className="resource-suggestion__bubble-title">
              <span className="bubli-icon-tile" aria-hidden="true">
                <Star size={15} strokeWidth={2.1} />
              </span>
              <strong>{t("widget.rs.bubblePreviewTitle")}</strong>
              <span>{t("widget.rs.bubblePreviewCount")}</span>
            </div>
            <div className="resource-suggestion__bubble-card">
              <StatusBadge tone="room">{t("widget.rs.previewRoomBadge")}</StatusBadge>
              <h3>{t("widget.rs.previewFile")}</h3>
              <p>{t("widget.rs.previewReason")}</p>
              <div>
                <Button icon={<Pin size={14} />} size="sm" variant="primary">
                  {t("widget.rs.pin")}
                </Button>
                <Button icon={<EyeOff size={14} />} size="sm" variant="quiet">
                  {t("widget.rs.hide")}
                </Button>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="resource-suggestion__list">
          <div className="resource-suggestion__list-top">
            <div>
              <h3>{t("widget.rs.candidateTitle")}</h3>
              <p>{t("widget.rs.candidateBody")}</p>
            </div>
            <Chip>{t("widget.rs.itemState")}</Chip>
          </div>
          <div className="resource-suggestion__items">
            {resources.map((item) => (
              <ResourceSuggestionRow item={item} key={item.id} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-suggestion__flow">
        <Chip selected>{t("widget.rs.flowContext")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>{t("widget.rs.flowCandidate")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>{t("widget.rs.flowPermission")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip selected>{t("widget.rs.flowBubble")}</Chip>
      </GlassPanel>

      <div className="resource-suggestion__policy">
        <GlassPanel>
          <ShieldCheck size={18} strokeWidth={2.1} />
          <h3>{t("widget.rs.policyPermTitle")}</h3>
          <p>{t("widget.rs.policyPermBody")}</p>
        </GlassPanel>
        <GlassPanel>
          <Pin size={18} strokeWidth={2.1} />
          <h3>{t("widget.rs.policyPinTitle")}</h3>
          <p>{t("widget.rs.policyPinBody")}</p>
        </GlassPanel>
        <GlassPanel>
          <X size={18} strokeWidth={2.1} />
          <h3>{t("widget.rs.policyHideTitle")}</h3>
          <p>{t("widget.rs.policyHideBody")}</p>
        </GlassPanel>
      </div>
    </section>
  );
}
