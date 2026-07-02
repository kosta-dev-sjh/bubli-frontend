import { AlertTriangle, Archive, Cloud, Database, FolderSync, HardDrive, Search, ShieldCheck } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./personal-resource-quota-panel.module.css";

type LocalFileStatus = "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "STORAGE_LIMIT_EXCEEDED";

type StorageUsage = {
  limitLabel: string;
  percent: number;
  remainingLabel: string;
  usedLabel: string;
};

type LocalFileItem = {
  filename: string;
  pathLabel: string;
  sizeLabel: string;
  status: LocalFileStatus;
};

type QuotaRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type PersonalResourceQuotaPanelProps = HTMLAttributes<HTMLElement> & {
  files: LocalFileItem[];
  rules: QuotaRule[];
  title?: string;
  usage: StorageUsage;
};

const statusMeta: Record<LocalFileStatus, { label: string; tone: StatusTone }> = {
  LOCAL_ONLY: { label: "로컬만", tone: "personal" },
  STORAGE_LIMIT_EXCEEDED: { label: "용량 초과", tone: "warning" },
  SYNC_PENDING: { label: "대기", tone: "pending" },
  SYNCED: { label: "반영됨", tone: "success" },
};

export const defaultStorageUsage: StorageUsage = {
  limitLabel: "1GB",
  percent: 82,
  remainingLabel: "180MB 남음",
  usedLabel: "820MB 사용",
};

export const defaultQuotaFiles: LocalFileItem[] = [
  {
    filename: "자료보드_화면설계.md",
    pathLabel: "개인 관리 폴더",
    sizeLabel: "2.4MB",
    status: "SYNCED",
  },
  {
    filename: "회의록_검토메모.txt",
    pathLabel: "로컬 색인",
    sizeLabel: "880KB",
    status: "LOCAL_ONLY",
  },
  {
    filename: "업무기준문서_참고자료.zip",
    pathLabel: "서버 반영 대기",
    sizeLabel: "120MB",
    status: "SYNC_PENDING",
  },
  {
    filename: "레퍼런스_전체_압축본.zip",
    pathLabel: "서버 반영 차단",
    sizeLabel: "260MB",
    status: "STORAGE_LIMIT_EXCEEDED",
  },
];

export const defaultQuotaRules: QuotaRule[] = [
  {
    description: "사용자가 지정한 폴더만 색인하고, 서버 전송 전에도 파일명 검색과 변경 확인은 가능합니다.",
    label: "로컬 색인 유지",
    tone: "personal",
  },
  {
    description: "용량 안에 있는 파일만 서버 개인 자료함에 반영합니다.",
    label: "서버 반영 제한",
    tone: "todo",
  },
  {
    description: "개인 자료함에 올라온 뒤에도 프로젝트룸 자료가 되려면 별도 공유 승인이 필요합니다.",
    label: "공유 승인 분리",
    tone: "room",
  },
];

export function PersonalResourceQuotaPanel({
  className,
  files,
  rules,
  title = "개인 자료함 용량",
  usage,
  ...props
}: PersonalResourceQuotaPanelProps) {
  const overLimitCount = files.filter((file) => file.status === "STORAGE_LIMIT_EXCEEDED").length;
  const pendingCount = files.filter((file) => file.status === "SYNC_PENDING").length;
  const usageTone: StatusTone = usage.percent >= 90 ? "warning" : usage.percent >= 75 ? "pending" : "success";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<HardDrive size={16} strokeWidth={2.1} />}>개인 저장 정책</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              개인 자료함 동기화는 사용자별 용량 안에서만 서버에 반영합니다. 용량을 넘은 파일은 기기 안
              색인에는 남겨 검색할 수 있지만, 서버 업로드와 프로젝트룸 공유 단계로 넘어가지 않습니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>무료 기준</span>
          <strong>{usage.limitLabel}</strong>
          <StatusBadge tone={usageTone}>{usage.percent}%</StatusBadge>
        </div>
      </header>

      <section className={styles.usageGrid} aria-label="개인 자료함 사용량">
        <article className={styles.usageCard}>
          <div className={styles.usageTop}>
            <span className={styles.usageIcon}>
              <Archive size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{usage.usedLabel}</strong>
              <p>{usage.remainingLabel}</p>
            </div>
            <StatusBadge tone={usageTone}>{usage.percent}%</StatusBadge>
          </div>
          <ProgressBar className={cn(styles.progress, usageTone === "warning" && styles.progressWarning)} value={usage.percent} />
          <div className={styles.usageMeta}>
            <span>서버 개인 자료함</span>
            <b>{usage.limitLabel}</b>
          </div>
        </article>

        <article className={styles.warningCard}>
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>초과 파일 {overLimitCount}개</strong>
            <p>서버 반영은 멈추지만 로컬 색인과 변경 확인은 유지합니다.</p>
          </div>
        </article>

        <article className={styles.pendingCard}>
          <FolderSync size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>동기화 대기 {pendingCount}개</strong>
            <p>네트워크와 용량을 확인한 뒤 사용자가 승인한 항목만 반영합니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.fileGrid} aria-label="로컬 파일 동기화 상태">
        <div className={styles.fileHeader}>
          <div>
            <strong>로컬 색인 파일</strong>
            <p>서버 전송 전에도 기기 안 색인에서 검색하고 상태를 확인합니다.</p>
          </div>
          <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            기기 안에서 찾기
          </Button>
        </div>
        <div className={styles.fileStack}>
          {files.map((file) => {
            const status = statusMeta[file.status];

            return (
              <article className={cn(styles.fileRow, file.status === "STORAGE_LIMIT_EXCEEDED" && styles.blocked)} key={file.filename}>
                <span className={styles.fileIcon}>
                  <Database size={16} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.fileCopy}>
                  <b>{file.filename}</b>
                  <span>{file.pathLabel}</span>
                </span>
                <span className={styles.fileSize}>{file.sizeLabel}</span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label="개인 자료함 동기화 규칙">
        {rules.map((rule) => (
          <article key={rule.label}>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
              <StatusBadge tone={rule.tone}>정책</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Button icon={<Cloud size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          동기화 대상 확인
        </Button>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          공유 승인으로 이동
        </Button>
      </footer>
    </GlassPanel>
  );
}
