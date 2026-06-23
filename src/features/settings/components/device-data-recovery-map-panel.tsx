import {
  ArchiveRestore,
  CheckCircle2,
  Cloud,
  DatabaseBackup,
  HardDrive,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./device-data-recovery-map-panel.module.css";

type RecoverySource = "SERVER" | "LOCAL_BACKUP" | "CACHE_REBUILD" | "NOT_RECOVERABLE";
type RecoveryHealth = "SAFE" | "ATTENTION" | "RISK";

type RecoveryItem = {
  description: string;
  label: string;
  source: RecoverySource;
  health: RecoveryHealth;
  lastCheckedLabel: string;
};

type BackupSnapshot = {
  label: string;
  value: string;
  tone: StatusTone;
};

export type DeviceDataRecoveryMapPanelProps = HTMLAttributes<HTMLElement> & {
  backupSnapshots: BackupSnapshot[];
  items: RecoveryItem[];
  title?: string;
};

const sourceMeta: Record<RecoverySource, { label: string; tone: StatusTone; icon: typeof Cloud }> = {
  CACHE_REBUILD: { icon: RefreshCcw, label: "서버에서 재구성", tone: "pending" },
  LOCAL_BACKUP: { icon: DatabaseBackup, label: "로컬 백업 필요", tone: "personal" },
  NOT_RECOVERABLE: { icon: ShieldAlert, label: "복구 제한", tone: "warning" },
  SERVER: { icon: Cloud, label: "서버 원본", tone: "approved" },
};

const healthMeta: Record<RecoveryHealth, { label: string; tone: StatusTone }> = {
  ATTENTION: { label: "확인 필요", tone: "pending" },
  RISK: { label: "주의", tone: "warning" },
  SAFE: { label: "안전", tone: "success" },
};

export const defaultRecoveryItems: RecoveryItem[] = [
  {
    description: "프로젝트룸 채팅, TODO, 일정, 자료 메타데이터는 서버 DB 원본에서 다시 내려받습니다.",
    health: "SAFE",
    label: "프로젝트룸 데이터",
    lastCheckedLabel: "방금 확인",
    source: "SERVER",
  },
  {
    description: "Tauri의 프로젝트룸 채팅 캐시는 비어도 서버의 최근 메시지와 sequence 기준으로 다시 채웁니다.",
    health: "SAFE",
    label: "채팅 캐시",
    lastCheckedLabel: "5분 전",
    source: "CACHE_REBUILD",
  },
  {
    description: "개인 에이전트 원문, 로컬 요약, 앱 설정은 암호화된 로컬 백업이 있을 때만 복구합니다.",
    health: "ATTENTION",
    label: "개인 로컬 데이터",
    lastCheckedLabel: "오늘 09:10",
    source: "LOCAL_BACKUP",
  },
  {
    description: "위젯 상세 사용 이벤트 원문은 서버에 저장하지 않습니다. 로컬 백업이 없으면 일부 기록은 복구하지 못합니다.",
    health: "RISK",
    label: "위젯 상세 이벤트",
    lastCheckedLabel: "백업 전",
    source: "NOT_RECOVERABLE",
  },
];

export const defaultBackupSnapshots: BackupSnapshot[] = [
  { label: "최근 백업", tone: "approved", value: "오늘 09:10" },
  { label: "보관 파일", tone: "personal", value: "7개" },
  { label: "대기열", tone: "pending", value: "2건" },
  { label: "무결성", tone: "success", value: "정상" },
];

export function DeviceDataRecoveryMapPanel({
  backupSnapshots,
  className,
  items,
  title = "데이터 복구 출처",
  ...props
}: DeviceDataRecoveryMapPanelProps) {
  const safeCount = items.filter((item) => item.health === "SAFE").length;
  const riskCount = items.filter((item) => item.health === "RISK").length;
  const safePercent = Math.round((safeCount / items.length) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ArchiveRestore size={16} strokeWidth={2.1} />}>기기 복구</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              Tauri SQLite가 비거나 손상될 때 어떤 데이터가 서버에서 복구되고, 어떤 데이터가 로컬 백업을 필요로
              하는지 구분합니다. 프로젝트룸 원본과 개인 로컬 데이터의 복구 기준은 다릅니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>복구 안전도</span>
          <strong>{safePercent}%</strong>
          <StatusBadge tone={riskCount > 0 ? "warning" : "success"}>주의 {riskCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.snapshotGrid} aria-label="로컬 백업 상태">
        {backupSnapshots.map((snapshot) => (
          <article key={snapshot.label}>
            <span>{snapshot.label}</span>
            <strong>{snapshot.value}</strong>
            <StatusBadge tone={snapshot.tone}>상태</StatusBadge>
          </article>
        ))}
      </section>

      <section className={styles.recoveryList} aria-label="데이터별 복구 출처">
        {items.map((item) => {
          const source = sourceMeta[item.source];
          const health = healthMeta[item.health];
          const Icon = source.icon;

          return (
            <article className={cn(styles.recoveryItem, item.health === "RISK" && styles.riskyItem)} key={item.label}>
              <span className={styles.iconTile}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div className={styles.itemCopy}>
                <div className={styles.itemTop}>
                  <strong>{item.label}</strong>
                  <div className={styles.badges}>
                    <StatusBadge tone={source.tone}>{source.label}</StatusBadge>
                    <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
                  </div>
                </div>
                <p>{item.description}</p>
                <small>{item.lastCheckedLabel}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.policyGrid} aria-label="복구 정책">
        <article>
          <Cloud size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>서버 원본 우선</strong>
            <p>프로젝트룸 채팅, TODO, 일정, 자료 메타데이터는 서버 원본을 다시 불러옵니다.</p>
          </div>
        </article>
        <article>
          <HardDrive size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>로컬 백업 필요</strong>
            <p>개인 에이전트 원문과 로컬 설정은 기기 안의 백업이 있을 때만 되살립니다.</p>
          </div>
        </article>
        <article>
          <LockKeyhole size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>서버 미보관</strong>
            <p>상세 위젯 이벤트 원문은 서버에 남기지 않고, 집계와 항목 상태만 서버에 보관합니다.</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>복구 전에 손상된 SQLite 파일은 따로 보관하고, 서버 원본과 로컬 백업을 순서대로 확인합니다.</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<RefreshCcw size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            무결성 확인
          </Button>
          <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            백업 만들기
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
