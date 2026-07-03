"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { useI18n } from "@/lib/i18n";
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

export function RoomResourceWorkspace({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<RoomState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadResources = useCallback(async () => {
    try {
      const page = await resourcesApi.listRoomResources(roomId);
      setState({ kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : null));
    } catch (error) {
      const message = getErrorMessage(error, t);
      if (message !== "AUTH_REQUIRED" && shouldUseWorkspacePreviewData()) {
        const matched = workspacePreviewRoomResources.filter((resource) => resource.roomId === roomId);
        const resources = matched.length ? matched : workspacePreviewRoomResources;
        setState({ kind: "ready", resources });
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
        setUploadState({ kind: "error", message: getErrorMessage(error, t) });
      }
    },
    [loadResources, roomId, t],
  );

  return (
    <section className={cn("resource-workspace", styles.workspace)} aria-label={t("resources.workspace.aria")}>
      <GlassPanel className={cn("resource-workspace__hero", styles.boardHeader)}>
        <div className="resource-workspace__copy">
          <span className={styles.kicker}>{t("resources.workspace.kickerRoom")}</span>
          <h1>{t("resources.workspace.title")}</h1>
          <p>{t("resources.workspace.roomHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <ResourceScopeSwitch activeScope="room" roomHref={`/app/project-rooms/${roomId}/resources`} roomLabel={t("resources.common.roomFallback")} />
        </div>
      </GlassPanel>

      {state.kind === "auth" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("resources.workspace.loginRequired")}</h2>
            <Link className="bubli-button bubli-button--primary" href="/login">
              {t("resources.workspace.login")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("resources.workspace.serverWaiting")}</h2>
            <p>{state.message}</p>
            <div className="resource-workspace__notice-actions" aria-label={t("resources.workspace.statusActionAria")}>
              <Button onClick={refreshResources} variant="primary">
                {t("resources.workspace.reconnect")}
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
            <section className="resource-workspace__browser" aria-label={t("resources.workspace.browseAria")}>
              <div className={styles.listHeader}>
                <div>
                  <span>{t("resources.workspace.kickerRoom")}</span>
                  <strong>{state.kind === "loading" ? t("resources.workspace.totalUnknown") : t("resources.workspace.totalCount", { count: resources.length })}</strong>
                </div>
                <p>{uploadState.kind === "idle" ? t("resources.workspace.dropHint") : null}</p>
                {uploadState.kind === "uploading" ? <p>{t("resources.workspace.uploading", { fileName: uploadState.fileName })}</p> : null}
                {uploadState.kind === "success" ? <p>{t("resources.workspace.uploadDone", { fileName: uploadState.fileName })}</p> : null}
                {uploadState.kind === "error" ? <p>{uploadState.message}</p> : null}
                <Button disabled={uploadDisabled} onClick={() => fileInputRef.current?.click()} variant="primary">
                  {t("resources.workspace.selectFile")}
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

              {state.kind === "loading" ? (
                <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                  <>
                    <GlassPanel loading />
                    <GlassPanel loading />
                    <GlassPanel loading />
                  </>
                </div>
              ) : filteredResources.length === 0 ? (
                <div className={styles.emptyCanvas} role="status">
                  <div className={styles.emptyCanvasInner}>
                    <strong>{t("resources.workspace.emptyRoomTitle")}</strong>
                    <p>{t("resources.workspace.emptyRoomDesc")}</p>
                  </div>
                </div>
              ) : (
                <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                  {filteredResources.map((resource) => (
                    <ResourceTile
                      key={resource.id}
                      mode={viewMode}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="room"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))}
                </div>
              )}
            </section>

            <ResourcePreview
              emptyHint={t("resources.workspace.previewEmptyHint")}
              onClose={() => setSelectedResourceId(null)}
              onDeleted={() => {
                setSelectedResourceId(null);
                void loadResources();
              }}
              onError={(message) => setUploadState({ kind: "error", message })}
              resource={selectedResource}
              roomId={roomId}
              scope="room"
            />
          </GlassPanel>
        </>
      ) : null}
    </section>
  );
}
