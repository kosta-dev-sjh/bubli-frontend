"use client";

import { Plus } from "lucide-react";
import type { HTMLAttributes } from "react";

import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DropzoneState = "default" | "active" | "invalid" | "empty";

type DashboardDropzoneProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  state?: DropzoneState;
};

const defaultLabelKey: Record<DropzoneState, MessageKey> = {
  default: "dashboard.dropzone.default",
  active: "dashboard.dropzone.active",
  invalid: "dashboard.dropzone.invalid",
  empty: "dashboard.dropzone.empty",
};

export function DashboardDropzone({ className, label, state = "default", ...props }: DashboardDropzoneProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn("bubli-dash-dropzone", state !== "default" && `bubli-dash-dropzone--${state}`, className)}
      {...props}
    >
      <Plus aria-hidden="true" />
      <span>{label ?? t(defaultLabelKey[state])}</span>
    </div>
  );
}
