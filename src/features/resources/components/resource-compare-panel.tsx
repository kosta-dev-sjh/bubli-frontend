import { AlertCircle, CheckCircle2, FileSearch, FileText, ListChecks, Scale, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type CompareField = {
  field: string;
  contractValue: string;
  estimateValue: string;
  requirementValue: string;
  status: "match" | "different" | "missing";
};

const compareFields: CompareField[] = [
  {
    contractValue: "8,000,000원",
    estimateValue: "8,800,000원",
    field: "금액 참고값",
    requirementValue: "금액 없음",
    status: "different",
  },
  {
    contractValue: "2회",
    estimateValue: "2회",
    field: "수정 횟수",
    requirementValue: "최종 검수 1회",
    status: "different",
  },
  {
    contractValue: "상세페이지 120건",
    estimateValue: "120건",
    field: "납품물",
    requirementValue: "상세페이지 120건",
    status: "match",
  },
  {
    contractValue: "조건 없음",
    estimateValue: "조건 없음",
    field: "저작권 조건",
    requirementValue: "클라이언트 귀속 요청",
    status: "missing",
  },
];

const statusMeta: Record<CompareField["status"], { label: string; tone: "success" | "warning" | "pending" }> = {
  different: { label: "값 차이", tone: "warning" },
  match: { label: "일치", tone: "success" },
  missing: { label: "조건 확인", tone: "pending" },
};

function CompareRow({ item }: { item: CompareField }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-compare-row">
      <div className="resource-compare-row__head">
        <div>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <h3>{item.field}</h3>
        </div>
        <Button size="sm" variant="quiet">
          질문 초안 만들기
        </Button>
      </div>
      <div className="resource-compare-row__values">
        <span>
          <strong>업무 범위 문서</strong>
          {item.contractValue}
        </span>
        <span>
          <strong>견적서</strong>
          {item.estimateValue}
        </span>
        <span>
          <strong>요구사항</strong>
          {item.requirementValue}
        </span>
      </div>
    </article>
  );
}

export function ResourceComparePanel() {
  return (
    <section className="resource-compare" aria-label="문서 비교와 확인 필요 항목">
      <GlassPanel className="resource-compare__hero">
        <div className="resource-compare__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FileSearch size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>자료보드</Chip>
            <h2>업무 범위 문서, 견적서, 요구사항 문서의 값 차이를 확인 필요 항목으로 정리합니다</h2>
            <p>
              에이전트는 금액 참고값, 부가세, 납품물, 검수 기준, 개인정보, 저작권 조건을 비교합니다. 결과는 판단이
              아니라 사용자가 확인할 후보입니다.
            </p>
          </div>
        </div>
        <div className="resource-compare__score">
          <StatusBadge tone="warning">검토 필요</StatusBadge>
          <strong>3건</strong>
          <span>값 차이와 누락 조건</span>
          <ProgressBar label="문서 비교 진행률" value={88} />
        </div>
      </GlassPanel>

      <div className="resource-compare__grid">
        <GlassPanel className="resource-compare__panel">
          <div className="resource-compare__panel-header">
            <div>
              <h3>비교 결과</h3>
              <p>확인한 항목만 WBS, TODO, 일정 후보로 이어집니다.</p>
            </div>
            <Chip icon={<ListChecks size={14} />}>사용자 확인 필요</Chip>
          </div>

          <div className="resource-compare__list">
            {compareFields.map((item) => (
              <CompareRow item={item} key={item.field} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-compare__policy">
          <h3>비교 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <FileText size={16} strokeWidth={2.1} />
            </span>
            <p>문서 종류를 먼저 분류한 뒤 같은 항목끼리 값을 맞춰 봅니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <AlertCircle size={16} strokeWidth={2.1} />
            </span>
            <p>서로 다른 값과 빠진 조건은 확인 필요 항목으로만 표시합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Scale size={16} strokeWidth={2.1} />
            </span>
            <p>법적 해석이나 책임 판단 대신 확인 질문과 정리 초안을 제안합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>사용자가 승인하기 전에는 확정 데이터와 공유 자료 상태를 바꾸지 않습니다.</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-compare__next">
        <span className="bubli-icon-tile" aria-hidden="true">
          <CheckCircle2 size={16} strokeWidth={2.1} />
        </span>
        <p>확인한 항목은 클라이언트 질문 초안, 요구사항 정리 초안, WBS/TODO 후보로 이어집니다.</p>
      </GlassPanel>
    </section>
  );
}
