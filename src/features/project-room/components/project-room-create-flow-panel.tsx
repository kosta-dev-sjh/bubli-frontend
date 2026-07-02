"use client";

import { ArrowRight, CalendarClock, CheckCircle2, FileText, FolderPlus, ListChecks, Sparkles, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type ResourceKind = "contract" | "estimate" | "requirement" | "minutes";
type CandidateTarget = "room" | "wbs" | "todo" | "schedule";

type UploadedResource = {
  name: string;
  kind: ResourceKind;
  status: "classified" | "analyzing" | "ready";
};

type CandidateItem = {
  labelKey: MessageKey;
  valueKey?: MessageKey;
  value?: string;
  target: CandidateTarget;
};

const kindLabelKey: Record<ResourceKind, MessageKey> = {
  contract: "room.create.kindContract",
  estimate: "room.create.kindEstimate",
  requirement: "room.create.kindRequirement",
  minutes: "room.create.kindMinutes",
};

const targetLabelKey: Record<CandidateTarget, MessageKey> = {
  room: "room.create.targetRoom",
  wbs: "room.create.targetWbs",
  todo: "room.create.targetTodo",
  schedule: "room.create.targetSchedule",
};

const uploadedResources: UploadedResource[] = [
  { kind: "contract", name: "업무기준문서_v2.pdf", status: "ready" },
  { kind: "estimate", name: "서비스_견적서_0622.pdf", status: "classified" },
  { kind: "requirement", name: "요구사항_정리본.docx", status: "analyzing" },
  { kind: "minutes", name: "회의록_0621.md", status: "ready" },
];

const candidates: CandidateItem[] = [
  { labelKey: "room.create.candProjectName", target: "room", valueKey: "room.create.candProjectNameValue" },
  { labelKey: "room.create.candDueDate", target: "schedule", value: "2026-07-15" },
  { labelKey: "room.create.candDeliverable", target: "wbs", valueKey: "room.create.candDeliverableValue" },
  { labelKey: "room.create.candReviewQuestion", target: "todo", valueKey: "room.create.candReviewQuestionValue" },
];

const statusMetaKey: Record<UploadedResource["status"], { labelKey: MessageKey; tone: "success" | "pending" | "agent" }> = {
  analyzing: { labelKey: "room.create.statusAnalyzing", tone: "agent" },
  classified: { labelKey: "room.create.statusClassified", tone: "pending" },
  ready: { labelKey: "room.create.statusReady", tone: "success" },
};

function ResourceRow({ resource }: { resource: UploadedResource }) {
  const { t } = useI18n();
  const status = statusMetaKey[resource.status];

  return (
    <article className="project-room-create-resource">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="project-room-create-resource__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(kindLabelKey[resource.kind])}</span>
        </div>
        <h3>{resource.name}</h3>
      </div>
    </article>
  );
}

function CandidateRow({ candidate }: { candidate: CandidateItem }) {
  const { t } = useI18n();
  return (
    <article className="project-room-create-candidate">
      <div>
        <StatusBadge tone="pending">{t("room.create.candidate")}</StatusBadge>
        <h3>{t(candidate.labelKey)}</h3>
        <p>{candidate.valueKey ? t(candidate.valueKey) : candidate.value}</p>
      </div>
      <ArrowRight size={16} strokeWidth={2.1} />
      <Chip selected>{t(targetLabelKey[candidate.target])}</Chip>
    </article>
  );
}

export function ProjectRoomCreateFlowPanel() {
  const { t } = useI18n();
  return (
    <section className="project-room-create" aria-label={t("room.create.sectionAria")}>
      <GlassPanel className="project-room-create__hero">
        <div className="project-room-create__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderPlus size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("room.create.heroChip")}</Chip>
            <h2>{t("room.create.heroHeading")}</h2>
            <p>{t("room.create.heroDescription")}</p>
          </div>
        </div>
        <div className="project-room-create__progress">
          <StatusBadge tone="agent">{t("room.create.progressBadge")}</StatusBadge>
          <strong>3/4</strong>
          <span>{t("room.create.progressStep")}</span>
          <ProgressBar label={t("room.create.progressLabel")} value={75} />
        </div>
      </GlassPanel>

      <div className="project-room-create__flow">
        <GlassPanel className="project-room-create__upload">
          <div className="project-room-create__panel-header">
            <div>
              <h3>{t("room.create.uploadedTitle")}</h3>
              <p>{t("room.create.uploadedSub")}</p>
            </div>
            <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
              {t("room.create.uploadButton")}
            </Button>
          </div>

          <div className="project-room-create__resource-list">
            {uploadedResources.map((resource) => (
              <ResourceRow key={resource.name} resource={resource} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="project-room-create__candidate-panel">
          <div className="project-room-create__panel-header">
            <div>
              <h3>{t("room.create.candidateTitle")}</h3>
              <p>{t("room.create.candidateSub")}</p>
            </div>
            <Chip icon={<Sparkles size={14} />}>{t("room.create.candidateChip")}</Chip>
          </div>

          <div className="project-room-create__candidate-list">
            {candidates.map((candidate) => (
              <CandidateRow candidate={candidate} key={`${candidate.labelKey}-${candidate.target}`} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="project-room-create__checks">
        <div>
          <span className="bubli-icon-tile" aria-hidden="true">
            <ListChecks size={16} strokeWidth={2.1} />
          </span>
          <p>{t("room.create.check1")}</p>
        </div>
        <div>
          <span className="bubli-icon-tile" aria-hidden="true">
            <CheckCircle2 size={16} strokeWidth={2.1} />
          </span>
          <p>{t("room.create.check2")}</p>
        </div>
        <div>
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarClock size={16} strokeWidth={2.1} />
          </span>
          <p>{t("room.create.check3")}</p>
        </div>
      </GlassPanel>
    </section>
  );
}
