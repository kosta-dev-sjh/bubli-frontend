import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  FolderLock,
  History,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-version-decision-panel.module.css";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";
export type ResourceVersionStatus = "CURRENT" | "PREVIOUS" | "PENDING_REVIEW";
export type ResourceVersionDecision = "CREATE_VERSION" | "KEEP_CURRENT" | "HOLD_UPLOAD";

export type ResourceVersionItem = {
  authorLabel: string;
  changedAtLabel: string;
  fileName: string;
  id: string;
  note: string;
  status: ResourceVersionStatus;
  versionLabel: string;
};

export type ResourceVersionDecisionPanelProps = {
  className?: string;
  currentFileName?: string;
  incomingFileName?: string;
  onChooseDecision?: (decision: ResourceVersionDecision) => void;
  onOpenCurrent?: () => void;
  onOpenIncoming?: () => void;
  versions?: ResourceVersionItem[];
  visibility?: ResourceVisibility;
};

const versionStatusCopy: Record<ResourceVersionStatus, string> = {
  CURRENT: "현재 버전",
  PENDING_REVIEW: "검토 대기",
  PREVIOUS: "이전 버전",
};

const versionStatusTone: Record<ResourceVersionStatus, StatusTone> = {
  CURRENT: "approved",
  PENDING_REVIEW: "pending",
  PREVIOUS: "neutral",
};

const decisionCopy: Record<ResourceVersionDecision, { description: string; label: string }> = {
  CREATE_VERSION: {
    description: "새 파일을 다음 버전으로 등록하고 기존 버전 기록을 유지합니다.",
    label: "새 버전으로 등록",
  },
  HOLD_UPLOAD: {
    description: "파일은 대기 상태로 두고 프로젝트룸 자료에는 반영하지 않습니다.",
    label: "나중에 확인",
  },
  KEEP_CURRENT: {
    description: "현재 등록된 자료를 그대로 두고 새 파일은 반영하지 않습니다.",
    label: "현재 자료 유지",
  },
};

const defaultVersions: ResourceVersionItem[] = [
  {
    authorLabel: "프로젝트 리더",
    changedAtLabel: "2026-06-18 15:20",
    fileName: "요구사항정의서_v1.3.pdf",
    id: "version-current",
    note: "WBS 후보 생성에 사용 중인 현재 자료입니다.",
    status: "CURRENT",
    versionLabel: "v3",
  },
  {
    authorLabel: "이서연",
    changedAtLabel: "2026-06-16 11:42",
    fileName: "요구사항정의서_v1.2.pdf",
    id: "version-previous-2",
    note: "검수 기준 문장이 추가되기 전 버전입니다.",
    status: "PREVIOUS",
    versionLabel: "v2",
  },
  {
    authorLabel: "프로젝트 리더",
    changedAtLabel: "2026-06-14 09:18",
    fileName: "요구사항정의서_초안.pdf",
    id: "version-previous-1",
    note: "프로젝트룸 생성 시 처음 업로드한 자료입니다.",
    status: "PREVIOUS",
    versionLabel: "v1",
  },
];

export function ResourceVersionDecisionPanel({
  className,
  currentFileName = "요구사항정의서_v1.3.pdf",
  incomingFileName = "요구사항정의서_v1.4.pdf",
  onChooseDecision,
  onOpenCurrent,
  onOpenIncoming,
  versions = defaultVersions,
  visibility = "ROOM_SHARED",
}: ResourceVersionDecisionPanelProps) {
  const VisibilityIcon = visibility === "ROOM_SHARED" ? UsersRound : FolderLock;
  const sortedVersions = versions;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<History size={14} />}>자료 버전 확인</Chip>
          <h2>같은 자료를 다시 올리면 사용자가 반영 방식을 고릅니다</h2>
          <p>
            새 파일을 바로 확정하지 않고 현재 자료와 비교해 보여줍니다. 선택한 뒤에만 자료보드의
            최신 버전과 분석 후보가 바뀝니다.
          </p>
        </div>
        <StatusBadge tone={visibility === "ROOM_SHARED" ? "room" : "personal"}>
          {visibility === "ROOM_SHARED" ? "프로젝트룸 자료" : "개인 자료"}
        </StatusBadge>
      </header>

      <section className={styles.compareArea} aria-label="현재 자료와 새 파일 비교">
        <article className={styles.fileCard}>
          <span className={styles.fileIcon} aria-hidden="true">
            <FileText size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>현재 등록된 자료</span>
            <strong>{currentFileName}</strong>
            <p>자료보드와 에이전트 후보의 기준이 되는 파일입니다.</p>
          </div>
          <Button icon={<FileText size={15} />} onClick={onOpenCurrent} size="sm" variant="ghost">
            열기
          </Button>
        </article>

        <span className={styles.compareArrow} aria-hidden="true">
          <ArrowRight size={20} strokeWidth={2.2} />
        </span>

        <article className={cn(styles.fileCard, styles.incomingCard)}>
          <span className={styles.fileIcon} aria-hidden="true">
            <UploadCloud size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>새로 감지된 파일</span>
            <strong>{incomingFileName}</strong>
            <p>사용자가 고르기 전까지 현재 자료를 바꾸지 않습니다.</p>
          </div>
          <Button icon={<FileClock size={15} />} onClick={onOpenIncoming} size="sm" variant="quiet">
            미리 보기
          </Button>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.decisionPanel} aria-label="자료 반영 방식 선택">
          <div className={styles.decisionHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <VisibilityIcon size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>반영 방식을 선택하세요</h3>
              <p>프로젝트룸 자료는 멤버가 보는 기준이므로 선택 전 상태를 유지합니다.</p>
            </div>
          </div>

          <div className={styles.decisionList}>
            {(Object.keys(decisionCopy) as ResourceVersionDecision[]).map((decision) => {
              const isPrimary = decision === "CREATE_VERSION";
              const icon =
                decision === "CREATE_VERSION" ? (
                  <CheckCircle2 size={17} strokeWidth={2.1} />
                ) : decision === "KEEP_CURRENT" ? (
                  <RotateCcw size={17} strokeWidth={2.1} />
                ) : (
                  <Clock3 size={17} strokeWidth={2.1} />
                );

              return (
                <button
                  className={cn(styles.decisionButton, isPrimary && styles.decisionButtonPrimary)}
                  key={decision}
                  onClick={() => onChooseDecision?.(decision)}
                  type="button"
                >
                  <span aria-hidden="true">{icon}</span>
                  <div>
                    <strong>{decisionCopy[decision].label}</strong>
                    <p>{decisionCopy[decision].description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className={styles.historyPanel} aria-label="자료 버전 기록">
          <div className={styles.historyHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>버전 기록은 남깁니다</h3>
              <p>나중에 어떤 자료로 분석했는지 다시 확인할 수 있어야 합니다.</p>
            </div>
          </div>

          <ol className={styles.versionList}>
            {sortedVersions.map((version) => (
              <li key={version.id}>
                <div className={styles.versionTop}>
                  <span>{version.versionLabel}</span>
                  <StatusBadge tone={versionStatusTone[version.status]}>{versionStatusCopy[version.status]}</StatusBadge>
                </div>
                <strong>{version.fileName}</strong>
                <p>{version.note}</p>
                <small>
                  {version.authorLabel} · {version.changedAtLabel}
                </small>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </GlassPanel>
  );
}
