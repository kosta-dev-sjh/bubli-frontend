import { CheckCircle2, FileText, FolderOpen, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
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

const visibilityMeta: Record<ResourceVisibility, { label: string; tone: StatusTone }> = {
  PERSONAL: { label: "개인 자료", tone: "personal" },
  ROOM_SHARED: { label: "프로젝트룸 자료", tone: "room" },
};

const stateMeta: Record<ResourceState, { label: string; tone: StatusTone }> = {
  analyzing: { label: "분석 중", tone: "agent" },
  needsReview: { label: "확인 필요", tone: "pending" },
  ready: { label: "열람 가능", tone: "success" },
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
    detail: "프로젝트룸 자료 · 어제 업로드 · 작업 조건 확인",
    id: "resource-2",
    state: "analyzing",
    title: "업무기준문서_v2.pdf",
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
  title = "자료보드 범위 필터",
  ...props
}: ResourceScopeFilterPanelProps) {
  const active = scopes.find((scope) => scope.scope === activeScope) ?? scopes[0];
  const activeMeta = scopeMeta[active.scope];
  const ActiveIcon = activeMeta.icon;
  const selectedResource = resources[0];
  const selectedVisibility = visibilityMeta[selectedResource.visibility];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderOpen size={16} strokeWidth={2.1} />}>자료보드 안의 범위</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              범위 필터는 따로 떨어진 메뉴가 아니라 자료보드 안의 탭입니다. 개인 자료, 프로젝트룸 자료, 확인할
              항목을 같은 작업 화면에서 전환하되, 개인 자료는 사용자가 직접 공유하기 전까지 프로젝트룸 멤버와
              프로젝트룸 에이전트에게 보이지 않습니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>현재 범위</span>
          <strong>{active.label}</strong>
          <StatusBadge tone={activeMeta.tone}>{active.count}건</StatusBadge>
        </div>
      </header>

      <section className={styles.scopeTabs} aria-label="자료보드 범위 필터">
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

      <section className={styles.boardGrid} aria-label="자료보드 범위 필터 미리보기">
        <article className={styles.resourceList}>
          <div className={styles.searchBar}>
            <Search size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>업무 기준 문서 관련 회의록 찾아줘</span>
          </div>
          <div className={styles.listHeader}>
            <div>
              <strong>{active.label}</strong>
              <p>{active.description}</p>
            </div>
            <StatusBadge tone={activeMeta.tone}>{active.count}건</StatusBadge>
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
                  <StatusBadge tone={visibility.tone}>{visibility.label}</StatusBadge>
                  <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                </button>
              );
            })}
          </div>
        </article>

        <aside className={styles.detailPanel} aria-label="자료 상세 권한 안내">
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
            <b>권한 범위</b>
            <span>{selectedVisibility.label}</span>
          </div>
          <div className={styles.detailCard}>
            <b>확인할 항목</b>
            <span>마감일과 수정 범위를 비교해 검토합니다.</span>
          </div>
          <div className={styles.detailCard}>
            <b>관련 자료</b>
            <span>같은 권한 범위의 회의록과 요구사항 문서를 우선 표시합니다.</span>
          </div>
          <div className={styles.shareNotice}>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <p>개인 자료는 공유 버튼을 눌러 승인한 뒤에만 프로젝트룸 자료로 보입니다.</p>
          </div>
        </aside>
      </section>

      <section className={styles.policyGrid} aria-label="범위 필터 정책">
        <article>
          <LockKeyhole size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>개인 자료</strong>
            <p>올린 본인만 보고, 공유 전까지 프로젝트룸 에이전트가 읽지 않습니다.</p>
          </div>
        </article>
        <article>
          <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>프로젝트룸 자료</strong>
            <p>프로젝트룸 멤버 권한을 확인한 뒤 목록, 댓글, 버전, 분석 결과를 보여줍니다.</p>
          </div>
        </article>
        <article>
          <Sparkles size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>관련 자료</strong>
            <p>검색과 추천은 같은 권한 범위 안에서만 실행합니다.</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          범위 안에서 검색
        </Button>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          공유 승인 확인
        </Button>
      </footer>
    </GlassPanel>
  );
}
