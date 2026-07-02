import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  FolderLock,
  History,
  Info,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-share-approval-panel.module.css";

export type ShareReadiness = "READY" | "NEEDS_ROOM" | "NO_PERMISSION" | "ALREADY_SHARED";
export type ShareAuditStatus = "PASSED" | "PENDING" | "BLOCKED";

export type ShareAuditItem = {
  description: string;
  id: string;
  label: string;
  status: ShareAuditStatus;
};

export type ShareTargetRoom = {
  memberCountLabel: string;
  name: string;
  roleLabel: "프로젝트 리더" | "멤버";
};

export type ResourceShareApprovalPanelProps = {
  auditItems?: ShareAuditItem[];
  className?: string;
  onApproveShare?: () => void;
  onCancel?: () => void;
  onOpenResource?: () => void;
  onSelectRoom?: () => void;
  readiness?: ShareReadiness;
  resourceTitle?: string;
  targetRoom?: ShareTargetRoom;
};

const readinessCopy: Record<ShareReadiness, string> = {
  ALREADY_SHARED: "이미 공유됨",
  NEEDS_ROOM: "프로젝트룸 선택 필요",
  NO_PERMISSION: "권한 확인 필요",
  READY: "공유 가능",
};

const readinessTone: Record<ShareReadiness, StatusTone> = {
  ALREADY_SHARED: "approved",
  NEEDS_ROOM: "pending",
  NO_PERMISSION: "warning",
  READY: "room",
};

const auditStatusCopy: Record<ShareAuditStatus, string> = {
  BLOCKED: "막힘",
  PASSED: "확인됨",
  PENDING: "대기",
};

const auditStatusTone: Record<ShareAuditStatus, StatusTone> = {
  BLOCKED: "warning",
  PASSED: "approved",
  PENDING: "pending",
};

const defaultTargetRoom: ShareTargetRoom = {
  memberCountLabel: "멤버 4명",
  name: "신축 홈페이지 리뉴얼",
  roleLabel: "프로젝트 리더",
};

const defaultAuditItems: ShareAuditItem[] = [
  {
    description: "현재 자료는 owner 기준으로만 보이는 개인 자료입니다.",
    id: "personal-visibility",
    label: "개인 자료 기준 확인",
    status: "PASSED",
  },
  {
    description: "선택한 프로젝트룸에 ACTIVE 멤버 권한이 있는지 확인합니다.",
    id: "room-member",
    label: "프로젝트룸 접근 권한",
    status: "PASSED",
  },
  {
    description: "공유 이력을 남기고 roomId 기준으로 프로젝트룸 자료에 연결합니다.",
    id: "share-event",
    label: "공유 이력 기록",
    status: "PENDING",
  },
  {
    description: "공유 뒤 프로젝트룸 에이전트가 자료 후보 생성에 사용할 수 있습니다.",
    id: "agent-scope",
    label: "에이전트 접근 범위",
    status: "PENDING",
  },
];

export function ResourceShareApprovalPanel({
  auditItems = defaultAuditItems,
  className,
  onApproveShare,
  onCancel,
  onOpenResource,
  onSelectRoom,
  readiness = "READY",
  resourceTitle = "개인_자료검토_메모.md",
  targetRoom = defaultTargetRoom,
}: ResourceShareApprovalPanelProps) {
  const blocked = readiness === "NO_PERMISSION" || auditItems.some((item) => item.status === "BLOCKED");
  const needsRoom = readiness === "NEEDS_ROOM";
  const alreadyShared = readiness === "ALREADY_SHARED";

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<ShieldCheck size={14} />}>공유 승인</Chip>
          <h2>개인 자료는 승인한 뒤에만 프로젝트룸 자료가 됩니다</h2>
          <p>
            개인 자료를 선택한 프로젝트룸에 연결하기 전, 대상과 권한을 확인합니다. 공유 전에는
            멤버와 프로젝트룸 에이전트가 이 자료를 볼 수 없습니다.
          </p>
        </div>
        <StatusBadge tone={readinessTone[readiness]}>{readinessCopy[readiness]}</StatusBadge>
      </header>

      <section className={styles.flowCards} aria-label="개인 자료 공유 흐름">
        <article className={styles.flowCard}>
          <span className={styles.flowIcon} aria-hidden="true">
            <FolderLock size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>현재 상태</span>
            <strong>개인 자료</strong>
            <p>{resourceTitle}</p>
          </div>
          <Button icon={<FileText size={15} />} onClick={onOpenResource} size="sm" variant="ghost">
            자료 보기
          </Button>
        </article>

        <span className={styles.flowArrow} aria-hidden="true">
          <ArrowRight size={20} strokeWidth={2.2} />
        </span>

        <article className={cn(styles.flowCard, styles.roomCard)}>
          <span className={styles.flowIcon} aria-hidden="true">
            <UsersRound size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>공유 대상</span>
            <strong>{targetRoom.name}</strong>
            <p>
              {targetRoom.roleLabel} · {targetRoom.memberCountLabel}
            </p>
          </div>
          <Button icon={<UserCheck size={15} />} onClick={onSelectRoom} size="sm" variant="quiet">
            대상 변경
          </Button>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.auditPanel} aria-label="공유 전 확인 항목">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <CheckCircle2 size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>공유 전 확인</h3>
              <p>권한과 기록 기준이 맞아야 공유 버튼을 실행합니다.</p>
            </div>
          </div>

          <ul className={styles.auditList}>
            {auditItems.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
                <StatusBadge tone={auditStatusTone[item.status]}>{auditStatusCopy[item.status]}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.policyPanel} aria-label="공유 뒤 적용 기준">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <History size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>공유 뒤 바뀌는 것</h3>
              <p>자료가 보이는 범위와 에이전트 입력 범위가 달라집니다.</p>
            </div>
          </div>

          <div className={styles.policyStack}>
            <article>
              <UsersRound size={17} strokeWidth={2.1} />
              <div>
                <strong>프로젝트룸 자료보드에 표시</strong>
                <p>선택한 프로젝트룸 멤버만 자료를 찾고 열 수 있습니다.</p>
              </div>
            </article>
            <article>
              <Bot size={17} strokeWidth={2.1} />
              <div>
                <strong>프로젝트룸 에이전트 범위에 포함</strong>
                <p>공유 뒤에는 요약, WBS/TODO 후보, 관련 문서 후보의 근거가 될 수 있습니다.</p>
              </div>
            </article>
            <article>
              <Info size={17} strokeWidth={2.1} />
              <div>
                <strong>공유 이력 보관</strong>
                <p>누가 어떤 프로젝트룸에 공유했는지 기록해 나중에 확인할 수 있게 둡니다.</p>
              </div>
            </article>
          </div>

          <div className={styles.actions}>
            <Button onClick={onCancel} size="sm" variant="ghost">
              취소
            </Button>
            <Button
              disabled={blocked || needsRoom || alreadyShared}
              icon={<UsersRound size={15} />}
              onClick={onApproveShare}
              size="sm"
              variant="primary"
            >
              프로젝트룸에 공유
            </Button>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
