import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePause,
  Database,
  FileText,
  LayoutPanelTop,
  Link2,
  ListChecks,
  LockKeyhole,
  PencilLine,
  ServerCog,
  Workflow,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./requirement-candidate-review-panel.module.css";

export type RequirementCandidateStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type RequirementCategory = "FEATURE" | "SCREEN" | "PERMISSION" | "DATA" | "INTEGRATION" | "ENVIRONMENT";

export type RequirementCandidate = {
  category: RequirementCategory;
  confidence?: number;
  description: string;
  id: string;
  sourceLabel: string;
  status: RequirementCandidateStatus;
  title: string;
};

export type RequirementCandidateReviewPanelProps = {
  candidates?: RequirementCandidate[];
  className?: string;
  jobStatusLabel?: string;
  onApproveCandidate?: (candidateId: string) => void;
  onEditCandidate?: (candidateId: string) => void;
  onHoldCandidate?: (candidateId: string) => void;
  onRejectCandidate?: (candidateId: string) => void;
  onRunRequirementJob?: () => void;
};

const categoryCopy: Record<RequirementCategory, string> = {
  DATA: "데이터",
  ENVIRONMENT: "지원 환경",
  FEATURE: "기능",
  INTEGRATION: "연동",
  PERMISSION: "권한",
  SCREEN: "화면",
};

const categoryIcon: Record<RequirementCategory, ReactNode> = {
  DATA: <Database size={17} strokeWidth={2.1} />,
  ENVIRONMENT: <ServerCog size={17} strokeWidth={2.1} />,
  FEATURE: <ListChecks size={17} strokeWidth={2.1} />,
  INTEGRATION: <Link2 size={17} strokeWidth={2.1} />,
  PERMISSION: <LockKeyhole size={17} strokeWidth={2.1} />,
  SCREEN: <LayoutPanelTop size={17} strokeWidth={2.1} />,
};

const statusCopy: Record<RequirementCandidateStatus, string> = {
  APPROVED: "승인됨",
  DRAFT: "검토 전",
  HELD: "보류",
  REJECTED: "제외",
};

const statusTone: Record<RequirementCandidateStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

const defaultCandidates: RequirementCandidate[] = [
  {
    category: "FEATURE",
    confidence: 93,
    description: "사용자가 번역 파일을 업로드하면 원문, 번역본, 검수 질문을 같은 프로젝트룸 자료로 묶어야 합니다.",
    id: "candidate-feature-resource-group",
    sourceLabel: "요구사항정의서_v1.3.pdf 3쪽",
    status: "DRAFT",
    title: "번역 자료 묶음 관리",
  },
  {
    category: "SCREEN",
    confidence: 88,
    description: "자료 상세에서 요약, 확인 필요 항목, 관련 문서, 후보 목록을 한 번에 검토할 수 있어야 합니다.",
    id: "candidate-screen-resource-detail",
    sourceLabel: "회의록_0618.md",
    status: "APPROVED",
    title: "자료 상세 검토 화면",
  },
  {
    category: "PERMISSION",
    confidence: 84,
    description: "프로젝트룸 멤버가 아닌 게스트는 자료, WBS, 일정, 다운로드에 접근하지 못해야 합니다.",
    id: "candidate-permission-guest",
    sourceLabel: "요구사항정의서_v1.3.pdf 5쪽",
    status: "DRAFT",
    title: "게스트 접근 제한",
  },
  {
    category: "DATA",
    confidence: 79,
    description: "후보는 승인 전까지 DRAFT 상태로 저장하고, 승인된 항목만 실제 작업 데이터로 반영합니다.",
    id: "candidate-data-draft",
    sourceLabel: "요구사항정의서_v1.3.pdf 6쪽",
    status: "HELD",
    title: "후보 상태 저장",
  },
];

export function RequirementCandidateReviewPanel({
  candidates = defaultCandidates,
  className,
  jobStatusLabel = "분석 완료",
  onApproveCandidate,
  onEditCandidate,
  onHoldCandidate,
  onRejectCandidate,
  onRunRequirementJob,
}: RequirementCandidateReviewPanelProps) {
  const counts = candidates.reduce(
    (acc, candidate) => {
      acc[candidate.status] += 1;
      return acc;
    },
    { APPROVED: 0, DRAFT: 0, HELD: 0, REJECTED: 0 } satisfies Record<RequirementCandidateStatus, number>,
  );

  const approvedRatio = candidates.length > 0 ? Math.round((counts.APPROVED / candidates.length) * 100) : 0;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Bot size={14} />}>에이전트 제안</Chip>
          <h2>요구사항 후보를 검토하고 작업 구조로 넘깁니다</h2>
          <p>
            요구사항 문서에서 나온 기능, 화면, 권한, 데이터, 연동, 지원 환경 후보를 확인합니다.
            승인된 후보만 WBS와 TODO 후보 생성의 근거가 됩니다.
          </p>
        </div>
        <div className={styles.headerAside}>
          <StatusBadge tone="approved">{jobStatusLabel}</StatusBadge>
          <Button icon={<Workflow size={15} />} onClick={onRunRequirementJob} size="sm" variant="quiet">
            후보 다시 만들기
          </Button>
        </div>
      </header>

      <section className={styles.statusStrip} aria-label="요구사항 후보 상태">
        <article>
          <strong>{candidates.length}</strong>
          <span>전체 후보</span>
        </article>
        <article>
          <strong>{counts.APPROVED}</strong>
          <span>승인됨</span>
        </article>
        <article>
          <strong>{counts.DRAFT}</strong>
          <span>검토 전</span>
        </article>
        <article>
          <strong>{counts.HELD}</strong>
          <span>보류</span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.candidateList} aria-label="요구사항 후보 목록">
          {candidates.map((candidate) => (
            <article className={styles.candidateCard} key={candidate.id}>
              <span className={styles.categoryIcon} aria-hidden="true">
                {categoryIcon[candidate.category]}
              </span>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <div>
                    <Chip>{categoryCopy[candidate.category]}</Chip>
                    <h3>{candidate.title}</h3>
                  </div>
                  <StatusBadge tone={statusTone[candidate.status]}>{statusCopy[candidate.status]}</StatusBadge>
                </div>
                <p>{candidate.description}</p>
                <div className={styles.sourceRow}>
                  <FileText size={14} strokeWidth={2.1} />
                  <span>{candidate.sourceLabel}</span>
                </div>
                {typeof candidate.confidence === "number" ? (
                  <ProgressBar label="후보 신뢰도" value={candidate.confidence} />
                ) : null}
                <footer className={styles.actions}>
                  <button onClick={() => onApproveCandidate?.(candidate.id)} type="button">
                    <CheckCircle2 size={14} />
                    승인
                  </button>
                  <button onClick={() => onEditCandidate?.(candidate.id)} type="button">
                    <PencilLine size={14} />
                    수정
                  </button>
                  <button onClick={() => onHoldCandidate?.(candidate.id)} type="button">
                    <CirclePause size={14} />
                    보류
                  </button>
                  <button onClick={() => onRejectCandidate?.(candidate.id)} type="button">
                    <XCircle size={14} />
                    제외
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </section>

        <aside className={styles.flowPanel} aria-label="요구사항 후보 반영 흐름">
          <div className={styles.flowHeader}>
            <Sparkline />
            <div>
              <h3>승인 후 연결</h3>
              <p>확인된 요구사항만 다음 업무 구조의 근거가 됩니다.</p>
            </div>
          </div>
          <ProgressBar label="승인된 후보 비율" value={approvedRatio} />
          <ol className={styles.flowList}>
            <li>
              <span>1</span>
              <div>
                <strong>요구사항 후보</strong>
                <p>문서의 기능, 화면, 권한, 데이터 조건을 후보로 분리합니다.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>사용자 검토</strong>
                <p>승인, 수정, 보류, 제외 중 하나로 상태를 정합니다.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>WBS/TODO 후보</strong>
                <p>승인된 요구사항만 큰 작업과 실행할 업무 후보로 이어집니다.</p>
              </div>
            </li>
          </ol>
          <div className={styles.flowFooter}>
            <span>요구사항 후보</span>
            <ArrowRight size={16} />
            <span>WBS/TODO 후보</span>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}

function Sparkline() {
  return (
    <span className={styles.sparkline} aria-hidden="true">
      <ListChecks size={22} strokeWidth={2.2} />
    </span>
  );
}
