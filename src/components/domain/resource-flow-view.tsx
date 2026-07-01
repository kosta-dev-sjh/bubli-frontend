"use client";

import {
  CalendarClock,
  CheckCircle2,
  CirclePause,
  FileText,
  FolderLock,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-flow-view.module.css";

type ResourceScope = "personal" | "room";
type ResourceStatus = "normal" | "needsReview" | "candidate" | "approved";
type SuggestionStatus = "pending" | "approved" | "held";
type WorkStatus = "waiting" | "doing" | "review" | "done";

export type ResourceFlowData = {
  resources: {
    description: string;
    id: string;
    meta: string;
    ownerLabel: string;
    relatedCount: number;
    scope: ResourceScope;
    status: ResourceStatus;
    title: string;
    updatedLabel: string;
  }[];
  suggestions: {
    confidence: number;
    description: string;
    id: string;
    resourceId: string;
    source: string;
    status: SuggestionStatus;
    title: string;
  }[];
  works: {
    dueLabel?: string;
    id: string;
    sourceLabel: string;
    status: WorkStatus;
    title: string;
  }[];
};

export const DEFAULT_RESOURCE_FLOW: ResourceFlowData = {
  resources: [
    {
      description: "메인, 상세, 마이페이지 개편 범위와 검수 기준이 들어 있습니다.",
      id: "r1",
      meta: "PDF · 2.4MB",
      ownerLabel: "Bubli 제품 개발룸",
      relatedCount: 3,
      scope: "room",
      status: "needsReview",
      title: "A사 리뉴얼 요구사항 정의서.pdf",
      updatedLabel: "오늘 10:24",
    },
    {
      description: "화면 흐름과 정보 구조가 정리된 시안입니다.",
      id: "r2",
      meta: "Figma · A사 룸",
      ownerLabel: "Bubli 제품 개발룸",
      relatedCount: 5,
      scope: "room",
      status: "candidate",
      title: "B사 앱 와이어프레임.fig",
      updatedLabel: "어제 18:12",
    },
    {
      description: "외부 공유 전 정리 중인 견적 기준 메모입니다.",
      id: "r3",
      meta: "Markdown · 개인",
      ownerLabel: "개인 자료",
      relatedCount: 1,
      scope: "personal",
      status: "normal",
      title: "내 견적 메모.md",
      updatedLabel: "3일 전",
    },
  ],
  suggestions: [
    {
      confidence: 82,
      description: "요구사항 정의서 2장에서 메인 배너 개편 범위와 검수 기준을 찾았습니다.",
      id: "s1",
      resourceId: "r1",
      source: "2장 화면 범위",
      status: "pending",
      title: "메인 배너 영역 개편",
    },
    {
      confidence: 74,
      description: "마이페이지 IA 변경 근거가 와이어프레임 3, 4페이지에 있습니다.",
      id: "s2",
      resourceId: "r2",
      source: "와이어프레임 3-4페이지",
      status: "held",
      title: "마이페이지 정보 구조 변경",
    },
    {
      confidence: 90,
      description: "정의서 5장과 개인 메모가 같은 결제 흐름 단순화를 가리킵니다.",
      id: "s3",
      resourceId: "r1",
      source: "정의서 5장 + 메모",
      status: "approved",
      title: "결제 흐름 단순화",
    },
  ],
  works: [
    { dueLabel: "오늘 18:00", id: "w1", sourceLabel: "후보 승인", status: "doing", title: "메인 배너 시안 1차" },
    { dueLabel: "내일", id: "w2", sourceLabel: "후보 보류", status: "waiting", title: "마이페이지 IA 정리" },
    { id: "w3", sourceLabel: "후보 승인", status: "review", title: "결제 흐름 검토 회신" },
  ],
};

const resourceStatusCopy: Record<ResourceStatus, { label: string; tone: "approved" | "neutral" | "pending" | "warning" }> = {
  approved: { label: "승인됨", tone: "approved" },
  candidate: { label: "후보 있음", tone: "pending" },
  needsReview: { label: "확인 필요", tone: "warning" },
  normal: { label: "자료", tone: "neutral" },
};

const suggestionStatusCopy: Record<SuggestionStatus, { label: string; tone: "approved" | "pending" | "warning" }> = {
  approved: { label: "승인됨", tone: "approved" },
  held: { label: "보류", tone: "warning" },
  pending: { label: "승인 전", tone: "pending" },
};

const workStatusCopy: Record<WorkStatus, { label: string; tone: "approved" | "neutral" | "todo" | "warning" }> = {
  doing: { label: "진행 중", tone: "todo" },
  done: { label: "완료", tone: "approved" },
  review: { label: "검토", tone: "warning" },
  waiting: { label: "대기", tone: "neutral" },
};

type ResourceFlowViewProps = {
  className?: string;
  data?: ResourceFlowData;
  empty?: boolean;
  error?: boolean;
  loading?: boolean;
};

function ScopeChip({ scope }: { scope: ResourceScope }) {
  const Icon = scope === "room" ? UsersRound : FolderLock;
  return (
    <Chip className={styles.scopeChip} icon={<Icon size={13} strokeWidth={2} />} selected={scope === "room"}>
      {scope === "room" ? "프로젝트룸 자료" : "개인 자료"}
    </Chip>
  );
}

function ResourceSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function ResourceFlowView({
  className,
  data = DEFAULT_RESOURCE_FLOW,
  empty = false,
  error = false,
  loading = false,
}: ResourceFlowViewProps) {
  const [selectedId, setSelectedId] = useState(data.resources[0]?.id);
  const selected = useMemo(
    () => data.resources.find((resource) => resource.id === selectedId) ?? data.resources[0],
    [data.resources, selectedId],
  );
  const selectedSuggestions = data.suggestions.filter((suggestion) => suggestion.resourceId === selected?.id);
  const pendingCount = data.suggestions.filter((suggestion) => suggestion.status === "pending").length;
  const roomCount = data.resources.filter((resource) => resource.scope === "room").length;

  if (error) {
    return (
      <GlassPanel className={styles.statePanel}>
        <EmptyState description="자료를 불러오지 못했다. 잠시 후 다시 시도하거나 새로고침 한다." title="자료를 불러오지 못했어요" />
      </GlassPanel>
    );
  }

  if (empty || data.resources.length === 0) {
    return (
      <GlassPanel className={styles.statePanel}>
        <EmptyState description="자료를 올리면 에이전트가 확인 필요 항목과 업무 후보를 정리한다." title="아직 올린 자료가 없어요" />
      </GlassPanel>
    );
  }

  return (
    <section className={cn(styles.resourceDesk, className)} aria-label="자료보드 작업 화면">
      <div className={styles.summaryStrip} aria-label="자료보드 요약">
        <div>
          <span>전체 자료</span>
          <strong>{data.resources.length}</strong>
        </div>
        <div>
          <span>프로젝트룸 자료</span>
          <strong>{roomCount}</strong>
        </div>
        <div>
          <span>승인 대기</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>오늘 연결</span>
          <strong>{data.works.length}</strong>
        </div>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.libraryPanel} aria-label="자료 목록">
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>자료함</span>
              <h2>최근 자료</h2>
            </div>
            <Button icon={<Search size={15} />} size="sm" variant="quiet">
              검색
            </Button>
          </header>

          <div className={styles.filterRow} aria-label="자료 범위">
            <Chip selected>전체</Chip>
            <Chip>개인</Chip>
            <Chip>프로젝트룸</Chip>
          </div>

          <div className={styles.resourceList}>
            {loading
              ? [0, 1, 2].map((item) => <ResourceSkeleton key={item} />)
              : data.resources.map((resource) => {
                  const status = resourceStatusCopy[resource.status];
                  const active = resource.id === selected?.id;

                  return (
                    <button
                      aria-pressed={active}
                      className={cn(styles.resourceRow, active && styles.resourceRowActive)}
                      key={resource.id}
                      onClick={() => setSelectedId(resource.id)}
                      type="button"
                    >
                      <span className={styles.fileIcon} aria-hidden="true">
                        <FileText size={17} strokeWidth={2} />
                      </span>
                      <span className={styles.resourceBody}>
                        <strong>{resource.title}</strong>
                        <small>{resource.meta}</small>
                        <span>{resource.updatedLabel}</span>
                      </span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </button>
                  );
                })}
          </div>
        </aside>

        <main className={styles.detailPanel} aria-label="선택 자료 상세">
          <header className={styles.detailHead}>
            <div>
              <span className={styles.kicker}>선택한 자료</span>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
            </div>
            <ScopeChip scope={selected.scope} />
          </header>

          <div className={styles.detailMeta}>
            <span>{selected.ownerLabel}</span>
            <span>{selected.updatedLabel}</span>
            <span>관련 자료 {selected.relatedCount}개</span>
          </div>

          <section className={styles.evidencePanel} aria-label="에이전트 확인 항목">
            <div className={styles.evidenceHead}>
              <Sparkles size={16} strokeWidth={2} />
              <div>
                <strong>에이전트가 찾은 후보</strong>
                <span>근거를 확인하고 승인 여부를 정한다</span>
              </div>
            </div>

            <div className={styles.suggestionList}>
              {selectedSuggestions.length > 0 ? (
                selectedSuggestions.map((suggestion) => {
                  const status = suggestionStatusCopy[suggestion.status];

                  return (
                    <article className={styles.suggestionItem} key={suggestion.id}>
                      <div>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        <h3>{suggestion.title}</h3>
                        <p>{suggestion.description}</p>
                      </div>
                      <footer>
                        <span>근거: {suggestion.source}</span>
                        <span>신뢰도 {suggestion.confidence}%</span>
                      </footer>
                    </article>
                  );
                })
              ) : (
                <p className={styles.emptyCopy}>이 자료에서 아직 검토할 후보가 없습니다.</p>
              )}
            </div>
          </section>

          <div className={styles.actionBar} aria-label="자료 후보 처리">
            <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
              선택 후보 승인
            </Button>
            <Button size="sm" variant="quiet">
              근거 수정
            </Button>
            <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
              보류
            </Button>
          </div>
        </main>

        <aside className={styles.sidePanel} aria-label="오늘 연결된 일">
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>오늘 연결</span>
              <h2>할 일 후보</h2>
            </div>
          </header>

          <div className={styles.workList}>
            {data.works.map((work) => {
              const status = workStatusCopy[work.status];

              return (
                <article className={styles.workItem} key={work.id}>
                  <div>
                    <h3>{work.title}</h3>
                    <p>{work.sourceLabel}</p>
                  </div>
                  <footer>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    {work.dueLabel ? (
                      <Chip icon={<CalendarClock size={13} strokeWidth={2} />}>{work.dueLabel}</Chip>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
