"use client";

import { Check, Pause, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentApi } from "@/features/agent/api/agentApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { getActiveProjectRoomId, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewPersonalSuggestions,
  workspacePreviewRoomSuggestions,
  workspacePreviewRooms,
} from "@/lib/workspace-preview-data";
import type { AgentSuggestionResponse, AgentSuggestionStatus, AgentSuggestionType } from "@/types/api/agent";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type AgentPageState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ProjectRoomResponse[]; selectedRoomId: string | null; suggestions: AgentSuggestionResponse[] }
  | { kind: "auth" }
  | { kind: "offline"; message: string };

const typeLabels: Record<AgentSuggestionType, string> = {
  CONTRACT_FIELD: "프로젝트 참고값",
  CONTRACT_REVIEW: "범위 확인",
  DAILY_SUMMARY: "하루정리",
  DOCUMENT_DRAFT: "문서 초안",
  MEMO: "메모",
  QUESTION: "확인 질문",
  REQUIREMENT: "요구사항",
  REVIEW_ITEM: "확인 항목",
  SCHEDULE: "일정",
  TASK: "작업",
  TODO: "할 일",
  WBS: "작업 구조",
};

const statusLabels: Record<AgentSuggestionStatus, string> = {
  APPROVED: "반영됨",
  DRAFT: "확인 필요",
  HELD: "보류",
  REJECTED: "제외",
};

function statusTone(status: AgentSuggestionStatus) {
  if (status === "APPROVED") return "success";
  if (status === "DRAFT") return "agent";
  if (status === "HELD") return "warning";
  return "neutral";
}

function displayText(payload: Record<string, unknown>, fallback: string) {
  const preferred = ["title", "name", "label", "summary", "question", "description", "content"]
    .map((key) => payload[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (preferred) return preferred;

  const firstString = Object.values(payload).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return firstString ?? fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function AgentPageContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AgentPageState>({ kind: "loading" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const selectedRoomId = state.kind === "ready" ? state.selectedRoomId : null;

  const load = useCallback(async (roomId: string | null) => {
    setState((current) => {
      if (current.kind === "ready") return { ...current, selectedRoomId: roomId, suggestions: [] };
      return { kind: "loading" };
    });

    try {
      const [roomPage, suggestions] = await Promise.all([
        projectRoomApi.list(),
        roomId ? agentApi.listRoomSuggestions(roomId, { status: "DRAFT" }) : agentApi.listPersonalSuggestions({ status: "DRAFT" }),
      ]);
      const selectedRoom = roomId ? roomPage.items.find((room) => room.id === roomId) : null;
      if (selectedRoom) {
        setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
      }

      setState({
        kind: "ready",
        rooms: roomPage.items,
        selectedRoomId: roomId,
        suggestions,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      if (shouldUseWorkspacePreviewData()) {
        const selectedRoom = roomId ? workspacePreviewRooms.find((room) => room.id === roomId) ?? workspacePreviewRooms[0] : null;
        if (selectedRoom) {
          setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
        }

        setState({
          kind: "ready",
          rooms: workspacePreviewRooms,
          selectedRoomId: selectedRoom?.id ?? null,
          suggestions: selectedRoom ? workspacePreviewRoomSuggestions(selectedRoom.id) : workspacePreviewPersonalSuggestions(),
        });
        return;
      }

      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "후보를 불러오지 못했습니다.",
      });
    }
  }, []);

  useEffect(() => {
    const initialRoomId = searchParams.get("roomId") ?? getActiveProjectRoomId();
    const timeoutId = window.setTimeout(() => {
      void load(initialRoomId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load, searchParams]);

  const summary = useMemo(() => {
    if (state.kind !== "ready") return null;

    return {
      count: state.suggestions.length,
      scope: state.selectedRoomId ? state.rooms.find((room) => room.id === state.selectedRoomId)?.name ?? "프로젝트룸" : "개인",
    };
  }, [state]);

  const review = useCallback(async (suggestionId: string, action: "APPROVE" | "HOLD" | "REJECT") => {
    setUpdatingId(suggestionId);

    try {
      await agentApi.updateSuggestion(suggestionId, { action });
      await load(selectedRoomId);
    } catch (error) {
      if (!shouldUseWorkspacePreviewData()) {
        setState({
          kind: "offline",
          message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "후보 상태를 바꾸지 못했습니다.",
        });
        return;
      }

      const nextStatus: AgentSuggestionStatus = action === "APPROVE" ? "APPROVED" : action === "HOLD" ? "HELD" : "REJECTED";
      setState((current) => {
        if (current.kind !== "ready") return current;

        return {
          ...current,
          suggestions: current.suggestions.map((suggestion) =>
            suggestion.suggestionId === suggestionId
              ? {
                  ...suggestion,
                  reviewedAt: new Date().toISOString(),
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                }
              : suggestion,
          ),
        };
      });
    } finally {
      setUpdatingId(null);
    }
  }, [load, selectedRoomId]);

  return (
    <section className="workspace-route" aria-labelledby="agent-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="agent-title">확인할 후보</h1>
        </div>
        <div className="workspace-route__actions">
          {state.kind === "ready" ? (
            <select
              aria-label="후보 범위"
              className="workspace-route__select"
              onChange={(event) => void load(event.target.value || null)}
              value={state.selectedRoomId ?? ""}
            >
              <option value="">개인</option>
              {state.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </header>

      {state.kind === "loading" ? <GlassPanel className="workspace-route__panel">후보를 불러오는 중</GlassPanel> : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "offline" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{state.message}</strong>
          <div className="workspace-route__actions">
            <Button onClick={() => void load(selectedRoomId)} variant="primary">
              <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
              다시 연결
            </Button>
            <Link className="bubli-button" href="/app/resources">
              자료보드
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" ? (
        <>
          {summary && summary.count > 0 ? (
            <div className="workspace-route__cards workspace-route__cards--compact">
              <section className="workspace-route__card" aria-label="확인할 후보">
                <span className="workspace-route__label">{summary.scope}</span>
                <strong>{summary.count}</strong>
                <span>확인 필요</span>
              </section>
            </div>
          ) : null}

          {state.suggestions.length === 0 ? (
            <GlassPanel className="workspace-route__panel">
              <strong>후보 전</strong>
              <div className="workspace-route__actions">
                <Link className="bubli-button bubli-button--primary" href="/app/resources">
                  자료보드
                </Link>
                <Link className="bubli-button" href="/app/project-rooms">
                  프로젝트룸
                </Link>
              </div>
            </GlassPanel>
          ) : (
            <div className="workspace-route__list">
              {state.suggestions.map((item) => {
                const title = displayText(item.payloadJson, typeLabels[item.suggestionType]);
                const disabled = updatingId === item.suggestionId || item.status !== "DRAFT";
                const dateLabel = formatDate(item.createdAt);

                return (
                  <article className="workspace-route__row workspace-route__row--actions" key={item.suggestionId}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{title}</strong>
                      <span>{dateLabel ? `${typeLabels[item.suggestionType]} · ${dateLabel}` : typeLabels[item.suggestionType]}</span>
                    </span>
                    <StatusBadge tone={statusTone(item.status)}>{statusLabels[item.status]}</StatusBadge>
                    <span className="workspace-route__actions workspace-route__actions--compact">
                      <button disabled={disabled} onClick={() => void review(item.suggestionId, "APPROVE")} type="button">
                        <Check aria-hidden size={14} />
                        승인
                      </button>
                      <button disabled={disabled} onClick={() => void review(item.suggestionId, "HOLD")} type="button">
                        <Pause aria-hidden size={14} />
                        보류
                      </button>
                      <button disabled={disabled} onClick={() => void review(item.suggestionId, "REJECT")} type="button">
                        <X aria-hidden size={14} />
                        제외
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<GlassPanel className="workspace-route__panel">후보를 불러오는 중</GlassPanel>}>
      <AgentPageContent />
    </Suspense>
  );
}
