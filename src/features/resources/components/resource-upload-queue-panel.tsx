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

const statusMeta: Record<UploadStatus, { icon: ReactNode; label: string; tone: StatusTone }> = {
  queued: {
    icon: <Clock3 size={15} strokeWidth={2.1} />,
    label: "대기",
    tone: "pending",
  },
  checking: {
    icon: <ShieldCheck size={15} strokeWidth={2.1} />,
    label: "확인 중",
    tone: "agent",
  },
  uploading: {
    icon: <UploadCloud size={15} strokeWidth={2.1} />,
    label: "업로드 중",
    tone: "todo",
  },
  ready: {
    icon: <CheckCircle2 size={15} strokeWidth={2.1} />,
    label: "반영됨",
    tone: "success",
  },
  blocked: {
    icon: <AlertTriangle size={15} strokeWidth={2.1} />,
    label: "차단됨",
    tone: "warning",
  },
  failed: {
    icon: <XCircle size={15} strokeWidth={2.1} />,
    label: "실패",
    tone: "warning",
  },
};

const scopeLabel: Record<UploadScope, string> = {
  personal: "개인 자료",
  room: "프로젝트룸 자료",
};

export function ResourceUploadQueuePanel({
  className,
  items,
  limitLabel,
  onOpenStorageSettings,
  onRetryFailed,
  storageUsageLabel,
  storageUsagePercent,
  title = "자료 업로드 대기열",
  ...props
}: ResourceUploadQueuePanelProps) {
  const failedCount = items.filter((item) => item.status === "failed").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const activeCount = items.filter((item) => item.status === "queued" || item.status === "checking" || item.status === "uploading").length;

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<FileUp size={14} strokeWidth={2.1} />} selected>
            자료보드
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{title}</h2>
            <p className="m-0 max-w-[660px] text-[14px] leading-6 text-[var(--color-muted)]">
              서버에 반영되기 전 상태를 보여줍니다. 용량을 넘거나 전송이 실패한 자료는 사용자가 다시 확인해야 합니다.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="pending">진행 {activeCount}개</StatusBadge>
          <StatusBadge tone={blockedCount > 0 ? "warning" : "neutral"}>차단 {blockedCount}개</StatusBadge>
          <StatusBadge tone={failedCount > 0 ? "warning" : "neutral"}>실패 {failedCount}개</StatusBadge>
        </div>
      </header>

      <section className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/60 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bubli-icon-tile" aria-hidden="true">
              <HardDrive size={18} strokeWidth={2.1} />
            </span>
            <div>
              <p className="m-0 text-[14px] font-[820] text-[var(--color-text)]">개인 자료함 용량</p>
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">{storageUsageLabel}</p>
            </div>
          </div>
          <Chip>{limitLabel}</Chip>
        </div>
        <ProgressBar label="개인 자료함 사용량" value={storageUsagePercent} />
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
                        {meta.label}
                      </span>
                    </StatusBadge>
                  </div>
                  <p className="m-0 mt-1 text-[12.5px] text-[var(--color-muted)]">
                    {scopeLabel[item.scope]} · {item.sizeLabel}
                  </p>
                </div>
                <span className="text-[13px] font-[800] text-[var(--color-blue-deep)]">{Math.round(item.progress)}%</span>
              </div>
              <ProgressBar label={`${item.fileName} 업로드 진행률`} value={item.progress} />
              {item.message ? <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">{item.message}</p> : null}
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[rgba(215,234,244,0.42)] p-4">
        <p className="m-0 max-w-[620px] text-[13px] leading-5 text-[var(--color-muted)]">
          개인 자료는 사용자가 선택한 범위만 서버에 반영합니다. 프로젝트룸 자료로 보이게 하려면 별도 공유 승인이 필요합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<RefreshCw size={15} strokeWidth={2.1} />} onClick={onRetryFailed} size="sm" variant="quiet">
            실패 항목 재시도
          </Button>
          <Button onClick={onOpenStorageSettings} size="sm" variant="secondary">
            저장 설정 열기
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
