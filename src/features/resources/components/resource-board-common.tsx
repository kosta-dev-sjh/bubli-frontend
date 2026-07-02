"use client";

import {
  Download,
  FileImage,
  FileText,
  FileType,
  Grid3X3,
  HardDrive,
  List,
  MessageSquareText,
  Pencil,
  Presentation,
  Search,
  Sheet,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type {
  ResourceCommentResponse,
  ResourceResponse,
  ResourceStatus,
  ResourceSummaryResponse,
  ResourceSummaryStatus,
  ResourceVersionResponse,
} from "@/types/api/resource";

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

function extractSummaryText(summary?: ResourceSummaryResponse | null) {
  if (!summary?.summaryJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(summary.summaryJson) as Record<string, unknown>;
    const preferredValue = parsed.summary ?? parsed.description ?? parsed.title ?? parsed.raw;

    if (typeof preferredValue === "string" && preferredValue.trim()) {
      return preferredValue.trim();
    }
  } catch {
    const matched = summary.summaryJson.match(/(?:summary|description|title)=([^,}]+)/i);
    if (matched?.[1]?.trim()) {
      return matched[1].trim();
    }
  }

  return summary.summaryJson;
}

function sortComments(comments: ResourceCommentResponse[]) {
  return [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
  const [detailResource, setDetailResource] = useState<ResourceResponse | null>(resource);
  const [summary, setSummary] = useState<ResourceSummaryResponse | null>(null);
  const [versions, setVersions] = useState<ResourceVersionResponse[]>([]);
  const [comments, setComments] = useState<ResourceCommentResponse[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!resource) {
        setDetailResource(null);
        setSummary(null);
        setVersions([]);
        setComments([]);
        setDetailError(null);
        setCommentBody("");
        setEditingCommentId(null);
        setEditingCommentBody("");
        setCommentError(null);
        return;
      }

      setDetailResource(resource);
      setSummary(null);
      setVersions([]);
      setComments([]);
      setDetailLoading(true);
      setDetailError(null);
      setCommentError(null);
      setEditingCommentId(null);
      setEditingCommentBody("");

      Promise.allSettled([
        resourcesApi.get(resource.id),
        resourcesApi.getSummary(resource.id),
        resourcesApi.getVersions(resource.id),
        resourcesApi.getComments(resource.id),
      ]).then(([resourceResult, summaryResult, versionsResult, commentsResult]) => {
        if (cancelled) {
          return;
        }

        if (resourceResult.status === "fulfilled") {
          setDetailResource(resourceResult.value);
        }

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value);
        }

        if (versionsResult.status === "fulfilled") {
          setVersions(versionsResult.value.items);
        }

        if (commentsResult.status === "fulfilled") {
          setComments(sortComments(commentsResult.value.items));
        }

        const failed = [resourceResult, summaryResult, versionsResult, commentsResult].find((result) => result.status === "rejected");
        setDetailError(failed?.status === "rejected" ? getErrorMessage(failed.reason) : null);
        setDetailLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [resource]);

  const activeResource = detailResource?.id === resource?.id ? detailResource : resource;
  const summaryText = useMemo(() => extractSummaryText(summary), [summary]);
  const latestVersion = versions[0] ?? activeResource?.currentVersion ?? null;

  const handleDownload = useCallback(async () => {
    if (!activeResource) {
      return;
    }

    try {
      const response = await resourcesApi.getDownloadUrl(activeResource.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError?.(getErrorMessage(error));
    }
  }, [activeResource, onError]);

  const handleCreateComment = useCallback(async () => {
    const body = commentBody.trim();
    if (!activeResource || !body) {
      return;
    }

    setCommentBusyId("new");
    setCommentError(null);

    try {
      const comment = await resourcesApi.createComment(activeResource.id, { body });
      setComments((current) => sortComments([...current, comment]));
      setCommentBody("");
    } catch (error) {
      setCommentError(getErrorMessage(error));
    } finally {
      setCommentBusyId(null);
    }
  }, [activeResource, commentBody]);

  const startEditComment = useCallback((comment: ResourceCommentResponse) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
    setCommentError(null);
  }, []);

  const handleUpdateComment = useCallback(
    async (commentId: string) => {
      const body = editingCommentBody.trim();
      if (!body) {
        return;
      }

      setCommentBusyId(commentId);
      setCommentError(null);

      try {
        const updated = await resourcesApi.updateComment(commentId, { body });
        setComments((current) => sortComments(current.map((comment) => (comment.id === commentId ? updated : comment))));
        setEditingCommentId(null);
        setEditingCommentBody("");
      } catch (error) {
        setCommentError(getErrorMessage(error));
      } finally {
        setCommentBusyId(null);
      }
    },
    [editingCommentBody],
  );

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setCommentBusyId(commentId);
    setCommentError(null);

    try {
      await resourcesApi.deleteComment(commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentBody("");
      }
    } catch (error) {
      setCommentError(getErrorMessage(error));
    } finally {
      setCommentBusyId(null);
    }
  }, [editingCommentId]);

  if (!activeResource) {
    return null;
  }

  const visibleStatus = activeResource
    ? scope === "personal"
      ? personalStatusCopy[activeResource.status] ?? statusCopy[activeResource.status]
      : statusCopy[activeResource.status]
    : "선택 전";
  const previewKind = getResourcePreviewKind(activeResource);
  const previewLabel = getKindLabel(previewKind);
  const size = formatSize(latestVersion?.sizeBytes);
  const originalName = latestVersion?.originalName ?? activeResource.title;
  const versionLabel = latestVersion ? `v${latestVersion.versionNo}` : "v1";
  const summaryLabel = summary?.status ? summaryStatusCopy[summary.status] : activeResource.summaryStatus ? summaryStatusCopy[activeResource.summaryStatus] : visibleStatus;

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
              <span>{activeResource.visibility === "PERSONAL" ? "개인 색인" : "프로젝트룸 공용"}</span>
              <h2>{activeResource.title}</h2>
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
            <strong>{summaryText ? "요약" : `${previewLabel} 정보`}</strong>
            <span>
              {summaryText ??
                (activeResource.visibility === "PERSONAL"
                  ? "내 로컬 폴더에서 색인된 개인 자료입니다."
                  : "현재 프로젝트룸 멤버가 함께 확인하는 공용 자료입니다.")}
            </span>
          </div>

          <section className={styles.detailPanel} aria-label="자료 상세 API 상태">
            <div>
              <span>상세 조회</span>
              <strong>{detailLoading ? "불러오는 중" : detailError ? "일부 대기" : "연결됨"}</strong>
            </div>
            <div>
              <span>요약 모델</span>
              <strong>{summary?.modelName ?? summary?.promptVersion ?? "대기"}</strong>
            </div>
            <div>
              <span>댓글</span>
              <strong>{comments.length}개</strong>
            </div>
            <div>
              <span>버전</span>
              <strong>{versions.length || (activeResource.currentVersion ? 1 : 0)}개</strong>
            </div>
          </section>

          {detailError ? <p className={styles.previewError}>{detailError}</p> : null}
        </div>
      </div>

      <div className="resource-workspace__preview-meta">
        <div>
          <span>상태</span>
          <StatusBadge tone={toneForStatus(activeResource.status)}>{visibleStatus}</StatusBadge>
        </div>
        <div>
          <span>최근 수정</span>
          <b>{formatDate(activeResource.updatedAt)}</b>
        </div>
        <div>
          <span>위치</span>
          <b>{activeResource.visibility === "PERSONAL" ? "개인 자료" : "프로젝트룸 자료"}</b>
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

      <section className={styles.commentPanel} aria-label="자료 댓글">
        <div className={styles.commentPanelTitle}>
          <div>
            <span>댓글</span>
            <strong>{comments.length ? `${comments.length}개 연결됨` : "첫 댓글 대기"}</strong>
          </div>
          <MessageSquareText aria-hidden size={18} strokeWidth={2} />
        </div>

        <form
          className={styles.commentForm}
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateComment();
          }}
        >
          <textarea
            aria-label="자료 댓글 작성"
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="이 자료에 남길 확인 사항"
            rows={3}
            value={commentBody}
          />
          <Button disabled={!commentBody.trim() || commentBusyId === "new"} type="submit" variant="primary">
            등록
          </Button>
        </form>

        {commentError ? <p className={styles.previewError}>{commentError}</p> : null}

        <div className={styles.commentList}>
          {comments.length === 0 ? (
            <p className={styles.commentEmpty}>아직 등록된 댓글이 없습니다.</p>
          ) : (
            comments.map((comment) => (
              <article className={styles.commentItem} key={comment.id}>
                <div className={styles.commentHead}>
                  <div>
                    <span>{comment.authorId.slice(0, 8)}</span>
                    <strong>{formatDate(comment.updatedAt)}</strong>
                  </div>
                  <div className={styles.commentActions}>
                    <button aria-label="댓글 수정" onClick={() => startEditComment(comment)} type="button">
                      <Pencil aria-hidden size={14} strokeWidth={2} />
                    </button>
                    <button aria-label="댓글 삭제" disabled={commentBusyId === comment.id} onClick={() => void handleDeleteComment(comment.id)} type="button">
                      <Trash2 aria-hidden size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {editingCommentId === comment.id ? (
                  <form
                    className={styles.commentEditForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleUpdateComment(comment.id);
                    }}
                  >
                    <textarea
                      aria-label="자료 댓글 수정"
                      onChange={(event) => setEditingCommentBody(event.target.value)}
                      rows={3}
                      value={editingCommentBody}
                    />
                    <div>
                      <Button
                        disabled={!editingCommentBody.trim() || commentBusyId === comment.id}
                        type="submit"
                        variant="primary"
                      >
                        저장
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentBody("");
                        }}
                        type="button"
                        variant="ghost"
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p>{comment.body}</p>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
