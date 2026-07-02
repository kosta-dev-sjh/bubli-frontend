"use client";

import { Check, Download, Pause, RefreshCw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentApi } from "@/features/agent/api/agentApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { getActiveProjectRoomId, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewPersonalSuggestions,
  workspacePreviewRoomSuggestions,
  workspacePreviewRooms,
} from "@/lib/workspace-preview-data";
import type {
  AgentSuggestionResponse,
  AgentSuggestionStatus,
  AgentSuggestionType,
  DailySummaryResponse,
  GeneratedDocumentResponse,
} from "@/types/api/agent";
import type { RoomMemorySummaryResponse } from "@/types/api/chat";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type AgentPageState =
  | { kind: "loading" }
  | {
      dailySummaries: DailySummaryResponse[];
      generatedDocuments: GeneratedDocumentResponse[];
      kind: "ready";
      roomMemorySummaries: RoomMemorySummaryResponse[];
      rooms: ProjectRoomResponse[];
      selectedRoomId: string | null;
      suggestions: AgentSuggestionResponse[];
    }
  | { kind: "auth" }
  | { kind: "offline"; message: string };

const typeLabels: Record<AgentSuggestionType, string> = {
  CONTRACT_FIELD: "자료 참고값",
  CONTRACT_REVIEW: "자료 검토",
  DAILY_SUMMARY: "하루 정리",
  DOCUMENT_DRAFT: "문서 초안",
  MEMO: "메모",
  QUESTION: "확인 질문",
  REQUIREMENT: "요구사항",
  REVIEW_ITEM: "검토 항목",
  SCHEDULE: "일정",
  TASK: "작업",
  TODO: "TODO",
  WBS: "작업 구조",
};

const statusLabels: Record<AgentSuggestionStatus, string> = {
  APPROVED: "반영됨",
  DRAFT: "확인 필요",
  HELD: "보류",
  REJECTED: "제외됨",
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

function displayJsonText(value: string, fallback: string) {
  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed === "string" && parsed.trim().length > 0) return parsed;
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const direct = ["title", "summary", "content", "text", "memo"]
        .map((key) => record[key])
        .find((item): item is string => typeof item === "string" && item.trim().length > 0);

      if (direct) return direct;

      const list = Object.values(record).find((item): item is string[] =>
        Array.isArray(item) && item.every((entry) => typeof entry === "string"),
      );
      if (list?.length) return list.slice(0, 3).join(" / ");
    }
  } catch {
    if (value.trim().length > 0) return value;
  }

  return fallback;
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

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function AgentPageContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AgentPageState>({ kind: "loading" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dailyUpdatingId, setDailyUpdatingId] = useState<string | null>(null);
  const [exportingDocumentId, setExportingDocumentId] = useState<string | null>(null);
  const [startingSummaryJob, setStartingSummaryJob] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedRoomId = state.kind === "ready" ? state.selectedRoomId : null;

  const load = useCallback(async (roomId: string | null) => {
    setNotice(null);
    setState((current) => {
      if (current.kind === "ready") {
        return {
          ...current,
          dailySummaries: [],
          generatedDocuments: [],
          roomMemorySummaries: [],
          selectedRoomId: roomId,
          suggestions: [],
        };
      }
      return { kind: "loading" };
    });

    try {
      const [roomPage, suggestions, dailySummaryPage, generatedDocumentPage, roomMemorySummaries] = await Promise.all([
        projectRoomApi.list(),
        roomId ? agentApi.listRoomSuggestions(roomId, { status: "DRAFT" }) : agentApi.listPersonalSuggestions({ status: "DRAFT" }),
        agentApi.listDailySummaries(),
        roomId ? agentApi.listRoomGeneratedDocuments(roomId) : agentApi.listGeneratedDocuments(),
        roomId ? chatApi.listRoomMemorySummaries(roomId) : Promise.resolve([]),
      ]);
      const selectedRoom = roomId ? roomPage.items.find((room) => room.id === roomId) : null;
      if (selectedRoom) {
        setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
      }

      setState({
        dailySummaries: dailySummaryPage.items,
        generatedDocuments: generatedDocumentPage.items,
        kind: "ready",
        roomMemorySummaries,
        rooms: roomPage.items,
        selectedRoomId: selectedRoom?.id ?? null,
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
          dailySummaries: [],
          generatedDocuments: [],
          kind: "ready",
          roomMemorySummaries: [],
          rooms: workspacePreviewRooms,
          selectedRoomId: selectedRoom?.id ?? null,
          suggestions: selectedRoom ? workspacePreviewRoomSuggestions(selectedRoom.id) : workspacePreviewPersonalSuggestions(),
        });
        return;
      }

      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "후보 데이터를 불러오지 못했습니다.",
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

  const counts = useMemo(() => {
    if (state.kind !== "ready") return null;

    return [
      { label: state.selectedRoomId ? "룸 후보" : "개인 후보", value: state.suggestions.length },
      { label: "하루 정리", value: state.dailySummaries.length },
      { label: "생성 문서", value: state.generatedDocuments.length },
      { label: "룸 메모리", value: state.roomMemorySummaries.length },
    ];
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

  const approveDailySummary = useCallback(async (summaryId: string) => {
    setDailyUpdatingId(summaryId);
    try {
      await agentApi.updateDailySummary(summaryId, { action: "APPROVE" });
      await load(selectedRoomId);
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "하루 정리를 승인하지 못했습니다.",
      });
    } finally {
      setDailyUpdatingId(null);
    }
  }, [load, selectedRoomId]);

  const startDailySummary = useCallback(async () => {
    setStartingSummaryJob(true);
    try {
      const job = await agentApi.summarizeDay({ summaryDate: todayDateKey() });
      setNotice(`하루 정리 작업을 시작했습니다. 작업 ID: ${job.jobId}`);
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "하루 정리 생성을 시작하지 못했습니다.",
      });
    } finally {
      setStartingSummaryJob(false);
    }
  }, []);

  const exportDocument = useCallback(async (documentId: string) => {
    setExportingDocumentId(documentId);
    try {
      const result = await agentApi.exportGeneratedDocument(documentId);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "생성 문서를 내려받지 못했습니다.",
      });
    } finally {
      setExportingDocumentId(null);
    }
  }, []);

  return (
    <section className="workspace-route" aria-labelledby="agent-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="agent-title">후보와 생성물</h1>
        </div>
        <div className="workspace-route__actions">
          {state.kind === "ready" ? (
            <>
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
              <Button
                icon={<Sparkles size={15} strokeWidth={1.9} />}
                loading={startingSummaryJob}
                onClick={() => void startDailySummary()}
                variant="primary"
              >
                오늘 정리 생성
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {state.kind === "loading" ? <GlassPanel className="workspace-route__panel">후보 데이터를 불러오는 중</GlassPanel> : null}

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
          {notice ? (
            <GlassPanel className="workspace-route__panel">
              <strong>{notice}</strong>
            </GlassPanel>
          ) : null}

          {counts ? (
            <div className="workspace-route__summary" aria-label="후보와 생성물 요약">
              {counts.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <section className="workspace-route__section" aria-labelledby="agent-suggestions-title">
            <div className="workspace-route__section-head">
              <h2 id="agent-suggestions-title">확인할 후보</h2>
              <StatusBadge tone={state.suggestions.length > 0 ? "agent" : "neutral"}>{state.suggestions.length}개</StatusBadge>
            </div>
            {state.suggestions.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>확인할 후보가 없습니다</strong>
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
          </section>

          <section className="workspace-route__section" aria-labelledby="daily-summary-title">
            <div className="workspace-route__section-head">
              <h2 id="daily-summary-title">하루 정리</h2>
              <StatusBadge tone={state.dailySummaries.length > 0 ? "personal" : "neutral"}>{state.dailySummaries.length}개</StatusBadge>
            </div>
            {state.dailySummaries.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>저장된 하루 정리가 없습니다</strong>
              </GlassPanel>
            ) : (
              <div className="workspace-route__list">
                {state.dailySummaries.map((summary) => (
                  <article className="workspace-route__row workspace-route__row--actions" key={summary.id}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{summary.summaryDate}</strong>
                      <span>{displayJsonText(summary.summaryJson, "하루 정리 내용")}</span>
                    </span>
                    <StatusBadge tone={summary.status === "APPROVED" ? "approved" : "pending"}>
                      {summary.status === "APPROVED" ? "승인됨" : "초안"}
                    </StatusBadge>
                    <Button
                      disabled={summary.status === "APPROVED"}
                      loading={dailyUpdatingId === summary.id}
                      onClick={() => void approveDailySummary(summary.id)}
                      size="sm"
                      variant="quiet"
                    >
                      승인
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-route__section" aria-labelledby="generated-documents-title">
            <div className="workspace-route__section-head">
              <h2 id="generated-documents-title">생성 문서</h2>
              <StatusBadge tone={state.generatedDocuments.length > 0 ? "room" : "neutral"}>{state.generatedDocuments.length}개</StatusBadge>
            </div>
            {state.generatedDocuments.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>생성된 문서가 없습니다</strong>
              </GlassPanel>
            ) : (
              <div className="workspace-route__list">
                {state.generatedDocuments.map((item) => (
                  <article className="workspace-route__row workspace-route__row--actions" key={item.id}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{item.title}</strong>
                      <span>{item.documentType}</span>
                    </span>
                    <Button
                      icon={<Download size={14} strokeWidth={1.9} />}
                      loading={exportingDocumentId === item.id}
                      onClick={() => void exportDocument(item.id)}
                      size="sm"
                      variant="quiet"
                    >
                      내려받기
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {state.selectedRoomId ? (
            <section className="workspace-route__section" aria-labelledby="room-memory-title">
              <div className="workspace-route__section-head">
                <h2 id="room-memory-title">룸 메모리 요약</h2>
                <StatusBadge tone={state.roomMemorySummaries.length > 0 ? "agent" : "neutral"}>
                  {state.roomMemorySummaries.length}개
                </StatusBadge>
              </div>
              {state.roomMemorySummaries.length === 0 ? (
                <GlassPanel className="workspace-route__panel">
                  <strong>저장된 룸 메모리 요약이 없습니다</strong>
                </GlassPanel>
              ) : (
                <div className="workspace-route__list">
                  {state.roomMemorySummaries.map((item) => (
                    <article className="workspace-route__row" key={item.id}>
                      <span className="workspace-route__dot" aria-hidden="true" />
                      <span className="workspace-route__main">
                        <strong>
                          메시지 {item.fromSequence}-{item.toSequence}
                        </strong>
                        <span>{displayJsonText(item.summaryJson, "룸 메모리 요약")}</span>
                      </span>
                      <StatusBadge tone={item.status === "APPROVED" ? "approved" : "pending"}>
                        {item.status === "APPROVED" ? "승인됨" : "초안"}
                      </StatusBadge>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<GlassPanel className="workspace-route__panel">후보 데이터를 불러오는 중</GlassPanel>}>
      <AgentPageContent />
    </Suspense>
  );
}
