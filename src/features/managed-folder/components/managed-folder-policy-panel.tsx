import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FolderCheck,
  FolderOpen,
  HardDrive,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./managed-folder-policy-panel.module.css";

export type LocalFileSyncStatus =
  | "LOCAL_ONLY"
  | "SYNC_PENDING"
  | "SYNCED"
  | "CONFLICT"
  | "DELETE_CANDIDATE"
  | "STORAGE_LIMIT_EXCEEDED";

export type ManagedFolderMetric = {
  count: number;
  id: string;
  label: string;
  status: LocalFileSyncStatus;
};

type ManagedFolderPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  backupLabel?: string;
  folderAlias?: string;
  metrics?: ManagedFolderMetric[];
  onBackupNow?: () => void;
  onSelectFolder?: () => void;
  onSyncNow?: () => void;
  quotaLabel?: string;
  quotaPercent?: number;
  syncEnabled?: boolean;
};

const statusCopy: Record<LocalFileSyncStatus, string> = {
  LOCAL_ONLY: "로컬",
  SYNC_PENDING: "동기화 대기",
  SYNCED: "반영됨",
  CONFLICT: "충돌",
  DELETE_CANDIDATE: "삭제 후보",
  STORAGE_LIMIT_EXCEEDED: "용량 초과",
};

const statusTone: Record<LocalFileSyncStatus, "neutral" | "pending" | "success" | "warning"> = {
  LOCAL_ONLY: "neutral",
  SYNC_PENDING: "pending",
  SYNCED: "success",
  CONFLICT: "warning",
  DELETE_CANDIDATE: "warning",
  STORAGE_LIMIT_EXCEEDED: "warning",
};

const defaultMetrics: ManagedFolderMetric[] = [
  {
    count: 24,
    id: "local",
    label: "로컬 색인",
    status: "LOCAL_ONLY",
  },
  {
    count: 3,
    id: "pending",
    label: "서버 반영 대기",
    status: "SYNC_PENDING",
  },
  {
    count: 18,
    id: "synced",
    label: "개인 자료함 반영",
    status: "SYNCED",
  },
  {
    count: 1,
    id: "conflict",
    label: "확인 필요",
    status: "CONFLICT",
  },
];

export function ManagedFolderPolicyPanel({
  backupLabel = "마지막 로컬 백업 09:42",
  className,
  folderAlias = "~/Documents/Bubli",
  metrics = defaultMetrics,
  onBackupNow,
  onSelectFolder,
  onSyncNow,
  quotaLabel = "개인 자료함 820MB / 1GB",
  quotaPercent = 82,
  syncEnabled = true,
  ...props
}: ManagedFolderPolicyPanelProps) {
  const pendingCount = metrics
    .filter((metric) => metric.status === "SYNC_PENDING" || metric.status === "CONFLICT")
    .reduce((sum, metric) => sum + metric.count, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <FolderCheck size={22} />
          </span>
          <div>
            <StatusBadge tone={syncEnabled ? "success" : "neutral"}>{syncEnabled ? "동기화 켜짐" : "로컬만 사용"}</StatusBadge>
            <h2>개인 관리 폴더</h2>
            <p>사용자가 지정한 폴더만 감지하고, 서버 반영과 프로젝트룸 공유는 각각 확인한 뒤 진행합니다.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<FolderOpen size={15} />} onClick={onSelectFolder} size="sm" variant="quiet">
            폴더 선택
          </Button>
          <Button icon={<UploadCloud size={15} />} onClick={onSyncNow} size="sm" variant="primary">
            대기 항목 반영
          </Button>
        </div>
      </header>

      <div className={styles.folderCard}>
        <div className={styles.folderIcon} aria-hidden="true">
          <HardDrive size={20} />
        </div>
        <div className={styles.folderBody}>
          <strong>{folderAlias}</strong>
          <span>scan_folder와 watch_folder는 이 폴더 안에서만 동작합니다.</span>
        </div>
        <Chip>{pendingCount}개 확인 필요</Chip>
      </div>

      <div className={styles.metricGrid} aria-label="개인 관리 폴더 동기화 상태">
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.id}>
            <div>
              <strong>{metric.count}</strong>
              <span>{metric.label}</span>
            </div>
            <StatusBadge tone={statusTone[metric.status]}>{statusCopy[metric.status]}</StatusBadge>
          </article>
        ))}
      </div>

      <div className={styles.policyGrid}>
        <PolicyItem
          icon={<ShieldCheck size={17} />}
          label="접근 범위"
          value="전체 PC가 아니라 사용자가 선택한 개인 관리 폴더만 색인합니다."
        />
        <PolicyItem
          icon={<Database size={17} />}
          label="저장 기준"
          value="파일 색인과 변경 이벤트는 먼저 Tauri SQLite에 저장합니다."
        />
        <PolicyItem
          icon={<AlertTriangle size={17} />}
          label="공유 기준"
          value="개인 자료함 동기화와 프로젝트룸 공유 승인은 서로 다른 단계입니다."
        />
      </div>

      <footer className={styles.footer}>
        <div className={styles.quota}>
          <div>
            <strong>{quotaLabel}</strong>
            <span>용량을 넘으면 서버 업로드는 막고 로컬 색인은 유지합니다.</span>
          </div>
          <span>{quotaPercent}%</span>
        </div>
        <ProgressBar label="개인 자료함 사용량" value={quotaPercent} />
        <div className={styles.backupRow}>
          <span>
            <CheckCircle2 size={15} />
            {backupLabel}
          </span>
          <Button icon={<RefreshCcw size={14} />} onClick={onBackupNow} size="sm" variant="ghost">
            백업 만들기
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}

function PolicyItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.policyItem}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </div>
  );
}
