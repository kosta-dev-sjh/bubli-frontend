"use client";

// 화면 간 데이터 변경 전파용 경량 이벤트 버스 — "새로고침해야만 반영"을 없앤다.
// - notifyDataChanged(domain): 생성/수정/삭제가 서버에 반영된 직후 발행한다.
// - useDataRefresh: 같은 창에 함께 떠 있는 다른 표면(셸 스위처, 홈 카드 등)이 구독해 재조회하고,
//   창 focus/visibilitychange 때도 스로틀을 걸어 재검증한다(폴링 금지 — 이벤트 기반만).
// - notifyUserUpdated(user): 프로필 저장(설정/온보딩) 직후 발행해 탑바 사용자 표시를 즉시 갱신한다.
// 브라우저 저장소를 쓰지 않고 window CustomEvent만 사용한다(check-tauri-boundaries 허용 범위).

import { useEffect, useRef } from "react";

import type { AuthUser } from "@/types/api/auth";

export const DATA_CHANGED_EVENT = "bubli:data-changed";
export const USER_UPDATED_EVENT = "bubli:user-updated";

export type DataChangedDomain = "memo" | "project-room" | "resource" | "schedule" | "todo";

export type DataChangedDetail = {
  domain: DataChangedDomain;
  /** 발행한 표면 식별자 — 같은 표면이 자기 이벤트로 중복 재조회하는 것을 막을 때 쓴다. */
  source?: string;
};

export function notifyDataChanged(domain: DataChangedDomain, options?: { source?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DataChangedDetail>(DATA_CHANGED_EVENT, { detail: { domain, source: options?.source } }),
  );
}

export function notifyUserUpdated(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ user: AuthUser }>(USER_UPDATED_EVENT, { detail: { user } }));
}

export function readUserUpdatedDetail(event: Event): AuthUser | null {
  const detail = event instanceof CustomEvent ? (event.detail as { user?: AuthUser } | null) : null;
  return detail?.user ?? null;
}

type UseDataRefreshOptions = {
  /** 구독할 도메인 목록. 비우면 focus/visibility 재검증만 수행한다. */
  domains?: DataChangedDomain[];
  /** 이 source가 발행한 이벤트는 무시한다(자기 화면은 이미 낙관적으로 갱신했으므로). */
  ignoreSource?: string;
  /** focus/visibility 재검증 최소 간격(ms). 기본 15초 — 잦은 탭 전환으로 인한 중복 요청을 막는다. */
  minFocusIntervalMs?: number;
  onRefresh: () => void;
  /** 기본 true — 창 focus/visibilitychange 때 재검증한다. */
  revalidateOnFocus?: boolean;
};

export function useDataRefresh({
  domains,
  ignoreSource,
  minFocusIntervalMs = 15_000,
  onRefresh,
  revalidateOnFocus = true,
}: UseDataRefreshOptions) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  // 도메인 배열 리터럴을 매 렌더 새로 만들어도 효과가 재구독하지 않도록 문자열 키로 좁힌다.
  const domainsKey = domains && domains.length > 0 ? [...domains].sort().join("|") : "";

  useEffect(() => {
    // 마운트 직후에는 방금 로드한 상태이므로 첫 focus 재검증을 스로틀 기준점으로 잡는다.
    let lastRefreshAt = Date.now();
    const run = () => {
      lastRefreshAt = Date.now();
      refreshRef.current();
    };

    const domainSet = new Set(domainsKey ? domainsKey.split("|") : []);

    function handleDataChanged(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as DataChangedDetail | null) : null;
      if (!detail || !domainSet.has(detail.domain)) return;
      if (ignoreSource && detail.source === ignoreSource) return;
      run();
    }

    function handleFocusLike() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (Date.now() - lastRefreshAt < minFocusIntervalMs) return;
      run();
    }

    if (domainSet.size > 0) {
      window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    }
    if (revalidateOnFocus) {
      window.addEventListener("focus", handleFocusLike);
      document.addEventListener("visibilitychange", handleFocusLike);
    }

    return () => {
      if (domainSet.size > 0) {
        window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
      }
      if (revalidateOnFocus) {
        window.removeEventListener("focus", handleFocusLike);
        document.removeEventListener("visibilitychange", handleFocusLike);
      }
    };
  }, [domainsKey, ignoreSource, minFocusIntervalMs, revalidateOnFocus]);
}
