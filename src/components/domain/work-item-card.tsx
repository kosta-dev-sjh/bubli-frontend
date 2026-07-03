"use client";

import { CalendarClock, UserRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type WorkStatus = "waiting" | "doing" | "review" | "done";

type WorkItemCardProps = HTMLAttributes<HTMLElement> & {
  assignee?: string;
  code?: string;
  dueLabel?: string;
  sourceLabel?: string;
  status: WorkStatus;
  title: string;
};

const statusCopyKey: Record<WorkStatus, MessageKey> = {
  waiting: "domain.work.statusWaiting",
  doing: "domain.work.statusDoing",
  review: "domain.work.statusReview",
  done: "domain.work.statusDone",
};

export function WorkItemCard({
  assignee,
  className,
  code,
  dueLabel,
  sourceLabel,
  status,
  title,
  ...props
}: WorkItemCardProps) {
  const { t } = useI18n();
  return (
    <GlassPanel as="article" className={cn("bubli-domain-card", className)} {...props}>
      <div className="bubli-card-row">
        <div style={{ minWidth: 0 }}>
          {code ? <StatusBadge tone="pending">{code}</StatusBadge> : null}
          <h3 className="bubli-domain-card__title" style={{ marginTop: code ? 8 : 0 }}>
            {title}
          </h3>
          {sourceLabel ? <p className="bubli-domain-card__meta">{sourceLabel}</p> : null}
        </div>
        <StatusBadge tone={status === "done" ? "approved" : status === "review" ? "warning" : status === "doing" ? "todo" : "neutral"}>
          {t(statusCopyKey[status])}
        </StatusBadge>
      </div>
      <footer className="bubli-domain-card__footer">
        {assignee ? <Chip icon={<UserRound size={14} />}>{assignee}</Chip> : null}
        {dueLabel ? <Chip icon={<CalendarClock size={14} />}>{dueLabel}</Chip> : null}
      </footer>
    </GlassPanel>
  );
}
