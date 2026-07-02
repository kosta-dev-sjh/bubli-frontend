import { ArrowRight, CalendarClock, CheckCircle2, FileText, FolderPlus, ListChecks, Sparkles, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type UploadedResource = {
  name: string;
  kind: "업무 문서" | "견적서" | "요구사항 문서" | "회의록";
  status: "classified" | "analyzing" | "ready";
};

type CandidateItem = {
  label: string;
  value: string;
  target: "프로젝트룸" | "WBS" | "TODO" | "일정";
};

const uploadedResources: UploadedResource[] = [
  { kind: "업무 문서", name: "업무기준문서_v2.pdf", status: "ready" },
  { kind: "견적서", name: "서비스_견적서_0622.pdf", status: "classified" },
  { kind: "요구사항 문서", name: "요구사항_정리본.docx", status: "analyzing" },
  { kind: "회의록", name: "회의록_0621.md", status: "ready" },
];

const candidates: CandidateItem[] = [
  { label: "프로젝트명", target: "프로젝트룸", value: "일본어 쇼핑몰 번역" },
  { label: "납품일", target: "일정", value: "2026-07-15" },
  { label: "납품물", target: "WBS", value: "상품 상세 120건 번역" },
  { label: "확인 질문", target: "TODO", value: "검수 기준과 수정 횟수 확인" },
];

const statusMeta: Record<UploadedResource["status"], { label: string; tone: "success" | "pending" | "agent" }> = {
  analyzing: { label: "분석 중", tone: "agent" },
  classified: { label: "분류됨", tone: "pending" },
  ready: { label: "후보 준비", tone: "success" },
};

function ResourceRow({ resource }: { resource: UploadedResource }) {
  const status = statusMeta[resource.status];

  return (
    <article className="project-room-create-resource">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="project-room-create-resource__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{resource.kind}</span>
        </div>
        <h3>{resource.name}</h3>
      </div>
    </article>
  );
}

function CandidateRow({ candidate }: { candidate: CandidateItem }) {
  return (
    <article className="project-room-create-candidate">
      <div>
        <StatusBadge tone="pending">후보</StatusBadge>
        <h3>{candidate.label}</h3>
        <p>{candidate.value}</p>
      </div>
      <ArrowRight size={16} strokeWidth={2.1} />
      <Chip selected>{candidate.target}</Chip>
    </article>
  );
}

export function ProjectRoomCreateFlowPanel() {
  return (
    <section className="project-room-create" aria-label="프로젝트룸 생성 흐름">
      <GlassPanel className="project-room-create__hero">
        <div className="project-room-create__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderPlus size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>프로젝트룸 생성</Chip>
            <h2>자료를 올리면 에이전트가 후보를 만들고, 확인한 값만 업무에 반영합니다</h2>
            <p>
              업무 문서, 견적서, 요구사항 문서, 회의록을 모아 문서 종류를 분류합니다. 작업 범위, 납품물, 마감, 확인
              질문, WBS/TODO 후보는 사용자가 승인한 뒤에만 저장됩니다.
            </p>
          </div>
        </div>
        <div className="project-room-create__progress">
          <StatusBadge tone="agent">후보 생성 중</StatusBadge>
          <strong>3/4</strong>
          <span>후보 생성 단계</span>
          <ProgressBar label="프로젝트룸 생성 진행률" value={75} />
        </div>
      </GlassPanel>

      <div className="project-room-create__flow">
        <GlassPanel className="project-room-create__upload">
          <div className="project-room-create__panel-header">
            <div>
              <h3>업로드한 자료</h3>
              <p>자료는 먼저 프로젝트룸 자료 후보로 올라가고, 권한 확인 후 프로젝트룸 자료로 저장됩니다.</p>
            </div>
            <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
              자료 올리기
            </Button>
          </div>

          <div className="project-room-create__resource-list">
            {uploadedResources.map((resource) => (
              <ResourceRow key={resource.name} resource={resource} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="project-room-create__candidate-panel">
          <div className="project-room-create__panel-header">
            <div>
              <h3>추출 후보</h3>
              <p>후보는 확정 데이터가 아니며, 승인 후 프로젝트룸, WBS, TODO, 일정에 연결됩니다.</p>
            </div>
            <Chip icon={<Sparkles size={14} />}>사용자 확인 필요</Chip>
          </div>

          <div className="project-room-create__candidate-list">
            {candidates.map((candidate) => (
              <CandidateRow candidate={candidate} key={`${candidate.label}-${candidate.target}`} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="project-room-create__checks">
        <div>
          <span className="bubli-icon-tile" aria-hidden="true">
            <ListChecks size={16} strokeWidth={2.1} />
          </span>
          <p>문서 사이의 금액 참고값, 부가세, 납품물, 검수 기준, 개인정보, 저작권 조건 차이를 확인 필요 항목으로 표시합니다.</p>
        </div>
        <div>
          <span className="bubli-icon-tile" aria-hidden="true">
            <CheckCircle2 size={16} strokeWidth={2.1} />
          </span>
          <p>에이전트는 후보만 만들고, 확정 저장은 사용자의 승인 뒤 서버가 처리합니다.</p>
        </div>
        <div>
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarClock size={16} strokeWidth={2.1} />
          </span>
          <p>승인된 일정과 TODO는 개인 대시보드와 버블 표시 데이터로 이어집니다.</p>
        </div>
      </GlassPanel>
    </section>
  );
}
