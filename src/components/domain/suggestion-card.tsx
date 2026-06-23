import { Bot, CheckCircle2, CirclePause, PencilLine } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type SuggestionStatus = "pending" | "approved" | "held";

type SuggestionCardProps = HTMLAttributes<HTMLElement> & {
  confidence?: number;
  description: string;
  source: string;
  status?: SuggestionStatus;
  title: string;
};

const statusCopy: Record<SuggestionStatus, string> = {
  pending: "승인 전",
  approved: "승인됨",
  held: "보류",
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
          {statusCopy[status]}
        </StatusBadge>
      </div>
      <p className="bubli-domain-card__body">{description}</p>
      {typeof confidence === "number" ? <ProgressBar label="후보 신뢰도" value={confidence} /> : null}
      <footer className="bubli-domain-card__footer">
        <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
          승인
        </Button>
        <Button icon={<PencilLine size={15} />} size="sm" variant="quiet">
          수정
        </Button>
        <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
          보류
        </Button>
      </footer>
    </GlassPanel>
  );
}
