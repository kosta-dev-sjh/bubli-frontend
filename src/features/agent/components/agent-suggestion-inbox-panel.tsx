"use client";

import {
  AlertCircle,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CirclePause,
  FileQuestion,
  GitBranch,
  Inbox,
  ListTodo,
  PencilLine,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type AgentSuggestionInboxState = "ready" | "empty" | "loading" | "error";
export type AgentSuggestionKind = "REQUIREMENT" | "WBS" | "TODO" | "QUESTION" | "SCHEDULE";
export type AgentInboxSuggestionStatus = "DRAFT" | "EDITED" | "HELD" | "APPROVED";

export type AgentSuggestionInboxItem = {
  confidence: number;
  description: string;
  dueLabel?: string;
  id: string;
  kind: AgentSuggestionKind;
  projectRoomName: string;
  sourceLabel: string;
  status: AgentInboxSuggestionStatus;
  title: string;
};

export type AgentSuggestionInboxPanelProps = HTMLAttributes<HTMLElement> & {
  items?: AgentSuggestionInboxItem[];
  state?: AgentSuggestionInboxState;
};

// 번역 대상 필드는 t() 키를 담고 렌더 시 번역한다(호출부 문자열/파일명은 t() 폴백으로 그대로 통과).
const defaultItems: AgentSuggestionInboxItem[] = [
  {
    confidence: 92,
    description: "agent.inbox.item1Desc",
    dueLabel: "agent.inbox.item1Due",
    id: "suggestion-wbs-scope",
    kind: "WBS",
    projectRoomName: "agent.inbox.item1Room",
    sourceLabel: "요구사항정의서_v1.3.pdf",
    status: "DRAFT",
    title: "agent.inbox.item1Title",
  },
  {
    confidence: 87,
    description: "agent.inbox.item2Desc",
    dueLabel: "agent.inbox.item2Due",
    id: "suggestion-question-due-date",
    kind: "QUESTION",
    projectRoomName: "agent.inbox.item2Room",
    sourceLabel: "agent.inbox.item2Source",
    status: "EDITED",
    title: "agent.inbox.item2Title",
  },
  {
    confidence: 83,
    description: "agent.inbox.item3Desc",
    dueLabel: "D-2",
    id: "suggestion-todo-review-table",
    kind: "TODO",
    projectRoomName: "agent.inbox.item3Room",
    sourceLabel: "회의록_0618.md",
    status: "HELD",
    title: "agent.inbox.item3Title",
  },
];

const kindMeta: Record<AgentSuggestionKind, { icon: typeof Bot; labelKey: MessageKey; tone: StatusTone }> = {
  QUESTION: { icon: FileQuestion, labelKey: "agent.inbox.kindQuestion", tone: "warning" },
  REQUIREMENT: { icon: Bot, labelKey: "agent.inbox.kindRequirement", tone: "agent" },
  SCHEDULE: { icon: CalendarClock, labelKey: "agent.inbox.kindSchedule", tone: "timer" },
  TODO: { icon: ListTodo, labelKey: "agent.inbox.kindTodo", tone: "todo" },
  WBS: { icon: GitBranch, labelKey: "agent.inbox.kindWbs", tone: "agent" },
};

const statusMeta: Record<AgentInboxSuggestionStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  APPROVED: { labelKey: "agent.inbox.statusApproved", tone: "approved" },
  DRAFT: { labelKey: "agent.inbox.statusDraft", tone: "pending" },
  EDITED: { labelKey: "agent.inbox.statusEdited", tone: "warning" },
  HELD: { labelKey: "agent.inbox.statusHeld", tone: "neutral" },
};

function SuggestionInboxStatePanel({ state, t }: { state: Exclude<AgentSuggestionInboxState, "ready">; t: TranslateFn }) {
  const stateCopy = {
    empty: {
      actionKey: "agent.inbox.emptyAction",
      descriptionKey: "agent.inbox.emptyDesc",
      icon: Inbox,
      titleKey: "agent.inbox.emptyTitle",
    },
    error: {
      actionKey: "agent.inbox.errorAction",
      descriptionKey: "agent.inbox.errorDesc",
      icon: AlertCircle,
      titleKey: "agent.inbox.errorTitle",
    },
    loading: {
      actionKey: "agent.inbox.loadingAction",
      descriptionKey: "agent.inbox.loadingDesc",
      icon: CircleDashed,
      titleKey: "agent.inbox.loadingTitle",
    },
  } satisfies Record<Exclude<AgentSuggestionInboxState, "ready">, {
    actionKey: MessageKey;
    descriptionKey: MessageKey;
    icon: typeof Inbox;
    titleKey: MessageKey;
  }>;

  const copy = stateCopy[state];
  const Icon = copy.icon;

  return (
    <GlassPanel className="agent-suggestion-inbox-state">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={20} strokeWidth={2.1} />
      </span>
      <div>
        <Chip selected={state === "loading"}>{state === "loading" ? t("agent.inbox.chipLoading") : state === "error" ? t("agent.inbox.chipError") : t("agent.inbox.chipEmpty")}</Chip>
        <h2>{t(copy.titleKey)}</h2>
        <p>{t(copy.descriptionKey)}</p>
      </div>
      <Button disabled={state === "loading"} icon={<RefreshCcw size={15} strokeWidth={2.1} />} variant={state === "error" ? "primary" : "quiet"}>
        {t(copy.actionKey)}
      </Button>
    </GlassPanel>
  );
}

function SuggestionRow({ item, t }: { item: AgentSuggestionInboxItem; t: TranslateFn }) {
  const kind = kindMeta[item.kind];
  const status = statusMeta[item.status];
  const Icon = kind.icon;
  const title = t(item.title as MessageKey);

  return (
    <article className="agent-suggestion-inbox-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={17} strokeWidth={2.1} />
      </span>
      <div className="agent-suggestion-inbox-row__body">
        <div className="agent-suggestion-inbox-row__top">
          <div>
            <div className="agent-suggestion-inbox-row__badges">
              <StatusBadge tone={kind.tone}>{t(kind.labelKey)}</StatusBadge>
              <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            </div>
            <h3>{title}</h3>
          </div>
          <Chip>{item.confidence}%</Chip>
        </div>
        <p>{t(item.description as MessageKey)}</p>
        <div className="agent-suggestion-inbox-row__meta">
          <span>{t(item.projectRoomName as MessageKey)}</span>
          <span>{t(item.sourceLabel as MessageKey)}</span>
          <span>{item.dueLabel ? t(item.dueLabel as MessageKey) : t("agent.inbox.noDue")}</span>
        </div>
        <ProgressBar label={t("agent.inbox.confidence", { title })} value={item.confidence} />
        <footer className="agent-suggestion-inbox-row__actions">
          <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            {t("agent.inbox.approve")}
          </Button>
          <Button icon={<PencilLine size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("agent.inbox.edit")}
          </Button>
          <Button icon={<CirclePause size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            {t("agent.inbox.hold")}
          </Button>
          <Button icon={<Trash2 size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            {t("agent.inbox.delete")}
          </Button>
        </footer>
      </div>
    </article>
  );
}

export function AgentSuggestionInboxPanel({
  className,
  items = defaultItems,
  state = "ready",
  ...props
}: AgentSuggestionInboxPanelProps) {
  const { t } = useI18n();
  const pendingCount = items.filter((item) => item.status === "DRAFT" || item.status === "EDITED").length;
  const approvedCount = items.filter((item) => item.status === "APPROVED").length;

  return (
    <section className={cn("agent-suggestion-inbox", className)} aria-label={t("agent.inbox.aria")} {...props}>
      {state === "ready" ? (
        <>
          <GlassPanel className="agent-suggestion-inbox__hero">
            <div>
              <Chip icon={<Inbox size={15} strokeWidth={2.1} />} selected>
                {t("agent.inbox.chip")}
              </Chip>
              <h2>{t("agent.inbox.heroTitle")}</h2>
              <p>{t("agent.inbox.heroDesc")}</p>
            </div>
            <div className="agent-suggestion-inbox__summary">
              <strong>{items.length}</strong>
              <span>{t("agent.inbox.total")}</span>
              <p>{t("agent.inbox.summaryStatus", { approved: approvedCount, pending: pendingCount })}</p>
            </div>
          </GlassPanel>

          <GlassPanel className="agent-suggestion-inbox__list">
            {items.map((item) => (
              <SuggestionRow item={item} key={item.id} t={t} />
            ))}
          </GlassPanel>
        </>
      ) : (
        <SuggestionInboxStatePanel state={state} t={t} />
      )}
    </section>
  );
}
