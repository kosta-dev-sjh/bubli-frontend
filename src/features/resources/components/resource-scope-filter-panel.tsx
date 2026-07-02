"use client";

import { CheckCircle2, FileText, FolderOpen, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-scope-filter-panel.module.css";

type ResourceScope = "all" | "personal" | "room" | "review" | "related";
type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";
type ResourceState = "ready" | "analyzing" | "needsReview";

type ScopeOption = {
  count: number;
  description: string;
  label: string;
  scope: ResourceScope;
};

type ScopedResource = {
  detail: string;
  id: string;
  state: ResourceState;
  title: string;
  visibility: ResourceVisibility;
};

export type ResourceScopeFilterPanelProps = HTMLAttributes<HTMLElement> & {
  activeScope?: ResourceScope;
  resources: ScopedResource[];
  scopes: ScopeOption[];
  title?: string;
};

const scopeMeta: Record<ResourceScope, { icon: typeof FolderOpen; tone: StatusTone }> = {
  all: { icon: FolderOpen, tone: "neutral" },
  personal: { icon: LockKeyhole, tone: "personal" },
  related: { icon: Search, tone: "agent" },
  review: { icon: CheckCircle2, tone: "pending" },
  room: { icon: FileText, tone: "room" },
};

const visibilityMeta: Record<ResourceVisibility, { labelKey: MessageKey; tone: StatusTone }> = {
  PERSONAL: { labelKey: "resources.scope.visibilityPersonal", tone: "personal" },
  ROOM_SHARED: { labelKey: "resources.scope.visibilityRoom", tone: "room" },
};

const stateMeta: Record<ResourceState, { labelKey: MessageKey; tone: StatusTone }> = {
  analyzing: { labelKey: "resources.scope.stateAnalyzing", tone: "agent" },
  needsReview: { labelKey: "resources.scope.stateNeedsReview", tone: "pending" },
  ready: { labelKey: "resources.scope.stateReady", tone: "success" },
};

// Exported fixtures store message keys in label/description/detail/title; the panel resolves them via t().
export const defaultResourceScopes: ScopeOption[] = [
  {
    count: 32,
    description: "resources.scope.optAllDesc",
    label: "resources.scope.optAllLabel",
    scope: "all",
  },
  {
    count: 9,
    description: "resources.scope.optPersonalDesc",
    label: "resources.scope.optPersonalLabel",
    scope: "personal",
  },
  {
    count: 18,
    description: "resources.scope.optRoomDesc",
    label: "resources.scope.optRoomLabel",
    scope: "room",
  },
  {
    count: 3,
    description: "resources.scope.optReviewDesc",
    label: "resources.scope.optReviewLabel",
    scope: "review",
  },
  {
    count: 5,
    description: "resources.scope.optRelatedDesc",
    label: "resources.scope.optRelatedLabel",
    scope: "related",
  },
];

export const defaultScopedResources: ScopedResource[] = [
  {
    detail: "resources.scope.res1Detail",
    id: "resource-1",
    state: "needsReview",
    title: "resources.scope.res1Title",
    visibility: "ROOM_SHARED",
  },
  {
    detail: "resources.scope.res2Detail",
    id: "resource-2",
    state: "analyzing",
    title: "resources.scope.res2Title",
    visibility: "ROOM_SHARED",
  },
  {
    detail: "resources.scope.res3Detail",
    id: "resource-3",
    state: "ready",
    title: "resources.scope.res3Title",
    visibility: "PERSONAL",
  },
  {
    detail: "resources.scope.res4Detail",
    id: "resource-4",
    state: "ready",
    title: "resources.scope.res4Title",
    visibility: "PERSONAL",
  },
];

export function ResourceScopeFilterPanel({
  activeScope = "room",
  className,
  resources,
  scopes,
  title,
  ...props
}: ResourceScopeFilterPanelProps) {
  const { t } = useI18n();
  const active = scopes.find((scope) => scope.scope === activeScope) ?? scopes[0];
  const activeMeta = scopeMeta[active.scope];
  const ActiveIcon = activeMeta.icon;
  const selectedResource = resources[0];
  const selectedVisibility = visibilityMeta[selectedResource.visibility];
  const panelTitle = title ?? t("resources.scope.defaultTitle");

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderOpen size={16} strokeWidth={2.1} />}>{t("resources.scope.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{panelTitle}</h2>
            <p className={styles.description}>
              {t("resources.scope.description")}
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.scope.currentScope")}</span>
          <strong>{t(active.label as MessageKey)}</strong>
          <StatusBadge tone={activeMeta.tone}>{t("resources.scope.countUnit", { count: active.count })}</StatusBadge>
        </div>
      </header>

      <section className={styles.scopeTabs} aria-label={t("resources.scope.tabsAria")}>
        {scopes.map((scope) => {
          const meta = scopeMeta[scope.scope];
          const Icon = meta.icon;
          const selected = scope.scope === activeScope;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.scopeTab, selected && styles.selected)}
              key={scope.scope}
              type="button"
            >
              <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
              <span>{t(scope.label as MessageKey)}</span>
              <b>{scope.count}</b>
            </button>
          );
        })}
      </section>

      <section className={styles.boardGrid} aria-label={t("resources.scope.previewAria")}>
        <article className={styles.resourceList}>
          <div className={styles.searchBar}>
            <Search size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>{t("resources.scope.searchPlaceholder")}</span>
          </div>
          <div className={styles.listHeader}>
            <div>
              <strong>{t(active.label as MessageKey)}</strong>
              <p>{t(active.description as MessageKey)}</p>
            </div>
            <StatusBadge tone={activeMeta.tone}>{t("resources.scope.countUnit", { count: active.count })}</StatusBadge>
          </div>
          <div className={styles.fileStack}>
            {resources.map((resource, index) => {
              const visibility = visibilityMeta[resource.visibility];
              const state = stateMeta[resource.state];

              return (
                <button className={cn(styles.fileRow, index === 0 && styles.activeFile)} key={resource.id} type="button">
                  <span className={styles.fileIcon}>
                    <FileText size={16} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <span className={styles.fileCopy}>
                    <b>{t(resource.title as MessageKey)}</b>
                    <span>{t(resource.detail as MessageKey)}</span>
                  </span>
                  <StatusBadge tone={visibility.tone}>{t(visibility.labelKey)}</StatusBadge>
                  <StatusBadge tone={state.tone}>{t(state.labelKey)}</StatusBadge>
                </button>
              );
            })}
          </div>
        </article>

        <aside className={styles.detailPanel} aria-label={t("resources.scope.detailAria")}>
          <div className={styles.detailHeader}>
            <span className={styles.detailIcon}>
              <ActiveIcon size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{t(selectedResource.title as MessageKey)}</strong>
              <p>{t(selectedResource.detail as MessageKey)}</p>
            </div>
          </div>
          <div className={styles.detailCard}>
            <b>{t("resources.scope.permissionScope")}</b>
            <span>{t(selectedVisibility.labelKey)}</span>
          </div>
          <div className={styles.detailCard}>
            <b>{t("resources.scope.reviewItemLabel")}</b>
            <span>{t("resources.scope.reviewItemValue")}</span>
          </div>
          <div className={styles.detailCard}>
            <b>{t("resources.scope.relatedLabel")}</b>
            <span>{t("resources.scope.relatedValue")}</span>
          </div>
          <div className={styles.shareNotice}>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <p>{t("resources.scope.shareNotice")}</p>
          </div>
        </aside>
      </section>

      <section className={styles.policyGrid} aria-label={t("resources.scope.policyAria")}>
        <article>
          <LockKeyhole size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.scope.policyPersonalTitle")}</strong>
            <p>{t("resources.scope.policyPersonalDesc")}</p>
          </div>
        </article>
        <article>
          <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.scope.policyRoomTitle")}</strong>
            <p>{t("resources.scope.policyRoomDesc")}</p>
          </div>
        </article>
        <article>
          <Sparkles size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.scope.policyRelatedTitle")}</strong>
            <p>{t("resources.scope.policyRelatedDesc")}</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("resources.scope.searchInScope")}
        </Button>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("resources.scope.checkShareApproval")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
