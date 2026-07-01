"use client";

import { CheckCircle2, FileText, FolderOpen, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
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
  PERSONAL: { labelKey: "resources.scope.visibility.PERSONAL", tone: "personal" },
  ROOM_SHARED: { labelKey: "resources.scope.visibility.ROOM_SHARED", tone: "room" },
};

const stateMeta: Record<ResourceState, { labelKey: MessageKey; tone: StatusTone }> = {
  analyzing: { labelKey: "resources.scope.state.analyzing", tone: "agent" },
  needsReview: { labelKey: "resources.scope.state.needsReview", tone: "pending" },
  ready: { labelKey: "resources.scope.state.ready", tone: "success" },
};

export const defaultResourceScopes: ScopeOption[] = [
  {
    count: 32,
    description: "자료보드 안에서 접근 가능한 자료를 한 번에 봅니다.",
    label: "전체",
    scope: "all",
  },
  {
    count: 9,
    description: "사용자가 공유하기 전까지 본인에게만 보이는 자료입니다.",
    label: "개인 자료",
    scope: "personal",
  },
  {
    count: 18,
    description: "프로젝트룸 멤버 권한으로 함께 보는 자료입니다.",
    label: "프로젝트룸 자료",
    scope: "room",
  },
  {
    count: 3,
    description: "문서에서 빠지거나 서로 다른 값이 있어 사용자가 확인할 항목입니다.",
    label: "확인할 항목",
    scope: "review",
  },
  {
    count: 5,
    description: "같은 권한 범위 안에서 함께 볼 만한 관련 자료입니다.",
    label: "관련 자료",
    scope: "related",
  },
];

export const defaultScopedResources: ScopedResource[] = [
  {
    detail: "프로젝트룸 자료 · 오늘 10:04 · 버전 2",
    id: "resource-1",
    state: "needsReview",
    title: "회의록_0616.md",
    visibility: "ROOM_SHARED",
  },
  {
    detail: "프로젝트룸 자료 · 어제 업로드 · 계약 조건 확인",
    id: "resource-2",
    state: "analyzing",
    title: "번역계약서_v2.pdf",
    visibility: "ROOM_SHARED",
  },
  {
    detail: "개인 자료 · 오늘 11:18 · 공유 전",
    id: "resource-3",
    state: "ready",
    title: "자료보드_화면설계.md",
    visibility: "PERSONAL",
  },
  {
    detail: "개인 자료 · 관리 폴더에서 감지",
    id: "resource-4",
    state: "ready",
    title: "개인_아이디어_메모.txt",
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
  const resolvedTitle = title ?? t("resources.scope.defaultTitle");
  const active = scopes.find((scope) => scope.scope === activeScope) ?? scopes[0];
  const activeMeta = scopeMeta[active.scope];
  const ActiveIcon = activeMeta.icon;
  const selectedResource = resources[0];
  const selectedVisibility = visibilityMeta[selectedResource.visibility];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderOpen size={16} strokeWidth={2.1} />}>{t("resources.scope.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.scope.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.scope.currentLabel")}</span>
          <strong>{active.label}</strong>
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
              <span>{scope.label}</span>
              <b>{scope.count}</b>
            </button>
          );
        })}
      </section>

      <section className={styles.boardGrid} aria-label={t("resources.scope.previewAria")}>
        <article className={styles.resourceList}>
          <div className={styles.searchBar}>
            <Search size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>{t("resources.scope.searchDemo")}</span>
          </div>
          <div className={styles.listHeader}>
            <div>
              <strong>{active.label}</strong>
              <p>{active.description}</p>
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
                    <b>{resource.title}</b>
                    <span>{resource.detail}</span>
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
              <strong>{selectedResource.title}</strong>
              <p>{selectedResource.detail}</p>
            </div>
          </div>
          <div className={styles.detailCard}>
            <b>{t("resources.scope.detailPermission")}</b>
            <span>{t(selectedVisibility.labelKey)}</span>
          </div>
          <div className={styles.detailCard}>
            <b>{t("resources.scope.detailReview")}</b>
            <span>{t("resources.scope.detailReviewValue")}</span>
          </div>
          <div className={styles.detailCard}>
            <b>{t("resources.scope.detailRelated")}</b>
            <span>{t("resources.scope.detailRelatedValue")}</span>
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
          {t("resources.scope.footerSearch")}
        </Button>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("resources.scope.footerShare")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
