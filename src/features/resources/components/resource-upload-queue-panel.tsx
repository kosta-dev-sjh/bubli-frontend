"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileUp,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type UploadScope = "personal" | "room";
type UploadStatus = "queued" | "checking" | "uploading" | "ready" | "blocked" | "failed";

export type ResourceUploadQueueItem = {
  fileName: string;
  message?: string;
  progress: number;
  scope: UploadScope;
  sizeLabel: string;
  status: UploadStatus;
};

export type ResourceUploadQueuePanelProps = HTMLAttributes<HTMLElement> & {
  items: ResourceUploadQueueItem[];
  limitLabel: string;
  onOpenStorageSettings?: () => void;
  onRetryFailed?: () => void;
  storageUsageLabel: string;
  storageUsagePercent: number;
  title?: string;
};

const statusMeta: Record<UploadStatus, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  queued: {
    icon: <Clock3 size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.queue.status.queued",
    tone: "pending",
  },
  checking: {
    icon: <ShieldCheck size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.queue.status.checking",
    tone: "agent",
  },
  uploading: {
    icon: <UploadCloud size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.queue.status.uploading",
    tone: "todo",
  },
  ready: {
    icon: <CheckCircle2 size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.queue.status.ready",
    tone: "success",
  },
  blocked: {
    icon: <AlertTriangle size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.queue.status.blocked",
    tone: "warning",
  },
  failed: {
    icon: <XCircle size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.queue.status.failed",
    tone: "warning",
  },
};

const scopeLabelKey: Record<UploadScope, MessageKey> = {
  personal: "resources.upload.scopePersonal",
  room: "resources.upload.scopeRoom",
};

export function ResourceUploadQueuePanel({
  className,
  items,
  limitLabel,
  onOpenStorageSettings,
  onRetryFailed,
  storageUsageLabel,
  storageUsagePercent,
  title,
  ...props
}: ResourceUploadQueuePanelProps) {
  const { t } = useI18n();
  const failedCount = items.filter((item) => item.status === "failed").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const activeCount = items.filter((item) => item.status === "queued" || item.status === "checking" || item.status === "uploading").length;

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<FileUp size={14} strokeWidth={2.1} />} selected>
            {t("resources.upload.queue.chip")}
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{title ?? t("resources.upload.queue.defaultTitle")}</h2>
            <p className="m-0 max-w-[660px] text-[14px] leading-6 text-[var(--color-muted)]">
              {t("resources.upload.queue.intro")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="pending">{t("resources.upload.queue.badgeActive", { count: activeCount })}</StatusBadge>
          <StatusBadge tone={blockedCount > 0 ? "warning" : "neutral"}>{t("resources.upload.queue.badgeBlocked", { count: blockedCount })}</StatusBadge>
          <StatusBadge tone={failedCount > 0 ? "warning" : "neutral"}>{t("resources.upload.queue.badgeFailed", { count: failedCount })}</StatusBadge>
        </div>
      </header>

      <section className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/60 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bubli-icon-tile" aria-hidden="true">
              <HardDrive size={18} strokeWidth={2.1} />
            </span>
            <div>
              <p className="m-0 text-[14px] font-[820] text-[var(--color-text)]">{t("resources.upload.queue.storageTitle")}</p>
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">{storageUsageLabel}</p>
            </div>
          </div>
          <Chip>{limitLabel}</Chip>
        </div>
        <ProgressBar label={t("resources.upload.queue.storageProgressLabel")} value={storageUsagePercent} />
      </section>

      <ul className="m-0 grid list-none gap-3 p-0">
        {items.map((item) => {
          const meta = statusMeta[item.status];

          return (
            <li
              className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              key={`${item.scope}-${item.fileName}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-[15px] font-[820] text-[var(--color-text)]">{item.fileName}</span>
                    <StatusBadge tone={meta.tone}>
                      <span className="inline-flex items-center gap-1">
                        {meta.icon}
                        {t(meta.labelKey)}
                      </span>
                    </StatusBadge>
                  </div>
                  <p className="m-0 mt-1 text-[12.5px] text-[var(--color-muted)]">
                    {t(scopeLabelKey[item.scope])} · {item.sizeLabel}
                  </p>
                </div>
                <span className="text-[13px] font-[800] text-[var(--color-blue-deep)]">{Math.round(item.progress)}%</span>
              </div>
              <ProgressBar label={t("resources.upload.queue.progressLabel", { fileName: item.fileName })} value={item.progress} />
              {item.message ? <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">{item.message}</p> : null}
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[rgba(215,234,244,0.42)] p-4">
        <p className="m-0 max-w-[620px] text-[13px] leading-5 text-[var(--color-muted)]">
          {t("resources.upload.queue.footerNote")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<RefreshCw size={15} strokeWidth={2.1} />} onClick={onRetryFailed} size="sm" variant="quiet">
            {t("resources.upload.queue.retryFailed")}
          </Button>
          <Button onClick={onOpenStorageSettings} size="sm" variant="secondary">
            {t("resources.upload.queue.openStorageSettings")}
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
