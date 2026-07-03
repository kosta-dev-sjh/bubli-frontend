"use client";

import {
  Download,
  FileImage,
  FileText,
  FileType,
  Grid3X3,
  HardDrive,
  Link2,
  List,
  MessageSquareText,
  Pencil,
  Presentation,
  ScanText,
  Search,
  Sheet,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentApi } from "@/features/agent/api/agentApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  AiDocumentResponse,
  AiDocumentStatus,
  ResourceCommentResponse,
  ResourceRelationResponse,
  ResourceResponse,
  ResourceStatus,
  ResourceSummaryResponse,
  ResourceSummaryStatus,
  ResourceVersionResponse,
} from "@/types/api/resource";

import styles from "./resource-board-polish.module.css";

export type ViewMode = "grid" | "list";
export type ResourceBoardScope = "personal" | "room";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const statusCopyKey: Record<ResourceStatus, MessageKey> = {
  ANALYZED: "resources.common.statusAnalyzed",
  ANALYZING: "resources.common.statusAnalyzing",
  ARCHIVED: "resources.common.statusArchived",
  FAILED: "resources.common.statusFailed",
  READY: "resources.common.statusReady",
  UPLOADED: "resources.common.statusUploaded",
  UPLOADING: "resources.common.statusUploading",
};

const summaryStatusCopyKey: Record<ResourceSummaryStatus, MessageKey> = {
  FAILED: "resources.common.summaryFailed",
  NONE: "resources.common.summaryNone",
  PENDING: "resources.common.summaryPending",
  SUCCEEDED: "resources.common.summarySucceeded",
};

const aiDocumentStatusCopyKey: Record<AiDocumentStatus, MessageKey> = {
  ANALYZED: "resources.common.aiDocStatusAnalyzed",
  ANALYZING: "resources.common.aiDocStatusAnalyzing",
  FAILED: "resources.common.aiDocStatusFailed",
  NONE: "resources.common.aiDocStatusNone",
  READY: "resources.common.aiDocStatusReady",
};

const personalStatusCopyKey: Partial<Record<ResourceStatus, MessageKey>> = {
  UPLOADED: "resources.common.personalUploaded",
  UPLOADING: "resources.common.personalUploading",
};

function statusLabel(t: TranslateFn, scope: ResourceBoardScope, status: ResourceStatus) {
  const personalKey = scope === "personal" ? personalStatusCopyKey[status] : undefined;
  return t(personalKey ?? statusCopyKey[status]);
}

// getErrorMessage returns the "AUTH_REQUIRED" sentinel or a raw error message.
// When t is provided, the generic fallback is localized; otherwise the sentinel/message passthrough is kept.
export function getErrorMessage(error: unknown, t?: TranslateFn) {
  if (error instanceof ApiClientError && error.status === 401) {
    return "AUTH_REQUIRED";
  }

  if (error instanceof Error && error.message !== "Failed to fetch") {
    return error.message;
  }

  return t ? t("resources.common.loadError") : "자료를 불러오지 못했습니다";
}

export function formatDate(value?: string | null, t?: TranslateFn) {
  const unknown = () => (t ? t("resources.common.dateUnknown") : "날짜 미정");
  if (!value) {
    return unknown();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return unknown();
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

function extractSummaryModelLabel(summary?: ResourceSummaryResponse | null) {
  if (summary?.modelName?.trim()) {
    return summary.modelName.trim();
  }
  if (summary?.promptVersion?.trim()) {
    return summary.promptVersion.trim();
  }
  if (!summary?.summaryJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(summary.summaryJson) as Record<string, unknown>;
    const analysis = parsed.analysis && typeof parsed.analysis === "object" ? (parsed.analysis as Record<string, unknown>) : null;
    const model = analysis?.model && typeof analysis.model === "object" ? (analysis.model as Record<string, unknown>) : null;
    const modelName = typeof model?.name === "string" ? model.name.trim() : "";
    const promptVersion = typeof model?.promptVersion === "string" ? model.promptVersion.trim() : "";

    return modelName || promptVersion || null;
  } catch {
    const matched = summary.summaryJson.match(/model=\{[^}]*name=([^,}]+)(?:,[^}]*promptVersion=([^,}]+))?/i);
    const modelName = matched?.[1]?.trim();
    const promptVersion = matched?.[2]?.trim();
    return modelName || promptVersion || null;
  }
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

function getKindLabel(kind: ResourcePreviewKind, t: TranslateFn) {
  if (kind === "image") {
    return t("resources.common.kindImage");
  }

  if (kind === "word") {
    return "DOC";
  }

  if (kind === "slide") {
    return "PPT";
  }

  if (kind === "sheet") {
    return t("resources.common.kindSheet");
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

  return t("resources.common.kindDocument");
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
  const scopes = [
    {
      description: t("resources.scope.personalDesc"),
      href: "/app/resources",
      icon: HardDrive,
      id: "personal" as const,
      title: t("resources.scope.personalTitle"),
    },
    {
      description: t("resources.scope.roomDesc"),
      href: roomHref,
      icon: UsersRound,
      id: "room" as const,
      title: roomLabel ?? t("resources.common.roomFallback"),
    },
  ];

  return (
    <div className={styles.scopeSwitch} aria-label={t("resources.scope.switchAria")}>
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
        <input aria-label={t("resources.common.searchAria")} onChange={(event) => onQuery(event.target.value)} placeholder={t("resources.common.searchPlaceholder")} value={query} />
      </div>

      <div className={styles.viewToggle} aria-label={t("resources.common.viewModeAria")}>
        <button className={cn(viewMode === "grid" && "is-active")} onClick={() => onViewMode("grid")} title={t("resources.common.viewGridTitle")} type="button">
          <Grid3X3 aria-hidden size={16} strokeWidth={2} />
          <span>{t("resources.common.viewGridLabel")}</span>
        </button>
        <button className={cn(viewMode === "list" && "is-active")} onClick={() => onViewMode("list")} title={t("resources.common.viewListTitle")} type="button">
          <List aria-hidden size={16} strokeWidth={2} />
          <span>{t("resources.common.viewListLabel")}</span>
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
  const visibleStatus = statusLabel(t, scope, resource.status);
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
  roomId,
  onClose,
  onDeleted,
  onError,
  onSelectRelated,
  onUpdated,
}: {
  resource: ResourceResponse | null;
  emptyHint?: string;
  roomId?: string;
  scope?: ResourceBoardScope;
  onClose?: () => void;
  onDeleted?: () => void;
  onError?: (message: string) => void;
  onSelectRelated?: (resource: ResourceResponse) => void;
  onUpdated?: () => void;
}) {
  const { t } = useI18n();
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
  const [deleteState, setDeleteState] = useState<{ kind: "idle" } | { kind: "deleting" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [analysisState, setAnalysisState] = useState<{ kind: "idle" } | { kind: "running" } | { jobId: string; kind: "started" } | { kind: "error"; message: string }>({
    kind: "idle",
  });
  const [questionState, setQuestionState] = useState<{ kind: "idle" } | { kind: "running" } | { jobId: string; kind: "started" } | { kind: "error"; message: string }>({
    kind: "idle",
  });
  const [draftState, setDraftState] = useState<{ kind: "idle" } | { kind: "running" } | { jobId: string; kind: "started" } | { kind: "error"; message: string }>({
    kind: "idle",
  });
  const [related, setRelated] = useState<ResourceRelationResponse[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameState, setRenameState] = useState<{ kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [versionState, setVersionState] = useState<
    { kind: "idle" } | { fileName: string; kind: "uploading" } | { kind: "success"; versionNo: number } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [aiDocState, setAiDocState] = useState<{ kind: "closed" } | { kind: "loading" } | { document: AiDocumentResponse; kind: "open" } | { kind: "error"; message: string }>({
    kind: "closed",
  });
  const versionInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!resource) {
        setDetailResource(null);
        setSummary(null);
        setVersions([]);
        setComments([]);
        setRelated([]);
        setDetailError(null);
        setCommentBody("");
        setEditingCommentId(null);
        setEditingCommentBody("");
        setCommentError(null);
        setDeleteState({ kind: "idle" });
        setAnalysisState({ kind: "idle" });
        setQuestionState({ kind: "idle" });
        setDraftState({ kind: "idle" });
        setRenameOpen(false);
        setRenameState({ kind: "idle" });
        setVersionState({ kind: "idle" });
        setAiDocState({ kind: "closed" });
        return;
      }

      setDetailResource(resource);
      setSummary(null);
      setVersions([]);
      setComments([]);
      setRelated([]);
      setDetailLoading(true);
      setDetailError(null);
      setCommentError(null);
      setDeleteState({ kind: "idle" });
      setAnalysisState({ kind: "idle" });
      setQuestionState({ kind: "idle" });
      setDraftState({ kind: "idle" });
      setEditingCommentId(null);
      setEditingCommentBody("");
      setRenameOpen(false);
      setRenameState({ kind: "idle" });
      setVersionState({ kind: "idle" });
      setAiDocState({ kind: "closed" });

      Promise.allSettled([
        resourcesApi.get(resource.id),
        resourcesApi.getSummary(resource.id),
        resourcesApi.getVersions(resource.id),
        resourcesApi.getComments(resource.id),
        resourcesApi.getRelated(resource.id),
      ]).then(([resourceResult, summaryResult, versionsResult, commentsResult, relatedResult]) => {
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

        setRelated(relatedResult.status === "fulfilled" ? relatedResult.value.items : []);

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
  const summaryModelLabel = useMemo(() => extractSummaryModelLabel(summary), [summary]);
  const latestVersion = versions[0] ?? activeResource?.currentVersion ?? null;

  const handleDownload = useCallback(async () => {
    if (!activeResource) {
      return;
    }

    try {
      const response = await resourcesApi.getDownloadUrl(activeResource.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError?.(getErrorMessage(error, t));
    }
  }, [activeResource, onError, t]);

  const handleRenameSubmit = useCallback(async () => {
    const title = renameValue.trim();
    if (!activeResource || !title || renameState.kind === "saving") {
      return;
    }

    if (title === activeResource.title) {
      setRenameOpen(false);
      setRenameState({ kind: "idle" });
      return;
    }

    setRenameState({ kind: "saving" });

    try {
      const updated = await resourcesApi.update(activeResource.id, { title });
      setDetailResource(updated);
      setRenameOpen(false);
      setRenameState({ kind: "idle" });
      onUpdated?.();
    } catch (error) {
      setRenameState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [activeResource, onUpdated, renameState.kind, renameValue, t]);

  const handleVersionFile = useCallback(
    async (file: File) => {
      if (!activeResource) {
        return;
      }

      setVersionState({ fileName: file.name, kind: "uploading" });

      try {
        const body = new FormData();
        body.append("file", file);
        const version = await resourcesApi.uploadVersion(activeResource.id, body);
        setVersionState({ kind: "success", versionNo: version.versionNo });

        const [detailResult, versionsResult] = await Promise.allSettled([resourcesApi.get(activeResource.id), resourcesApi.getVersions(activeResource.id)]);
        if (detailResult.status === "fulfilled") {
          setDetailResource(detailResult.value);
        }
        if (versionsResult.status === "fulfilled") {
          setVersions(versionsResult.value.items);
        }
        onUpdated?.();
      } catch (error) {
        // 백엔드 POST /api/resources/{id}/versions 는 JSON 메타데이터(storageKey 등)만 받고
        // multipart 파일 업로드는 아직 지원하지 않는다 — 계약 밖 요청 거절(415/405/400,
        // 혹은 비-JSON 오류 응답 파싱 실패)은 사용자에게 이해 가능한 안내로 바꿔 보여준다.
        const contractRejected =
          (error instanceof ApiClientError && (error.status === 415 || error.status === 405 || error.status === 400)) ||
          error instanceof SyntaxError;
        setVersionState({
          kind: "error",
          message: contractRejected ? t("resources.common.versionUploadUnsupported") : getErrorMessage(error, t),
        });
      }
    },
    [activeResource, onUpdated, t],
  );

  const handleToggleAiDocument = useCallback(async () => {
    if (!activeResource || aiDocState.kind === "loading") {
      return;
    }

    if (aiDocState.kind === "open" || aiDocState.kind === "error") {
      setAiDocState({ kind: "closed" });
      return;
    }

    setAiDocState({ kind: "loading" });

    try {
      const document = await resourcesApi.getAiDocument(activeResource.id);
      setAiDocState({ document, kind: "open" });
    } catch (error) {
      setAiDocState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [activeResource, aiDocState.kind, t]);

  const handleAnalyzeResource = useCallback(async () => {
    if (!activeResource || analysisState.kind === "running") {
      return;
    }

    setAnalysisState({ kind: "running" });
    setDetailError(null);

    try {
      const job = await agentApi.analyzeResource({
        idempotencyKey: crypto.randomUUID(),
        resourceId: activeResource.id,
      });
      setAnalysisState({ jobId: job.jobId, kind: "started" });
      setDetailResource((current) => (current && current.id === activeResource.id ? { ...current, status: "ANALYZING" } : current));
    } catch (error) {
      const message = getErrorMessage(error, t);
      setAnalysisState({ kind: "error", message });
    }
  }, [activeResource, analysisState.kind, t]);

  const handleGenerateQuestions = useCallback(async () => {
    if (!roomId || questionState.kind === "running") {
      return;
    }

    setQuestionState({ kind: "running" });

    try {
      const job = await agentApi.generateQuestions({ roomId });
      setQuestionState({ jobId: job.jobId, kind: "started" });
    } catch (error) {
      setQuestionState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [questionState.kind, roomId, t]);

  const handleDraftDocument = useCallback(async () => {
    if (!activeResource || !roomId || draftState.kind === "running") {
      return;
    }

    setDraftState({ kind: "running" });

    try {
      const job = await agentApi.draftDocument({
        documentType: "proposal",
        instruction: t("resources.common.draftInstruction"),
        roomId,
        sourceResourceIds: [activeResource.id],
      });
      setDraftState({ jobId: job.jobId, kind: "started" });
    } catch (error) {
      setDraftState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [activeResource, draftState.kind, roomId, t]);

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
      setCommentError(getErrorMessage(error, t));
    } finally {
      setCommentBusyId(null);
    }
  }, [activeResource, commentBody, t]);

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
        setCommentError(getErrorMessage(error, t));
      } finally {
        setCommentBusyId(null);
      }
    },
    [editingCommentBody, t],
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
      setCommentError(getErrorMessage(error, t));
    } finally {
      setCommentBusyId(null);
    }
  }, [editingCommentId, t]);

  const handleDeleteResource = useCallback(async () => {
    if (!activeResource || deleteState.kind === "deleting") {
      return;
    }

    setDeleteState({ kind: "deleting" });

    try {
      await resourcesApi.delete(activeResource.id);
      onDeleted?.();
      onClose?.();
    } catch (error) {
      setDeleteState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [activeResource, deleteState.kind, onClose, onDeleted, t]);

  if (!activeResource) {
    return null;
  }

  const visibleStatus = statusLabel(t, scope, activeResource.status);
  const previewKind = getResourcePreviewKind(activeResource);
  const previewLabel = getKindLabel(previewKind, t);
  const size = formatSize(latestVersion?.sizeBytes);
  const originalName = latestVersion?.originalName ?? activeResource.title;
  const versionLabel = latestVersion ? `v${latestVersion.versionNo}` : "v1";
  const summaryLabel = summary?.status
    ? t(summaryStatusCopyKey[summary.status])
    : activeResource.summaryStatus
      ? t(summaryStatusCopyKey[activeResource.summaryStatus])
      : visibleStatus;

  return (
    <aside className={cn("resource-workspace__preview", styles.previewPanel)} aria-label={t("resources.common.previewAria")}>
      <div className={styles.previewTitle}>
        <div>
          <span>{t("resources.common.previewDetail")}</span>
          <strong>{visibleStatus}</strong>
        </div>
        <div className={styles.previewTitleActions}>
          <button
            aria-label={t("resources.common.analyzeStartAria")}
            className={styles.analyzeResourceButton}
            disabled={analysisState.kind === "running"}
            onClick={() => void handleAnalyzeResource()}
            title={t("resources.common.analyzeStartAria")}
            type="button"
          >
            <Sparkles aria-hidden size={15} strokeWidth={2} />
            <span>{analysisState.kind === "running" ? t("resources.common.analyzing") : t("resources.common.aiAnalyze")}</span>
          </button>
          <button aria-label={t("resources.common.previewCloseAria")} className={styles.closePreview} onClick={onClose} type="button">
            <X aria-hidden size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {roomId ? (
        <div className={styles.previewAiActions} aria-label={t("resources.common.aiActionsAria")}>
          <button
            aria-label={t("resources.common.generateQuestionsAria")}
            className={styles.analyzeResourceButton}
            disabled={questionState.kind === "running"}
            onClick={() => void handleGenerateQuestions()}
            title={t("resources.common.generateQuestionsAria")}
            type="button"
          >
            <MessageSquareText aria-hidden size={15} strokeWidth={2} />
            <span>{questionState.kind === "running" ? t("resources.common.questionRunning") : t("resources.common.questionCandidate")}</span>
          </button>
          <button
            aria-label={t("resources.common.draftDocumentAria")}
            className={styles.analyzeResourceButton}
            disabled={draftState.kind === "running"}
            onClick={() => void handleDraftDocument()}
            title={t("resources.common.draftDocumentAria")}
            type="button"
          >
            <FileText aria-hidden size={15} strokeWidth={2} />
            <span>{draftState.kind === "running" ? t("resources.common.draftRunning") : t("resources.common.documentDraft")}</span>
          </button>
        </div>
      ) : null}

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
              <span>{activeResource.visibility === "PERSONAL" ? t("resources.common.indexPersonal") : t("resources.common.indexRoom")}</span>
              <h2>{activeResource.title}</h2>
              <p>{originalName}</p>
            </div>
          </div>

          {/* 종류·원본 파일명은 상단 크롬/헤더에 이미 보이므로 여기서는 반복하지 않는다. */}
          <dl className={styles.fileFacts}>
            <div>
              <dt>{t("resources.common.factSummary")}</dt>
              <dd>{summaryLabel}</dd>
            </div>
            <div>
              <dt>{t("resources.common.factVersion")}</dt>
              <dd>{versionLabel}</dd>
            </div>
          </dl>

          <div className={cn(styles.previewBody, styles[`previewBody${previewKind[0].toUpperCase()}${previewKind.slice(1)}`])}>
            <strong>{summaryText ? t("resources.common.summaryHeading") : t("resources.common.previewInfoSuffix", { label: previewLabel })}</strong>
            <span>
              {summaryText ??
                (activeResource.visibility === "PERSONAL"
                  ? t("resources.common.previewBodyPersonal")
                  : t("resources.common.previewBodyRoom"))}
            </span>
          </div>

          <section className={styles.detailPanel} aria-label={t("resources.common.detailApiAria")}>
            <div>
              <span>{t("resources.common.detailLookup")}</span>
              <strong>{detailLoading ? t("resources.common.loading") : detailError ? t("resources.common.partialPending") : t("resources.common.connected")}</strong>
            </div>
            <div>
              <span>{t("resources.common.summaryModel")}</span>
              <strong>{summaryModelLabel ?? t("resources.common.pending")}</strong>
            </div>
            <div>
              <span>{t("resources.common.commentsLabel")}</span>
              <strong>{t("resources.common.countUnit", { count: comments.length })}</strong>
            </div>
            <div>
              <span>{t("resources.common.factVersion")}</span>
              <strong>{t("resources.common.countUnit", { count: versions.length || (activeResource.currentVersion ? 1 : 0) })}</strong>
            </div>
          </section>

          {detailError ? <p className={styles.previewError}>{detailError}</p> : null}
          {analysisState.kind === "started" ? <p className={styles.previewNotice}>{t("resources.common.analysisStarted", { jobId: analysisState.jobId.slice(0, 8) })}</p> : null}
          {analysisState.kind === "running" ? <p className={styles.previewNotice}>{t("resources.common.analysisRunning")}</p> : null}
          {analysisState.kind === "error" ? <p className={styles.previewError}>{analysisState.message}</p> : null}
          {questionState.kind === "started" ? <p className={styles.previewNotice}>{t("resources.common.questionStarted", { jobId: questionState.jobId.slice(0, 8) })}</p> : null}
          {questionState.kind === "running" ? <p className={styles.previewNotice}>{t("resources.common.questionRunningNotice")}</p> : null}
          {questionState.kind === "error" ? <p className={styles.previewError}>{t("resources.common.questionFailed", { message: questionState.message })}</p> : null}
          {draftState.kind === "started" ? <p className={styles.previewNotice}>{t("resources.common.draftStarted", { jobId: draftState.jobId.slice(0, 8) })}</p> : null}
          {draftState.kind === "running" ? <p className={styles.previewNotice}>{t("resources.common.draftRunningNotice")}</p> : null}
          {draftState.kind === "error" ? <p className={styles.previewError}>{t("resources.common.draftFailed", { message: draftState.message })}</p> : null}
        </div>
      </div>

      <div className="resource-workspace__preview-meta">
        <div>
          <span>{t("resources.common.metaStatus")}</span>
          <StatusBadge tone={toneForStatus(activeResource.status)}>{visibleStatus}</StatusBadge>
        </div>
        <div>
          <span>{t("resources.common.metaUpdated")}</span>
          <b>{formatDate(activeResource.updatedAt, t)}</b>
        </div>
        <div>
          <span>{t("resources.common.metaLocation")}</span>
          <b>{activeResource.visibility === "PERSONAL" ? t("resources.common.metaLocationPersonal") : t("resources.common.metaLocationRoom")}</b>
        </div>
        <div>
          <span>{t("resources.common.metaFile")}</span>
          <b>{size ?? previewLabel}</b>
        </div>
      </div>

      <div className="resource-workspace__preview-actions">
        <Button onClick={handleDownload} variant="primary">
          <Download aria-hidden size={16} strokeWidth={2} />
          {t("resources.common.download")}
        </Button>
        <Button
          aria-label={t("resources.common.renameAria")}
          onClick={() => {
            setRenameValue(activeResource.title);
            setRenameState({ kind: "idle" });
            setRenameOpen((current) => !current);
          }}
          variant="secondary"
        >
          <Pencil aria-hidden size={15} strokeWidth={2} />
          {t("resources.common.rename")}
        </Button>
        <Button
          aria-label={t("resources.common.uploadVersionAria")}
          disabled={versionState.kind === "uploading"}
          loading={versionState.kind === "uploading"}
          onClick={() => versionInputRef.current?.click()}
          variant="secondary"
        >
          <Upload aria-hidden size={15} strokeWidth={2} />
          {t("resources.common.uploadVersion")}
        </Button>
        <Button
          aria-label={t("resources.common.aiDocAria")}
          disabled={aiDocState.kind === "loading"}
          loading={aiDocState.kind === "loading"}
          onClick={() => void handleToggleAiDocument()}
          variant="secondary"
        >
          <ScanText aria-hidden size={15} strokeWidth={2} />
          {aiDocState.kind === "open" || aiDocState.kind === "error" ? t("resources.common.aiDocHide") : t("resources.common.aiDocView")}
        </Button>
      </div>

      <input
        ref={versionInputRef}
        accept={SUPPORTED_RESOURCE_UPLOAD_ACCEPT}
        aria-label={t("resources.common.uploadVersionAria")}
        className="resource-workspace__file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleVersionFile(file);
          }
          event.currentTarget.value = "";
        }}
        type="file"
      />

      {renameOpen ? (
        <form
          className={styles.renameForm}
          onSubmit={(event) => {
            event.preventDefault();
            void handleRenameSubmit();
          }}
        >
          <input
            aria-label={t("resources.common.renameInputAria")}
            maxLength={200}
            onChange={(event) => setRenameValue(event.target.value)}
            value={renameValue}
          />
          <Button disabled={!renameValue.trim() || renameState.kind === "saving"} loading={renameState.kind === "saving"} size="sm" type="submit" variant="primary">
            {t("resources.common.save")}
          </Button>
          <Button
            onClick={() => {
              setRenameOpen(false);
              setRenameState({ kind: "idle" });
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("resources.common.cancel")}
          </Button>
        </form>
      ) : null}
      {renameState.kind === "error" ? <p className={styles.previewError}>{renameState.message}</p> : null}
      {versionState.kind === "uploading" ? <p className={styles.previewNotice}>{t("resources.common.uploadingVersion", { fileName: versionState.fileName })}</p> : null}
      {versionState.kind === "success" ? <p className={styles.previewNotice}>{t("resources.common.versionUploaded", { version: versionState.versionNo })}</p> : null}
      {versionState.kind === "error" ? <p className={styles.previewError}>{versionState.message}</p> : null}
      {aiDocState.kind === "error" ? <p className={styles.previewError}>{aiDocState.message}</p> : null}

      {aiDocState.kind === "open" ? (
        <section className={styles.aiDocPanel} aria-label={t("resources.common.aiDocAria")}>
          <div className={styles.aiDocHead}>
            <span>{t("resources.common.aiDocAria")}</span>
            <StatusBadge tone={aiDocState.document.status === "ANALYZED" ? "success" : "neutral"}>
              {t(aiDocumentStatusCopyKey[aiDocState.document.status])}
            </StatusBadge>
          </div>
          <dl>
            <div>
              <dt>{t("resources.common.aiDocType")}</dt>
              <dd>{aiDocState.document.documentType ?? t("resources.common.pending")}</dd>
            </div>
            <div>
              <dt>{t("resources.common.aiDocStatusLabel")}</dt>
              <dd>{t(aiDocumentStatusCopyKey[aiDocState.document.status])}</dd>
            </div>
            {Object.entries(aiDocState.document.fields ?? {})
              .slice(0, 8)
              .map(([fieldKey, fieldValue]) => (
                <div key={fieldKey}>
                  <dt>{fieldKey}</dt>
                  <dd>{typeof fieldValue === "string" || typeof fieldValue === "number" ? String(fieldValue) : JSON.stringify(fieldValue)}</dd>
                </div>
              ))}
          </dl>
          {!aiDocState.document.documentType && Object.keys(aiDocState.document.fields ?? {}).length === 0 ? (
            <p className={styles.aiDocEmpty}>{t("resources.common.aiDocEmpty")}</p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.relatedPanel} aria-label={t("resources.common.relatedAria")}>
        <div className={styles.relatedTitle}>
          <div>
            <span>{t("resources.common.relatedTitle")}</span>
            <strong>{related.length > 0 ? t("resources.common.countUnit", { count: related.length }) : t("resources.common.relatedEmpty")}</strong>
          </div>
          <Link2 aria-hidden size={16} strokeWidth={2} />
        </div>
        {related.length > 0 ? (
          <ul className={styles.relatedList}>
            {related.map((relation) => (
              <li key={relation.id}>
                <button
                  aria-label={t("resources.common.relatedOpenAria", { title: relation.relatedResource.title })}
                  disabled={!onSelectRelated}
                  onClick={() => onSelectRelated?.(relation.relatedResource)}
                  type="button"
                >
                  <b>{relation.relatedResource.title}</b>
                  <span>{relation.reason?.trim() || formatDate(relation.relatedResource.updatedAt, t)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.commentPanel} aria-label={t("resources.common.commentsAria")}>
        <div className={styles.commentPanelTitle}>
          <div>
            <span>{t("resources.common.commentsLabel")}</span>
            <strong>{comments.length ? t("resources.common.commentsLinked", { count: comments.length }) : t("resources.common.commentsEmptyTitle")}</strong>
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
            aria-label={t("resources.common.commentComposeAria")}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder={t("resources.common.commentPlaceholder")}
            rows={3}
            value={commentBody}
          />
          <Button disabled={!commentBody.trim() || commentBusyId === "new"} type="submit" variant="primary">
            {t("resources.common.commentSubmit")}
          </Button>
        </form>

        {commentError ? <p className={styles.previewError}>{commentError}</p> : null}

        <div className={styles.commentList}>
          {comments.length === 0 ? (
            <p className={styles.commentEmpty}>{t("resources.common.commentsEmpty")}</p>
          ) : (
            comments.map((comment) => (
              <article className={styles.commentItem} key={comment.id}>
                <div className={styles.commentHead}>
                  <div>
                    <span>{comment.authorId.slice(0, 8)}</span>
                    <strong>{formatDate(comment.updatedAt, t)}</strong>
                  </div>
                  <div className={styles.commentActions}>
                    <button aria-label={t("resources.common.commentEditAria")} onClick={() => startEditComment(comment)} type="button">
                      <Pencil aria-hidden size={14} strokeWidth={2} />
                    </button>
                    <button aria-label={t("resources.common.commentDeleteAria")} disabled={commentBusyId === comment.id} onClick={() => void handleDeleteComment(comment.id)} type="button">
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
                      aria-label={t("resources.common.commentEditComposeAria")}
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
                        {t("resources.common.save")}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentBody("");
                        }}
                        type="button"
                        variant="ghost"
                      >
                        {t("resources.common.cancel")}
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

      <div className={styles.resourceDeleteArea}>
        <button className={styles.resourceDeleteButton} disabled={deleteState.kind === "deleting"} onClick={() => void handleDeleteResource()} type="button">
          <Trash2 aria-hidden size={15} strokeWidth={2} />
          {deleteState.kind === "deleting" ? t("resources.common.deleting") : t("resources.common.deleteFile")}
        </button>
        {deleteState.kind === "error" ? <p className={styles.previewError}>{deleteState.message}</p> : null}
      </div>
    </aside>
  );
}
