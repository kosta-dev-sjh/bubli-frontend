"use client";

import { FileText, FolderLock, UsersRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const statusLabelKey: Record<ResourceStatus, MessageKey> = {
  normal: "domain.resource.statusNormal",
  needsReview: "domain.resource.statusNeedsReview",
  candidate: "domain.resource.statusCandidate",
  approved: "domain.resource.statusApproved",
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
  const { t } = useI18n();
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
          {scope === "room" ? t("domain.resource.scopeRoom") : t("domain.resource.scopePersonal")}
        </Chip>
        <StatusBadge tone={status === "needsReview" ? "warning" : status === "approved" ? "approved" : status === "candidate" ? "pending" : "neutral"}>
          {t(statusLabelKey[status])}
        </StatusBadge>
        {typeof relatedCount === "number" ? <Chip>{t("domain.resource.relatedCount", { count: relatedCount })}</Chip> : null}
      </footer>
    </GlassPanel>
  );
}
