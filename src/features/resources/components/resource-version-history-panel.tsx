"use client";

import { Clock3, FileClock, FileText, Link2, MessageSquareText, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type VersionItem = {
  version: string;
  titleKey: MessageKey;
  updatedAtKey: MessageKey;
  status: "current" | "previous" | "review";
  noteKey: MessageKey;
};

const versions: VersionItem[] = [
  {
    noteKey: "resources.version.rowCurrentNote",
    status: "current",
    titleKey: "resources.version.rowCurrentTitle",
    updatedAtKey: "resources.version.rowCurrentUpdated",
    version: "v2.1",
  },
  {
    noteKey: "resources.version.rowReviewNote",
    status: "review",
    titleKey: "resources.version.rowReviewTitle",
    updatedAtKey: "resources.version.rowReviewUpdated",
    version: "v2.0",
  },
  {
    noteKey: "resources.version.rowDraftNote",
    status: "previous",
    titleKey: "resources.version.rowDraftTitle",
    updatedAtKey: "resources.version.rowDraftUpdated",
    version: "v1.0",
  },
];

const statusMeta: Record<VersionItem["status"], { labelKey: MessageKey; tone: "success" | "pending" | "neutral" }> = {
  current: { labelKey: "resources.version.statusCurrent", tone: "success" },
  previous: { labelKey: "resources.version.statusPrevious", tone: "neutral" },
  review: { labelKey: "resources.version.statusReview", tone: "pending" },
};

function VersionRow({ item }: { item: VersionItem }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];

  return (
    <article className="resource-version-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileClock size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-version-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{item.version}</span>
          <span>{t(item.updatedAtKey)}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
        <p>{t(item.noteKey)}</p>
      </div>
      <Button size="sm" variant="quiet">
        {t("resources.version.historyView")}
      </Button>
    </article>
  );
}

export function ResourceVersionHistoryPanel() {
  const { t } = useI18n();
  return (
    <section className="resource-version" aria-label={t("resources.version.historyPanelAria")}>
      <GlassPanel className="resource-version__hero">
        <div>
          <Chip icon={<FileText size={14} />} selected>
            {t("resources.version.historyChip")}
          </Chip>
          <h2>{t("resources.version.historyHeroTitle")}</h2>
          <p>{t("resources.version.historyHeroDesc")}</p>
        </div>
        <div className="resource-version__summary">
          <StatusBadge tone="room">{t("resources.version.historyBadge")}</StatusBadge>
          <strong>3</strong>
          <span>{t("resources.version.historyStored")}</span>
          <ProgressBar label={t("resources.version.historyProgressLabel")} value={66} />
        </div>
      </GlassPanel>

      <div className="resource-version__grid">
        <GlassPanel className="resource-version__list">
          <div className="resource-version__list-top">
            <div>
              <h3>{t("resources.version.historyListTitle")}</h3>
              <p>{t("resources.version.historyListDesc")}</p>
            </div>
            <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
              {t("resources.version.historyUploadNew")}
            </Button>
          </div>
          <div className="resource-version__items">
            {versions.map((item) => (
              <VersionRow item={item} key={`${item.version}-${item.titleKey}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-version__side">
          <h3>{t("resources.version.contextTitle")}</h3>
          <div>
            <MessageSquareText size={17} strokeWidth={2.1} />
            <p>{t("resources.version.contextComment")}</p>
          </div>
          <div>
            <Link2 size={17} strokeWidth={2.1} />
            <p>{t("resources.version.contextRelated")}</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("resources.version.contextPermission")}</p>
          </div>
          <div>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>{t("resources.version.contextPrevious")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-version__comment">
        <Clock3 size={18} strokeWidth={2.1} />
        <p>{t("resources.version.commentQuote")}</p>
        <Chip>{t("resources.version.commentCount")}</Chip>
      </GlassPanel>
    </section>
  );
}
