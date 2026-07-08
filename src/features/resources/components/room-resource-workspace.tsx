"use client";

import { AlertCircle, HardDrive, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { agentApi } from "@/features/agent/api/agentApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { notifyDataChanged, useDataRefresh } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import { projectRoomRoute } from "@/lib/project-room-routes";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData, workspacePreviewRoomResources } from "@/lib/workspace-preview-data";
import type { GeneratedDocumentResponse } from "@/types/api/agent";
import type { ResourceResponse } from "@/types/api/resource";

import { LocalIndexedFileSearchPanel } from "./local-indexed-file-search-panel";
import { ResourceAiSearchPanel } from "./resource-ai-search-panel";
import {
  downloadGeneratedDocument,
  GeneratedDocumentRow,
  getErrorMessage,
  isResourceAnalysisPending,
  openResourceDownload,
  ResourcePreview,
  ResourceRow,
  ResourceScopeSwitch,
  ResourceStorageUsage,
  SUPPORTED_RESOURCE_UPLOAD_ACCEPT,
  type ResourcePreviewIntent,
} from "./resource-board-common";
import styles from "./resource-workspace.module.css";

const EMPTY_RESOURCES: ResourceResponse[] = [];

type RoomState =
  | { kind: "loading" }
  | { generatedDocuments: GeneratedDocumentResponse[]; kind: "ready"; resources: ResourceResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "success"; fileName: string }
  | { kind: "error"; message: string };

function createUploadBody(file: File, roomId: string) {
  const body = new FormData();
  body.append("title", file.name);
  body.append("kind", "FILE");
  body.append("visibility", "ROOM_SHARED");
  body.append("roomId", roomId);
  body.append("file", file);

  return body;
}

export function RoomResourceWorkspace({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  // 딥링크 지원: ?resourceId= 로 진입하면(예: 댓글/자료 알림 보러가기) 해당 자료 상세를 연다.
  const queryResourceId = searchParams.get("resourceId");
  const appliedQueryResourceIdRef = useRef<string | null>(null);
  const [state, setState] = useState<RoomState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [previewIntent, setPreviewIntent] = useState<ResourcePreviewIntent | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [pendingDeleteGeneratedDocumentId, setPendingDeleteGeneratedDocumentId] = useState<string | null>(null);
  const [deletingGeneratedDocumentId, setDeletingGeneratedDocumentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadResources = useCallback(async () => {
    try {
      const [page, generatedDocumentPage] = await Promise.all([
        resourcesApi.listRoomResources(roomId),
        agentApi.listRoomGeneratedDocuments(roomId),
      ]);
      setState({ generatedDocuments: generatedDocumentPage.items, kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : null));
    } catch (error) {
      const message = getErrorMessage(error, t);
      if (message !== "AUTH_REQUIRED" && shouldUseWorkspacePreviewData()) {
        const matched = workspacePreviewRoomResources.filter((resource) => resource.roomId === roomId);
        const resources = matched.length ? matched : workspacePreviewRoomResources;
        setState({ generatedDocuments: [], kind: "ready", resources });
        setSelectedResourceId((current) => (current && resources.some((resource) => resource.id === current) ? current : null));
        return;
      }
      setState(message === "AUTH_REQUIRED" ? { kind: "auth" } : { kind: "error", message });
    }
  }, [roomId, t]);

  const refreshResources = useCallback(() => {
    setState({ kind: "loading" });
    void loadResources();
  }, [loadResources]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  // 데스크톱 위젯/다른 탭에서 올라온 자료를 포커스 복귀 시 재검증한다(loadResources는 목록을 유지한 채 갱신).
  const revalidateResources = useCallback(() => {
    void loadResources();
  }, [loadResources]);
  useDataRefresh({ domains: [], onRefresh: revalidateResources });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsTauri(isTauriRuntime());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const resources = useMemo(() => (state.kind === "ready" ? state.resources : EMPTY_RESOURCES), [state]);
  const generatedDocuments = useMemo(() => (state.kind === "ready" ? state.generatedDocuments : []), [state]);

  useEffect(() => {
    if (state.kind !== "ready" || !resources.some(isResourceAnalysisPending)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadResources();
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [loadResources, resources, state.kind]);

  // ?resourceId= 딥링크는 목록 로드 완료 후, 같은 값에 대해 한 번만 적용한다
  // (적용 후 사용자가 다른 자료를 고르거나 닫는 것을 방해하지 않는다).
  useEffect(() => {
    if (!queryResourceId || appliedQueryResourceIdRef.current === queryResourceId) return;
    if (state.kind !== "ready") return;
    const exists = state.resources.some((resource) => resource.id === queryResourceId);
    const timeoutId = window.setTimeout(() => {
      appliedQueryResourceIdRef.current = queryResourceId;
      if (exists) setSelectedResourceId(queryResourceId);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [queryResourceId, state]);

  const filteredResources = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return resources;
    }

    return resources.filter((resource) => {
      const versionName = resource.currentVersion?.originalName ?? "";
      return `${resource.title} ${versionName} ${resource.status}`.toLowerCase().includes(term);
    });
  }, [query, resources]);

  const filteredGeneratedDocuments = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return generatedDocuments;
    }

    return generatedDocuments.filter((document) =>
      `${document.title} ${document.documentType} ${document.contentMarkdown}`.toLowerCase().includes(term),
    );
  }, [generatedDocuments, query]);

  const selectedResource = selectedResourceId ? filteredResources.find((resource) => resource.id === selectedResourceId) ?? null : null;
  const canShowBoard = state.kind !== "auth" && state.kind !== "error";
  const uploadDisabled = state.kind !== "ready" || uploadState.kind === "uploading";

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      const [firstFile] = selectedFiles;

      if (!firstFile) {
        return;
      }

      setUploadState({ fileName: firstFile.name, kind: "uploading" });

      try {
        let firstUploadedResource: ResourceResponse | null = null;

        for (const file of selectedFiles) {
          const resource = await resourcesApi.upload(createUploadBody(file, roomId));
          firstUploadedResource ??= resource;
        }

        setUploadState({ fileName: firstFile.name, kind: "success" });
        await loadResources();
        setSelectedResourceId(firstUploadedResource?.id ?? null);
        // 홈 최근 자료 카드 등 같은 창의 다른 자료 표면에 업로드를 즉시 반영한다.
        notifyDataChanged("resource");
      } catch (error) {
        setUploadState({ kind: "error", message: getErrorMessage(error, t) });
      }
    },
    [loadResources, roomId, t],
  );

  const handleRowDownload = useCallback(async (resource: ResourceResponse) => {
    try {
      await openResourceDownload(resource.id);
    } catch (error) {
      setUploadState({ kind: "error", message: getErrorMessage(error, t) });
    }
  }, [t]);

  const handleGeneratedDocumentDownload = useCallback(async (document: GeneratedDocumentResponse) => {
    try {
      await downloadGeneratedDocument(document.id);
    } catch (error) {
      setUploadState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorExportDocument"),
      });
    }
  }, [t]);

  const handleGeneratedDocumentDelete = useCallback(async (document: GeneratedDocumentResponse) => {
    if (pendingDeleteGeneratedDocumentId !== document.id) {
      setPendingDeleteGeneratedDocumentId(document.id);
      return;
    }

    setDeletingGeneratedDocumentId(document.id);
    try {
      await agentApi.deleteGeneratedDocument(document.id);
      setState((current) =>
        current.kind === "ready"
          ? {
              ...current,
              generatedDocuments: current.generatedDocuments.filter((item) => item.id !== document.id),
            }
          : current,
      );
      setPendingDeleteGeneratedDocumentId(null);
      notifyDataChanged("agent");
      notifyDataChanged("resource");
    } catch (error) {
      setUploadState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "생성 문서를 삭제하지 못했습니다.",
      });
    } finally {
      setDeletingGeneratedDocumentId(null);
    }
  }, [pendingDeleteGeneratedDocumentId]);

  const sendPreviewIntent = useCallback((resourceId: string, kind: ResourcePreviewIntent["kind"]) => {
    setSelectedResourceId(resourceId);
    setPreviewIntent((current) => ({ kind, token: (current?.token ?? 0) + 1 }));
  }, []);

  return (
    <section className={cn("resource-workspace", styles.page)} aria-label={t("resources.workspace.aria")}>
      <GlassPanel
        className={cn(styles.shell, dragActive && styles.shellDrop)}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setDragActive(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!uploadDisabled) {
            void handleFiles(event.dataTransfer.files);
          }
        }}
        padded={false}
      >
        <header className={styles.header}>
          <h1 className={styles.title}>{t("resources.workspace.title")}</h1>
          <span className={styles.count}>
            {state.kind === "loading"
              ? t("resources.workspace.totalUnknown")
              : t("resources.workspace.totalCount", { count: resources.length + generatedDocuments.length })}
          </span>
          <span className={styles.headerSpacer} aria-hidden="true" />
          <ResourceScopeSwitch activeScope="room" roomHref={projectRoomRoute(roomId, "resources")} roomLabel={t("resources.common.roomFallback")} />
          <ResourceStorageUsage roomId={roomId} />
          <label className={styles.search}>
            <Search aria-hidden size={15} strokeWidth={2} />
            <input
              aria-label={t("resources.common.searchAria")}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("resources.common.searchPlaceholder")}
              type="search"
              value={query}
            />
          </label>
          <Button
            disabled={uploadDisabled}
            icon={<Upload aria-hidden size={14} strokeWidth={2} />}
            loading={uploadState.kind === "uploading"}
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="primary"
          >
            {t("resources.board.upload")}
          </Button>
        </header>

        <input
          ref={fileInputRef}
          accept={SUPPORTED_RESOURCE_UPLOAD_ACCEPT}
          aria-label={t("resources.workspace.selectFile")}
          className={styles.srInput}
          disabled={uploadDisabled}
          multiple
          onChange={(event) => {
            if (event.target.files) {
              void handleFiles(event.target.files);
            }
            event.currentTarget.value = "";
          }}
          type="file"
        />

        {state.kind === "auth" ? (
          <div className={styles.stateBlock} role="status">
            <AlertCircle aria-hidden size={22} strokeWidth={2} />
            <strong>{t("resources.workspace.loginRequired")}</strong>
            <div className={styles.stateActions}>
              <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/login">
                {t("resources.workspace.login")}
              </Link>
            </div>
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className={styles.stateBlock} role="status">
            <AlertCircle aria-hidden size={22} strokeWidth={2} />
            <strong>{t("resources.workspace.serverWaiting")}</strong>
            <p>{state.message}</p>
            <div className={styles.stateActions} aria-label={t("resources.workspace.statusActionAria")}>
              <Button onClick={refreshResources} size="sm" variant="primary">
                {t("resources.workspace.reconnect")}
              </Button>
            </div>
          </div>
        ) : null}

        {canShowBoard ? (
          <div className={cn(styles.body, selectedResource && styles.bodyHasPreview)}>
            <div className={styles.list} aria-label={t("resources.workspace.browseAria")}>
              <div className={cn(styles.dropzone, dragActive && styles.dropzoneActive)}>
                <Upload aria-hidden size={18} strokeWidth={2} />
                <span className={styles.dropzoneText}>
                  <strong>{t("resources.workspace.dropHint")}</strong>
                  <span>{t("resources.workspace.roomHint")}</span>
                </span>
              </div>

              {/* dev PR 217 이식: 로컬 동기화 안내 스트립 — 우리 드롭존 스트립 문법으로 플랫하게 배치.
                  웹에서는 안내 문구만 보여주고, 실제 로컬 검색 패널은 아래 컴포넌트가 Tauri에서만 렌더링한다. */}
              <div className={styles.dropzone}>
                <HardDrive aria-hidden size={18} strokeWidth={2} />
                <span className={styles.dropzoneText}>
                  <strong>{isTauri ? t("resources.workspace.syncTitleTauri") : t("resources.workspace.syncTitleWeb")}</strong>
                  <span>{isTauri ? t("local.folder.personalOnly") : t("resources.workspace.syncDescWeb")}</span>
                </span>
              </div>

              {/* dev PR 217 이식: 프로젝트룸 자료보드 로컬 참고 검색 — 검색어 입력 + Tauri 런타임에서만 내용이 뜬다. */}
              <LocalIndexedFileSearchPanel query={query} />

              {/* 룸 공유 자료의 내용(임베딩) 기반 AI 검색 — 파일명 필터로 못 찾을 때의 보조 경로. */}
              <ResourceAiSearchPanel
                onSelectResource={(resourceId) => {
                  setQuery("");
                  setSelectedResourceId(resourceId);
                }}
                query={query}
                resources={resources}
                roomId={roomId}
              />

              {uploadState.kind === "uploading" ? <p className={styles.noticeLine}>{t("resources.workspace.uploading", { fileName: uploadState.fileName })}</p> : null}
              {uploadState.kind === "success" ? <p className={styles.noticeLine}>{t("resources.workspace.uploadDone", { fileName: uploadState.fileName })}</p> : null}
              {uploadState.kind === "error" ? <p className={styles.errorLine}>{uploadState.message}</p> : null}

              {state.kind === "loading" ? (
                <div aria-hidden="true" className={styles.rows}>
                  {[0, 1, 2].map((index) => (
                    <div className={styles.skeletonRow} key={index}>
                      <span className="bubli-skeleton" style={{ borderRadius: 9, height: 34, width: 34 }} />
                      <span className="bubli-skeleton" style={{ height: 13, width: `${54 - index * 9}%` }} />
                    </div>
                  ))}
                </div>
              ) : filteredResources.length === 0 && filteredGeneratedDocuments.length === 0 ? (
                <div className={styles.empty} role="status">
                  <strong>{t("resources.workspace.emptyRoomTitle")}</strong>
                  <p>{t("resources.workspace.emptyRoomDesc")}</p>
                  {/* 빈 화면이 막다른 길이 되지 않게 업로드 진입점을 바로 노출한다. */}
                  <div className={styles.emptyActions}>
                    <Button
                      disabled={uploadDisabled}
                      icon={<Upload aria-hidden size={14} strokeWidth={2} />}
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      variant="primary"
                    >
                      {t("resources.workspace.selectFile")}
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className={styles.rows}>
                  {filteredGeneratedDocuments.map((document) => (
                    <GeneratedDocumentRow
                      document={document}
                      deleteBusy={deletingGeneratedDocumentId === document.id}
                      deletePending={pendingDeleteGeneratedDocumentId === document.id}
                      key={`generated-${document.id}`}
                      onDelete={() => void handleGeneratedDocumentDelete(document)}
                      onDownload={() => void handleGeneratedDocumentDownload(document)}
                      onSelect={() => setSelectedResourceId(null)}
                      selected={false}
                    />
                  ))}
                  {filteredResources.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      onDelete={() => sendPreviewIntent(resource.id, "delete")}
                      onDownload={() => void handleRowDownload(resource)}
                      onRename={() => sendPreviewIntent(resource.id, "rename")}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="room"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))}
                </ul>
              )}
            </div>

            <ResourcePreview
              intent={previewIntent}
              onClose={() => setSelectedResourceId(null)}
              onDeleted={() => {
                setSelectedResourceId(null);
                void loadResources();
              }}
              onError={(message) => setUploadState({ kind: "error", message })}
              onSelectRelated={(relatedResource) => {
                if (resources.some((item) => item.id === relatedResource.id)) {
                  setQuery("");
                  setSelectedResourceId(relatedResource.id);
                }
              }}
              onUpdated={() => {
                void loadResources();
              }}
              resource={selectedResource}
              roomId={roomId}
              scope="room"
            />
          </div>
        ) : null}
      </GlassPanel>
    </section>
  );
}
