import type { ReactNode } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <GlassPanel className="bubli-empty">
      <div className="bubli-empty__inner">
        <h3>{title}</h3>
        <p>{description}</p>
        {action ? <div>{action}</div> : null}
      </div>
    </GlassPanel>
  );
}
