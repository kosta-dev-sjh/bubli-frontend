import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePause,
  ClipboardCheck,
  Copy,
  FileQuestion,
  MessageSquareText,
  PencilLine,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./clarification-question-draft-panel.module.css";

export type QuestionDraftStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type QuestionDraftTone = "conflict" | "missing" | "unclear";

export type QuestionDraft = {
  confidence?: number;
  id: string;
  question: string;
  sourceLabel: string;
  status: QuestionDraftStatus;
  tone: QuestionDraftTone;
  triggerLabel: string;
};

export type ClarificationQuestionDraftPanelProps = {
  className?: string;
  drafts?: QuestionDraft[];
  onApproveDraft?: (draftId: string) => void;
  onCopyDraft?: (draftId: string) => void;
  onEditDraft?: (draftId: string) => void;
  onHoldDraft?: (draftId: string) => void;
  onRejectDraft?: (draftId: string) => void;
  onRunQuestionJob?: () => void;
  selectedDraftId?: string;
};

const statusCopy: Record<QuestionDraftStatus, string> = {
  APPROVED: "승인됨",
  DRAFT: "검토 전",
  HELD: "보류",
  REJECTED: "제외",
};

const statusTone: Record<QuestionDraftStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

const toneCopy: Record<QuestionDraftTone, string> = {
  conflict: "값 차이",
  missing: "빠진 조건",
  unclear: "모호한 표현",
};

const defaultDrafts: QuestionDraft[] = [
  {
    confidence: 91,
    id: "question-due-date",
    question: "최종 마감일은 7월 5일과 7월 10일 중 어느 날짜가 맞을까요?",
    sourceLabel: "업무 범위 문서 2쪽, 견적서 1쪽",
    status: "DRAFT",
    tone: "conflict",
    triggerLabel: "마감일 후보가 문서마다 다름",
  },
  {
    confidence: 86,
    id: "question-review-standard",
    question: "검수 기준과 수정 가능 횟수를 문서에 맞춰 한 번 더 확인해 주실 수 있을까요?",
    sourceLabel: "요구사항정의서_v1.3.pdf",
    status: "APPROVED",
    tone: "missing",
    triggerLabel: "검수 기준이 업무 범위 문서에 없음",
  },
  {
    confidence: 79,
    id: "question-copyright",
    question: "완료된 번역본의 사용 범위와 저작권 표기 방식은 어떤 기준으로 진행하면 될까요?",
    sourceLabel: "업무 범위 문서 4쪽",
    status: "HELD",
    tone: "unclear",
    triggerLabel: "사용 범위 표현이 모호함",
  },
];

export function ClarificationQuestionDraftPanel({
  className,
  drafts = defaultDrafts,
  onApproveDraft,
  onCopyDraft,
  onEditDraft,
  onHoldDraft,
  onRejectDraft,
  onRunQuestionJob,
  selectedDraftId,
}: ClarificationQuestionDraftPanelProps) {
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0];
  const approvedCount = drafts.filter((draft) => draft.status === "APPROVED").length;
  const pendingCount = drafts.filter((draft) => draft.status === "DRAFT").length;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Bot size={14} />}>확인 질문 후보</Chip>
          <h2>문서에서 확인할 질문을 초안으로 정리합니다</h2>
          <p>
            문서 사이 값이 다르거나 조건이 빠진 부분을 질문 후보로 보여줍니다. 사용자가 검토한
            문장만 복사하거나 메시지 초안으로 저장합니다.
          </p>
        </div>
        <Button icon={<RefreshCw size={15} />} onClick={onRunQuestionJob} size="sm" variant="quiet">
          질문 다시 만들기
        </Button>
      </header>

      <section className={styles.summary} aria-label="질문 후보 상태">
        <article>
          <strong>{drafts.length}</strong>
          <span>질문 후보</span>
        </article>
        <article>
          <strong>{approvedCount}</strong>
          <span>승인됨</span>
        </article>
        <article>
          <strong>{pendingCount}</strong>
          <span>검토 전</span>
        </article>
      </section>

      <div className={styles.grid}>
        <section className={styles.list} aria-label="확인 질문 후보 목록">
          {drafts.map((draft) => (
            <article className={cn(styles.draftCard, draft.id === selectedDraft.id && styles.selected)} key={draft.id}>
              <span className={styles.draftIcon} aria-hidden="true">
                <FileQuestion size={17} strokeWidth={2.1} />
              </span>
              <div className={styles.draftBody}>
                <div className={styles.draftTop}>
                  <div>
                    <Chip>{toneCopy[draft.tone]}</Chip>
                    <h3>{draft.triggerLabel}</h3>
                  </div>
                  <StatusBadge tone={statusTone[draft.status]}>{statusCopy[draft.status]}</StatusBadge>
                </div>
                <p>{draft.question}</p>
                <span className={styles.source}>{draft.sourceLabel}</span>
                {typeof draft.confidence === "number" ? (
                  <ProgressBar label="후보 신뢰도" value={draft.confidence} />
                ) : null}
                <footer className={styles.actions}>
                  <button onClick={() => onApproveDraft?.(draft.id)} type="button">
                    <CheckCircle2 size={14} />
                    승인
                  </button>
                  <button onClick={() => onEditDraft?.(draft.id)} type="button">
                    <PencilLine size={14} />
                    수정
                  </button>
                  <button onClick={() => onHoldDraft?.(draft.id)} type="button">
                    <CirclePause size={14} />
                    보류
                  </button>
                  <button onClick={() => onRejectDraft?.(draft.id)} type="button">
                    <XCircle size={14} />
                    제외
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </section>

        <aside className={styles.preview} aria-label="질문 초안 미리보기">
          <div className={styles.previewHeader}>
            <span className={styles.previewIcon} aria-hidden="true">
              <MessageSquareText size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>메시지 초안</h3>
              <p>사용자가 확인한 뒤 복사하거나 저장합니다.</p>
            </div>
          </div>

          <div className={styles.messageBox}>
            <span>안녕하세요. 작업 범위를 정확히 맞추기 위해 아래 내용을 확인 부탁드립니다.</span>
            <strong>{selectedDraft.question}</strong>
            <span>확인해 주시면 WBS와 TODO를 그 기준으로 정리하겠습니다.</span>
          </div>

          <div className={styles.previewActions}>
            <Button icon={<Copy size={15} />} onClick={() => onCopyDraft?.(selectedDraft.id)} size="sm" variant="quiet">
              복사
            </Button>
            <Button icon={<Send size={15} />} size="sm" variant="primary">
              초안 저장
            </Button>
          </div>

          <div className={styles.policy}>
            <ClipboardCheck size={17} strokeWidth={2.1} />
            <p>질문 초안은 바로 전송하지 않습니다. 사용자가 문장을 확인한 뒤 다음 단계로 넘깁니다.</p>
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>확인 필요 항목</span>
        <ArrowRight size={16} />
        <span>질문 후보</span>
        <ArrowRight size={16} />
        <span>사용자 검토</span>
        <ArrowRight size={16} />
        <span>메시지 초안</span>
      </footer>
    </GlassPanel>
  );
}
