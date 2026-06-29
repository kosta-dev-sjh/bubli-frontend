import {
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  FolderLock,
  KeyRound,
  ShieldCheck,
  UserX,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-download-access-panel.module.css";

export type DownloadAccessScope = "PERSONAL" | "ROOM_SHARED";
export type DownloadAccessStatus = "READY" | "CHECKING" | "DENIED" | "EXPIRED";
export type DownloadCheckStatus = "PASSED" | "PENDING" | "BLOCKED";

export type DownloadCheckItem = {
  description: string;
  id: string;
  label: string;
  status: DownloadCheckStatus;
};

export type DownloadFileMeta = {
  checksumLabel: string;
  fileName: string;
  mimeLabel: string;
  sizeLabel: string;
  updatedLabel: string;
};

export type ResourceDownloadAccessPanelProps = {
  accessScope?: DownloadAccessScope;
  checks?: DownloadCheckItem[];
  className?: string;
  expiresLabel?: string;
  file?: DownloadFileMeta;
  onDownload?: () => void;
  onRefreshUrl?: () => void;
  status?: DownloadAccessStatus;
};

const accessCopy: Record<DownloadAccessStatus, string> = {
  CHECKING: "권한 확인 중",
  DENIED: "다운로드 불가",
  EXPIRED: "주소 만료",
  READY: "다운로드 가능",
};

const accessTone: Record<DownloadAccessStatus, StatusTone> = {
  CHECKING: "pending",
  DENIED: "warning",
  EXPIRED: "pending",
  READY: "approved",
};

const checkStatusCopy: Record<DownloadCheckStatus, string> = {
  BLOCKED: "차단",
  PASSED: "확인",
  PENDING: "대기",
};

const checkStatusTone: Record<DownloadCheckStatus, StatusTone> = {
  BLOCKED: "warning",
  PASSED: "approved",
  PENDING: "pending",
};

const defaultFile: DownloadFileMeta = {
  checksumLabel: "파일 지문 확인됨",
  fileName: "번역계약서_v2.pdf",
  mimeLabel: "PDF",
  sizeLabel: "2.4 MB",
  updatedLabel: "2026-06-18 15:20",
};

const defaultChecks: DownloadCheckItem[] = [
  {
    description: "로그인한 사용자인지 확인합니다.",
    id: "auth",
    label: "회원 인증",
    status: "PASSED",
  },
  {
    description: "개인 자료는 올린 사람 기준, 프로젝트룸 자료는 멤버 권한 기준으로 확인합니다.",
    id: "resource-scope",
    label: "자료 접근 권한",
    status: "PASSED",
  },
  {
    description: "파일 저장소 경로가 아니라 서버 권한 기준으로 다운로드 주소를 발급합니다.",
    id: "download-url",
    label: "다운로드 주소 발급",
    status: "PASSED",
  },
];

export function ResourceDownloadAccessPanel({
  accessScope = "ROOM_SHARED",
  checks = defaultChecks,
  className,
  expiresLabel = "10분 뒤 만료",
  file = defaultFile,
  onDownload,
  onRefreshUrl,
  status = "READY",
}: ResourceDownloadAccessPanelProps) {
  const ScopeIcon = accessScope === "ROOM_SHARED" ? UsersRound : FolderLock;
  const blocked = status === "DENIED" || checks.some((check) => check.status === "BLOCKED");
  const needsRefresh = status === "EXPIRED";

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Download size={14} />}>다운로드 권한</Chip>
          <h2>자료 파일은 서버 권한 확인 뒤 내려받습니다</h2>
          <p>
            파일 저장소를 직접 열지 않고, 로그인 사용자와 자료 접근 권한을 확인한 뒤 제한된 시간의
            다운로드 주소를 발급합니다.
          </p>
        </div>
        <StatusBadge tone={accessTone[status]}>{accessCopy[status]}</StatusBadge>
      </header>

      <section className={styles.fileCard} aria-label="다운로드 파일 정보">
        <span className={styles.fileIcon} aria-hidden="true">
          <FileText size={21} strokeWidth={2.1} />
        </span>
        <div className={styles.fileText}>
          <span>{accessScope === "ROOM_SHARED" ? "프로젝트룸 자료" : "개인 자료"}</span>
          <strong>{file.fileName}</strong>
          <p>
            {file.mimeLabel} · {file.sizeLabel} · {file.updatedLabel}
          </p>
        </div>
        <Button icon={<FileCheck2 size={15} />} onClick={onRefreshUrl} size="sm" variant="quiet">
          권한 다시 확인
        </Button>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.checkPanel} aria-label="다운로드 전 확인 항목">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>다운로드 전 확인</h3>
              <p>권한과 파일 상태가 맞아야 다운로드 주소를 사용할 수 있습니다.</p>
            </div>
          </div>

          <ul className={styles.checkList}>
            {checks.map((check) => (
              <li key={check.id}>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.description}</p>
                </div>
                <StatusBadge tone={checkStatusTone[check.status]}>{checkStatusCopy[check.status]}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.policyPanel} aria-label="다운로드 보안 기준">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <ScopeIcon size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>자료 접근 기준</h3>
              <p>프로젝트룸 밖 사용자나 나간 멤버는 자료를 내려받을 수 없습니다.</p>
            </div>
          </div>

          <div className={styles.policyStack}>
            <article>
              <KeyRound size={17} strokeWidth={2.1} />
              <div>
                <strong>짧게 유효한 주소</strong>
                <p>{expiresLabel}라서 오래 보관해도 다시 확인을 거칩니다.</p>
              </div>
            </article>
            <article>
              <FileArchive size={17} strokeWidth={2.1} />
              <div>
                <strong>파일 메타데이터 확인</strong>
                <p>{file.checksumLabel} 기준으로 사용자가 내려받는 파일을 구분합니다.</p>
              </div>
            </article>
            <article>
              <UserX size={17} strokeWidth={2.1} />
              <div>
                <strong>비멤버 접근 제한</strong>
                <p>프로젝트룸 멤버가 아니면 자료 다운로드를 차단합니다.</p>
              </div>
            </article>
          </div>

          <div className={styles.actions}>
            {needsRefresh ? (
              <Button icon={<Clock3 size={15} />} onClick={onRefreshUrl} size="sm" variant="quiet">
                주소 다시 받기
              </Button>
            ) : null}
            <Button disabled={blocked || needsRefresh} icon={<Download size={15} />} onClick={onDownload} size="sm" variant="primary">
              다운로드
            </Button>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
