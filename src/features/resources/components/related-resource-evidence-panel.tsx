import {
  ArrowRight,
  Bot,
  FileSearch,
  FileText,
  FolderLock,
  Link2,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./related-resource-evidence-panel.module.css";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";
export type ResourceRelationReason = "SAME_SCOPE" | "MENTIONS_DELIVERABLE" | "MATCHES_REQUIREMENT" | "SAME_MEETING";

export type RelatedResource = {
  id: string;
  reason: ResourceRelationReason;
  score: number;
  summary: string;
  title: string;
  updatedLabel: string;
  visibility: ResourceVisibility;
};

export type RelatedResourceEvidencePanelProps = {
  className?: string;
  currentResourceTitle?: string;
  onOpenResource?: (resourceId: string) => void;
  onRunRelatedSearch?: () => void;
  relatedResources?: RelatedResource[];
};

const reasonCopy: Record<ResourceRelationReason, string> = {
  MATCHES_REQUIREMENT: "요구사항 연결",
  MENTIONS_DELIVERABLE: "결과물 언급",
  SAME_MEETING: "같은 회의 흐름",
  SAME_SCOPE: "작업 범위 유사",
};

const defaultRelatedResources: RelatedResource[] = [
  {
    id: "resource-meeting-0618",
    reason: "SAME_MEETING",
    score: 92,
    summary: "마감일과 검수 기준을 다시 확인한 회의 기록입니다.",
    title: "회의록_0618.md",
    updatedLabel: "2026-06-18",
    visibility: "ROOM_SHARED",
  },
  {
    id: "resource-requirements-v13",
    reason: "MATCHES_REQUIREMENT",
    score: 88,
    summary: "자료 상세 화면과 WBS 후보의 근거가 되는 요구사항 문서입니다.",
    title: "요구사항정의서_v1.3.pdf",
    updatedLabel: "2026-06-16",
    visibility: "ROOM_SHARED",
  },
  {
    id: "resource-private-note",
    reason: "MENTIONS_DELIVERABLE",
    score: 74,
    summary: "개인 검토 메모입니다. 사용자가 공유하기 전까지 프로젝트룸에는 보이지 않습니다.",
    title: "개인_검토메모.txt",
    updatedLabel: "2026-06-15",
    visibility: "PERSONAL",
  },
];

export function RelatedResourceEvidencePanel({
  className,
  currentResourceTitle = "업무기준문서_v2.pdf",
  onOpenResource,
  onRunRelatedSearch,
  relatedResources = defaultRelatedResources,
}: RelatedResourceEvidencePanelProps) {
  const roomCount = relatedResources.filter((resource) => resource.visibility === "ROOM_SHARED").length;
  const personalCount = relatedResources.filter((resource) => resource.visibility === "PERSONAL").length;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<FileSearch size={14} />}>관련 문서</Chip>
          <h2>같은 권한 범위 안에서 근거 문서를 찾습니다</h2>
          <p>
            현재 자료와 비슷한 내용을 가진 문서를 추천합니다. 개인 자료는 사용자가 직접 공유하기
            전까지 프로젝트룸 자료로 보이지 않습니다.
          </p>
        </div>
        <Button icon={<Search size={15} />} onClick={onRunRelatedSearch} size="sm" variant="quiet">
          다시 찾기
        </Button>
      </header>

      <section className={styles.currentResource} aria-label="현재 자료">
        <span className={styles.resourceIcon} aria-hidden="true">
          <FileText size={19} strokeWidth={2.1} />
        </span>
        <div>
          <span>현재 자료</span>
          <strong>{currentResourceTitle}</strong>
        </div>
        <StatusBadge tone="approved">분석됨</StatusBadge>
      </section>

      <section className={styles.summary} aria-label="관련 문서 요약">
        <article>
          <strong>{relatedResources.length}</strong>
          <span>추천 후보</span>
        </article>
        <article>
          <strong>{roomCount}</strong>
          <span>프로젝트룸 자료</span>
        </article>
        <article>
          <strong>{personalCount}</strong>
          <span>개인 자료</span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.resourceList} aria-label="관련 문서 후보 목록">
          {relatedResources.map((resource) => {
            const ScopeIcon = resource.visibility === "ROOM_SHARED" ? UsersRound : FolderLock;

            return (
              <article className={styles.relatedCard} key={resource.id}>
                <span className={styles.scopeIcon} aria-hidden="true">
                  <ScopeIcon size={18} strokeWidth={2.1} />
                </span>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <div>
                      <Chip selected={resource.visibility === "ROOM_SHARED"}>
                        {resource.visibility === "ROOM_SHARED" ? "프로젝트룸 자료" : "개인 자료"}
                      </Chip>
                      <h3>{resource.title}</h3>
                    </div>
                    <StatusBadge tone={resource.score >= 85 ? "approved" : "pending"}>{reasonCopy[resource.reason]}</StatusBadge>
                  </div>
                  <p>{resource.summary}</p>
                  <div className={styles.metaRow}>
                    <span>{resource.updatedLabel}</span>
                    <ProgressBar label="관련도" value={resource.score} />
                  </div>
                  <Button
                    icon={<Link2 size={15} />}
                    onClick={() => onOpenResource?.(resource.id)}
                    size="sm"
                    variant="ghost"
                  >
                    자료 열기
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className={styles.policyPanel} aria-label="관련 문서 권한 기준">
          <div className={styles.policyHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>권한 필터 먼저</h3>
              <p>검색 결과보다 접근 기준을 먼저 확인합니다.</p>
            </div>
          </div>

          <ol className={styles.policyList}>
            <li>
              <span>1</span>
              <div>
                <strong>접근 가능한 자료만 조회</strong>
                <p>개인 자료는 올린 사람 기준, 프로젝트룸 자료는 멤버 권한 기준으로 확인합니다.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>의미 검색으로 후보 찾기</strong>
                <p>문서 chunk와 임베딩을 사용해 현재 자료와 가까운 문서를 찾습니다.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>근거 후보로 표시</strong>
                <p>에이전트 답변과 WBS/TODO 후보의 근거로 사용할 수 있게 보여줍니다.</p>
              </div>
            </li>
          </ol>

          <div className={styles.flowFooter}>
            <span>권한 확인</span>
            <ArrowRight size={16} />
            <span>관련 문서 후보</span>
            <ArrowRight size={16} />
            <span>에이전트 근거</span>
          </div>

          <div className={styles.agentNote}>
            <Bot size={17} strokeWidth={2.1} />
            <p>프로젝트룸 에이전트는 공유 전 개인 자료를 읽지 않습니다.</p>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
