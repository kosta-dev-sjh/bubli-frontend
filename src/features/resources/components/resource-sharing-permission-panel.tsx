"use client";

import { ArrowRight, CheckCircle2, FileLock2, FolderOpen, History, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";

type ResourceScope = "personal" | "room";

type ResourceShareItem = {
  name: MessageKey;
  currentScope: ResourceScope;
  nextAction: MessageKey;
  status: "private" | "review" | "shared";
};

const shareItems: ResourceShareItem[] = [
  {
    currentScope: "personal",
    name: "resources.permission.itemPrivateName",
    nextAction: "resources.permission.itemPrivateAction",
    status: "private",
  },
  {
    currentScope: "personal",
    name: "resources.permission.itemReviewName",
    nextAction: "resources.permission.itemReviewAction",
    status: "review",
  },
  {
    currentScope: "room",
    name: "resources.permission.itemSharedName",
    nextAction: "resources.permission.itemSharedAction",
    status: "shared",
  },
];

const scopeLabel: Record<ResourceScope, MessageKey> = {
  personal: "resources.permission.scopePersonal",
  room: "resources.permission.scopeRoom",
};

const statusMeta: Record<ResourceShareItem["status"], { label: MessageKey; tone: "personal" | "pending" | "room" }> = {
  private: { label: "resources.permission.statusPrivate", tone: "personal" },
  review: { label: "resources.permission.statusReview", tone: "pending" },
  shared: { label: "resources.permission.statusShared", tone: "room" },
};

function ResourceShareRow({ item, t }: { item: ResourceShareItem; t: (key: MessageKey) => string }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-sharing-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileLock2 size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-sharing-row__meta">
          <StatusBadge tone={status.tone}>{t(status.label)}</StatusBadge>
          <span>{t(scopeLabel[item.currentScope])}</span>
        </div>
        <h3>{t(item.name)}</h3>
        <p>{t(item.nextAction)}</p>
      </div>
      <Button size="sm" variant={item.status === "review" ? "primary" : "quiet"}>
        {item.status === "review" ? t("resources.permission.actionApprove") : t("resources.permission.actionOpen")}
      </Button>
    </article>
  );
}

export function ResourceSharingPermissionPanel() {
  const { t } = useI18n();

  return (
    <section className="resource-sharing" aria-label={t("resources.permission.sectionAria")}>
      <GlassPanel className="resource-sharing__hero">
        <div className="resource-sharing__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderOpen size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("resources.permission.boardChip")}</Chip>
            <h2>{t("resources.permission.heroTitle")}</h2>
            <p>{t("resources.permission.heroDesc")}</p>
          </div>
        </div>
        <div className="resource-sharing__summary">
          <StatusBadge tone="personal">{t("resources.permission.summaryBadge")}</StatusBadge>
          <strong>{t("resources.permission.summaryStep")}</strong>
          <span>{t("resources.permission.summaryStepDesc")}</span>
          <ProgressBar label={t("resources.permission.progressLabel")} value={62} />
        </div>
      </GlassPanel>

      <div className="resource-sharing__grid">
        <GlassPanel className="resource-sharing__panel">
          <div className="resource-sharing__panel-header">
            <div>
              <h3>{t("resources.permission.candidateHeading")}</h3>
              <p>{t("resources.permission.candidateDesc")}</p>
            </div>
            <Chip icon={<UploadCloud size={14} />}>{t("resources.permission.scopeChip")}</Chip>
          </div>

          <div className="resource-sharing__list">
            {shareItems.map((item) => (
              <ResourceShareRow item={item} key={item.name} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-sharing__policy">
          <h3>{t("resources.permission.policyHeading")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.permission.policyPersonal")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.permission.policyRoom")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <History size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.permission.policyVersion")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.permission.policyAgent")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-sharing__flow">
        <Chip selected>{t("resources.permission.scopePersonal")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>{t("resources.permission.flowUserApproval")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip selected>{t("resources.permission.scopeRoom")}</Chip>
      </GlassPanel>
    </section>
  );
}
