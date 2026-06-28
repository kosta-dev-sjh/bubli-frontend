"use client";

import { ChatMessage } from "@/components/domain/chat-message";
import { ResourceCard } from "@/components/domain/resource-card";
import { SuggestionCard } from "@/components/domain/suggestion-card";
import { WorkItemCard } from "@/components/domain/work-item-card";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassPanel } from "@/components/ui/glass-panel";

/* 자료 → 에이전트 후보 → 승인 → 오늘 할 일 흐름. 목 데이터, 업로드/job API 미연결. */
export type ResourceFlowData = {
  resources: { id: string; title: string; meta: string; scope: "personal" | "room"; status: "normal" | "needsReview" | "candidate" | "approved"; description?: string; relatedCount?: number }[];
  suggestions: { id: string; title: string; description: string; source: string; confidence: number; status: "pending" | "approved" | "held" }[];
  works: { id: string; title: string; status: "waiting" | "doing" | "review" | "done"; assignee?: string; dueLabel?: string; sourceLabel?: string; code?: string }[];
};

export const MOCK_FLOW: ResourceFlowData = {
  resources: [
    { id: "r1", title: "A사 리뉴얼 요구사항 정의서.pdf", meta: "2.4MB · 오늘 업로드", scope: "room", status: "needsReview", description: "메인/상세/마이페이지 개편 범위", relatedCount: 3 },
    { id: "r2", title: "B사 앱 와이어프레임.fig", meta: "어제 · A사 룸", scope: "room", status: "candidate", relatedCount: 5 },
    { id: "r3", title: "내 견적 메모.md", meta: "3일 전", scope: "personal", status: "normal" },
  ],
  suggestions: [
    { id: "s1", title: "메인 배너 영역 개편", description: "요구사항 정의서 2장에서 추출", source: "요구사항 정의서.pdf", confidence: 82, status: "pending" },
    { id: "s2", title: "마이페이지 정보 구조 변경", description: "와이어프레임 3·4페이지 근거", source: "와이어프레임.fig", confidence: 74, status: "held" },
    { id: "s3", title: "결제 흐름 단순화", description: "정의서 5장 + 메모 근거", source: "요구사항 정의서.pdf", confidence: 90, status: "approved" },
  ],
  works: [
    { id: "w1", title: "메인 배너 시안 1차", status: "doing", assignee: "나", dueLabel: "오늘 18:00", sourceLabel: "후보 승인", code: "A-12" },
    { id: "w2", title: "마이페이지 IA 정리", status: "waiting", assignee: "나", dueLabel: "내일", sourceLabel: "후보 보류", code: "A-13" },
    { id: "w3", title: "결제 흐름 검토 회신", status: "review", assignee: "나", sourceLabel: "후보 승인", code: "A-14" },
  ],
};

function Col({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="bubli-flow__col">
      <header className="bubli-flow__col-head">
        <strong>{title}</strong>
        <span className="bubli-flow__hint">{hint}</span>
      </header>
      <div className="bubli-flow__stack">{children}</div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <GlassPanel>
      <div style={{ display: "grid", gap: 8, padding: 4 }}>
        <span className="bubli-skeleton" style={{ display: "block", height: 13, width: "70%", borderRadius: 8 }} />
        <span className="bubli-skeleton" style={{ display: "block", height: 11, width: "90%", borderRadius: 8 }} />
      </div>
    </GlassPanel>
  );
}

type ResourceFlowViewProps = {
  data?: ResourceFlowData;
  empty?: boolean;
  error?: boolean;
  loading?: boolean;
};

export function ResourceFlowView({ data = MOCK_FLOW, empty = false, error = false, loading = false }: ResourceFlowViewProps) {
  if (error) {
    return (
      <GlassPanel>
        <EmptyState
          description="자료를 불러오지 못했다. 잠시 후 다시 시도하거나 새로고침 한다."
          title="불러오기에 실패했어요"
        />
      </GlassPanel>
    );
  }

  if (empty) {
    return (
      <GlassPanel>
        <EmptyState
          description="자료를 올리면 에이전트가 요구사항 후보를 찾아 정리해 준다."
          title="아직 올린 자료가 없어요"
        />
      </GlassPanel>
    );
  }

  return (
    <div className="bubli-flow">
      <Col hint="업로드된 프로젝트 자료" title="자료">
        {loading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : data.resources.map((r) => (
              <ResourceCard
                description={r.description}
                key={r.id}
                meta={r.meta}
                relatedCount={r.relatedCount}
                scope={r.scope}
                status={r.status}
                title={r.title}
              />
            ))}
      </Col>

      <Col hint="에이전트가 찾은 요구사항" title="후보">
        {loading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : data.suggestions.map((s) => (
              <SuggestionCard
                confidence={s.confidence}
                description={s.description}
                key={s.id}
                source={s.source}
                status={s.status}
                title={s.title}
              />
            ))}
      </Col>

      <Col hint="승인하면 할 일로 이어진다" title="승인 · 근거">
        {loading ? (
          <SkeletonCard />
        ) : (
          <>
            {data.suggestions
              .filter((s) => s.status !== "pending")
              .map((s) => (
                <SuggestionCard
                  confidence={s.confidence}
                  description={s.description}
                  key={s.id}
                  source={s.source}
                  status={s.status}
                  title={s.title}
                />
              ))}
            <ChatMessage
              author="에이전트"
              message="승인하면 같은 근거를 단 할 일이 오늘 목록에 추가돼요."
              roleLabel="프로젝트룸 에이전트"
              timeLabel="방금"
            />
          </>
        )}
      </Col>

      <Col hint="승인에서 이어진 작업" title="오늘 할 일">
        {loading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : data.works.map((w) => (
              <WorkItemCard
                assignee={w.assignee}
                code={w.code}
                dueLabel={w.dueLabel}
                key={w.id}
                sourceLabel={w.sourceLabel}
                status={w.status}
                title={w.title}
              />
            ))}
      </Col>
    </div>
  );
}
