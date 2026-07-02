"use client";

import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  ClipboardCheck,
  GitBranch,
  ListChecks,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type CandidateType = "wbs" | "todo" | "schedule" | "question";
type CandidateStatus = "pending" | "edited" | "held";

type Candidate = {
  assigneeKey: MessageKey;
  confidence: number;
  descriptionKey: MessageKey;
  dueLabelKey: MessageKey;
  sourceKey: MessageKey;
  status: CandidateStatus;
  titleKey: MessageKey;
  type: CandidateType;
};

const candidates: Candidate[] = [
  {
    assigneeKey: "agent.candidate.assigneeMe",
    confidence: 91,
    descriptionKey: "agent.candidate.desc1",
    dueLabelKey: "agent.candidate.due1",
    sourceKey: "agent.candidate.source1",
    status: "pending",
    titleKey: "agent.candidate.title1",
    type: "wbs",
  },
  {
    assigneeKey: "agent.candidate.assigneeMe",
    confidence: 87,
    descriptionKey: "agent.candidate.desc2",
    dueLabelKey: "agent.candidate.due2",
    sourceKey: "agent.candidate.source2",
    status: "edited",
    titleKey: "agent.candidate.title2",
    type: "question",
  },
  {
    assigneeKey: "agent.candidate.assigneeLeader",
    confidence: 78,
    descriptionKey: "agent.candidate.desc3",
    dueLabelKey: "agent.candidate.due3",
    sourceKey: "agent.candidate.source3",
    status: "held",
    titleKey: "agent.candidate.title3",
    type: "todo",
  },
];

const typeMeta: Record<CandidateType, { icon: typeof GitBranch; labelKey: MessageKey; tone: "agent" | "todo" | "timer" | "warning" }> = {
  question: { icon: ShieldCheck, labelKey: "agent.candidate.typeQuestion", tone: "warning" },
  schedule: { icon: CalendarClock, labelKey: "agent.candidate.typeSchedule", tone: "timer" },
  todo: { icon: ListChecks, labelKey: "agent.candidate.typeTodo", tone: "todo" },
  wbs: { icon: GitBranch, labelKey: "agent.candidate.typeWbs", tone: "agent" },
};

const statusMeta: Record<CandidateStatus, { labelKey: MessageKey; tone: "pending" | "warning" | "neutral" }> = {
  edited: { labelKey: "agent.candidate.statusEdited", tone: "warning" },
  held: { labelKey: "agent.candidate.statusHeld", tone: "neutral" },
  pending: { labelKey: "agent.candidate.statusPending", tone: "pending" },
};

function CandidateCard({ candidate, t }: { candidate: Candidate; t: TranslateFn }) {
  const type = typeMeta[candidate.type];
  const status = statusMeta[candidate.status];
  const Icon = type.icon;
  const title = t(candidate.titleKey);

  return (
    <article className="candidate-approval-card">
      <div className="candidate-approval-card__top">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className="candidate-approval-card__meta">
            <StatusBadge tone={type.tone}>{t(type.labelKey)}</StatusBadge>
            <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          </div>
          <h3>{title}</h3>
          <p>{t(candidate.sourceKey)}</p>
        </div>
      </div>
      <p>{t(candidate.descriptionKey)}</p>
      <div className="candidate-approval-card__chips">
        <Chip>{t(candidate.assigneeKey)}</Chip>
        <Chip>{t(candidate.dueLabelKey)}</Chip>
        <Chip>{t("agent.candidate.confidenceChip", { value: candidate.confidence })}</Chip>
      </div>
      <ProgressBar label={t("agent.candidate.confidence", { title })} value={candidate.confidence} />
      <footer>
        <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
          {t("agent.candidate.approve")}
        </Button>
        <Button icon={<PencilLine size={15} />} size="sm" variant="quiet">
          {t("agent.candidate.edit")}
        </Button>
        <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
          {t("agent.candidate.hold")}
        </Button>
      </footer>
    </article>
  );
}

export function CandidateApprovalPanel() {
  const { t } = useI18n();

  return (
    <section className="candidate-approval" aria-label={t("agent.candidate.aria")}>
      <GlassPanel className="candidate-approval__hero">
        <div>
          <Chip icon={<Bot size={14} />} selected>
            {t("agent.candidate.chip")}
          </Chip>
          <h2>{t("agent.candidate.heroTitle")}</h2>
          <p>{t("agent.candidate.heroDesc")}</p>
        </div>
        <div className="candidate-approval__summary">
          <StatusBadge tone="agent">{t("agent.candidate.summaryBadge")}</StatusBadge>
          <strong>{t("agent.candidate.summaryCount")}</strong>
          <span>{t("agent.candidate.summaryLabel")}</span>
          <ProgressBar label={t("agent.candidate.reviewProgress")} value={64} />
        </div>
      </GlassPanel>

      <div className="candidate-approval__flow">
        <span>{t("agent.candidate.flowDone")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("agent.candidate.flowList")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("agent.candidate.flowUser")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("agent.candidate.flowApply")}</span>
      </div>

      <div className="candidate-approval__grid">
        <GlassPanel className="candidate-approval__list">
          <div className="candidate-approval__section-title">
            <h3>{t("agent.candidate.listTitle")}</h3>
            <p>{t("agent.candidate.listDesc")}</p>
          </div>
          <div className="candidate-approval__items">
            {candidates.map((candidate) => (
              <CandidateCard candidate={candidate} key={candidate.titleKey} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="candidate-approval__rules">
          <h3>{t("agent.candidate.rulesTitle")}</h3>
          <div>
            <ClipboardCheck size={17} strokeWidth={2.1} />
            <p>{t("agent.candidate.ruleWbs")}</p>
          </div>
          <div>
            <ListChecks size={17} strokeWidth={2.1} />
            <p>{t("agent.candidate.ruleTodo")}</p>
          </div>
          <div>
            <CalendarClock size={17} strokeWidth={2.1} />
            <p>{t("agent.candidate.ruleSchedule")}</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("agent.candidate.ruleBoundary")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
