"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  FolderInput,
  FolderOpen,
  Grid3X3,
  HardDrive,
  List,
  RefreshCw,
  Search,
  Settings,
  UploadCloud,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";
import type { ResourceResponse, ResourceStatus, ResourceVisibility } from "@/types/api/resource";

type ResourceScope = "personal" | "room" | "local";
type ViewMode = "grid" | "list";
type UploadState = { kind: "idle" } | { kind: "uploading"; fileName: string } | { kind: "success"; fileName: string } | { kind: "error"; message: string };

type ResourceWorkspaceState =
  | { kind: "loading" }
  | {
      kind: "ready";
      personalResources: ResourceResponse[];
      projectRooms: ProjectRoomResponse[];
      roomResources: ResourceResponse[];
    }
  | { kind: "auth" }
  | { kind: "error"; message: string };

const emptyState = {
  personalResources: [],
  projectRooms: [],
  roomResources: [],
};

const statusCopy: Record<ResourceStatus, string> = {
  ANALYZED: "정리됨",
  ANALYZING: "정리 중",
  ARCHIVED: "보관됨",
  FAILED: "확인 필요",
  UPLOADED: "업로드됨",
};

const visibilityCopy: Record<ResourceVisibility, string> = {
  PERSONAL: "개인 자료",
  ROOM_SHARED: "프로젝트룸 자료",
};

const localSourceNotes = [
  "개인 자료에서만 사용합니다",
  "동기화가 켜진 폴더만 제한 용량 안에서 주고받습니다",
  "프로젝트룸 공용 자료에는 폴더 동기화를 쓰지 않습니다",
];

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401) {
    return "AUTH_REQUIRED";
  }

  if (error instanceof Error && error.message !== "Failed to fetch") {
    return error.message;
  }

  return "백엔드 연결을 기다리고 있습니다.";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "날짜 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatSize(value?: number | null) {
  if (!value) {
    return null;
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))}KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

function toneForStatus(status: ResourceStatus) {
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

function createUploadBody(file: File, scope: ResourceScope, roomId: string | null) {
  const body = new FormData();
  body.append("title", file.name);
  body.append("kind", "FILE");
  body.append("visibility", scope === "room" ? "ROOM_SHARED" : "PERSONAL");
  body.append("file", file);

  if (scope === "room" && roomId) {
    body.append("roomId", roomId);
  }

  return body;
}

function ResourceEmpty({ scope }: { scope: ResourceScope }) {
  const title = scope === "room" ? "공용 자료 없음" : scope === "local" ? "연결된 개인 폴더 없음" : "개인 자료 없음";
  const description =
    scope === "room"
      ? "파일 업로드로만 추가합니다."
      : scope === "local"
        ? "데스크탑 앱에서 개인 폴더 동기화를 켜세요."
        : "파일을 올리거나 개인 폴더를 연결하세요.";

  return (
    <GlassPanel className="resource-workspace__empty">
      <FolderOpen aria-hidden size={22} strokeWidth={2} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </GlassPanel>
  );
}

function ResourceTile({
  mode,
  resource,
  selected,
  onSelect,
}: {
  mode: ViewMode;
  resource: ResourceResponse;
  selected: boolean;
  onSelect: () => void;
}) {
  const version = resource.currentVersion;
  const size = formatSize(version?.sizeBytes);

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
      <StatusBadge tone={toneForStatus(resource.status)}>{statusCopy[resource.status]}</StatusBadge>
    </button>
  );
}

function UploadDropzone({
  dragActive,
  disabled,
  scope,
  uploadState,
  onBrowse,
  onDragActive,
  onFiles,
}: {
  dragActive: boolean;
  disabled: boolean;
  scope: ResourceScope;
  uploadState: UploadState;
  onBrowse: () => void;
  onDragActive: (active: boolean) => void;
  onFiles: (files: FileList | File[]) => void;
}) {
  if (scope === "local") {
    return (
      <GlassPanel className="resource-workspace__dropzone resource-workspace__dropzone--local">
        <HardDrive aria-hidden size={22} strokeWidth={2} />
        <div>
          <strong>개인 로컬 폴더 동기화</strong>
          <p>개인 폴더만 연결합니다. 공용 자료에는 적용되지 않습니다.</p>
        </div>
        <Link className="bubli-button" href="/app/settings">
          폴더 설정
        </Link>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      className={cn("resource-workspace__dropzone", dragActive && "is-dragging", disabled && "is-disabled")}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        onDragActive(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDragActive(false);
        onFiles(event.dataTransfer.files);
      }}
    >
      <UploadCloud aria-hidden size={23} strokeWidth={2} />
      <div>
        <strong>{scope === "room" ? "공용 자료 업로드" : "개인 자료 업로드"}</strong>
        <p>{scope === "room" ? "프로젝트룸에 공유할 파일만 직접 올립니다." : "공유 전까지 나만 봅니다."}</p>
        {uploadState.kind === "uploading" ? <span>{uploadState.fileName} 업로드 중</span> : null}
        {uploadState.kind === "success" ? <span>{uploadState.fileName} 업로드 완료</span> : null}
        {uploadState.kind === "error" ? <span>{uploadState.message}</span> : null}
      </div>
      <Button disabled={disabled} onClick={onBrowse} variant="primary">
        파일 선택
      </Button>
    </GlassPanel>
  );
}

export function ResourceWorkspace() {
  const [state, setState] = useState<ResourceWorkspaceState>({ kind: "loading" });
  const [scope, setScope] = useState<ResourceScope>("personal");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [dragActive, setDragActive] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadResources = useCallback(
    async (roomId?: string | null) => {
      try {
        const [personalPage, roomPage] = await Promise.all([resourcesApi.listPersonal(), projectRoomApi.list()]);
        const rooms = roomPage.items;
        const nextRoomId = roomId ?? selectedRoomId ?? rooms[0]?.id ?? null;
        const roomResources = nextRoomId ? (await resourcesApi.listRoomResources(nextRoomId)).items : [];

        setSelectedRoomId(nextRoomId);
        setState({
          kind: "ready",
          personalResources: personalPage.items,
          projectRooms: rooms,
          roomResources,
        });

        const nextResources = scope === "room" ? roomResources : personalPage.items;
        setSelectedResourceId((current) => (current && nextResources.some((resource) => resource.id === current) ? current : nextResources[0]?.id ?? null));
      } catch (error) {
        const message = getErrorMessage(error);
        setState(message === "AUTH_REQUIRED" ? { kind: "auth" } : { kind: "error", message });
      }
    },
    [scope, selectedRoomId],
  );

  const refreshResources = useCallback(() => {
    setState({ kind: "loading" });
    void loadResources(selectedRoomId);
  }, [loadResources, selectedRoomId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsTauri(isTauriRuntime());
      void loadResources(selectedRoomId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadResources, selectedRoomId]);

  const data = state.kind === "ready" ? state : emptyState;
  const resources = useMemo(
    () => (scope === "room" ? data.roomResources : scope === "personal" ? data.personalResources : []),
    [data.personalResources, data.roomResources, scope],
  );
  const selectedRoom = useMemo(
    () => data.projectRooms.find((room) => room.id === selectedRoomId) ?? data.projectRooms[0] ?? null,
    [data.projectRooms, selectedRoomId],
  );
  const canUseRoomScope = data.projectRooms.length > 0;
  const allResources = useMemo(() => [...data.personalResources, ...data.roomResources], [data.personalResources, data.roomResources]);

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
  const analyzingCount = allResources.filter((resource) => resource.status === "ANALYZING").length;
  const needsReviewCount = allResources.filter((resource) => resource.status === "FAILED").length;
  const uploadDisabled = state.kind !== "ready" || uploadState.kind === "uploading" || (scope === "room" && !selectedRoomId);

  const selectScope = useCallback(
    (nextScope: ResourceScope) => {
      setScope(nextScope);
      const nextResources = nextScope === "room" ? data.roomResources : nextScope === "personal" ? data.personalResources : [];
      setSelectedResourceId(nextResources[0]?.id ?? null);
    },
    [data.personalResources, data.roomResources],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const [file] = Array.from(files);
      if (!file || scope === "local") {
        return;
      }

      if (scope === "room" && !selectedRoomId) {
        setUploadState({ kind: "error", message: "프로젝트룸을 먼저 선택하세요." });
        return;
      }

      setUploadState({ fileName: file.name, kind: "uploading" });

      try {
        const resource = await resourcesApi.upload(createUploadBody(file, scope, selectedRoomId));
        setUploadState({ fileName: file.name, kind: "success" });
        await loadResources(selectedRoomId);
        setSelectedResourceId(resource.id);
      } catch (error) {
        setUploadState({ kind: "error", message: getErrorMessage(error) });
      }
    },
    [loadResources, scope, selectedRoomId],
  );

  const handleDownload = useCallback(async () => {
    if (!selectedResource) {
      return;
    }

    try {
      const response = await resourcesApi.getDownloadUrl(selectedResource.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setUploadState({ kind: "error", message: getErrorMessage(error) });
    }
  }, [selectedResource]);

  return (
    <section className="resource-workspace" aria-label="자료보드">
      <GlassPanel className="resource-workspace__hero">
        <div className="resource-workspace__copy">
          <span className="workspace-dashboard__eyebrow">Resources</span>
          <h1>자료보드</h1>
          <div className="resource-workspace__scope-strip" aria-label="자료보드 기준">
            <span>개인 업로드</span>
            <span>개인 로컬 폴더</span>
            <span>공용 업로드</span>
          </div>
        </div>
        <div className="resource-workspace__actions">
          <Button onClick={refreshResources} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            새로고침
          </Button>
          <Link className="bubli-button" href="/app/project-rooms">
            프로젝트룸
          </Link>
          <Link className="bubli-button" href="/app/settings">
            <Settings aria-hidden size={15} strokeWidth={1.9} />
            설정
          </Link>
        </div>
      </GlassPanel>

      {state.kind === "auth" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>로그인이 필요합니다</h2>
            <p>로그인 후 자료를 확인할 수 있습니다.</p>
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
            <h2>자료를 불러오지 못했습니다</h2>
            <p>{state.message}</p>
          </div>
        </GlassPanel>
      ) : null}

      <div className="resource-workspace__stats" aria-label="자료 상태 요약">
        <GlassPanel dense className="resource-workspace__stat">
          <span>개인 자료</span>
          <b>{state.kind === "loading" ? "-" : data.personalResources.length}</b>
        </GlassPanel>
        <GlassPanel dense className="resource-workspace__stat">
          <span>프로젝트룸 자료</span>
          <b>{state.kind === "loading" ? "-" : data.roomResources.length}</b>
        </GlassPanel>
        <GlassPanel dense className="resource-workspace__stat">
          <span>정리 중</span>
          <b>{state.kind === "loading" ? "-" : analyzingCount}</b>
        </GlassPanel>
        <GlassPanel dense className="resource-workspace__stat">
          <span>확인 필요</span>
          <b>{state.kind === "loading" ? "-" : needsReviewCount}</b>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-workspace__board">
        <aside className="resource-workspace__sources" aria-label="자료 위치">
          <button className={cn(scope === "personal" && "is-active")} onClick={() => selectScope("personal")} type="button">
            <FileText aria-hidden size={18} strokeWidth={2} />
            <span>
              개인 업로드
              <b>{data.personalResources.length}</b>
            </span>
          </button>
          <button className={cn(scope === "room" && "is-active")} disabled={!canUseRoomScope} onClick={() => selectScope("room")} type="button">
            <Users aria-hidden size={18} strokeWidth={2} />
            <span>
              프로젝트룸
              <b>{data.roomResources.length}</b>
            </span>
          </button>
          <button className={cn(scope === "local" && "is-active")} onClick={() => selectScope("local")} type="button">
            <HardDrive aria-hidden size={18} strokeWidth={2} />
            <span>
              개인 로컬 폴더
              <b>{isTauri ? "앱" : "대기"}</b>
            </span>
          </button>

          <div className="resource-workspace__source-note">
            <FolderInput aria-hidden size={18} strokeWidth={2} />
            <div>
              <strong>개인 폴더 동기화</strong>
              {localSourceNotes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          </div>
        </aside>

        <section className="resource-workspace__browser" aria-label="자료 탐색">
          <div className="resource-workspace__toolbar">
            <div className="resource-workspace__search">
              <Search aria-hidden size={17} strokeWidth={2} />
              <input aria-label="자료 검색" onChange={(event) => setQuery(event.target.value)} placeholder="파일명, 상태로 찾기" value={query} />
            </div>

            {scope === "room" && canUseRoomScope ? (
              <select
                aria-label="프로젝트룸 선택"
                className="resource-workspace__room-select"
                onChange={(event) => {
                  setSelectedRoomId(event.target.value);
                  setSelectedResourceId(null);
                  void loadResources(event.target.value);
                }}
                value={selectedRoom?.id ?? ""}
              >
                {data.projectRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="resource-workspace__view-toggle" aria-label="보기 방식">
              <button className={cn(viewMode === "grid" && "is-active")} onClick={() => setViewMode("grid")} title="격자 보기" type="button">
                <Grid3X3 aria-hidden size={16} strokeWidth={2} />
              </button>
              <button className={cn(viewMode === "list" && "is-active")} onClick={() => setViewMode("list")} title="목록 보기" type="button">
                <List aria-hidden size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            className="resource-workspace__file-input"
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files);
              }
              event.currentTarget.value = "";
            }}
            type="file"
          />

          <UploadDropzone
            disabled={uploadDisabled}
            dragActive={dragActive}
            onBrowse={() => fileInputRef.current?.click()}
            onDragActive={setDragActive}
            onFiles={(files) => void handleFiles(files)}
            scope={scope}
            uploadState={uploadState}
          />

          <div className={cn("resource-workspace__items", viewMode === "list" && "resource-workspace__items--list")}>
            {state.kind === "loading" ? (
              <>
                <GlassPanel loading />
                <GlassPanel loading />
                <GlassPanel loading />
              </>
            ) : scope === "local" || filteredResources.length === 0 ? (
              <ResourceEmpty scope={scope} />
            ) : (
              filteredResources.map((resource) => (
                <ResourceTile
                  key={resource.id}
                  mode={viewMode}
                  onSelect={() => setSelectedResourceId(resource.id)}
                  resource={resource}
                  selected={selectedResource?.id === resource.id}
                />
              ))
            )}
          </div>
        </section>

        <aside className="resource-workspace__preview" aria-label="자료 미리보기">
          {selectedResource && scope !== "local" ? (
            <>
              <div className="resource-workspace__preview-window">
                <div className="resource-workspace__preview-top">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="resource-workspace__preview-page">
                  <span>{visibilityCopy[selectedResource.visibility]}</span>
                  <h2>{selectedResource.title}</h2>
                  <p>{selectedResource.currentVersion?.originalName ?? "미리보기 준비 중"}</p>
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
                  <StatusBadge tone={toneForStatus(selectedResource.status)}>{statusCopy[selectedResource.status]}</StatusBadge>
                </div>
                <div>
                  <span>최근 수정</span>
                  <b>{formatDate(selectedResource.updatedAt)}</b>
                </div>
                <div>
                  <span>범위</span>
                  <b>{selectedResource.visibility === "PERSONAL" ? "나만 보기" : selectedRoom?.name ?? "프로젝트룸"}</b>
                </div>
                <div>
                  <span>정리</span>
                  <b>{selectedResource.summaryStatus ?? selectedResource.status}</b>
                </div>
              </div>

              <div className="resource-workspace__preview-actions">
                <Button onClick={handleDownload} variant="primary">
                  <Download aria-hidden size={16} strokeWidth={2} />
                  다운로드
                </Button>
                <Button variant="secondary">
                  <Eye aria-hidden size={16} strokeWidth={2} />
                  열어보기
                </Button>
              </div>
            </>
          ) : (
            <GlassPanel className="resource-workspace__local-preview">
              <HardDrive aria-hidden size={24} strokeWidth={2} />
              <div>
                <h2>{scope === "local" ? "개인 폴더" : "미리보기"}</h2>
                <p>{scope === "local" ? "동기화가 켜진 폴더의 파일 경로와 업로드 후보를 표시합니다." : "자료를 선택하면 내용과 상태를 표시합니다."}</p>
              </div>
              <div className="resource-workspace__local-steps">
                <span>
                  <Clock3 aria-hidden size={15} strokeWidth={2} />
                  폴더 색인
                </span>
                <span>
                  <CheckCircle2 aria-hidden size={15} strokeWidth={2} />
                  업로드 선택
                </span>
              </div>
            </GlassPanel>
          )}
        </aside>
      </GlassPanel>
    </section>
  );
}
