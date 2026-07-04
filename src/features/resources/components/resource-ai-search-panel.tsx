"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { agentApi } from "@/features/agent/api/agentApi";
import { useI18n } from "@/lib/i18n";
import type { AgentResourceSearchHit } from "@/types/api/agent";
import type { ResourceResponse } from "@/types/api/resource";

import { getErrorMessage } from "./resource-board-common";
import styles from "./resource-workspace.module.css";

type AiSearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { hits: AgentResourceSearchHit[]; kind: "ready" }
  | { kind: "error"; message: string };

// 백엔드 POST /api/ai/search-resource(임베딩 기반 의미 검색)를 쓰는 패널.
// 파일명 필터와 달리 내용을 뒤지므로 타이핑마다가 아니라 버튼을 눌렀을 때만 호출한다.
export function ResourceAiSearchPanel({
  onSelectResource,
  query,
  resources,
  roomId,
}: {
  onSelectResource?: (resourceId: string) => void;
  query: string;
  resources: ResourceResponse[];
  roomId?: string;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<AiSearchState>({ kind: "idle" });

  const term = query.trim();

  // 검색어·룸이 바뀌면 이전 질문의 결과가 남지 않게 렌더 중에 초기화한다(effect 없이 리셋).
  const contextKey = `${roomId ?? ""}|${term}`;
  const [lastContextKey, setLastContextKey] = useState(contextKey);
  if (lastContextKey !== contextKey) {
    setLastContextKey(contextKey);
    setState({ kind: "idle" });
  }

  const runSearch = useCallback(async () => {
    if (!term) {
      return;
    }

    setState({ kind: "loading" });

    try {
      const result = await agentApi.searchResources({
        query: term,
        roomId: roomId ?? null,
        scope: roomId ? "ROOM_SHARED" : "PERSONAL",
        topK: 5,
      });
      setState({ hits: result.hits, kind: "ready" });
    } catch (error) {
      const message = getErrorMessage(error, t);
      setState({
        kind: "error",
        message: message === "AUTH_REQUIRED" ? t("resources.workspace.loginRequired") : message,
      });
    }
  }, [roomId, t, term]);

  if (!term) {
    return null;
  }

  return (
    <GlassPanel className={styles.localIndexPanel}>
      <div className={styles.localIndexHeader}>
        <div>
          <span>{t("resources.aiSearch.title")}</span>
          <strong>{t("resources.aiSearch.query", { query: term })}</strong>
        </div>
        <Button
          disabled={state.kind === "loading"}
          icon={<Sparkles aria-hidden size={14} strokeWidth={2} />}
          loading={state.kind === "loading"}
          onClick={() => void runSearch()}
          size="sm"
          type="button"
          variant="quiet"
        >
          {t("resources.aiSearch.run")}
        </Button>
      </div>

      {state.kind === "idle" ? <p className={styles.localIndexEmpty}>{t("resources.aiSearch.hint")}</p> : null}
      {state.kind === "error" ? <p className={styles.localIndexEmpty}>{state.message}</p> : null}
      {state.kind === "ready" && state.hits.length === 0 ? (
        <p className={styles.localIndexEmpty}>{t("resources.aiSearch.empty")}</p>
      ) : null}

      {state.kind === "ready" && state.hits.length > 0 ? (
        <div className={styles.localIndexRows}>
          {state.hits.map((hit) => {
            const resource = resources.find((item) => item.id === hit.resourceId) ?? null;
            const excerpt = hit.chunkText.trim();
            const pageLabel = typeof hit.pageNumber === "number" ? ` · ${t("resources.aiSearch.page", { page: hit.pageNumber })}` : "";

            return (
              <div className={styles.localIndexRow} key={hit.embeddingId}>
                <div>
                  <strong>{resource?.title ?? t("resources.aiSearch.unknownResource")}</strong>
                  <small>
                    {t("resources.aiSearch.score", { percent: Math.round(hit.similarityScore * 100) })}
                    {pageLabel}
                  </small>
                  {excerpt ? <p>{excerpt}</p> : null}
                </div>
                {resource && onSelectResource ? (
                  <div className={styles.localIndexActions}>
                    <Button onClick={() => onSelectResource(resource.id)} size="sm" type="button" variant="quiet">
                      {t("common.open")}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </GlassPanel>
  );
}
