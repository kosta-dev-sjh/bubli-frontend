import { Plus } from "lucide-react";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type DropzoneState = "default" | "active" | "invalid" | "empty";

type DashboardDropzoneProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  state?: DropzoneState;
};

const defaultLabel: Record<DropzoneState, string> = {
  default: "여기에 위젯을 놓으세요",
  active: "놓으면 추가됩니다",
  invalid: "여기에는 놓을 수 없어요",
  empty: "위젯을 끌어다 나만의 워크스페이스를 꾸며보세요",
};

export function DashboardDropzone({ className, label, state = "default", ...props }: DashboardDropzoneProps) {
  return (
    <div
      className={cn("bubli-dash-dropzone", state !== "default" && `bubli-dash-dropzone--${state}`, className)}
      {...props}
    >
      <Plus aria-hidden="true" />
      <span>{label ?? defaultLabel[state]}</span>
    </div>
  );
}
