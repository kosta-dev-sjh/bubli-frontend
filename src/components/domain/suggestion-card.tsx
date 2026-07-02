"use client";

import { Bot, CheckCircle2, CirclePause, PencilLine } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SuggestionStatus = "pending" | "approved" | "held";

type SuggestionCardProps = HTMLAttributes<HTMLElement> & {
  confidence?: number;
  description: string;
  source: string;
  status?: SuggestionStatus;
  title: string;
};

const statusCopyKey: Record<SuggestionStatus, MessageKey> = {
  pending: "domain.suggestion.statusPending",
  approved: "domain.suggestion.statusApproved",
  held: "domain.suggestion.statusHeld",
};

export function SuggestionCard({
  className,
  confidence,
  description,
  source,
  status = "pending",
  title,
  ...props
}: SuggestionCardProps) {
  const { t } = useI18n();
  return (
    <GlassPanel as="article" className={cn("bubli-domain-card", className)} {...props}>
      <div className="bubli-card-row">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Bot size={18} strokeWidth={2.1} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h3 className="bubli-domain-card__title">{title}</h3>
          <p className="bubli-domain-card__meta">{source}</p>
        </div>
        <StatusBadge tone={status === "approved" ? "approved" : status === "held" ? "warning" : "pending"}>
          {t(statusCopyKey[status])}
        </StatusBadge>
      </div>
      <p className="bubli-domain-card__body">{description}</p>
      {typeof confidence === "number" ? <ProgressBar label={t("domain.suggestion.confidenceLabel")} value={confidence} /> : null}
      <footer className="bubli-domain-card__footer">
        <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
          {t("domain.suggestion.approve")}
        </Button>
        <Button icon={<PencilLine size={15} />} size="sm" variant="quiet">
          {t("domain.suggestion.edit")}
        </Button>
        <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
          {t("domain.suggestion.hold")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
