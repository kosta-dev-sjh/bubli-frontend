"use client";

import { Clock3, FileClock, FileText, Link2, MessageSquareText, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";

type VersionItem = {
  version: string;
  title: string;
  updatedAt: string;
  status: "current" | "previous" | "review";
  note: string;
};

const versions: VersionItem[] = [
  {
    note: "검수 기준 문구가 추가됨",
    status: "current",
    title: "번역계약서_최종본_v2.1.pdf",
    updatedAt: "오늘 14:32",
    version: "v2.1",
  },
  {
    note: "납품일 표현이 회의록과 달라 확인 필요",
    status: "review",
    title: "번역계약서_최종본_v2.pdf",
    updatedAt: "어제 18:10",
    version: "v2.0",
  },
  {
    note: "초안 보관",
    status: "previous",
    title: "번역계약서_초안.pdf",
    updatedAt: "6월 18일 09:20",
    version: "v1.0",
  },
];

const statusMeta: Record<VersionItem["status"], { label: MessageKey; tone: "success" | "pending" | "neutral" }> = {
  current: { label: "resources.versionHistory.status.current", tone: "success" },
  previous: { label: "resources.versionHistory.status.previous", tone: "neutral" },
  review: { label: "resources.versionHistory.status.review", tone: "pending" },
};

function VersionRow({ item, t }: { item: VersionItem; t: (key: MessageKey) => string }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-version-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileClock size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-version-row__meta">
          <StatusBadge tone={status.tone}>{t(status.label)}</StatusBadge>
          <span>{item.version}</span>
          <span>{item.updatedAt}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.note}</p>
      </div>
      <Button size="sm" variant="quiet">
        {t("resources.versionHistory.rowView")}
      </Button>
    </article>
  );
}

export function ResourceVersionHistoryPanel() {
  const { t } = useI18n();

  return (
    <section className="resource-version" aria-label={t("resources.versionHistory.sectionAria")}>
      <GlassPanel className="resource-version__hero">
        <div>
          <Chip icon={<FileText size={14} />} selected>
            {t("resources.versionHistory.chip")}
          </Chip>
          <h2>{t("resources.versionHistory.title")}</h2>
          <p>{t("resources.versionHistory.description")}</p>
        </div>
        <div className="resource-version__summary">
          <StatusBadge tone="room">{t("resources.versionHistory.summaryBadge")}</StatusBadge>
          <strong>3</strong>
          <span>{t("resources.versionHistory.summaryCaption")}</span>
          <ProgressBar label={t("resources.versionHistory.progressLabel")} value={66} />
        </div>
      </GlassPanel>

      <div className="resource-version__grid">
        <GlassPanel className="resource-version__list">
          <div className="resource-version__list-top">
            <div>
              <h3>{t("resources.versionHistory.listHeading")}</h3>
              <p>{t("resources.versionHistory.listDesc")}</p>
            </div>
            <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
              {t("resources.versionHistory.uploadNew")}
            </Button>
          </div>
          <div className="resource-version__items">
            {versions.map((item) => (
              <VersionRow item={item} key={`${item.version}-${item.title}`} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-version__side">
          <h3>{t("resources.versionHistory.contextHeading")}</h3>
          <div>
            <MessageSquareText size={17} strokeWidth={2.1} />
            <p>{t("resources.versionHistory.contextComment")}</p>
          </div>
          <div>
            <Link2 size={17} strokeWidth={2.1} />
            <p>{t("resources.versionHistory.contextRelated")}</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("resources.versionHistory.contextPermission")}</p>
          </div>
          <div>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>{t("resources.versionHistory.contextPrevious")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-version__comment">
        <Clock3 size={18} strokeWidth={2.1} />
        <p>{t("resources.versionHistory.commentSample")}</p>
        <Chip>{t("resources.versionHistory.commentCount")}</Chip>
      </GlassPanel>
    </section>
  );
}
