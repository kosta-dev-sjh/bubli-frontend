"use client";

import { Download, FileImage, FileText, FileType, Grid3X3, HardDrive, List, Presentation, Search, Sheet, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { ResourceResponse, ResourceStatus, ResourceSummaryStatus } from "@/types/api/resource";

import styles from "./resource-board-polish.module.css";

export type ViewMode = "grid" | "list";
export type ResourceBoardScope = "personal" | "room";

export const statusCopy: Record<ResourceStatus, string> = {
  ANALYZED: "정리됨",
  ANALYZING: "정리 중",
  ARCHIVED: "보관됨",
  FAILED: "확인 필요",
  READY: "준비됨",
  UPLOADED: "업로드됨",
  UPLOADING: "업로드 중",
};

export const summaryStatusCopy: Record<ResourceSummaryStatus, string> = {
  FAILED: "확인 필요",
  NONE: "정리 전",
  PENDING: "정리 중",
  SUCCEEDED: "완료",
};

const personalStatusCopy: Partial<Record<ResourceStatus, string>> = {
  UPLOADED: "동기화됨",
  UPLOADING: "동기화 중",
};

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401) {
    return "AUTH_REQUIRED";
  }

  if (error instanceof Error && error.message !== "Failed to fetch") {
    return error.message;
  }

  return "자료를 불러오지 못했습니다";
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "날짜 미정";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "날짜 미정";
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

function getKindLabel(kind: ResourcePreviewKind) {
  if (kind === "image") {
    return "이미지";
  }

  if (kind === "word") {
    return "DOC";
  }

  if (kind === "slide") {
    return "PPT";
  }

  if (kind === "sheet") {
    return "표";
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

  return "문서";
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
  roomLabel = "프로젝트룸",
}: {
  activeScope: ResourceBoardScope;
  roomHref: string;
  roomLabel?: string;
}) {
  const scopes = [
    {
      description: "로컬 폴더",
      href: "/app/resources",
      icon: HardDrive,
      id: "personal" as const,
      title: "개인",
    },
    {
      description: "공용 자료",
      href: roomHref,
      icon: UsersRound,
      id: "room" as const,
      title: roomLabel,
    },
  ];

  return (
    <div className={styles.scopeSwitch} aria-label="자료보드 범위 전환">
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
  return (
    <div className="resource-workspace__toolbar">
      <div className="resource-workspace__search">
        <Search aria-hidden size={17} strokeWidth={2} />
        <input aria-label="자료 검색" onChange={(event) => onQuery(event.target.value)} placeholder="파일명, 상태로 찾기" value={query} />
      </div>

      <div className={styles.viewToggle} aria-label="보기 방식">
        <button className={cn(viewMode === "grid" && "is-active")} onClick={() => onViewMode("grid")} title="격자 보기" type="button">
          <Grid3X3 aria-hidden size={16} strokeWidth={2} />
          <span>객체</span>
        </button>
        <button className={cn(viewMode === "list" && "is-active")} onClick={() => onViewMode("list")} title="목록 보기" type="button">
          <List aria-hidden size={16} strokeWidth={2} />
          <span>목록</span>
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
  const size = formatSize(resource.currentVersion?.sizeBytes);
  const visibleStatus = scope === "personal" ? personalStatusCopy[resource.status] ?? statusCopy[resource.status] : statusCopy[resource.status];
  const previewKind = getResourcePreviewKind(resource);
  const kindLabel = getKindLabel(previewKind);

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
          {kindLabel} · {formatDate(resource.updatedAt)}
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
  const handleDownload = useCallback(async () => {
    if (!resource) {
      return;
    }

    try {
      const response = await resourcesApi.getDownloadUrl(resource.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError?.(getErrorMessage(error));
    }
  }, [onError, resource]);

  if (!resource) {
    return null;
  }

  const visibleStatus = resource
    ? scope === "personal"
      ? personalStatusCopy[resource.status] ?? statusCopy[resource.status]
      : statusCopy[resource.status]
    : "선택 전";
  const previewKind = getResourcePreviewKind(resource);
  const previewLabel = getKindLabel(previewKind);
  const size = formatSize(resource.currentVersion?.sizeBytes);
  const originalName = resource.currentVersion?.originalName ?? resource.title;
  const versionLabel = resource.currentVersion ? `v${resource.currentVersion.versionNo}` : "v1";
  const summaryLabel = resource.summaryStatus ? summaryStatusCopy[resource.summaryStatus] : visibleStatus;

  return (
    <aside className={cn("resource-workspace__preview", styles.previewPanel)} aria-label="자료 미리보기">
      <div className={styles.previewTitle}>
        <div>
          <span>상세 정보</span>
          <strong>{visibleStatus}</strong>
        </div>
        <button aria-label="미리보기 닫기" className={styles.closePreview} onClick={onClose} type="button">
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
              <span>{resource.visibility === "PERSONAL" ? "개인 색인" : "프로젝트룸 공용"}</span>
              <h2>{resource.title}</h2>
              <p>{originalName}</p>
            </div>
          </div>

          <dl className={styles.fileFacts}>
            <div>
              <dt>파일 형식</dt>
              <dd>{previewLabel}</dd>
            </div>
            <div>
              <dt>원본</dt>
              <dd>{originalName}</dd>
            </div>
            <div>
              <dt>정리 상태</dt>
              <dd>{summaryLabel}</dd>
            </div>
            <div>
              <dt>버전</dt>
              <dd>{versionLabel}</dd>
            </div>
          </dl>

          <div className={cn(styles.previewBody, styles[`previewBody${previewKind[0].toUpperCase()}${previewKind.slice(1)}`])}>
            <strong>{previewLabel} 정보</strong>
            <span>{resource.visibility === "PERSONAL" ? "내 로컬 폴더에서 색인된 개인 자료입니다." : "현재 프로젝트룸 멤버가 함께 확인하는 공용 자료입니다."}</span>
          </div>
        </div>
      </div>

      <div className="resource-workspace__preview-meta">
        <div>
          <span>상태</span>
          <StatusBadge tone={toneForStatus(resource.status)}>{visibleStatus}</StatusBadge>
        </div>
        <div>
          <span>최근 수정</span>
          <b>{formatDate(resource.updatedAt)}</b>
        </div>
        <div>
          <span>위치</span>
          <b>{resource.visibility === "PERSONAL" ? "개인 자료" : "프로젝트룸 자료"}</b>
        </div>
        <div>
          <span>파일</span>
          <b>{size ?? previewLabel}</b>
        </div>
      </div>

      <div className="resource-workspace__preview-actions">
        <Button onClick={handleDownload} variant="primary">
          <Download aria-hidden size={16} strokeWidth={2} />
          다운로드
        </Button>
      </div>
    </aside>
  );
}
