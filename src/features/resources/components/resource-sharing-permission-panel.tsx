"use client";

import { ArrowRight, CheckCircle2, FileLock2, FolderOpen, History, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type ResourceShareItem = {
  nameKey: MessageKey;
  currentScopeKey: MessageKey;
  nextActionKey: MessageKey;
  status: "private" | "review" | "shared";
};

const shareItems: ResourceShareItem[] = [
  {
    currentScopeKey: "resources.share2.scopePersonal",
    nameKey: "resources.share2.itemPrivateName",
    nextActionKey: "resources.share2.itemPrivateNext",
    status: "private",
  },
  {
    currentScopeKey: "resources.share2.scopePersonal",
    nameKey: "resources.share2.itemReviewName",
    nextActionKey: "resources.share2.itemReviewNext",
    status: "review",
  },
  {
    currentScopeKey: "resources.share2.scopeRoom",
    nameKey: "resources.share2.itemSharedName",
    nextActionKey: "resources.share2.itemSharedNext",
    status: "shared",
  },
];

const statusMeta: Record<ResourceShareItem["status"], { labelKey: MessageKey; tone: "personal" | "pending" | "room" }> = {
  private: { labelKey: "resources.share2.statusPrivate", tone: "personal" },
  review: { labelKey: "resources.share2.statusReview", tone: "pending" },
  shared: { labelKey: "resources.share2.statusShared", tone: "room" },
};

function ResourceShareRow({ item }: { item: ResourceShareItem }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];

  return (
    <article className="resource-sharing-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileLock2 size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-sharing-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(item.currentScopeKey)}</span>
        </div>
        <h3>{t(item.nameKey)}</h3>
        <p>{t(item.nextActionKey)}</p>
      </div>
      <Button size="sm" variant={item.status === "review" ? "primary" : "quiet"}>
        {item.status === "review" ? t("resources.share2.rowApprove") : t("resources.share2.rowOpen")}
      </Button>
    </article>
  );
}

export function ResourceSharingPermissionPanel() {
  const { t } = useI18n();
  return (
    <section className="resource-sharing" aria-label={t("resources.share2.permAria")}>
      <GlassPanel className="resource-sharing__hero">
        <div className="resource-sharing__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderOpen size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("resources.share2.permChip")}</Chip>
            <h2>{t("resources.share2.permHeroTitle")}</h2>
            <p>{t("resources.share2.permHeroDesc")}</p>
          </div>
        </div>
        <div className="resource-sharing__summary">
          <StatusBadge tone="personal">{t("resources.share2.permBadge")}</StatusBadge>
          <strong>{t("resources.share2.permStep2")}</strong>
          <span>{t("resources.share2.permReviewThenShare")}</span>
          <ProgressBar label={t("resources.share2.permProgressLabel")} value={62} />
        </div>
      </GlassPanel>

      <div className="resource-sharing__grid">
        <GlassPanel className="resource-sharing__panel">
          <div className="resource-sharing__panel-header">
            <div>
              <h3>{t("resources.share2.permCandidateTitle")}</h3>
              <p>{t("resources.share2.permCandidateDesc")}</p>
            </div>
            <Chip icon={<UploadCloud size={14} />}>{t("resources.share2.permScopeChip")}</Chip>
          </div>

          <div className="resource-sharing__list">
            {shareItems.map((item) => (
              <ResourceShareRow item={item} key={item.nameKey} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-sharing__policy">
          <h3>{t("resources.share2.permPolicyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.share2.permPolicyPersonal")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.share2.permPolicyRoom")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <History size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.share2.permPolicyVersion")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.share2.permPolicyAgent")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-sharing__flow">
        <Chip selected>{t("resources.share2.permFlowPersonal")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>{t("resources.share2.permFlowApproval")}</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip selected>{t("resources.share2.permFlowRoom")}</Chip>
      </GlassPanel>
    </section>
  );
}
