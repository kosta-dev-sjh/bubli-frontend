"use client";

import {
  ChevronDown,
  Download,
  FileImage,
  FileText,
  FileType,
  HardDrive,
  MessageSquareText,
  Pencil,
  Presentation,
  ScanText,
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
import { notifyDataChanged } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import {
  analyzePersonalLocalFileWithKeySentences,
  findPersonalLocalFileByResourceId,
} from "@/lib/local/managed-folder-client";
import type { LocalFileByResourceIdResult } from "@/lib/tauri/commands";
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

import styles from "./resource-workspace.module.css";

export type ResourceBoardScope = "personal" | "room";

// 파일 행 액션(이름 바꾸기/삭제)을 상세 패널의 같은 흐름으로 넘기는 신호.
export type ResourcePreviewIntent = { kind: "delete" | "rename"; token: number };

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

function displayStatusRank(status: ResourceStatus) {
  switch (status) {
    case "ANALYZED":
      return 5;
    case "FAILED":
      return 4;
    case "ANALYZING":
      return 3;
    case "READY":
      return 2;
    case "UPLOADED":
      return 1;
    case "UPLOADING":
      return 0;
    case "ARCHIVED":
      return 6;
  }
}

function statusFromAnalysisState(resource: ResourceResponse, summaryStatus?: ResourceSummaryStatus | null): ResourceStatus {
  if (resource.status === "ARCHIVED") return "ARCHIVED";

  const resolvedSummaryStatus = summaryStatus ?? resource.summaryStatus;
  if (resolvedSummaryStatus === "SUCCEEDED" || resource.aiDocumentStatus === "ANALYZED") return "ANALYZED";
  if (resolvedSummaryStatus === "FAILED" || resource.aiDocumentStatus === "FAILED") return "FAILED";
  if (resolvedSummaryStatus === "PENDING" || resource.aiDocumentStatus === "ANALYZING") return "ANALYZING";

  return resource.status;
}

export function isResourceAnalysisPending(resource: ResourceResponse) {
  return resource.status === "ANALYZING" || resource.summaryStatus === "PENDING" || resource.aiDocumentStatus === "ANALYZING";
}

function resolveDisplayStatus(
  resource: ResourceResponse,
  options?: {
    fallbackResource?: ResourceResponse | null;
    summaryStatus?: ResourceSummaryStatus | null;
  },
) {
  const primaryStatus = statusFromAnalysisState(resource, options?.summaryStatus);
  const fallbackStatus = options?.fallbackResource
    ? statusFromAnalysisState(options.fallbackResource, options.summaryStatus)
    : null;

  if (!fallbackStatus) return primaryStatus;
  return displayStatusRank(fallbackStatus) > displayStatusRank(primaryStatus) ? fallbackStatus : primaryStatus;
}

function isNotFoundError(error: unknown) {
  return error instanceof ApiClientError && error.status === 404;
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
  ".json",
  ".jsonl",
  ".yaml",
  ".yml",
  ".html",
  ".htm",
  ".rtf",
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
  "application/json",
  "application/x-ndjson",
  "application/yaml",
  "text/yaml",
  "text/html",
  "application/rtf",
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
    mimeType.includes("rtf") ||
    /\.(doc|docx|rtf)$/.test(fileName)
  ) {
    return "word";
  }

  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || /\.(ppt|pptx)$/.test(fileName)) {
    return "slide";
  }

  if (mimeType.includes("markdown") || /\.(md|markdown)$/.test(fileName)) {
    return "markdown";
  }

  if (
    mimeType.includes("text") ||
    mimeType.includes("json") ||
    mimeType.includes("yaml") ||
    /\.(txt|jsonl?|ya?ml|html?)$/.test(fileName)
  ) {
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

function glyphClassName(kind: ResourcePreviewKind) {
  return styles[`glyph${kind[0].toUpperCase()}${kind.slice(1)}`];
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

// 권한 확인 뒤 발급된 다운로드 주소를 새 탭으로 연다. 실패는 호출부에서 알린다.
export async function openResourceDownload(resourceId: string) {
  const response = await resourcesApi.getDownloadUrl(resourceId);
  window.open(response.url, "_blank", "noopener,noreferrer");
}

/* ---------- 범위 세그먼트: 개인 | 프로젝트룸 ---------- */

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

  return (
    <nav className={styles.scopeSwitch} aria-label={t("resources.scope.switchAria")}>
      <Link
        aria-current={activeScope === "personal" ? "page" : undefined}
        className={cn(styles.scopeItem, activeScope === "personal" && styles.scopeItemActive)}
        href="/app/resources"
      >
        <HardDrive aria-hidden size={13} strokeWidth={2} />
        {t("resources.scope.personalTitle")}
      </Link>
      <Link
        aria-current={activeScope === "room" ? "page" : undefined}
        className={cn(styles.scopeItem, activeScope === "room" && styles.scopeItemActive)}
        href={roomHref}
      >
        <UsersRound aria-hidden size={13} strokeWidth={2} />
        {roomLabel ?? t("resources.common.roomFallback")}
      </Link>
    </nav>
  );
}

/* ---------- 파일 행: 글리프 · 이름 · 메타 · 상태 칩 1개 · 호버 액션 ---------- */

export function ResourceRow({
  resource,
  scope = "room",
  selected,
  versionLabel,
  onDelete,
  onDownload,
  onRename,
  onSelect,
}: {
  resource: ResourceResponse;
  scope?: ResourceBoardScope;
  selected: boolean;
  versionLabel?: string | null;
  onDelete: () => void;
  onDownload: () => void;
  onRename: () => void;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const size = formatSize(resource.currentVersion?.sizeBytes);
  const previewKind = getResourcePreviewKind(resource);
  const kindLabel = getKindLabel(previewKind, t);
  const versionNo = resource.currentVersion?.versionNo;
  const rowVersionLabel = versionLabel ?? (versionNo ? `v${versionNo}` : null);
  const displayStatus = resolveDisplayStatus(resource);

  return (
    <li className={cn(styles.row, selected && styles.rowSelected)}>
      <button aria-pressed={selected} className={styles.rowMain} onClick={onSelect} title={resource.title} type="button">
        <span aria-hidden="true" className={cn(styles.glyph, glyphClassName(previewKind))}>
          <ResourceKindIcon kind={previewKind} size={17} strokeWidth={2} />
        </span>
        <span className={styles.rowText}>
          <b className={styles.rowName}>{resource.title}</b>
          <span className={styles.rowMeta}>
            {kindLabel}
            {rowVersionLabel ? ` · ${rowVersionLabel}` : ""} · {formatDate(resource.updatedAt, t)}
            {size ? ` · ${size}` : ""}
          </span>
        </span>
      </button>
      <StatusBadge className={styles.rowChip} tone={toneForStatus(displayStatus)}>
        {statusLabel(t, scope, displayStatus)}
      </StatusBadge>
      <span aria-label={t("resources.common.rowActionsAria", { title: resource.title })} className={styles.rowActions} role="group">
        <button aria-label={t("resources.common.download")} className={styles.iconButton} onClick={onDownload} title={t("resources.common.download")} type="button">
          <Download aria-hidden size={15} strokeWidth={2} />
        </button>
        <button aria-label={t("resources.common.renameAria")} className={styles.iconButton} onClick={onRename} title={t("resources.common.rename")} type="button">
          <Pencil aria-hidden size={15} strokeWidth={2} />
        </button>
        <button
          aria-label={t("resources.common.deleteFile")}
          className={cn(styles.iconButton, styles.iconDanger)}
          onClick={onDelete}
          title={t("resources.common.deleteFile")}
          type="button"
        >
          <Trash2 aria-hidden size={15} strokeWidth={2} />
        </button>
      </span>
    </li>
  );
}

/* ---------- 상세 패널: 파일명 헤더 + 요약 + 접기 가능한 플랫 섹션 ---------- */

export function ResourcePreview({
  resource,
  scope = "room",
  intent,
  localFolderConsent,
  roomId,
  onClose,
  onDeleted,
  onError,
  onSelectRelated,
  onUpdated,
}: {
  resource: ResourceResponse | null;
  intent?: ResourcePreviewIntent | null;
  localFolderConsent?: boolean;
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
  const [localFileVersion, setLocalFileVersion] = useState<LocalFileByResourceIdResult | null>(null);
  const [comments, setComments] = useState<ResourceCommentResponse[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<{ kind: "idle" } | { kind: "confirm" } | { kind: "deleting" } | { kind: "error"; message: string }>({ kind: "idle" });
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
  const handledIntentTokenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!resource) {
        setDetailResource(null);
        setSummary(null);
        setVersions([]);
        setLocalFileVersion(null);
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
      setLocalFileVersion(null);
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

      const localFileVersionRequest =
        scope === "personal" && localFolderConsent
          ? findPersonalLocalFileByResourceId({
              consentGranted: localFolderConsent,
              resourceId: resource.id,
            })
          : Promise.resolve(null);

      Promise.allSettled([
        resourcesApi.get(resource.id),
        resourcesApi.getSummary(resource.id),
        resourcesApi.getVersions(resource.id),
        resourcesApi.getComments(resource.id),
        resourcesApi.getRelated(resource.id),
        localFileVersionRequest,
      ]).then(([resourceResult, summaryResult, versionsResult, commentsResult, relatedResult, localFileVersionResult]) => {
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

        if (
          localFileVersionResult.status === "fulfilled" &&
          localFileVersionResult.value?.status === "ready"
        ) {
          setLocalFileVersion(localFileVersionResult.value.data);
        }

        if (commentsResult.status === "fulfilled") {
          setComments(sortComments(commentsResult.value.items));
        }

        setRelated(relatedResult.status === "fulfilled" ? relatedResult.value.items : []);

        const failed = [
          resourceResult,
          summaryResult.status === "rejected" && !isNotFoundError(summaryResult.reason) ? summaryResult : null,
          versionsResult,
          commentsResult,
        ].find((result) => result?.status === "rejected");
        setDetailError(failed?.status === "rejected" ? getErrorMessage(failed.reason) : null);
        setDetailLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [localFolderConsent, resource, scope]);

  // 행 호버 액션에서 넘어온 이름 바꾸기/삭제 신호 — 위 초기화 타임아웃 뒤에 실행되도록 같은 방식으로 미룬다.
  useEffect(() => {
    if (!intent || !resource || intent.token === handledIntentTokenRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handledIntentTokenRef.current = intent.token;

      if (intent.kind === "rename") {
        setRenameValue(resource.title);
        setRenameState({ kind: "idle" });
        setRenameOpen(true);
        return;
      }

      setDeleteState({ kind: "confirm" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [intent, resource]);

  const activeResource = detailResource?.id === resource?.id ? detailResource : resource;
  const summaryText = useMemo(() => extractSummaryText(summary), [summary]);
  const summaryModelLabel = useMemo(() => extractSummaryModelLabel(summary), [summary]);
  const latestVersion = versions[0] ?? activeResource?.currentVersion ?? null;

  const handleDownload = useCallback(async () => {
    if (!activeResource) {
      return;
    }

    try {
      await openResourceDownload(activeResource.id);
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
      // 홈 최근 자료 카드 등 같은 창의 다른 자료 표면에 즉시 반영한다.
      notifyDataChanged("resource");
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
        notifyDataChanged("resource");
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
      if (scope === "personal" && localFolderConsent) {
        const localFileResult = await findPersonalLocalFileByResourceId({
          consentGranted: localFolderConsent,
          resourceId: activeResource.id,
        });

        if (localFileResult.status !== "ready") {
          throw new Error(localFileResult.message);
        }

        if (localFileResult.data) {
          const localAnalysisResult = await analyzePersonalLocalFileWithKeySentences({
            consentGranted: localFolderConsent,
            localFileId: localFileResult.data.localFileId,
            resourceId: activeResource.id,
          });

          if (localAnalysisResult.status !== "ready") {
            throw new Error(localAnalysisResult.message);
          }

          setAnalysisState({ jobId: localAnalysisResult.data.job.jobId, kind: "started" });
          setDetailResource((current) => (current && current.id === activeResource.id ? { ...current, status: "ANALYZING" } : current));
          onUpdated?.();
          return;
        }
      }

      const job = await agentApi.analyzeResource({
        idempotencyKey: crypto.randomUUID(),
        resourceId: activeResource.id,
      });
      setAnalysisState({ jobId: job.jobId, kind: "started" });
      setDetailResource((current) => (current && current.id === activeResource.id ? { ...current, status: "ANALYZING" } : current));
      onUpdated?.();
    } catch (error) {
      const message = getErrorMessage(error, t);
      setAnalysisState({ kind: "error", message });
    }
  }, [activeResource, analysisState.kind, localFolderConsent, onUpdated, scope, t]);

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
      notifyDataChanged("resource");
    } catch (error) {
      setDeleteState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [activeResource, deleteState.kind, onClose, onDeleted, t]);

  if (!activeResource) {
    return null;
  }

  const listDisplayResource = resource ?? activeResource;
  const displayStatus = resolveDisplayStatus(listDisplayResource);
  const visibleStatus = statusLabel(t, scope, displayStatus);
  const previewKind = getResourcePreviewKind(activeResource);
  const previewLabel = getKindLabel(previewKind, t);
  const localRevisionNo = localFileVersion?.revisionNo ?? 0;
  const size = formatSize(latestVersion?.sizeBytes ?? localFileVersion?.sizeBytes);
  const originalName = latestVersion?.originalName ?? localFileVersion?.name ?? activeResource.title;
  const versionLabel = latestVersion ? `v${latestVersion.versionNo}` : localRevisionNo > 0 ? `v${localRevisionNo}` : "v1";
  const versionCount = versions.length || (activeResource.currentVersion ? 1 : localRevisionNo);
  const localVersionDate = localFileVersion?.latestEventAt ?? localFileVersion?.updatedAt;
  const summaryLabel = visibleStatus;
  const analysisAlreadyRequested = displayStatus === "ANALYZING";
  const analysisAlreadyCompleted = displayStatus === "ANALYZED";
  const analysisButtonDisabled = analysisState.kind === "running" || analysisState.kind === "started" || analysisAlreadyRequested || analysisAlreadyCompleted;
  const analysisButtonLabel =
    analysisState.kind === "running" || analysisState.kind === "started"
      ? t("resources.common.analyzing")
      : analysisAlreadyRequested || analysisAlreadyCompleted
        ? visibleStatus
        : t("resources.common.analyzeRun");

  return (
    <aside className={styles.detail} aria-label={t("resources.common.previewAria")}>
      <div className={styles.detailHead}>
        <span aria-hidden="true" className={cn(styles.glyph, glyphClassName(previewKind))}>
          <ResourceKindIcon kind={previewKind} size={18} strokeWidth={1.9} />
        </span>
        <div className={styles.detailTitleWrap}>
          <h2 className={styles.detailName} title={activeResource.title}>
            {activeResource.title}
          </h2>
          <span className={styles.detailSub}>
            {previewLabel} · {versionLabel}
            {size ? ` · ${size}` : ""} · {formatDate(activeResource.updatedAt, t)}
          </span>
          {originalName !== activeResource.title ? <span className={styles.detailSub}>{originalName}</span> : null}
        </div>
        <StatusBadge tone={toneForStatus(displayStatus)}>{visibleStatus}</StatusBadge>
        {onClose ? (
          <button aria-label={t("resources.common.previewCloseAria")} className={styles.iconButton} onClick={onClose} type="button">
            <X aria-hidden size={16} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <div className={styles.detailChrome}>
        <div className={styles.detailActions}>
          <button className={cn(styles.actionButton, styles.actionPrimary)} onClick={() => void handleDownload()} type="button">
            <Download aria-hidden size={14} strokeWidth={2} />
            {t("resources.common.download")}
          </button>
          <button
            aria-expanded={renameOpen}
            aria-label={t("resources.common.renameAria")}
            className={styles.actionButton}
            onClick={() => {
              setRenameValue(activeResource.title);
              setRenameState({ kind: "idle" });
              setRenameOpen((current) => !current);
            }}
            type="button"
          >
            <Pencil aria-hidden size={14} strokeWidth={2} />
            {t("resources.common.rename")}
          </button>
          <button
            className={cn(styles.actionButton, styles.actionDanger)}
            disabled={deleteState.kind === "deleting"}
            onClick={() => setDeleteState((current) => (current.kind === "confirm" ? { kind: "idle" } : current.kind === "deleting" ? current : { kind: "confirm" }))}
            type="button"
          >
            <Trash2 aria-hidden size={14} strokeWidth={2} />
            {deleteState.kind === "deleting" ? t("resources.common.deleting") : t("resources.common.deleteFile")}
          </button>
        </div>

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
        {renameState.kind === "error" ? <p className={styles.errorInline}>{renameState.message}</p> : null}

        {deleteState.kind === "confirm" ? (
          <div className={styles.deleteConfirm}>
            <p>{t("resources.common.deleteConfirmBody")}</p>
            <div className={styles.deleteConfirmActions}>
              <Button onClick={() => void handleDeleteResource()} size="sm" variant="primary">
                {t("resources.common.deleteConfirmYes")}
              </Button>
              <Button onClick={() => setDeleteState({ kind: "idle" })} size="sm" variant="ghost">
                {t("resources.common.cancel")}
              </Button>
            </div>
          </div>
        ) : null}
        {deleteState.kind === "error" ? <p className={styles.errorInline}>{deleteState.message}</p> : null}
        {detailLoading ? <p className={styles.noticeInline}>{t("resources.common.loading")}</p> : null}
        {detailError ? <p className={styles.errorInline}>{detailError}</p> : null}
      </div>

      <div className={styles.previewBlock}>
        <strong>{summaryText ? t("resources.common.summaryHeading") : t("resources.common.previewInfoSuffix", { label: previewLabel })}</strong>
        <span>
          {summaryText ??
            (activeResource.visibility === "PERSONAL"
              ? t("resources.common.previewBodyPersonal")
              : t("resources.common.previewBodyRoom"))}
        </span>
      </div>

      <details className={styles.section} open>
        <summary className={styles.sectionSummary}>
          {t("resources.common.sectionAi")}
          <span className={styles.sectionCount}>{summaryLabel}</span>
          <ChevronDown aria-hidden className={styles.sectionChevron} size={15} strokeWidth={2} />
        </summary>
        <div className={styles.sectionBody}>
          <div className={styles.kvLine}>
            <span>{t("resources.common.summaryModel")}</span>
            <b>{summaryModelLabel ?? t("resources.common.pending")}</b>
          </div>
          <div className={styles.aiActions}>
            <button
              aria-label={t("resources.common.analyzeStartAria")}
              className={styles.actionButton}
              disabled={analysisButtonDisabled}
              onClick={() => void handleAnalyzeResource()}
              type="button"
            >
              <Sparkles aria-hidden size={14} strokeWidth={2} />
              {analysisButtonLabel}
            </button>
            {roomId ? (
              <>
                <button
                  aria-label={t("resources.common.generateQuestionsAria")}
                  className={styles.actionButton}
                  disabled={questionState.kind === "running"}
                  onClick={() => void handleGenerateQuestions()}
                  type="button"
                >
                  <MessageSquareText aria-hidden size={14} strokeWidth={2} />
                  {questionState.kind === "running" ? t("resources.common.questionRunning") : t("resources.common.questionCandidate")}
                </button>
                <button
                  aria-label={t("resources.common.draftDocumentAria")}
                  className={styles.actionButton}
                  disabled={draftState.kind === "running"}
                  onClick={() => void handleDraftDocument()}
                  type="button"
                >
                  <FileText aria-hidden size={14} strokeWidth={2} />
                  {draftState.kind === "running" ? t("resources.common.draftRunning") : t("resources.common.documentDraft")}
                </button>
              </>
            ) : null}
            <button
              aria-label={t("resources.common.aiDocAria")}
              className={styles.actionButton}
              disabled={aiDocState.kind === "loading"}
              onClick={() => void handleToggleAiDocument()}
              type="button"
            >
              <ScanText aria-hidden size={14} strokeWidth={2} />
              {aiDocState.kind === "loading"
                ? t("resources.common.aiDocLoading")
                : aiDocState.kind === "open" || aiDocState.kind === "error"
                  ? t("resources.common.aiDocHide")
                  : t("resources.common.aiDocView")}
            </button>
          </div>

          {analysisState.kind === "started" ? <p className={styles.noticeInline}>{t("resources.common.analysisStarted", { jobId: analysisState.jobId.slice(0, 8) })}</p> : null}
          {analysisState.kind === "running" ? <p className={styles.noticeInline}>{t("resources.common.analysisRunning")}</p> : null}
          {analysisState.kind === "error" ? <p className={styles.errorInline}>{analysisState.message}</p> : null}
          {questionState.kind === "started" ? <p className={styles.noticeInline}>{t("resources.common.questionStarted", { jobId: questionState.jobId.slice(0, 8) })}</p> : null}
          {questionState.kind === "running" ? <p className={styles.noticeInline}>{t("resources.common.questionRunningNotice")}</p> : null}
          {questionState.kind === "error" ? <p className={styles.errorInline}>{t("resources.common.questionFailed", { message: questionState.message })}</p> : null}
          {draftState.kind === "started" ? <p className={styles.noticeInline}>{t("resources.common.draftStarted", { jobId: draftState.jobId.slice(0, 8) })}</p> : null}
          {draftState.kind === "running" ? <p className={styles.noticeInline}>{t("resources.common.draftRunningNotice")}</p> : null}
          {draftState.kind === "error" ? <p className={styles.errorInline}>{t("resources.common.draftFailed", { message: draftState.message })}</p> : null}
          {aiDocState.kind === "error" ? <p className={styles.errorInline}>{aiDocState.message}</p> : null}

          {aiDocState.kind === "open" ? (
            <>
              <dl className={styles.aiDocList}>
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
              {summaryText ? (
                <div className={styles.aiDocSummary}>
                  <strong>{t("resources.common.summaryHeading")}</strong>
                  <p>{summaryText}</p>
                </div>
              ) : null}
              {!aiDocState.document.documentType && Object.keys(aiDocState.document.fields ?? {}).length === 0 ? (
                <p className={styles.sectionEmpty}>{t("resources.common.aiDocEmpty")}</p>
              ) : null}
            </>
          ) : null}
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.sectionSummary}>
          {t("resources.common.factVersion")}
          <span className={styles.sectionCount}>{t("resources.common.countUnit", { count: versionCount })}</span>
          <ChevronDown aria-hidden className={styles.sectionChevron} size={15} strokeWidth={2} />
        </summary>
        <div className={styles.sectionBody}>
          <div className={styles.detailActions}>
            <button
              aria-label={t("resources.common.uploadVersionAria")}
              className={styles.actionButton}
              disabled={versionState.kind === "uploading"}
              onClick={() => versionInputRef.current?.click()}
              type="button"
            >
              <Upload aria-hidden size={14} strokeWidth={2} />
              {t("resources.common.uploadVersion")}
            </button>
          </div>
          {versionState.kind === "uploading" ? <p className={styles.noticeInline}>{t("resources.common.uploadingVersion", { fileName: versionState.fileName })}</p> : null}
          {versionState.kind === "success" ? <p className={styles.noticeInline}>{t("resources.common.versionUploaded", { version: versionState.versionNo })}</p> : null}
          {versionState.kind === "error" ? <p className={styles.errorInline}>{versionState.message}</p> : null}
          {versions.length > 0 ? (
            <ol className={styles.versionList}>
              {versions.map((version, index) => (
                <li key={version.id}>
                  <span className={styles.versionNo}>v{version.versionNo}</span>
                  <span className={styles.versionName}>{version.originalName}</span>
                  <span className={styles.versionMeta}>
                    {index === 0 ? `${t("resources.common.versionCurrent")} · ` : ""}
                    {formatDate(version.createdAt, t)}
                    {formatSize(version.sizeBytes) ? ` · ${formatSize(version.sizeBytes)}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          ) : localFileVersion ? (
            <ol className={styles.versionList}>
              <li>
                <span className={styles.versionNo}>v{localFileVersion.revisionNo}</span>
                <span className={styles.versionName}>{localFileVersion.name}</span>
                <span className={styles.versionMeta}>
                  {t("resources.common.versionCurrent")} · {formatDate(localVersionDate, t)}
                  {formatSize(localFileVersion.sizeBytes) ? ` · ${formatSize(localFileVersion.sizeBytes)}` : ""}
                </span>
              </li>
            </ol>
          ) : (
            <p className={styles.sectionEmpty}>{t("resources.common.versionsEmpty")}</p>
          )}
        </div>
      </details>

      <details className={styles.section} open>
        <summary className={styles.sectionSummary}>
          {t("resources.common.relatedTitle")}
          <span className={styles.sectionCount}>
            {related.length > 0 ? t("resources.common.countUnit", { count: related.length }) : t("resources.common.relatedEmpty")}
          </span>
          <ChevronDown aria-hidden className={styles.sectionChevron} size={15} strokeWidth={2} />
        </summary>
        <div className={styles.sectionBody}>
          {related.length > 0 ? (
            <ul className={styles.relatedList} aria-label={t("resources.common.relatedAria")}>
              {related.map((relation) => (
                <li key={relation.id}>
                  <button
                    aria-label={t("resources.common.relatedOpenAria", { title: relation.relatedResource.title })}
                    className={styles.relatedButton}
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
          ) : (
            <p className={styles.sectionEmpty}>{t("resources.common.relatedEmpty")}</p>
          )}
        </div>
      </details>

      <details className={styles.section} open>
        <summary className={styles.sectionSummary}>
          {t("resources.common.commentsLabel")}
          <span className={styles.sectionCount}>{t("resources.common.countUnit", { count: comments.length })}</span>
          <ChevronDown aria-hidden className={styles.sectionChevron} size={15} strokeWidth={2} />
        </summary>
        <div className={styles.sectionBody} aria-label={t("resources.common.commentsAria")}>
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
            <div className={styles.commentFormActions}>
              <Button disabled={!commentBody.trim() || commentBusyId === "new"} size="sm" type="submit" variant="primary">
                {t("resources.common.commentSubmit")}
              </Button>
            </div>
          </form>

          {commentError ? <p className={styles.errorInline}>{commentError}</p> : null}

          <div className={styles.commentList}>
            {comments.length === 0 ? (
              <p className={styles.sectionEmpty}>{t("resources.common.commentsEmpty")}</p>
            ) : (
              comments.map((comment) => (
                <article className={styles.commentItem} key={comment.id}>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>{comment.authorId.slice(0, 8)}</span>
                    <span className={styles.commentDate}>{formatDate(comment.updatedAt, t)}</span>
                    <div className={styles.commentTools}>
                      <button aria-label={t("resources.common.commentEditAria")} className={styles.iconButton} onClick={() => startEditComment(comment)} type="button">
                        <Pencil aria-hidden size={13} strokeWidth={2} />
                      </button>
                      <button
                        aria-label={t("resources.common.commentDeleteAria")}
                        className={cn(styles.iconButton, styles.iconDanger)}
                        disabled={commentBusyId === comment.id}
                        onClick={() => void handleDeleteComment(comment.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden size={13} strokeWidth={2} />
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
                      <div className={styles.commentEditActions}>
                        <Button disabled={!editingCommentBody.trim() || commentBusyId === comment.id} size="sm" type="submit" variant="primary">
                          {t("resources.common.save")}
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentBody("");
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {t("resources.common.cancel")}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className={styles.commentBody}>{comment.body}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </details>

      <input
        ref={versionInputRef}
        accept={SUPPORTED_RESOURCE_UPLOAD_ACCEPT}
        aria-label={t("resources.common.uploadVersionAria")}
        className={styles.srInput}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleVersionFile(file);
          }
          event.currentTarget.value = "";
        }}
        type="file"
      />
    </aside>
  );
}
