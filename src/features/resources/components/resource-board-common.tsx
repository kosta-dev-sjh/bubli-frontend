"use client";

import { Download, FileText, Grid3X3, List, Search } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { ResourceResponse, ResourceStatus, ResourceSummaryStatus } from "@/types/api/resource";

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

      <div className="resource-workspace__view-toggle" aria-label="보기 방식">
        <button className={cn(viewMode === "grid" && "is-active")} onClick={() => onViewMode("grid")} title="격자 보기" type="button">
          <Grid3X3 aria-hidden size={16} strokeWidth={2} />
        </button>
        <button className={cn(viewMode === "list" && "is-active")} onClick={() => onViewMode("list")} title="목록 보기" type="button">
          <List aria-hidden size={16} strokeWidth={2} />
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

  return (
    <button
      aria-pressed={selected}
      className={cn("resource-workspace__item", mode === "list" && "resource-workspace__item--list")}
      onClick={onSelect}
      type="button"
    >
      <span className="resource-workspace__file-icon" aria-hidden="true">
        <FileText size={19} strokeWidth={2} />
      </span>
      <span className="resource-workspace__item-main">
        <b>{resource.title}</b>
        <span>
          {formatDate(resource.updatedAt)}
          {size ? ` / ${size}` : ""}
        </span>
      </span>
      <StatusBadge tone={toneForStatus(resource.status)}>{visibleStatus}</StatusBadge>
    </button>
  );
}

export function ResourcePreview({
  resource,
  emptyHint,
  scope = "room",
  onError,
}: {
  resource: ResourceResponse | null;
  emptyHint: string;
  scope?: ResourceBoardScope;
  onError?: (message: string) => void;
}) {
  const visibleStatus = resource
    ? scope === "personal"
      ? personalStatusCopy[resource.status] ?? statusCopy[resource.status]
      : statusCopy[resource.status]
    : "선택 전";

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

  return (
    <aside className="resource-workspace__preview" aria-label="자료 미리보기">
      <div className="resource-workspace__scope-head">
        <span>미리보기</span>
        <strong>{visibleStatus}</strong>
      </div>
      {resource ? (
        <>
          <div className="resource-workspace__preview-window">
            <div className="resource-workspace__preview-top">
              <span />
              <span />
              <span />
            </div>
            <div className="resource-workspace__preview-page">
              <span>{resource.visibility === "PERSONAL" ? "개인 자료" : "프로젝트룸 자료"}</span>
              <h2>{resource.title}</h2>
              <p>{resource.currentVersion?.originalName ?? resource.title}</p>
              <div>
                <i />
                <i />
                <i />
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
              <span>범위</span>
              <b>{resource.visibility === "PERSONAL" ? "개인 자료" : "프로젝트룸"}</b>
            </div>
            <div>
              <span>정리</span>
              <b>{resource.summaryStatus ? summaryStatusCopy[resource.summaryStatus] : visibleStatus}</b>
            </div>
          </div>

          <div className="resource-workspace__preview-actions">
            <Button onClick={handleDownload} variant="primary">
              <Download aria-hidden size={16} strokeWidth={2} />
              다운로드
            </Button>
          </div>
        </>
      ) : (
        <GlassPanel className="resource-workspace__local-preview">
          <FileText aria-hidden size={24} strokeWidth={2} />
          <div>
            <h2>미리보기</h2>
            <p>{emptyHint}</p>
          </div>
        </GlassPanel>
      )}
    </aside>
  );
}
