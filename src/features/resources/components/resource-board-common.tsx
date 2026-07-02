"use client";

import { Download, FileImage, FileText, FileType, Grid3X3, HardDrive, List, Presentation, Search, Sheet, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ResourceResponse, ResourceStatus, ResourceSummaryStatus } from "@/types/api/resource";

import styles from "./resource-board-polish.module.css";

export type ViewMode = "grid" | "list";
export type ResourceBoardScope = "personal" | "room";

export const statusCopyKey: Record<ResourceStatus, MessageKey> = {
  ANALYZED: "resources.status.ANALYZED",
  ANALYZING: "resources.status.ANALYZING",
  ARCHIVED: "resources.status.ARCHIVED",
  FAILED: "resources.status.FAILED",
  READY: "resources.status.READY",
  UPLOADED: "resources.status.UPLOADED",
  UPLOADING: "resources.status.UPLOADING",
};

export const summaryStatusCopyKey: Record<ResourceSummaryStatus, MessageKey> = {
  FAILED: "resources.status.summary.FAILED",
  NONE: "resources.status.summary.NONE",
  PENDING: "resources.status.summary.PENDING",
  SUCCEEDED: "resources.status.summary.SUCCEEDED",
};

const personalStatusCopyKey: Partial<Record<ResourceStatus, MessageKey>> = {
  UPLOADED: "resources.status.personalUPLOADED",
  UPLOADING: "resources.status.personalUPLOADING",
};

function resolveVisibleStatusKey(scope: ResourceBoardScope, status: ResourceStatus): MessageKey {
  if (scope === "personal") {
    return personalStatusCopyKey[status] ?? statusCopyKey[status];
  }
  return statusCopyKey[status];
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401) {
    return "AUTH_REQUIRED";
  }

  if (error instanceof Error && error.message !== "Failed to fetch") {
    return error.message;
  }

  return "LOAD_ERROR";
}

/** getErrorMessage가 반환한 값을 사용자에게 보여줄 문구로 변환한다. */
export function resolveErrorMessage(message: string, t: (key: MessageKey) => string) {
  if (message === "LOAD_ERROR") {
    return t("resources.board.loadError");
  }
  return message;
}

export function formatDate(value: string | null | undefined, t: (key: MessageKey) => string) {
  if (!value) {
    return t("resources.board.dateUnknown");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("resources.board.dateUnknown");
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatSize(value?: number | null) {
  if (!value) {
    return null;
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))}KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

export const SUPPORTED_RESOURCE_UPLOAD_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".tsv",
  ".txt",
  ".md",
  ".markdown",
  ".hwp",
  ".hwpx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
].join(",");

type ResourcePreviewKind = "document" | "hwp" | "image" | "markdown" | "pdf" | "sheet" | "slide" | "text" | "word";

function getResourcePreviewKind(resource: ResourceResponse): ResourcePreviewKind {
  const mimeType = resource.currentVersion?.mimeType?.toLowerCase() ?? "";
  const fileName = `${resource.currentVersion?.originalName ?? ""} ${resource.title}`.toLowerCase();

  if (mimeType.includes("pdf") || /\.pdf$/.test(fileName)) {
    return "pdf";
  }

  if (mimeType.includes("hwp") || /\.(hwp|hwpx)$/.test(fileName)) {
    return "hwp";
  }

  if (
    mimeType.includes("word") ||
    mimeType.includes("msword") ||
    mimeType.includes("officedocument.wordprocessingml") ||
    /\.(doc|docx)$/.test(fileName)
  ) {
    return "word";
  }

  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || /\.(ppt|pptx)$/.test(fileName)) {
    return "slide";
  }

  if (mimeType.includes("markdown") || /\.(md|markdown)$/.test(fileName)) {
    return "markdown";
  }

  if (mimeType.includes("text") || /\.txt$/.test(fileName)) {
    return "text";
  }

  if (mimeType.includes("image") || /\.(png|jpe?g|webp|gif|svg)$/.test(fileName)) {
    return "image";
  }

  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || /\.(csv|xlsx?|tsv)$/.test(fileName)) {
    return "sheet";
  }

  return "document";
}

function getKindLabel(kind: ResourcePreviewKind, t: (key: MessageKey) => string) {
  if (kind === "image") {
    return t("resources.board.kind.image");
  }

  if (kind === "word") {
    return "DOC";
  }

  if (kind === "slide") {
    return "PPT";
  }

  if (kind === "sheet") {
    return t("resources.board.kind.sheet");
  }

  if (kind === "pdf") {
    return "PDF";
  }

  if (kind === "markdown") {
    return "MD";
  }

  if (kind === "text") {
    return "TXT";
  }

  if (kind === "hwp") {
    return "HWP";
  }

  return t("resources.board.kind.document");
}

function ResourceKindIcon({ kind, size, strokeWidth }: { kind: ResourcePreviewKind; size: number; strokeWidth: number }) {
  if (kind === "image") {
    return <FileImage aria-hidden size={size} strokeWidth={strokeWidth} />;
  }

  if (kind === "sheet") {
    return <Sheet aria-hidden size={size} strokeWidth={strokeWidth} />;
  }

  if (kind === "slide") {
    return <Presentation aria-hidden size={size} strokeWidth={strokeWidth} />;
  }

  if (kind === "markdown" || kind === "text") {
    return <FileType aria-hidden size={size} strokeWidth={strokeWidth} />;
  }

  return <FileText aria-hidden size={size} strokeWidth={strokeWidth} />;
}

export function ResourceScopeSwitch({
  activeScope,
  roomHref,
  roomLabel,
}: {
  activeScope: ResourceBoardScope;
  roomHref: string;
  roomLabel?: string;
}) {
  const { t } = useI18n();
  const resolvedRoomLabel = roomLabel ?? t("resources.board.scope.room");
  const scopes = [
    {
      description: t("resources.board.scope.personalDesc"),
      href: "/app/resources",
      icon: HardDrive,
      id: "personal" as const,
      title: t("resources.board.scope.personal"),
    },
    {
      description: t("resources.board.scope.roomDesc"),
      href: roomHref,
      icon: UsersRound,
      id: "room" as const,
      title: resolvedRoomLabel,
    },
  ];

  return (
    <div className={styles.scopeSwitch} aria-label={t("resources.board.scopeSwitchAria")}>
      {scopes.map((scope) => {
        const Icon = scope.icon;

        return (
          <Link
            key={scope.id}
            aria-current={activeScope === scope.id ? "page" : undefined}
            className={cn(activeScope === scope.id && styles.activeScope)}
            href={scope.href}
          >
            <Icon aria-hidden size={14} strokeWidth={2} />
            <span>
              <strong>{scope.title}</strong>
              <b>{scope.description}</b>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function toneForStatus(status: ResourceStatus) {
  if (status === "FAILED") {
    return "warning";
  }

  if (status === "ANALYZED") {
    return "success";
  }

  if (status === "ANALYZING") {
    return "agent";
  }

  return "neutral";
}

export function ResourceToolbar({
  query,
  viewMode,
  onQuery,
  onViewMode,
}: {
  query: string;
  viewMode: ViewMode;
  onQuery: (value: string) => void;
  onViewMode: (mode: ViewMode) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="resource-workspace__toolbar">
      <div className="resource-workspace__search">
        <Search aria-hidden size={17} strokeWidth={2} />
        <input aria-label={t("resources.board.searchAria")} onChange={(event) => onQuery(event.target.value)} placeholder={t("resources.board.searchPlaceholder")} value={query} />
      </div>

      <div className={styles.viewToggle} aria-label={t("resources.board.viewAria")}>
        <button className={cn(viewMode === "grid" && "is-active")} onClick={() => onViewMode("grid")} title={t("resources.board.viewGrid")} type="button">
          <Grid3X3 aria-hidden size={16} strokeWidth={2} />
          <span>{t("resources.board.viewGridLabel")}</span>
        </button>
        <button className={cn(viewMode === "list" && "is-active")} onClick={() => onViewMode("list")} title={t("resources.board.viewList")} type="button">
          <List aria-hidden size={16} strokeWidth={2} />
          <span>{t("resources.board.viewListLabel")}</span>
        </button>
      </div>
    </div>
  );
}

export function ResourceTile({
  mode,
  resource,
  scope = "room",
  selected,
  onSelect,
}: {
  mode: ViewMode;
  resource: ResourceResponse;
  scope?: ResourceBoardScope;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const size = formatSize(resource.currentVersion?.sizeBytes);
  const visibleStatus = t(resolveVisibleStatusKey(scope, resource.status));
  const previewKind = getResourcePreviewKind(resource);
  const kindLabel = getKindLabel(previewKind, t);

  return (
    <button
      aria-pressed={selected}
      className={cn("resource-workspace__item", styles.fileItem, mode === "list" && "resource-workspace__item--list", mode === "list" && styles.fileItemList)}
      onClick={onSelect}
      title={resource.title}
      type="button"
    >
      <span className={cn("resource-workspace__file-icon", styles.fileGlyph, styles[`fileGlyph${previewKind[0].toUpperCase()}${previewKind.slice(1)}`])} aria-hidden="true">
        <ResourceKindIcon kind={previewKind} size={19} strokeWidth={2} />
        <em>{kindLabel}</em>
      </span>
      <span className="resource-workspace__item-main">
        <b>{resource.title}</b>
        <span>
          {kindLabel} · {formatDate(resource.updatedAt, t)}
          {size ? ` / ${size}` : ""}
        </span>
      </span>
      <StatusBadge tone={toneForStatus(resource.status)}>{visibleStatus}</StatusBadge>
    </button>
  );
}

export function ResourcePreview({
  resource,
  scope = "room",
  onClose,
  onError,
}: {
  resource: ResourceResponse | null;
  emptyHint?: string;
  scope?: ResourceBoardScope;
  onClose?: () => void;
  onError?: (message: string) => void;
}) {
  const { t } = useI18n();
  const handleDownload = useCallback(async () => {
    if (!resource) {
      return;
    }

    try {
      const response = await resourcesApi.getDownloadUrl(resource.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError?.(resolveErrorMessage(getErrorMessage(error), t));
    }
  }, [onError, resource, t]);

  if (!resource) {
    return null;
  }

  const visibleStatus = t(resolveVisibleStatusKey(scope, resource.status));
  const previewKind = getResourcePreviewKind(resource);
  const previewLabel = getKindLabel(previewKind, t);
  const size = formatSize(resource.currentVersion?.sizeBytes);
  const originalName = resource.currentVersion?.originalName ?? resource.title;
  const versionLabel = resource.currentVersion ? `v${resource.currentVersion.versionNo}` : "v1";
  const summaryLabel = resource.summaryStatus ? t(summaryStatusCopyKey[resource.summaryStatus]) : visibleStatus;

  return (
    <aside className={cn("resource-workspace__preview", styles.previewPanel)} aria-label={t("resources.board.previewAria")}>
      <div className={styles.previewTitle}>
        <div>
          <span>{t("resources.board.previewDetail")}</span>
          <strong>{visibleStatus}</strong>
        </div>
        <button aria-label={t("resources.board.previewClose")} className={styles.closePreview} onClick={onClose} type="button">
          <X aria-hidden size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="resource-workspace__preview-window">
        <div className={styles.previewChrome}>
          <span>{previewLabel}</span>
          <strong>{versionLabel}</strong>
        </div>
        <div className={cn("resource-workspace__preview-page", styles.previewPage)}>
          <div className={styles.previewHeader}>
            <span className={cn(styles.previewFileIcon, styles[`fileGlyph${previewKind[0].toUpperCase()}${previewKind.slice(1)}`])}>
              <ResourceKindIcon kind={previewKind} size={20} strokeWidth={1.9} />
            </span>
            <div>
              <span>{resource.visibility === "PERSONAL" ? t("resources.board.previewIndexPersonal") : t("resources.board.previewIndexRoom")}</span>
              <h2>{resource.title}</h2>
              <p>{originalName}</p>
            </div>
          </div>

          <dl className={styles.fileFacts}>
            <div>
              <dt>{t("resources.board.factKind")}</dt>
              <dd>{previewLabel}</dd>
            </div>
            <div>
              <dt>{t("resources.board.factOriginal")}</dt>
              <dd>{originalName}</dd>
            </div>
            <div>
              <dt>{t("resources.board.factSummary")}</dt>
              <dd>{summaryLabel}</dd>
            </div>
            <div>
              <dt>{t("resources.board.factVersion")}</dt>
              <dd>{versionLabel}</dd>
            </div>
          </dl>

          <div className={cn(styles.previewBody, styles[`previewBody${previewKind[0].toUpperCase()}${previewKind.slice(1)}`])}>
            <strong>{t("resources.board.previewInfo", { kind: previewLabel })}</strong>
            <span>{resource.visibility === "PERSONAL" ? t("resources.board.previewBodyPersonal") : t("resources.board.previewBodyRoom")}</span>
          </div>
        </div>
      </div>

      <div className="resource-workspace__preview-meta">
        <div>
          <span>{t("resources.board.metaStatus")}</span>
          <StatusBadge tone={toneForStatus(resource.status)}>{visibleStatus}</StatusBadge>
        </div>
        <div>
          <span>{t("resources.board.metaUpdated")}</span>
          <b>{formatDate(resource.updatedAt, t)}</b>
        </div>
        <div>
          <span>{t("resources.board.metaLocation")}</span>
          <b>{resource.visibility === "PERSONAL" ? t("resources.board.metaLocationPersonal") : t("resources.board.metaLocationRoom")}</b>
        </div>
        <div>
          <span>{t("resources.board.metaFile")}</span>
          <b>{size ?? previewLabel}</b>
        </div>
      </div>

      <div className="resource-workspace__preview-actions">
        <Button onClick={handleDownload} variant="primary">
          <Download aria-hidden size={16} strokeWidth={2} />
          {t("resources.board.download")}
        </Button>
      </div>
    </aside>
  );
}
