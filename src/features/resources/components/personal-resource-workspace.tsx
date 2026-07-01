"use client";

import { AlertCircle, FolderOpen, HardDrive, Laptop, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ACTIVE_PROJECT_ROOM_CHANGE_EVENT, getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData, workspacePreviewPersonalResources } from "@/lib/workspace-preview-data";
import type { ResourceResponse } from "@/types/api/resource";

import { formatDate, getErrorMessage, ResourcePreview, ResourceScopeSwitch, ResourceTile, ResourceToolbar, type ViewMode } from "./resource-board-common";
import styles from "./resource-board-polish.module.css";

const EMPTY_RESOURCES: ResourceResponse[] = [];

type PersonalState =
  | { kind: "loading" }
  | { kind: "ready"; resources: ResourceResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

export function PersonalResourceWorkspace() {
  const [state, setState] = useState<PersonalState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isTauri, setIsTauri] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => getActiveProjectRoomId());

  const loadResources = useCallback(async () => {
    try {
      const page = await resourcesApi.listPersonal();
      setState({ kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : null));
    } catch (error) {
      const message = getErrorMessage(error);
      if (message !== "AUTH_REQUIRED" && shouldUseWorkspacePreviewData()) {
        const resources = workspacePreviewPersonalResources;
        setState({ kind: "ready", resources });
        setSelectedResourceId((current) => (current && resources.some((resource) => resource.id === current) ? current : null));
        return;
      }
      setState(message === "AUTH_REQUIRED" ? { kind: "auth" } : { kind: "error", message });
    }
  }, []);

  const refreshResources = useCallback(() => {
    setState({ kind: "loading" });
    void loadResources();
  }, [loadResources]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsTauri(isTauriRuntime());
      void loadResources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  useEffect(() => {
    function handleRoomChange() {
      setActiveRoomId(getActiveProjectRoomId());
    }

    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleRoomChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleRoomChange);
  }, []);

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
  const latestScannedAt = resources.reduce<string | null>((latest, resource) => {
    if (!resource.updatedAt) {
      return latest;
    }

    if (!latest || new Date(resource.updatedAt).getTime() > new Date(latest).getTime()) {
      return resource.updatedAt;
    }

    return latest;
  }, null);

  return (
    <section className={cn("resource-workspace", styles.workspace)} aria-label="자료보드">
      <GlassPanel className={cn("resource-workspace__hero", styles.boardHeader)}>
        <div className="resource-workspace__copy">
          <span className={styles.kicker}>개인 자료</span>
          <h1>자료보드</h1>
          <p>내 로컬 폴더에서 색인된 자료만 봅니다.</p>
        </div>
        <div className={styles.headerActions}>
          <ResourceScopeSwitch activeScope="personal" roomHref={activeRoomId ? `/app/project-rooms/${activeRoomId}/resources` : "/app/project-rooms"} roomLabel="프로젝트룸" />
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
          <GlassPanel className={cn("resource-workspace__board", styles.boardShell, styles.boardShellFlat, selectedResource ? styles.boardShellHasPreview : styles.boardShellNoPreview)}>
            <section className="resource-workspace__browser" aria-label="자료 탐색">
              <div className={styles.listHeader}>
                <div>
                  <span>개인 자료</span>
                  <strong>총 {state.kind === "loading" ? "-" : resources.length}개</strong>
                </div>
                <p>{isTauri ? `로컬 폴더 색인 · 최근 스캔 ${latestScannedAt ? formatDate(latestScannedAt) : "대기"}` : "데스크탑 앱에서 로컬 폴더를 연결합니다"}</p>
              </div>

              <ResourceToolbar onQuery={setQuery} onViewMode={setViewMode} query={query} viewMode={viewMode} />

              <GlassPanel className={cn("resource-workspace__dropzone resource-workspace__dropzone--local", styles.syncStrip)}>
                <HardDrive aria-hidden size={22} strokeWidth={2} />
                <div>
                  <strong>{isTauri ? "로컬 폴더 동기화" : "데스크탑 앱 연결 필요"}</strong>
                  <p>
                    {isTauri
                      ? "앱에서 지정한 폴더만 개인 자료로 읽습니다."
                      : "브라우저에서는 개인 파일을 받지 않습니다."}
                  </p>
                </div>
                <span className={styles.syncBadge}>{isTauri ? "연결됨" : "앱 필요"}</span>
              </GlassPanel>

              <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                {state.kind === "loading" ? (
                  <>
                    <GlassPanel loading />
                    <GlassPanel loading />
                    <GlassPanel loading />
                  </>
                ) : filteredResources.length === 0 ? (
                  <GlassPanel className="resource-workspace__empty">
                    <FolderOpen aria-hidden size={22} strokeWidth={2} />
                    <div>
                      <h2>현재 데이터가 없습니다</h2>
                      <p>{isTauri ? "연결한 폴더의 스캔이 끝나면 여기에 표시됩니다." : "데스크탑 앱에서 폴더를 연결하면 여기에 표시됩니다."}</p>
                      <div className="resource-workspace__local-steps">
                        <span>
                          <Laptop aria-hidden size={14} strokeWidth={2} />
                          데스크탑 앱 열기
                        </span>
                        <span>
                          <FolderOpen aria-hidden size={14} strokeWidth={2} />
                          폴더 선택
                        </span>
                        <span>
                          <RefreshCw aria-hidden size={14} strokeWidth={2} />
                          자동 동기화
                        </span>
                      </div>
                    </div>
                  </GlassPanel>
                ) : (
                  filteredResources.map((resource) => (
                    <ResourceTile
                      key={resource.id}
                      mode={viewMode}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="personal"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))
                )}
              </div>
            </section>

            <ResourcePreview
              emptyHint="자료를 선택하면 파일 정보와 정리 상태를 확인합니다."
              onClose={() => setSelectedResourceId(null)}
              resource={selectedResource}
              scope="personal"
            />
          </GlassPanel>
        </>
      ) : null}
    </section>
  );
}
