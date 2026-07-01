"use client";

import { AlertCircle, FileUp, FolderLock, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { ResourceCard } from "@/components/domain/resource-card";
import { SuggestionCard } from "@/components/domain/suggestion-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

type ResourceScope = "all" | "personal" | "room";

type ResourceBoardItem = {
  agentSummary: string;
  body: string;
  id: string;
  meta: string;
  missingItems: string[];
  relatedDocs: string[];
  scope: Exclude<ResourceScope, "all">;
  status: "normal" | "needsReview" | "candidate" | "approved";
  title: string;
};

const resourceItems: [ResourceBoardItem, ...ResourceBoardItem[]] = [
  {
    agentSummary: "검수 기준 문구와 중간보고 일정을 확인해야 합니다. WBS 후보 2개를 만들 수 있습니다.",
    body: "클라이언트가 올린 회의록입니다. 검수 기준, 중간보고 일정, 보이스 대기방 요구가 함께 들어 있습니다.",
    id: "meeting-0618",
    meta: "프로젝트룸 자료 · v3 · 댓글 4",
    missingItems: ["중간보고 날짜가 자료별 마감과 맞는지 확인", "보이스 대기방을 프로젝트룸 보이스로 처리할지 확인"],
    relatedDocs: ["작업범위_정리.pdf", "요구사항_정리.docx", "견적_최종.pdf"],
    scope: "room",
    status: "needsReview",
    title: "회의록_0618.md",
  },
  {
    agentSummary: "개인 메모입니다. 프로젝트룸 공유 전까지 멤버와 프로젝트룸 에이전트에게 보이지 않습니다.",
    body: "발표 전 팀원에게 물어볼 질문과 디자인보드에서 조정할 항목을 적어둔 개인 메모입니다.",
    id: "personal-note",
    meta: "개인 자료 · 공유 전 · 버전 1",
    missingItems: ["프로젝트룸에 공유할지 사용자 확인 필요"],
    relatedDocs: ["디자인보드_v20.html"],
    scope: "personal",
    status: "candidate",
    title: "개인_검토메모.txt",
  },
  {
    agentSummary: "마감일과 수정 범위가 다른 자료와 다릅니다. 확인 질문 후보를 만들 수 있습니다.",
    body: "마감일, 수정 범위, 저작권 조건이 들어 있는 기준 자료입니다.",
    id: "reference-v2",
    meta: "프로젝트룸 자료 · v2 · 확인 필요 2",
    missingItems: ["견적 자료의 마감일 07.15와 회의록의 07.20이 다름", "수정 횟수 기준 표현이 문서마다 다름"],
    relatedDocs: ["견적_최종.pdf", "회의록_0618.md"],
    scope: "room",
    status: "needsReview",
    title: "작업범위_정리.pdf",
  },
  {
    agentSummary: "개인 관리 폴더에서 감지된 파일입니다. 자료보드에 저장할지 선택해야 합니다.",
    body: "개인 관리 폴더에서 감지된 정리 메모입니다.",
    id: "local-folder-note",
    meta: "개인 자료 · 관리 폴더에서 감지",
    missingItems: ["서버 업로드 여부 선택", "프로젝트룸 자료로 공유할지 선택"],
    relatedDocs: ["개인 관리 폴더"],
    scope: "personal",
    status: "normal",
    title: "로컬_자료정리.md",
  },
];

const scopeCopy: Record<ResourceScope, string> = {
  all: "전체",
  personal: "개인 자료",
  room: "프로젝트룸 자료",
};

export function ResourceBoard() {
  const [activeScope, setActiveScope] = useState<ResourceScope>("all");
  const [selectedId, setSelectedId] = useState(resourceItems[0]?.id ?? "");

  const reviewCount = resourceItems.filter((resource) => resource.status === "needsReview").length;
  const candidateCount = resourceItems.filter((resource) => resource.status === "candidate").length;
  const personalCount = resourceItems.filter((resource) => resource.scope === "personal").length;
  const roomCount = resourceItems.filter((resource) => resource.scope === "room").length;

  const boardStats = [
    {
      icon: FileUp,
      label: "받은 자료",
      meta: `${resourceItems.length}개`,
      tone: "blue",
    },
    {
      icon: AlertCircle,
      label: "확인 필요",
      meta: `${reviewCount}개`,
      tone: "pearl",
    },
    {
      icon: Sparkles,
      label: "후보",
      meta: `${candidateCount}개`,
      tone: "opal",
    },
    {
      icon: FolderLock,
      label: "자료 범위",
      meta: `개인 ${personalCount} · 프로젝트룸 ${roomCount}`,
      tone: "glass",
    },
  ] as const;

  const filteredResources = useMemo(() => {
    if (activeScope === "all") {
      return resourceItems;
    }

    return resourceItems.filter((resource) => resource.scope === activeScope);
  }, [activeScope]);

  const selectedResource = resourceItems.find((resource) => resource.id === selectedId) ?? filteredResources[0] ?? resourceItems[0];

  return (
    <section className="resource-board" aria-label="자료보드">
      <div className="resource-board__toolbar">
        <div className="resource-board__filters" aria-label="자료 범위 필터">
          {Object.entries(scopeCopy).map(([scope, label]) => (
            <button
              className="resource-board__select"
              key={scope}
              onClick={() => {
                setActiveScope(scope as ResourceScope);
                const nextItem = scope === "all" ? resourceItems[0] : resourceItems.find((resource) => resource.scope === scope);
                if (nextItem) {
                  setSelectedId(nextItem.id);
                }
              }}
              style={{ width: "auto" }}
              type="button"
            >
              <Chip selected={activeScope === scope}>{label}</Chip>
            </button>
          ))}
        </div>
        <label style={{ position: "relative" }}>
          <Search aria-hidden="true" size={16} style={{ color: "var(--color-faint)", left: 14, position: "absolute", top: 14 }} />
          <input className="resource-board__search" placeholder="검수 기준 관련 회의록 찾아줘" style={{ paddingLeft: 38 }} type="search" />
        </label>
      </div>

      <GlassPanel className="resource-board__summary" padded={false}>
        {boardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className={`resource-board__stat resource-board__stat--${stat.tone}`} key={stat.label}>
              <span className="resource-board__stat-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <div>
                <b>{stat.label}</b>
                <span>{stat.meta}</span>
              </div>
            </div>
          );
        })}
      </GlassPanel>

      <div className="resource-board__grid">
        <section className="resource-board__list" aria-label="자료 목록">
          <div className="resource-board__list-head">
            <div>
              <h2>자료 목록</h2>
              <p>개인 자료와 프로젝트룸 자료를 범위별로 확인합니다.</p>
            </div>
            <Button icon={<FileUp size={15} />} size="sm" variant="primary">
              자료 올리기
            </Button>
          </div>

          {filteredResources.map((resource) => (
            <button
              aria-pressed={selectedResource.id === resource.id}
              className="resource-board__select"
              key={resource.id}
              onClick={() => setSelectedId(resource.id)}
              type="button"
            >
              <ResourceCard
                description={resource.body}
                meta={resource.meta}
                relatedCount={resource.relatedDocs.length}
                scope={resource.scope}
                status={resource.status}
                title={resource.title}
              />
            </button>
          ))}
        </section>

        <section className="resource-board__detail" aria-label="자료 상세">
          <div className="resource-board__detail-head">
            <div>
              <h2>{selectedResource.title}</h2>
              <p>{selectedResource.meta}</p>
            </div>
            <StatusBadge tone={selectedResource.scope === "room" ? "room" : "personal"}>
              {selectedResource.scope === "room" ? "프로젝트룸 자료" : "개인 자료"}
            </StatusBadge>
          </div>

          {selectedResource.scope === "personal" ? (
            <div className="resource-board__note">개인 자료는 사용자가 공유하기 전까지 프로젝트룸 멤버와 프로젝트룸 에이전트에게 보이지 않습니다.</div>
          ) : null}

          <div className="resource-board__detail-grid">
            <GlassPanel className="resource-board__section">
              <h3>에이전트 정리</h3>
              <p>{selectedResource.agentSummary}</p>
            </GlassPanel>
            <GlassPanel className="resource-board__section">
              <h3>관련 문서</h3>
              <ul>
                {selectedResource.relatedDocs.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </GlassPanel>
          </div>

          <GlassPanel className="resource-board__section">
            <h3>확인 필요 항목</h3>
            <ul>
              {selectedResource.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>

          <SuggestionCard
            confidence={88}
            description="자료에서 바로 확정하지 않고, 사용자가 검토할 WBS/TODO 후보로만 표시합니다."
            source={selectedResource.title}
            title="WBS/TODO 후보 생성"
          />

          <div className="resource-board__footer">
            <Button variant="primary">후보 확인</Button>
            <Button variant="quiet">관련 문서 보기</Button>
            {selectedResource.scope === "personal" ? <Button>프로젝트룸에 공유</Button> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
