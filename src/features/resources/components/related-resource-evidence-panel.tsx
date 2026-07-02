"use client";

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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const reasonCopyKey: Record<ResourceRelationReason, MessageKey> = {
  MATCHES_REQUIREMENT: "resources.evidence.reason.MATCHES_REQUIREMENT",
  MENTIONS_DELIVERABLE: "resources.evidence.reason.MENTIONS_DELIVERABLE",
  SAME_MEETING: "resources.evidence.reason.SAME_MEETING",
  SAME_SCOPE: "resources.evidence.reason.SAME_SCOPE",
};

type TranslateFn = (key: MessageKey) => string;

function buildDefaultRelatedResources(t: TranslateFn): RelatedResource[] {
  return [
    {
      id: "resource-meeting-0618",
      reason: "SAME_MEETING",
      score: 92,
      summary: t("resources.evidence.itemMeetingSummary"),
      title: t("resources.evidence.itemMeetingFile"),
      updatedLabel: "2026-06-18",
      visibility: "ROOM_SHARED",
    },
    {
      id: "resource-requirements-v13",
      reason: "MATCHES_REQUIREMENT",
      score: 88,
      summary: t("resources.evidence.itemRequirementSummary"),
      title: t("resources.evidence.itemRequirementFile"),
      updatedLabel: "2026-06-16",
      visibility: "ROOM_SHARED",
    },
    {
      id: "resource-private-note",
      reason: "MENTIONS_DELIVERABLE",
      score: 74,
      summary: t("resources.evidence.itemPrivateSummary"),
      title: t("resources.evidence.itemPrivateFile"),
      updatedLabel: "2026-06-15",
      visibility: "PERSONAL",
    },
  ];
}

export function RelatedResourceEvidencePanel({
  className,
  currentResourceTitle,
  onOpenResource,
  onRunRelatedSearch,
  relatedResources,
}: RelatedResourceEvidencePanelProps) {
  const { t } = useI18n();
  const resolvedCurrentTitle = currentResourceTitle ?? t("resources.evidence.defaultCurrentTitle");
  const resolvedRelated = relatedResources ?? buildDefaultRelatedResources(t);
  const roomCount = resolvedRelated.filter((resource) => resource.visibility === "ROOM_SHARED").length;
  const personalCount = resolvedRelated.filter((resource) => resource.visibility === "PERSONAL").length;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<FileSearch size={14} />}>{t("resources.evidence.chip")}</Chip>
          <h2>{t("resources.evidence.title")}</h2>
          <p>{t("resources.evidence.description")}</p>
        </div>
        <Button icon={<Search size={15} />} onClick={onRunRelatedSearch} size="sm" variant="quiet">
          {t("resources.evidence.searchAction")}
        </Button>
      </header>

      <section className={styles.currentResource} aria-label={t("resources.evidence.currentAria")}>
        <span className={styles.resourceIcon} aria-hidden="true">
          <FileText size={19} strokeWidth={2.1} />
        </span>
        <div>
          <span>{t("resources.evidence.currentLabel")}</span>
          <strong>{resolvedCurrentTitle}</strong>
        </div>
        <StatusBadge tone="approved">{t("resources.evidence.currentBadge")}</StatusBadge>
      </section>

      <section className={styles.summary} aria-label={t("resources.evidence.summaryAria")}>
        <article>
          <strong>{resolvedRelated.length}</strong>
          <span>{t("resources.evidence.summaryCandidate")}</span>
        </article>
        <article>
          <strong>{roomCount}</strong>
          <span>{t("resources.evidence.summaryRoom")}</span>
        </article>
        <article>
          <strong>{personalCount}</strong>
          <span>{t("resources.evidence.summaryPersonal")}</span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.resourceList} aria-label={t("resources.evidence.listAria")}>
          {resolvedRelated.map((resource) => {
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
                        {resource.visibility === "ROOM_SHARED" ? t("resources.evidence.scopeRoom") : t("resources.evidence.scopePersonal")}
                      </Chip>
                      <h3>{resource.title}</h3>
                    </div>
                    <StatusBadge tone={resource.score >= 85 ? "approved" : "pending"}>{t(reasonCopyKey[resource.reason])}</StatusBadge>
                  </div>
                  <p>{resource.summary}</p>
                  <div className={styles.metaRow}>
                    <span>{resource.updatedLabel}</span>
                    <ProgressBar label={t("resources.evidence.relevance")} value={resource.score} />
                  </div>
                  <Button
                    icon={<Link2 size={15} />}
                    onClick={() => onOpenResource?.(resource.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("resources.evidence.openResource")}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className={styles.policyPanel} aria-label={t("resources.evidence.policyAria")}>
          <div className={styles.policyHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.evidence.policyTitle")}</h3>
              <p>{t("resources.evidence.policyDesc")}</p>
            </div>
          </div>

          <ol className={styles.policyList}>
            <li>
              <span>1</span>
              <div>
                <strong>{t("resources.evidence.step1Title")}</strong>
                <p>{t("resources.evidence.step1Desc")}</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>{t("resources.evidence.step2Title")}</strong>
                <p>{t("resources.evidence.step2Desc")}</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>{t("resources.evidence.step3Title")}</strong>
                <p>{t("resources.evidence.step3Desc")}</p>
              </div>
            </li>
          </ol>

          <div className={styles.flowFooter}>
            <span>{t("resources.evidence.flowPermission")}</span>
            <ArrowRight size={16} />
            <span>{t("resources.evidence.flowRelated")}</span>
            <ArrowRight size={16} />
            <span>{t("resources.evidence.flowAgent")}</span>
          </div>

          <div className={styles.agentNote}>
            <Bot size={17} strokeWidth={2.1} />
            <p>{t("resources.evidence.agentNote")}</p>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
