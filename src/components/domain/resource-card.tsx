import { FileText, FolderLock, UsersRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type ResourceScope = "personal" | "room";
type ResourceStatus = "normal" | "needsReview" | "candidate" | "approved";

type ResourceCardProps = HTMLAttributes<HTMLElement> & {
  description?: string;
  meta: string;
  relatedCount?: number;
  scope: ResourceScope;
  status?: ResourceStatus;
  title: string;
};

const statusLabel: Record<ResourceStatus, string> = {
  normal: "자료",
  needsReview: "확인 필요",
  candidate: "후보",
  approved: "승인됨",
};

export function ResourceCard({
  className,
  description,
  meta,
  relatedCount,
  scope,
  status = "normal",
  title,
  ...props
}: ResourceCardProps) {
  const ScopeIcon = scope === "room" ? UsersRound : FolderLock;

  return (
    <GlassPanel as="article" className={cn("bubli-domain-card", className)} {...props}>
      <div className="bubli-card-row">
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileText size={18} strokeWidth={2.1} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h3 className="bubli-domain-card__title">{title}</h3>
          <p className="bubli-domain-card__meta">{meta}</p>
        </div>
      </div>
      {description ? <p className="bubli-domain-card__body">{description}</p> : null}
      <footer className="bubli-domain-card__footer">
        <Chip icon={<ScopeIcon size={14} strokeWidth={2.1} />} selected={scope === "room"}>
          {scope === "room" ? "프로젝트룸 자료" : "개인 자료"}
        </Chip>
        <StatusBadge tone={status === "needsReview" ? "warning" : status === "approved" ? "approved" : status === "candidate" ? "pending" : "neutral"}>
          {statusLabel[status]}
        </StatusBadge>
        {typeof relatedCount === "number" ? <Chip>관련 문서 {relatedCount}개</Chip> : null}
      </footer>
    </GlassPanel>
  );
}
