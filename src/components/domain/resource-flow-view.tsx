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
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-flow-view.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

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

const EMPTY_RESOURCE_FLOW_DATA: ResourceFlowData = {
  resources: [],
  suggestions: [],
  works: [],
};

const resourceStatusCopy: Record<ResourceStatus, { labelKey: MessageKey; tone: "approved" | "neutral" | "pending" | "warning" }> = {
  approved: { labelKey: "domain.flow.statusApproved", tone: "approved" },
  candidate: { labelKey: "domain.flow.statusCandidate", tone: "pending" },
  needsReview: { labelKey: "domain.flow.statusNeedsReview", tone: "warning" },
  normal: { labelKey: "domain.flow.statusNormal", tone: "neutral" },
};

const suggestionStatusCopy: Record<SuggestionStatus, { labelKey: MessageKey; tone: "approved" | "pending" | "warning" }> = {
  approved: { labelKey: "domain.flow.suggestionApproved", tone: "approved" },
  held: { labelKey: "domain.flow.suggestionHeld", tone: "warning" },
  pending: { labelKey: "domain.flow.suggestionPending", tone: "pending" },
};

const workStatusCopy: Record<WorkStatus, { labelKey: MessageKey; tone: "approved" | "neutral" | "todo" | "warning" }> = {
  doing: { labelKey: "domain.flow.workDoing", tone: "todo" },
  done: { labelKey: "domain.flow.workDone", tone: "approved" },
  review: { labelKey: "domain.flow.workReview", tone: "warning" },
  waiting: { labelKey: "domain.flow.workWaiting", tone: "neutral" },
};

type ResourceFlowViewProps = {
  className?: string;
  data?: ResourceFlowData;
  empty?: boolean;
  error?: boolean;
  loading?: boolean;
};

function ScopeChip({ scope, t }: { scope: ResourceScope; t: TranslateFn }) {
  const Icon = scope === "room" ? UsersRound : FolderLock;
  return (
    <Chip className={styles.scopeChip} icon={<Icon size={13} strokeWidth={2} />} selected={scope === "room"}>
      {scope === "room" ? t("domain.resource.scopeRoom") : t("domain.resource.scopePersonal")}
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
  data = EMPTY_RESOURCE_FLOW_DATA,
  empty = false,
  error = false,
  loading = false,
}: ResourceFlowViewProps) {
  const { t } = useI18n();
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
        <EmptyState description={t("domain.flow.errorDescription")} title={t("domain.flow.errorTitle")} />
      </GlassPanel>
    );
  }

  if (empty || data.resources.length === 0) {
    return (
      <GlassPanel className={styles.statePanel}>
        <EmptyState description={t("domain.flow.emptyDescription")} title={t("domain.flow.emptyTitle")} />
      </GlassPanel>
    );
  }

  return (
    <section className={cn(styles.resourceDesk, className)} aria-label={t("domain.flow.deskAria")}>
      <div className={styles.summaryStrip} aria-label={t("domain.flow.summaryAria")}>
        <div>
          <span>{t("domain.flow.summaryTotal")}</span>
          <strong>{data.resources.length}</strong>
        </div>
        <div>
          <span>{t("domain.flow.summaryRoom")}</span>
          <strong>{roomCount}</strong>
        </div>
        <div>
          <span>{t("domain.flow.summaryPending")}</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>{t("domain.flow.summaryToday")}</span>
          <strong>{data.works.length}</strong>
        </div>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.libraryPanel} aria-label={t("domain.flow.libraryAria")}>
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>{t("domain.flow.libraryKicker")}</span>
              <h2>{t("domain.flow.libraryTitle")}</h2>
            </div>
            <Button icon={<Search size={15} />} size="sm" variant="quiet">
              {t("common.search")}
            </Button>
          </header>

          <div className={styles.filterRow} aria-label={t("domain.flow.scopeAria")}>
            <Chip selected>{t("domain.flow.scopeAll")}</Chip>
            <Chip>{t("domain.flow.scopePersonal")}</Chip>
            <Chip>{t("domain.flow.scopeRoomFilter")}</Chip>
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
                      <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                    </button>
                  );
                })}
          </div>
        </aside>

        <main className={styles.detailPanel} aria-label={t("domain.flow.detailAria")}>
          <header className={styles.detailHead}>
            <div>
              <span className={styles.kicker}>{t("domain.flow.detailKicker")}</span>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
            </div>
            <ScopeChip scope={selected.scope} t={t} />
          </header>

          <div className={styles.detailMeta}>
            <span>{selected.ownerLabel}</span>
            <span>{selected.updatedLabel}</span>
            <span>{t("domain.flow.relatedCount", { count: selected.relatedCount })}</span>
          </div>

          <section className={styles.evidencePanel} aria-label={t("domain.flow.evidenceAria")}>
            <div className={styles.evidenceHead}>
              <Sparkles size={16} strokeWidth={2} />
              <div>
                <strong>{t("domain.flow.evidenceTitle")}</strong>
                <span>{t("domain.flow.evidenceSub")}</span>
              </div>
            </div>

            <div className={styles.suggestionList}>
              {selectedSuggestions.length > 0 ? (
                selectedSuggestions.map((suggestion) => {
                  const status = suggestionStatusCopy[suggestion.status];

                  return (
                    <article className={styles.suggestionItem} key={suggestion.id}>
                      <div>
                        <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                        <h3>{suggestion.title}</h3>
                        <p>{suggestion.description}</p>
                      </div>
                      <footer>
                        <span>{t("domain.flow.source", { source: suggestion.source })}</span>
                        <span>{t("domain.flow.confidence", { confidence: suggestion.confidence })}</span>
                      </footer>
                    </article>
                  );
                })
              ) : (
                <p className={styles.emptyCopy}>{t("domain.flow.suggestionEmpty")}</p>
              )}
            </div>
          </section>

          <div className={styles.actionBar} aria-label={t("domain.flow.actionAria")}>
            <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
              {t("domain.flow.actionApprove")}
            </Button>
            <Button size="sm" variant="quiet">
              {t("domain.flow.actionEditSource")}
            </Button>
            <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
              {t("domain.flow.actionHold")}
            </Button>
          </div>
        </main>

        <aside className={styles.sidePanel} aria-label={t("domain.flow.sideAria")}>
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>{t("domain.flow.sideKicker")}</span>
              <h2>{t("domain.flow.sideTitle")}</h2>
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
                    <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
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
