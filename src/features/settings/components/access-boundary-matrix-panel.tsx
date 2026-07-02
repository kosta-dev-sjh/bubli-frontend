"use client";

import { Eye, EyeOff, FolderLock, MonitorUp, ShieldCheck, UsersRound } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BoundaryTone = "personal" | "room" | "local" | "widget";
type BoundaryStatus = "allowed" | "limited" | "blocked";

export type AccessBoundaryItem = {
  allowed: string;
  blocked: string;
  dataName: string;
  note: string;
  ownerLabel: string;
  status: BoundaryStatus;
  storageLabel: string;
  tone: BoundaryTone;
};

export type AccessBoundaryMatrixPanelProps = HTMLAttributes<HTMLElement> & {
  items: AccessBoundaryItem[];
  subtitle?: string;
  title?: string;
};

const statusLabelKey: Record<BoundaryStatus, MessageKey> = {
  allowed: "settings.abm.status.allowed",
  limited: "settings.abm.status.limited",
  blocked: "settings.abm.status.blocked",
};

const toneIcon: Record<BoundaryTone, ReactNode> = {
  personal: <FolderLock size={18} strokeWidth={2.1} />,
  room: <UsersRound size={18} strokeWidth={2.1} />,
  local: <MonitorUp size={18} strokeWidth={2.1} />,
  widget: <ShieldCheck size={18} strokeWidth={2.1} />,
};

const statusToneMap: Record<BoundaryStatus, StatusTone> = {
  allowed: "success",
  limited: "pending",
  blocked: "warning",
};

export function AccessBoundaryMatrixPanel({
  className,
  items,
  subtitle,
  title,
  ...props
}: AccessBoundaryMatrixPanelProps) {
  const { t } = useI18n();
  const resolvedSubtitle = subtitle ?? t("settings.abm.subtitle");
  const resolvedTitle = title ?? t("settings.abm.title");

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<ShieldCheck size={14} strokeWidth={2.1} />} selected>
            {t("settings.abm.chip")}
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{resolvedTitle}</h2>
            <p className="m-0 max-w-[680px] text-[14px] leading-6 text-[var(--color-muted)]">{resolvedSubtitle}</p>
          </div>
        </div>
        <StatusBadge tone="room">{t("settings.abm.userBasis")}</StatusBadge>
      </header>

      <div className="grid gap-3">
        {items.map((item) => {
          const statusTone = statusToneMap[item.status];

          return (
            <article
              className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              key={`${item.tone}-${item.dataName}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="bubli-icon-tile" aria-hidden="true">
                    {toneIcon[item.tone]}
                  </span>
                  <div className="min-w-0">
                    <h3 className="m-0 text-[16px] font-[840] leading-tight text-[var(--color-text)]">{item.dataName}</h3>
                    <p className="m-0 mt-1 text-[12.5px] text-[var(--color-muted)]">
                      {item.ownerLabel} · {item.storageLabel}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={statusTone}>{t(statusLabelKey[item.status])}</StatusBadge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.58)] p-3">
                  <div className="mb-2 flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-blue-deep)]">
                    <Eye size={15} strokeWidth={2.1} />
                    {t("settings.abm.viewable")}
                  </div>
                  <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">{item.allowed}</p>
                </div>
                <div className="rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.58)] p-3">
                  <div className="mb-2 flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-muted)]">
                    <EyeOff size={15} strokeWidth={2.1} />
                    {t("settings.abm.mustBlock")}
                  </div>
                  <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">{item.blocked}</p>
                </div>
              </div>

              <p className="m-0 rounded-[var(--radius-input)] bg-[rgba(215,234,244,0.42)] px-3 py-2 text-[13px] leading-5 text-[var(--color-muted)]">
                {item.note}
              </p>
            </article>
          );
        })}
      </div>
    </GlassPanel>
  );
}
