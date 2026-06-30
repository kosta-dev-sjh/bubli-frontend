"use client";

import { AlertCircle, FileText, FolderOpen, HardDrive, Laptop, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData, workspacePreviewPersonalResources } from "@/lib/workspace-preview-data";
import type { ResourceResponse } from "@/types/api/resource";

import { formatDate, getErrorMessage, ResourcePreview, ResourceTile, ResourceToolbar, type ViewMode } from "./resource-board-common";

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

  const loadResources = useCallback(async () => {
    if (shouldUseWorkspacePreviewData()) {
      const resources = workspacePreviewPersonalResources;
      setState({ kind: "ready", resources });
      setSelectedResourceId((current) => (current && resources.some((resource) => resource.id === current) ? current : resources[0]?.id ?? null));
      return;
    }

    try {
      const page = await resourcesApi.listPersonal();
      setState({ kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : page.items[0]?.id ?? null));
    } catch (error) {
      const message = getErrorMessage(error);
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

  const selectedResource = filteredResources.find((resource) => resource.id === selectedResourceId) ?? filteredResources[0] ?? null;
  const analyzingCount = resources.filter((resource) => resource.status === "ANALYZING").length;
  const needsReviewCount = resources.filter((resource) => resource.status === "FAILED").length;
  const canShowBoard = state.kind !== "auth" && state.kind !== "error";
  const previewMode = shouldUseWorkspacePreviewData();
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
    <section className="resource-workspace" aria-label="개인 자료">
      <GlassPanel className="resource-workspace__hero">
        <div className="resource-workspace__copy">
          <h1>개인 자료</h1>
          <p>내 컴퓨터 폴더 연결 상태, 개인 색인, 최근 동기화 결과를 확인합니다.</p>
        </div>
        <div className="resource-workspace__actions">
          <Link className="bubli-button" href="/app/settings">
            <Settings aria-hidden size={15} strokeWidth={1.9} />
            폴더 설정
          </Link>
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
          <div className="resource-workspace__stats" aria-label="자료 상태 요약">
            <GlassPanel dense className="resource-workspace__stat">
              <span>연결 폴더</span>
              <b>{isTauri ? "감지" : "앱 필요"}</b>
            </GlassPanel>
            <GlassPanel dense className="resource-workspace__stat">
              <span>개인 색인</span>
              <b>{state.kind === "loading" ? "-" : resources.length}</b>
            </GlassPanel>
            <GlassPanel dense className="resource-workspace__stat">
              <span>확인 필요</span>
              <b>{state.kind === "loading" ? "-" : needsReviewCount}</b>
            </GlassPanel>
            <GlassPanel dense className="resource-workspace__stat">
              <span>최근 스캔</span>
              <b>{state.kind === "loading" ? "-" : previewMode ? "확인용" : latestScannedAt ? formatDate(latestScannedAt) : "대기"}</b>
            </GlassPanel>
          </div>

          <GlassPanel className="resource-workspace__board">
            <aside className="resource-workspace__sources" aria-label="자료 위치">
              <button className="is-active" type="button">
                <FileText aria-hidden size={18} strokeWidth={2} />
                <span>
                  개인 자료
                  <b>{resources.length}</b>
                </span>
              </button>
              <div className="resource-workspace__source-note">
                <HardDrive aria-hidden size={17} strokeWidth={2} />
                <div>
                  <strong>개인 폴더 동기화</strong>
                  <span>{isTauri ? "기기 안 폴더를 읽어 개인 색인으로 정리" : "데스크탑 앱에서 폴더를 선택해야 연결"}</span>
                </div>
              </div>
            </aside>

            <section className="resource-workspace__browser" aria-label="자료 탐색">
              <div className="resource-workspace__scope-head">
                <span>개인 자료</span>
                <strong>{previewMode ? "서버 연결 전 화면 확인" : isTauri ? "동기화 상태 확인" : "데스크탑 앱 필요"}</strong>
              </div>

              <ResourceToolbar onQuery={setQuery} onViewMode={setViewMode} query={query} viewMode={viewMode} />

              <GlassPanel className="resource-workspace__dropzone resource-workspace__dropzone--local">
                <HardDrive aria-hidden size={22} strokeWidth={2} />
                <div>
                  <strong>{isTauri ? "연결한 폴더를 읽는 중" : "개인 자료는 폴더 선택으로 연결합니다"}</strong>
                  <p>
                    {isTauri
                      ? "기기 안 파일을 개인 색인으로 정리하고, 프로젝트룸 공유 전까지 공용 자료와 섞지 않습니다."
                      : "브라우저 화면에서는 파일을 받지 않습니다. 데스크탑 앱에서 내 컴퓨터 폴더를 지정하세요."}
                  </p>
                </div>
                <Link className="bubli-button" href="/app/settings">
                  폴더 설정
                </Link>
              </GlassPanel>

              <div className={cn("resource-workspace__items", viewMode === "list" && "resource-workspace__items--list")}>
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
                      <h2>{isTauri ? "아직 동기화된 자료가 없습니다" : "앱에서 폴더를 연결하세요"}</h2>
                      <p>
                        {isTauri
                          ? "연결한 폴더의 스캔이 끝나면 개인 색인 목록에 표시됩니다."
                          : "개인 자료는 브라우저에서 파일을 받지 않습니다. 데스크탑 앱의 폴더 연결을 사용합니다."}
                      </p>
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
              emptyHint={previewMode ? "서버 연결 전에는 선택한 파일의 실제 본문을 열지 않습니다." : "동기화된 자료를 선택하면 상태와 정리 결과를 확인합니다."}
              resource={selectedResource}
              scope="personal"
            />
          </GlassPanel>
        </>
      ) : null}
    </section>
  );
}
