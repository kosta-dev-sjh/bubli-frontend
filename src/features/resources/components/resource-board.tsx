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

// Demo/story fixture: text fields hold message keys resolved via t() at render.
const resourceItems: [ResourceBoardItem, ...ResourceBoardItem[]] = [
  {
    agentSummary: "resources.board.item1AgentSummary",
    body: "resources.board.item1Body",
    id: "meeting-0618",
    meta: "resources.board.item1Meta",
    missingItems: ["resources.board.item1Missing1", "resources.board.item1Missing2"],
    relatedDocs: ["resources.board.item1Doc1", "resources.board.item1Doc2", "resources.board.item1Doc3"],
    scope: "room",
    status: "needsReview",
    title: "resources.board.item1Title",
  },
  {
    agentSummary: "resources.board.item2AgentSummary",
    body: "resources.board.item2Body",
    id: "personal-note",
    meta: "resources.board.item2Meta",
    missingItems: ["resources.board.item2Missing1"],
    relatedDocs: ["resources.board.item2Doc1"],
    scope: "personal",
    status: "candidate",
    title: "resources.board.item2Title",
  },
  {
    agentSummary: "resources.board.item3AgentSummary",
    body: "resources.board.item3Body",
    id: "contract-v2",
    meta: "resources.board.item3Meta",
    missingItems: ["resources.board.item3Missing1", "resources.board.item3Missing2"],
    relatedDocs: ["resources.board.item3Doc1", "resources.board.item3Doc2"],
    scope: "room",
    status: "needsReview",
    title: "resources.board.item3Title",
  },
  {
    agentSummary: "resources.board.item4AgentSummary",
    body: "resources.board.item4Body",
    id: "local-folder-note",
    meta: "resources.board.item4Meta",
    missingItems: ["resources.board.item4Missing1", "resources.board.item4Missing2"],
    relatedDocs: ["resources.board.item4Doc1"],
    scope: "personal",
    status: "normal",
    title: "resources.board.item4Title",
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
                description={t(resource.body as MessageKey)}
                meta={t(resource.meta as MessageKey)}
                relatedCount={resource.relatedDocs.length}
                scope={resource.scope}
                status={resource.status}
                title={t(resource.title as MessageKey)}
              />
            </button>
          ))}
        </section>

        <section className="resource-board__detail" aria-label={t("resources.board.detailAria")}>
          <div className="resource-board__detail-head">
            <div>
              <h2>{t(selectedResource.title as MessageKey)}</h2>
              <p>{t(selectedResource.meta as MessageKey)}</p>
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
              <p>{t(selectedResource.agentSummary as MessageKey)}</p>
            </GlassPanel>
            <GlassPanel className="resource-board__section">
              <h3>{t("resources.board.relatedDocs")}</h3>
              <ul>
                {selectedResource.relatedDocs.map((doc) => (
                  <li key={doc}>{t(doc as MessageKey)}</li>
                ))}
              </ul>
            </GlassPanel>
          </div>

          <GlassPanel className="resource-board__section">
            <h3>{t("resources.board.missingItems")}</h3>
            <ul>
              {selectedResource.missingItems.map((item) => (
                <li key={item}>{t(item as MessageKey)}</li>
              ))}
            </ul>
          </GlassPanel>

          <SuggestionCard
            confidence={88}
            description={t("resources.board.suggestionDesc")}
            source={t(selectedResource.title as MessageKey)}
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
