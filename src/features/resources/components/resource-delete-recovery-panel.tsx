import { Archive, FileWarning, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-delete-recovery-panel.module.css";

type DeleteRecoveryStatus = "deleteCandidate" | "archived" | "ready" | "blocked";
type DeleteRecoveryAction = "restore" | "archive" | "confirmDelete";

type DeleteRecoveryItem = {
  action: DeleteRecoveryAction;
  description: string;
  fileName: string;
  meta: string;
  status: DeleteRecoveryStatus;
};

export type ResourceDeleteRecoveryPanelProps = HTMLAttributes<HTMLElement> & {
  items: DeleteRecoveryItem[];
  pendingCount: number;
  title?: string;
};

const statusMeta: Record<DeleteRecoveryStatus, { label: string; tone: StatusTone }> = {
  deleteCandidate: { label: "삭제 후보", tone: "warning" },
  archived: { label: "보관됨", tone: "neutral" },
  ready: { label: "정상 자료", tone: "success" },
  blocked: { label: "확인 필요", tone: "pending" },
};

const actionMeta: Record<DeleteRecoveryAction, { icon: ReactNode; label: string }> = {
  restore: {
    icon: <RotateCcw size={15} strokeWidth={2.1} />,
    label: "복구",
  },
  archive: {
    icon: <Archive size={15} strokeWidth={2.1} />,
    label: "보관",
  },
  confirmDelete: {
    icon: <Trash2 size={15} strokeWidth={2.1} />,
    label: "삭제 반영",
  },
};

export function ResourceDeleteRecoveryPanel({
  className,
  items,
  pendingCount,
  title = "자료 삭제 후보와 복구",
  ...props
}: ResourceDeleteRecoveryPanelProps) {
  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileWarning size={14} strokeWidth={2.1} />}>자료 안전</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              로컬에서 파일이 사라져도 서버 자료는 바로 지우지 않습니다. 사용자가 확인한 뒤 복구하거나, 보관하거나, 서버 반영을 선택합니다.
            </p>
          </div>
        </div>
        <div className={styles.countCard}>
          <span>확인할 자료</span>
          <strong>{pendingCount}개</strong>
        </div>
      </header>

      <section className={styles.ruleStrip} aria-label="삭제 반영 기준">
        <article>
          <span aria-hidden="true">
            <ShieldAlert size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>즉시 삭제 금지</h3>
            <p>원본이나 서버 데이터에 영향을 주는 작업은 사용자 확인 뒤에만 반영합니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <RotateCcw size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>복구 경로 유지</h3>
            <p>삭제 후보 상태의 개인 자료는 복구 API로 되돌릴 수 있어야 합니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Archive size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>보관 상태 분리</h3>
            <p>지금 쓰지 않는 자료는 보관 상태로 숨기고 기록은 남길 수 있습니다.</p>
          </div>
        </article>
      </section>

      <div className={styles.list} aria-label="삭제 후보 목록">
        {items.map((item) => {
          const status = statusMeta[item.status];
          const action = actionMeta[item.action];

          return (
            <article className={styles.item} key={`${item.fileName}-${item.meta}`}>
              <div className={styles.itemMain}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <FileWarning size={18} strokeWidth={2.1} />
                </span>
                <div className={styles.itemText}>
                  <h3>{item.fileName}</h3>
                  <p>{item.description}</p>
                  <span>{item.meta}</span>
                </div>
              </div>
              <div className={styles.itemSide}>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                <button className={styles.actionButton} type="button">
                  {action.icon}
                  {action.label}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <p>DELETE /api/resources/:id는 삭제 후보 또는 보관 처리로 시작하고, 복구는 POST /api/resources/:id/restore로 분리합니다.</p>
      </footer>
    </GlassPanel>
  );
}
