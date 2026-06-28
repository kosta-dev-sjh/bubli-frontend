import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { DashboardDropzone } from "./dashboard-dropzone";

type DashboardGridProps = HTMLAttributes<HTMLDivElement> & {
  dense?: boolean;
  empty?: boolean;
  mode?: "view" | "edit";
};

// 12-col 그리드 컨테이너. tile들을 children으로 받는다(프레젠테이셔널).
export function DashboardGrid({ children, className, dense = false, empty = false, mode = "view", ...props }: DashboardGridProps) {
  if (empty) {
    return (
      <div className={cn("bubli-dash-grid", mode === "edit" && "bubli-dash-grid--edit", className)} {...props}>
        <div style={{ gridColumn: "span 12" }}>
          <DashboardDropzone state="empty" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("bubli-dash-grid", dense && "bubli-dash-grid--dense", mode === "edit" && "bubli-dash-grid--edit", className)}
      {...props}
    >
      {children}
    </div>
  );
}
