"use client";

import { AlertCircle, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData, workspacePreviewRoomResources } from "@/lib/workspace-preview-data";
import type { ResourceResponse } from "@/types/api/resource";

import {
  getErrorMessage,
  ResourcePreview,
  ResourceScopeSwitch,
  ResourceTile,
  ResourceToolbar,
  SUPPORTED_RESOURCE_UPLOAD_ACCEPT,
  type ViewMode,
} from "./resource-board-common";
import styles from "./resource-board-polish.module.css";

const EMPTY_RESOURCES: ResourceResponse[] = [];

type RoomState =
  | { kind: "loading" }
  | { kind: "ready"; resources: ResourceResponse[] }
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

function createPreviewUploadedResource(file: File, roomId: string, index: number): ResourceResponse {
  const now = new Date().toISOString();
  const resourceId = `preview-upload-${Date.now()}-${index}`;

  return {
    aiDocumentStatus: "ANALYZING",
    createdAt: now,
    currentVersion: {
      createdAt: now,
      id: `${resourceId}-version-1`,
      mimeType: file.type || null,
      originalName: file.name,
      resourceId,
      sizeBytes: file.size,
      versionNo: 1,
    },
    id: resourceId,
    kind: "FILE",
    ownerId: "preview-user",
    roomId,
    status: "ANALYZING",
    summaryStatus: "PENDING",
    title: file.name,
    updatedAt: now,
    visibility: "ROOM_SHARED",
  };
}

export function RoomResourceWorkspace({ roomId }: { roomId: string }) {
  const [state, setState] = useState<RoomState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadResources = useCallback(async () => {
    if (shouldUseWorkspacePreviewData()) {
      const matched = workspacePreviewRoomResources.filter((resource) => resource.roomId === roomId);
      const resources = matched.length ? matched : workspacePreviewRoomResources;
      setState({ kind: "ready", resources });
      setSelectedResourceId((current) => (current && resources.some((resource) => resource.id === current) ? current : null));
      return;
    }

    try {
      const page = await resourcesApi.listRoomResources(roomId);
      setState({ kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : null));
    } catch (error) {
      const message = getErrorMessage(error);
      setState(message === "AUTH_REQUIRED" ? { kind: "auth" } : { kind: "error", message });
    }
  }, [roomId]);

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

  const resources = useMemo(() => (state.kind === "ready" ? state.resources : EMPTY_RESOURCES), [state]);

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

      if (shouldUseWorkspacePreviewData()) {
        const previewResources = selectedFiles.map((file, index) => createPreviewUploadedResource(file, roomId, index));
        const firstResource = previewResources[0];

        setState((current) => (current.kind === "ready" ? { ...current, resources: [...previewResources, ...current.resources] } : current));
        setUploadState({ fileName: firstFile.name, kind: "success" });
        setSelectedResourceId(firstResource?.id ?? null);
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
      } catch (error) {
        setUploadState({ kind: "error", message: getErrorMessage(error) });
      }
    },
    [loadResources, roomId],
  );

  return (
    <section className={cn("resource-workspace", styles.workspace)} aria-label="자료보드">
      <GlassPanel className={cn("resource-workspace__hero", styles.boardHeader)}>
        <div className="resource-workspace__copy">
          <span className={styles.kicker}>프로젝트룸 자료</span>
          <h1>자료보드</h1>
          <p>현재 프로젝트룸의 공용 파일을 올리고 확인합니다.</p>
        </div>
        <div className={styles.headerActions}>
          <ResourceScopeSwitch activeScope="room" roomHref={`/app/project-rooms/${roomId}/resources`} roomLabel="프로젝트룸" />
        </div>
      </GlassPanel>

      {state.kind === "auth" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>로그인이 필요합니다</h2>
            <Link className="bubli-button bubli-button--primary" href="/login">
              로그인
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>서버 연결 대기</h2>
            <p>{state.message}</p>
            <div className="resource-workspace__notice-actions" aria-label="자료보드 상태 액션">
              <Button onClick={refreshResources} variant="primary">
                다시 연결
              </Button>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {canShowBoard ? (
        <>
          <GlassPanel
            className={cn(
              "resource-workspace__board",
              styles.boardShell,
              styles.boardShellFlat,
              selectedResource ? styles.boardShellHasPreview : styles.boardShellNoPreview,
              dragActive && styles.boardDropActive,
            )}
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
          >
            <section className="resource-workspace__browser" aria-label="자료 탐색">
              <div className={styles.listHeader}>
                <div>
                  <span>프로젝트룸 자료</span>
                  <strong>총 {state.kind === "loading" ? "-" : resources.length}개</strong>
                </div>
                <p>{uploadState.kind === "idle" ? "파일을 끌어다 놓거나 선택해 추가합니다" : null}</p>
                {uploadState.kind === "uploading" ? <p>{uploadState.fileName} 업로드 중</p> : null}
                {uploadState.kind === "success" ? <p>{uploadState.fileName} 업로드 완료</p> : null}
                {uploadState.kind === "error" ? <p>{uploadState.message}</p> : null}
                <Button disabled={uploadDisabled} onClick={() => fileInputRef.current?.click()} variant="primary">
                  파일 선택
                </Button>
              </div>

              <ResourceToolbar onQuery={setQuery} onViewMode={setViewMode} query={query} viewMode={viewMode} />

              <input
                ref={fileInputRef}
                className="resource-workspace__file-input"
                disabled={uploadDisabled}
                accept={SUPPORTED_RESOURCE_UPLOAD_ACCEPT}
                multiple
                onChange={(event) => {
                  if (event.target.files) {
                    void handleFiles(event.target.files);
                  }
                  event.currentTarget.value = "";
                }}
                type="file"
              />

              <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                {state.kind === "loading" ? (
                  <>
                    <GlassPanel loading />
                    <GlassPanel loading />
                    <GlassPanel loading />
                  </>
                ) : filteredResources.length === 0 ? (
                  <GlassPanel className="resource-workspace__empty">
                    <UploadCloud aria-hidden size={22} strokeWidth={2} />
                    <div>
                      <h2>현재 데이터가 없습니다</h2>
                      <p>파일을 추가하면 이 룸의 자료 목록에 표시됩니다.</p>
                    </div>
                  </GlassPanel>
                ) : (
                  filteredResources.map((resource) => (
                    <ResourceTile
                      key={resource.id}
                      mode={viewMode}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="room"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))
                )}
              </div>
            </section>

            <ResourcePreview
              emptyHint="자료를 선택하면 파일 정보와 정리 상태를 확인합니다."
              onClose={() => setSelectedResourceId(null)}
              onError={(message) => setUploadState({ kind: "error", message })}
              resource={selectedResource}
              scope="room"
            />
          </GlassPanel>
        </>
      ) : null}
    </section>
  );
}
