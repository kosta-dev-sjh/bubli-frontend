import {
  CheckCircle2,
  Clock3,
  Database,
  Download,
  HardDrive,
  LockKeyhole,
  ShieldAlert,
  Trash2,
  UserRoundX,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./data-deletion-request-panel.module.css";

type DeletionScope = "SERVER_PERSONAL" | "LOCAL_TAURI" | "ROOM_PARTICIPATION" | "ACCOUNT_CLOSE";
type DeletionStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";

type DeletionOption = {
  description: string;
  effect: string;
  scope: DeletionScope;
  status: DeletionStatus;
  title: string;
};

type DeletionCheck = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type DataDeletionRequestPanelProps = HTMLAttributes<HTMLElement> & {
  checks: DeletionCheck[];
  options: DeletionOption[];
  title?: string;
};

const scopeIcons: Record<DeletionScope, typeof Database> = {
  ACCOUNT_CLOSE: UserRoundX,
  LOCAL_TAURI: HardDrive,
  ROOM_PARTICIPATION: LockKeyhole,
  SERVER_PERSONAL: Database,
};

const statusMeta: Record<DeletionStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  BLOCKED: { actionLabel: "확인 필요", label: "진행 전 확인", tone: "warning" },
  NEEDS_REVIEW: { actionLabel: "검토", label: "검토 필요", tone: "pending" },
  READY: { actionLabel: "요청", label: "요청 가능", tone: "approved" },
};

export const defaultDeletionOptions: DeletionOption[] = [
  {
    description: "개인 자료, 개인 설정, 개인 하루정리처럼 사용자에게 귀속된 서버 데이터를 삭제 요청합니다.",
    effect: "서버 기록 기준",
    scope: "SERVER_PERSONAL",
    status: "READY",
    title: "개인 서버 데이터",
  },
  {
    description: "개인 에이전트 원문, 위젯 상세 사용 기록, 로컬 백업 목록처럼 기기 안에 있는 데이터를 정리합니다.",
    effect: "기기 안 저장소 기준",
    scope: "LOCAL_TAURI",
    status: "READY",
    title: "기기 안 데이터",
  },
  {
    description: "프로젝트룸 참여 기록은 역할, 남은 멤버, 자료 접근 권한을 확인한 뒤 처리합니다.",
    effect: "프로젝트룸 멤버 권한 기준",
    scope: "ROOM_PARTICIPATION",
    status: "NEEDS_REVIEW",
    title: "프로젝트룸 참여 정보",
  },
  {
    description: "계정 종료는 로그인, 친구, 알림, 개인 설정을 함께 정리하므로 한 번 더 확인합니다.",
    effect: "users 기준",
    scope: "ACCOUNT_CLOSE",
    status: "BLOCKED",
    title: "계정 종료",
  },
];

export const defaultDeletionChecks: DeletionCheck[] = [
  {
    description: "프로젝트룸 채팅과 작업 기록처럼 협업 기록인 데이터는 권한과 역할을 먼저 확인합니다.",
    label: "협업 기록 분리",
    tone: "room",
  },
  {
    description: "개인 에이전트 원문과 위젯 상세 이벤트는 서버 복구 대상이 아니므로 로컬 정리 안내를 따로 보여줍니다.",
    label: "로컬 원문 분리",
    tone: "personal",
  },
  {
    description: "삭제 전에 백업과 내보내기 안내를 먼저 제공하고, 실행 후에는 복구 가능 범위를 알려줍니다.",
    label: "복구 범위 안내",
    tone: "approved",
  },
];

export function DataDeletionRequestPanel({
  checks,
  className,
  options,
  title = "데이터 삭제와 내보내기",
  ...props
}: DataDeletionRequestPanelProps) {
  const readyCount = options.filter((option) => option.status === "READY").length;
  const reviewCount = options.filter((option) => option.status !== "READY").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ShieldAlert size={16} strokeWidth={2.1} />}>개인정보 설정</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              삭제 요청은 서버 기록과 기기 안 데이터를 나눠 처리합니다. 프로젝트룸에 영향을 주는 데이터는
              역할과 권한을 확인한 뒤 진행합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>바로 요청 가능</span>
          <strong>{readyCount}개</strong>
          <StatusBadge tone={reviewCount > 0 ? "warning" : "success"}>확인 필요 {reviewCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.noticeRow} aria-label="삭제 전 확인">
        <article className={styles.noticeCard}>
          <span className={styles.iconTile}>
            <Download size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>먼저 내보내기</strong>
            <p>삭제 전에 서버 요약, 개인 자료 목록, 로컬 백업 상태를 확인할 수 있게 둡니다.</p>
          </div>
        </article>
        <article className={styles.noticeCard}>
          <span className={styles.iconTile}>
            <Clock3 size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>처리 상태 표시</strong>
            <p>요청, 대기, 완료, 실패 상태를 알림과 설정 화면에서 같은 기준으로 보여줍니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.optionGrid} aria-label="삭제 요청 항목">
        {options.map((option) => {
          const ScopeIcon = scopeIcons[option.scope];
          const status = statusMeta[option.status];
          const blocked = option.status === "BLOCKED";

          return (
            <article className={cn(styles.optionCard, blocked && styles.blockedCard)} key={option.scope}>
              <div className={styles.optionTop}>
                <span className={styles.iconTile}>
                  <ScopeIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.optionTitle}>
                  <strong>{option.title}</strong>
                  <span>{option.effect}</span>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <p>{option.description}</p>
              <footer className={styles.optionFooter}>
                <span>{option.scope.toLowerCase()}</span>
                <Button disabled={blocked} icon={<Trash2 size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
                  {status.actionLabel}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.checkGrid} aria-label="삭제 정책 기준">
        {checks.map((check) => (
          <article key={check.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={check.tone}>{check.label}</StatusBadge>
              <p>{check.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
