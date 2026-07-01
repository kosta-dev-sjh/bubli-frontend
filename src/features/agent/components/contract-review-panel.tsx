import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePause,
  FileText,
  HelpCircle,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type DocumentSource = {
  name: string;
  type: string;
  status: "analyzed" | "waiting" | "needsReview";
};

type ExtractedValue = {
  label: string;
  value: string;
  source: string;
};

type ReviewItem = {
  label: string;
  detail: string;
  source: string;
  type: "difference" | "missing" | "question";
};

const documents: DocumentSource[] = [
  { name: "업무범위정리_v2.pdf", status: "needsReview", type: "업무 범위 문서" },
  { name: "견적서_final.pdf", status: "analyzed", type: "견적서" },
  { name: "요구사항_정리.md", status: "analyzed", type: "요구사항" },
];

const extractedValues: ExtractedValue[] = [
  { label: "프로젝트명", source: "업무 범위 문서", value: "서비스 소개 페이지 번역" },
  { label: "마감일 후보", source: "업무 범위 문서, 견적서", value: "2026.07.15" },
  { label: "금액 참고값", source: "견적서", value: "8,000,000원" },
  { label: "결과물 후보", source: "요구사항", value: "한영 번역본, 용어집" },
];

const reviewItems: ReviewItem[] = [
  {
    detail: "업무 범위 문서에는 7월 15일, 회의록에는 7월 20일로 적혀 있습니다.",
    label: "마감일 값 차이",
    source: "업무 범위 문서 · 회의록",
    type: "difference",
  },
  {
    detail: "견적서에는 2회 수정이 있으나 업무 범위 문서에는 수정 범위가 비어 있습니다.",
    label: "수정 범위 확인",
    source: "업무 범위 문서 · 견적서",
    type: "missing",
  },
  {
    detail: "검수 기준과 최종 승인자가 문서마다 명확하지 않습니다.",
    label: "검수 기준 질문",
    source: "요구사항 · 회의록",
    type: "question",
  },
];

const sourceStatusCopy: Record<DocumentSource["status"], { label: string; tone: "approved" | "pending" | "warning" }> = {
  analyzed: { label: "분석됨", tone: "approved" },
  needsReview: { label: "확인 필요", tone: "warning" },
  waiting: { label: "대기", tone: "pending" },
};

const reviewTypeMeta: Record<ReviewItem["type"], { icon: typeof AlertTriangle; label: string; tone: "warning" | "pending" | "agent" }> = {
  difference: { icon: AlertTriangle, label: "값 차이", tone: "warning" },
  missing: { icon: ShieldCheck, label: "빠진 조건", tone: "pending" },
  question: { icon: HelpCircle, label: "확인 질문", tone: "agent" },
};

function DocumentPill({ document }: { document: DocumentSource }) {
  const status = sourceStatusCopy[document.status];

  return (
    <article className="contract-review-source">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <strong>{document.type}</strong>
        <span>{document.name}</span>
      </div>
      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
    </article>
  );
}

function ReviewItemCard({ item }: { item: ReviewItem }) {
  const meta = reviewTypeMeta[item.type];
  const Icon = meta.icon;

  return (
    <article className="contract-review-item">
      <div className="contract-review-item__top">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <h3>{item.label}</h3>
          <p>{item.source}</p>
        </div>
      </div>
      <p>{item.detail}</p>
      <footer>
        <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
          확인
        </Button>
        <Button icon={<PencilLine size={15} />} size="sm" variant="quiet">
          수정
        </Button>
        <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
          보류
        </Button>
      </footer>
    </article>
  );
}

export function ContractReviewPanel() {
  return (
    <section className="contract-review" aria-label="업무 기준 문서 확인 패널">
      <GlassPanel className="contract-review__hero">
        <div>
          <Chip icon={<Bot size={14} />} selected>
            업무 기준 문서 확인
          </Chip>
          <h2>업무 범위 문서, 견적서, 요구사항의 값 차이와 빠진 조건을 확인합니다</h2>
          <p>
            에이전트는 문서에서 프로젝트 정보와 확인 필요 항목을 후보로 정리합니다. 사용자가 확인한 값만
            프로젝트룸, WBS, TODO, 일정에 반영됩니다.
          </p>
        </div>
        <div className="contract-review__job">
          <StatusBadge tone="agent">에이전트 정리</StatusBadge>
          <strong>92%</strong>
          <span>문서 추출 후보 생성</span>
          <ProgressBar label="업무 기준 문서 분석 진행률" value={92} />
        </div>
      </GlassPanel>

      <div className="contract-review__sources" aria-label="업로드된 문서">
        {documents.map((document) => (
          <DocumentPill document={document} key={document.name} />
        ))}
      </div>

      <div className="contract-review__grid">
        <GlassPanel className="contract-review__values">
          <div className="contract-review__section-title">
            <h3>추출 후보</h3>
            <p>문서에서 뽑은 값은 사용자 확인 전까지 후보로만 둡니다.</p>
          </div>
          <div className="contract-review__value-grid">
            {extractedValues.map((item) => (
              <article className="contract-review-value" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.source}</small>
              </article>
            ))}
          </div>
          <div className="contract-review__flow">
            <span>문서 업로드</span>
            <ArrowRight size={16} strokeWidth={2.1} />
            <span>후보 생성</span>
            <ArrowRight size={16} strokeWidth={2.1} />
            <span>사용자 확인</span>
            <ArrowRight size={16} strokeWidth={2.1} />
            <span>작업 반영</span>
          </div>
        </GlassPanel>

        <GlassPanel className="contract-review__items">
          <div className="contract-review__section-title">
            <h3>확인 필요 항목</h3>
            <p>값이 다르거나 빠진 조건을 먼저 확인할 수 있게 모읍니다.</p>
          </div>
          {reviewItems.map((item) => (
            <ReviewItemCard item={item} key={item.label} />
          ))}
        </GlassPanel>
      </div>
    </section>
  );
}
