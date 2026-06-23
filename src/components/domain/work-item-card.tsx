import { CalendarClock, UserRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
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

const statusCopy: Record<WorkStatus, string> = {
  waiting: "대기",
  doing: "진행 중",
  review: "검토",
  done: "완료",
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
          {statusCopy[status]}
        </StatusBadge>
      </div>
      <footer className="bubli-domain-card__footer">
        {assignee ? <Chip icon={<UserRound size={14} />}>{assignee}</Chip> : null}
        {dueLabel ? <Chip icon={<CalendarClock size={14} />}>{dueLabel}</Chip> : null}
      </footer>
    </GlassPanel>
  );
}
