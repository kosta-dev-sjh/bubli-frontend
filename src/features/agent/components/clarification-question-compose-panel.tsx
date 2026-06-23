import { Check, FileSearch, MessageSquareText, PenLine, Send, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./clarification-question-compose-panel.module.css";

type ReviewPriority = "HIGH" | "MEDIUM" | "LOW";
type QuestionStatus = "SELECTED" | "EDITING" | "WAITING";

type ReviewItem = {
  evidenceLabel: string;
  id: string;
  priority: ReviewPriority;
  title: string;
};

type QuestionDraft = {
  id: string;
  linkedReviewItemId: string;
  message: string;
  status: QuestionStatus;
};

type ComposeRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ClarificationQuestionComposePanelProps = HTMLAttributes<HTMLElement> & {
  drafts: QuestionDraft[];
  reviewItems: ReviewItem[];
  rules: ComposeRule[];
  title?: string;
};

const priorityMeta: Record<ReviewPriority, { label: string; tone: StatusTone }> = {
  HIGH: { label: "높음", tone: "warning" },
  LOW: { label: "낮음", tone: "personal" },
  MEDIUM: { label: "보통", tone: "pending" },
};

const questionStatusMeta: Record<QuestionStatus, { label: string; tone: StatusTone }> = {
  EDITING: { label: "수정 중", tone: "pending" },
  SELECTED: { label: "선택됨", tone: "approved" },
  WAITING: { label: "대기", tone: "personal" },
};

export const defaultReviewItems: ReviewItem[] = [
  {
    evidenceLabel: "계약서 4p, 요구사항 문서 2p",
    id: "delivery-date",
    priority: "HIGH",
    title: "납품일이 문서마다 다릅니다.",
  },
  {
    evidenceLabel: "견적서 1p",
    id: "vat-condition",
    priority: "MEDIUM",
    title: "금액에 부가세 포함 여부가 분명하지 않습니다.",
  },
  {
    evidenceLabel: "회의록 2026-06-18",
    id: "revision-count",
    priority: "MEDIUM",
    title: "수정 횟수와 검수 기준을 확인해야 합니다.",
  },
];

export const defaultQuestionDrafts: QuestionDraft[] = [
  {
    id: "question-delivery-date",
    linkedReviewItemId: "delivery-date",
    message: "납품일은 2026년 7월 15일과 7월 20일 중 어떤 날짜를 기준으로 진행하면 될까요?",
    status: "SELECTED",
  },
  {
    id: "question-vat",
    linkedReviewItemId: "vat-condition",
    message: "견적 금액에 부가세가 포함된 금액인지, 별도인지 확인 부탁드립니다.",
    status: "EDITING",
  },
  {
    id: "question-revision",
    linkedReviewItemId: "revision-count",
    message: "수정 가능 횟수와 최종 검수 기준을 문서에 남길 수 있을까요?",
    status: "WAITING",
  },
];

export const defaultComposeRules: ComposeRule[] = [
  {
    description: "질문은 바로 전송하지 않고 사용자가 선택한 뒤 수정할 수 있게 둡니다.",
    label: "사용자 확인",
    tone: "approved",
  },
  {
    description: "각 질문은 어떤 문서에서 나온 확인 필요 항목인지 함께 보여줍니다.",
    label: "근거 연결",
    tone: "room",
  },
  {
    description: "법률 판단처럼 보이는 표현 대신 확인이 필요한 값만 묻습니다.",
    label: "표현 제한",
    tone: "warning",
  },
];

export function ClarificationQuestionComposePanel({
  className,
  drafts,
  reviewItems,
  rules,
  title = "확인 질문 초안",
  ...props
}: ClarificationQuestionComposePanelProps) {
  const selectedCount = drafts.filter((draft) => draft.status === "SELECTED").length;
  const reviewItemById = new Map(reviewItems.map((item) => [item.id, item]));

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<MessageSquareText size={16} strokeWidth={2.1} />}>문서 확인 보조</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              에이전트가 문서의 빠진 값과 서로 다른 값을 질문 후보로 바꿉니다. 사용자는 필요한 질문만 고르고
              문장을 다듬어 클라이언트에게 보냅니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>보낼 질문</span>
          <strong>{selectedCount}개</strong>
          <StatusBadge tone="approved">선택됨</StatusBadge>
        </div>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.reviewColumn} aria-label="확인 필요 항목">
          <div className={styles.sectionTitle}>
            <strong>확인 필요 항목</strong>
            <StatusBadge tone="warning">{reviewItems.length}개</StatusBadge>
          </div>
          <div className={styles.reviewStack}>
            {reviewItems.map((item) => {
              const priority = priorityMeta[item.priority];

              return (
                <article className={styles.reviewRow} key={item.id}>
                  <span className={styles.iconTile}>
                    <TriangleAlert size={16} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div className={styles.reviewCopy}>
                    <b>{item.title}</b>
                    <span>{item.evidenceLabel}</span>
                  </div>
                  <StatusBadge tone={priority.tone}>{priority.label}</StatusBadge>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.draftColumn} aria-label="질문 초안">
          <div className={styles.sectionTitle}>
            <strong>질문 초안</strong>
            <span className={styles.sectionMeta}>전송 전 확인 필요</span>
          </div>
          <div className={styles.draftStack}>
            {drafts.map((draft) => {
              const reviewItem = reviewItemById.get(draft.linkedReviewItemId);
              const status = questionStatusMeta[draft.status];

              return (
                <article className={cn(styles.draftRow, draft.status === "SELECTED" && styles.selectedDraft)} key={draft.id}>
                  <div className={styles.draftTop}>
                    <span className={styles.iconTile}>
                      <Sparkles size={16} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <div className={styles.draftCopy}>
                      <b>{reviewItem?.title ?? "확인 항목"}</b>
                      <p>{draft.message}</p>
                      <small>{reviewItem?.evidenceLabel ?? "근거 문서 확인 필요"}</small>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                  <div className={styles.draftActions}>
                    <Button icon={<PenLine size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                      문장 수정
                    </Button>
                    <Button icon={<Check size={14} strokeWidth={2.1} />} size="sm" variant="ghost">
                      선택 전환
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.ruleGrid} aria-label="질문 초안 생성 기준">
        {rules.map((rule) => (
          <article key={rule.label}>
            {rule.label === "근거 연결" ? (
              <FileSearch size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : rule.label === "표현 제한" ? (
              <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : (
              <Check size={17} strokeWidth={2.1} aria-hidden="true" />
            )}
            <div>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
              <StatusBadge tone={rule.tone}>기준</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>초안은 확인 보조입니다. 사용자가 고른 문장만 채팅이나 메일 작성 화면으로 넘깁니다.</span>
        </div>
        <Button icon={<Send size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          선택한 질문 넘기기
        </Button>
      </footer>
    </GlassPanel>
  );
}
