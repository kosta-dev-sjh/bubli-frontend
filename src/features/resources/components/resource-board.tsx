"use client";

import { AlertCircle, FileUp, FolderLock, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { ResourceCard } from "@/components/domain/resource-card";
import { SuggestionCard } from "@/components/domain/suggestion-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

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
    missingItems: ["중간보고 날짜가 업무 문서 납품일과 맞는지 확인", "보이스 대기방을 프로젝트룸 보이스로 처리할지 확인"],
    relatedDocs: ["업무기준문서_v2.pdf", "요구사항_정리.docx", "견적서_최종.pdf"],
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
    agentSummary: "납품일과 수정 범위가 견적서와 다릅니다. 확인 질문 후보를 만들 수 있습니다.",
    body: "납품일, 수정 범위, 저작권 조건이 들어 있는 업무 문서입니다.",
    id: "contract-v2",
    meta: "프로젝트룸 자료 · v2 · 확인 필요 2",
    missingItems: ["견적서의 납품일 07.15와 회의록의 07.20이 다름", "수정 횟수 기준 표현이 문서마다 다름"],
    relatedDocs: ["견적서_최종.pdf", "회의록_0618.md"],
    scope: "room",
    status: "needsReview",
    title: "업무기준문서_v2.pdf",
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

const scopeCopyKey: Record<ResourceScope, MessageKey> = {
  all: "resources.board.scopeAll",
  personal: "resources.board.scopePersonal",
  room: "resources.board.scopeRoom",
};

export function ResourceBoard() {
  const { t } = useI18n();
  const [activeScope, setActiveScope] = useState<ResourceScope>("all");
  const [selectedId, setSelectedId] = useState(resourceItems[0]?.id ?? "");

  const reviewCount = resourceItems.filter((resource) => resource.status === "needsReview").length;
  const candidateCount = resourceItems.filter((resource) => resource.status === "candidate").length;
  const personalCount = resourceItems.filter((resource) => resource.scope === "personal").length;
  const roomCount = resourceItems.filter((resource) => resource.scope === "room").length;

  const boardStats = [
    {
      icon: FileUp,
      label: t("resources.board.statReceived"),
      meta: t("resources.board.countUnit", { count: resourceItems.length }),
      tone: "blue",
    },
    {
      icon: AlertCircle,
      label: t("resources.board.statReview"),
      meta: t("resources.board.countUnit", { count: reviewCount }),
      tone: "pearl",
    },
    {
      icon: Sparkles,
      label: t("resources.board.statCandidate"),
      meta: t("resources.board.countUnit", { count: candidateCount }),
      tone: "opal",
    },
    {
      icon: FolderLock,
      label: t("resources.board.statScope"),
      meta: t("resources.board.statScopeMeta", { personal: personalCount, room: roomCount }),
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
    <section className="resource-board" aria-label={t("resources.board.aria")}>
      <div className="resource-board__toolbar">
        <div className="resource-board__filters" aria-label={t("resources.board.filterAria")}>
          {(Object.keys(scopeCopyKey) as ResourceScope[]).map((scope) => (
            <button
              className="resource-board__select"
              key={scope}
              onClick={() => {
                setActiveScope(scope);
                const nextItem = scope === "all" ? resourceItems[0] : resourceItems.find((resource) => resource.scope === scope);
                if (nextItem) {
                  setSelectedId(nextItem.id);
                }
              }}
              style={{ width: "auto" }}
              type="button"
            >
              <Chip selected={activeScope === scope}>{t(scopeCopyKey[scope])}</Chip>
            </button>
          ))}
        </div>
        <label style={{ position: "relative" }}>
          <Search aria-hidden="true" size={16} style={{ color: "var(--color-faint)", left: 14, position: "absolute", top: 14 }} />
          <input className="resource-board__search" placeholder={t("resources.board.demoSearchPlaceholder")} style={{ paddingLeft: 38 }} type="search" />
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
        <section className="resource-board__list" aria-label={t("resources.board.listAria")}>
          <div className="resource-board__list-head">
            <div>
              <h2>{t("resources.board.listTitle")}</h2>
              <p>{t("resources.board.listDesc")}</p>
            </div>
            <Button icon={<FileUp size={15} />} size="sm" variant="primary">
              {t("resources.board.upload")}
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

        <section className="resource-board__detail" aria-label={t("resources.board.detailAria")}>
          <div className="resource-board__detail-head">
            <div>
              <h2>{selectedResource.title}</h2>
              <p>{selectedResource.meta}</p>
            </div>
            <StatusBadge tone={selectedResource.scope === "room" ? "room" : "personal"}>
              {selectedResource.scope === "room" ? t("resources.board.badgeRoom") : t("resources.board.badgePersonal")}
            </StatusBadge>
          </div>

          {selectedResource.scope === "personal" ? (
            <div className="resource-board__note">{t("resources.board.personalNote")}</div>
          ) : null}

          <div className="resource-board__detail-grid">
            <GlassPanel className="resource-board__section">
              <h3>{t("resources.board.agentSummary")}</h3>
              <p>{selectedResource.agentSummary}</p>
            </GlassPanel>
            <GlassPanel className="resource-board__section">
              <h3>{t("resources.board.relatedDocs")}</h3>
              <ul>
                {selectedResource.relatedDocs.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </GlassPanel>
          </div>

          <GlassPanel className="resource-board__section">
            <h3>{t("resources.board.missingItems")}</h3>
            <ul>
              {selectedResource.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>

          <SuggestionCard
            confidence={88}
            description={t("resources.board.suggestionDesc")}
            source={selectedResource.title}
            title={t("resources.board.suggestionTitle")}
          />

          <div className="resource-board__footer">
            <Button variant="primary">{t("resources.board.confirmCandidate")}</Button>
            <Button variant="quiet">{t("resources.board.viewRelated")}</Button>
            {selectedResource.scope === "personal" ? <Button>{t("resources.board.shareToRoom")}</Button> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
