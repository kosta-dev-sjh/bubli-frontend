import { AlertTriangle, CheckCircle2, FileWarning, MessageSquareQuote, PencilLine, PauseCircle, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./contract-review-item-resolution-panel.module.css";

type ReviewItemType = "valueMismatch" | "missingCondition" | "questionDraft";
type ReviewSeverity = "high" | "medium" | "low";
type ReviewStatus = "draft" | "approved" | "held" | "rejected";

type ComparedDocument = {
  documentName: string;
  value: string;
};

type ContractReviewItem = {
  comparedDocuments: ComparedDocument[];
  description: string;
  fieldLabel: string;
  id: string;
  severity: ReviewSeverity;
  sourceHint: string;
  status: ReviewStatus;
  title: string;
  type: ReviewItemType;
};

export type ContractReviewItemResolutionPanelProps = HTMLAttributes<HTMLElement> & {
  items: ContractReviewItem[];
  title?: string;
};

const typeMeta: Record<ReviewItemType, { icon: ReactNode; label: string; tone: StatusTone }> = {
  valueMismatch: {
    icon: <AlertTriangle size={18} strokeWidth={2.1} />,
    label: "값 차이",
    tone: "warning",
  },
  missingCondition: {
    icon: <FileWarning size={18} strokeWidth={2.1} />,
    label: "빠진 조건",
    tone: "pending",
  },
  questionDraft: {
    icon: <MessageSquareQuote size={18} strokeWidth={2.1} />,
    label: "질문 후보",
    tone: "agent",
  },
};

const severityMeta: Record<ReviewSeverity, { label: string; tone: StatusTone }> = {
  high: { label: "높음", tone: "warning" },
  medium: { label: "보통", tone: "pending" },
  low: { label: "낮음", tone: "neutral" },
};

const statusMeta: Record<ReviewStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "검토 전", tone: "pending" },
  approved: { label: "반영", tone: "approved" },
  held: { label: "보류", tone: "warning" },
  rejected: { label: "제외", tone: "neutral" },
};

export function ContractReviewItemResolutionPanel({
  className,
  items,
  title = "확인 필요 항목",
  ...props
}: ContractReviewItemResolutionPanelProps) {
  const draftCount = items.filter((item) => item.status === "draft").length;
  const highSeverityCount = items.filter((item) => item.severity === "high").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileWarning size={14} strokeWidth={2.1} />}>contract_review_items</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              계약서, 견적서, 요구사항 문서에서 같은 항목의 값이 다르거나 한쪽에만 있는 조건을 모아 봅니다. 사용자가 처리한 항목만 프로젝트 참고 정보와 작업 후보에 반영합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryGrid} aria-label="확인 필요 항목 요약">
          <div>
            <span>검토 전</span>
            <strong>{draftCount}건</strong>
          </div>
          <div>
            <span>우선 확인</span>
            <strong>{highSeverityCount}건</strong>
          </div>
        </div>
      </header>

      <section className={styles.notice} aria-label="처리 기준">
        <span aria-hidden="true">
          <CheckCircle2 size={18} strokeWidth={2.1} />
        </span>
        <p>
          이 목록은 문서 검토를 돕는 후보입니다. 반영, 수정, 보류, 제외 중 하나를 선택해야 다음 화면에서 같은 기준으로 보여줄 수 있습니다.
        </p>
      </section>

      <section className={styles.itemList} aria-label="확인 필요 항목 목록">
        {items.map((item) => {
          const itemType = typeMeta[item.type];
          const severity = severityMeta[item.severity];
          const status = statusMeta[item.status];

          return (
            <article className={styles.itemCard} key={item.id}>
              <div className={styles.itemHeader}>
                <div className={styles.itemTitle}>
                  <span className={styles.typeIcon} aria-hidden="true">
                    {itemType.icon}
                  </span>
                  <div>
                    <div className={styles.titleLine}>
                      <h3>{item.title}</h3>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>
                    <p>{item.description}</p>
                  </div>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={itemType.tone}>{itemType.label}</StatusBadge>
                  <StatusBadge tone={severity.tone}>중요도 {severity.label}</StatusBadge>
                </div>
              </div>

              <div className={styles.fieldBlock}>
                <span>비교 항목</span>
                <strong>{item.fieldLabel}</strong>
                <small>{item.sourceHint}</small>
              </div>

              <div className={styles.documentGrid} aria-label={`${item.title} 문서별 값`}>
                {item.comparedDocuments.map((document) => (
                  <div className={styles.documentValue} key={`${item.id}-${document.documentName}`}>
                    <span>{document.documentName}</span>
                    <strong>{document.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.actions} aria-label={`${item.title} 처리 액션`}>
                <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
                  반영
                </Button>
                <Button icon={<PencilLine size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
                  수정
                </Button>
                <Button icon={<PauseCircle size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
                  보류
                </Button>
                <Button icon={<XCircle size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
                  제외
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
