"use client";

import { CheckCircle2, Database, FileSearch, FolderOpen, HardDrive, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type LocalFileEventStatus = "suggested" | "approved" | "queued" | "synced";

type LocalFileEvent = {
  fileName: string;
  folderName: string;
  modifiedAt: string;
  projectHint: string;
  status: LocalFileEventStatus;
  type: "new" | "changed" | "deleted";
};

const localEvents: LocalFileEvent[] = [
  {
    fileName: "업무기준문서_v3.pdf",
    folderName: "Bubli/업무 기준 문서 정리",
    modifiedAt: "방금 전",
    projectHint: "업무 기준 문서 정리",
    status: "suggested",
    type: "changed",
  },
  {
    fileName: "회의록_0622.md",
    folderName: "Bubli/웹사이트 리뉴얼",
    modifiedAt: "12분 전",
    projectHint: "웹사이트 리뉴얼",
    status: "approved",
    type: "new",
  },
  {
    fileName: "요구사항_정리.docx",
    folderName: "Bubli/브랜드 소개서",
    modifiedAt: "35분 전",
    projectHint: "브랜드 소개서",
    status: "queued",
    type: "changed",
  },
  {
    fileName: "이전_견적서.xlsx",
    folderName: "Bubli/정기 운영 업무",
    modifiedAt: "1시간 전",
    projectHint: "정기 운영 업무",
    status: "synced",
    type: "deleted",
  },
];

const statusMeta: Record<LocalFileEventStatus, { labelKey: MessageKey; tone: "pending" | "approved" | "warning" | "success" }> = {
  approved: { labelKey: "folder.status.approved", tone: "approved" },
  queued: { labelKey: "folder.status.queued", tone: "warning" },
  suggested: { labelKey: "folder.status.needsApproval", tone: "pending" },
  synced: { labelKey: "folder.status.syncDone", tone: "success" },
};

const eventTypeCopy: Record<LocalFileEvent["type"], MessageKey> = {
  changed: "folder.sync.eventChanged",
  deleted: "folder.sync.eventDeleted",
  new: "folder.sync.eventNew",
};

function LocalFileEventRow({ event, t }: { event: LocalFileEvent; t: TranslateFn }) {
  const status = statusMeta[event.status];

  return (
    <article className="managed-folder-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileSearch size={17} strokeWidth={2.1} />
      </span>
      <div className="managed-folder-row__body">
        <div className="managed-folder-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(eventTypeCopy[event.type])}</span>
          <span>{event.modifiedAt}</span>
        </div>
        <h3>{event.fileName}</h3>
        <p>{event.folderName}</p>
        <footer>
          <Chip icon={<FolderOpen size={14} />}>{event.projectHint}</Chip>
          {event.status === "suggested" ? (
            <Button icon={<CheckCircle2 size={14} />} size="sm" variant="primary">
              {t("folder.sync.approveServerApply")}
            </Button>
          ) : null}
        </footer>
      </div>
    </article>
  );
}

export function ManagedFolderSyncPanel() {
  const { t } = useI18n();

  return (
    <section className="managed-folder-sync" aria-label={t("folder.sync.aria")}>
      <GlassPanel className="managed-folder-sync__hero">
        <div className="managed-folder-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderOpen size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("folder.sync.chip")}</Chip>
            <h2>{t("folder.sync.heroTitle")}</h2>
            <p>{t("folder.sync.heroDesc")}</p>
          </div>
        </div>
        <div className="managed-folder-sync__summary">
          <strong>342</strong>
          <span>{t("folder.sync.summaryLabel")}</span>
          <ProgressBar label={t("folder.sync.storageLabel")} value={68} />
        </div>
      </GlassPanel>

      <div className="managed-folder-sync__grid">
        <GlassPanel className="managed-folder-sync__panel">
          <div className="managed-folder-sync__toolbar">
            <h3>{t("folder.sync.detectedTitle")}</h3>
            <div>
              <Button icon={<RefreshCw size={15} />} size="sm" variant="quiet">
                {t("folder.sync.rescan")}
              </Button>
              <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
                {t("folder.sync.applyApproved")}
              </Button>
            </div>
          </div>
          <div className="managed-folder-sync__list">
            {localEvents.map((event) => (
              <LocalFileEventRow event={event} key={`${event.folderName}-${event.fileName}`} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="managed-folder-sync__policy">
          <h3>{t("folder.sync.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <HardDrive size={16} strokeWidth={2.1} />
            </span>
            <p>{t("folder.sync.policyStore")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("folder.sync.policyApproval")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>{t("folder.sync.policyRetry")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
