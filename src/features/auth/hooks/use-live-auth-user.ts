"use client";

import { useEffect, useState } from "react";

import { authApi } from "@/features/auth/api/authApi";
import {
  AUTH_SESSION_CHANGE_EVENT,
  getStoredAuthSession,
  restoreStoredAuthSessionFromTauri,
} from "@/lib/auth/auth-session";
import type { AuthUser } from "@/types/api/auth";

type LiveAuthState = {
  status: "checking" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
};

// 공개 페이지(랜딩/로그인)에서 살아 있는 세션을 조용히 감지한다.
// - 저장된 세션이 없으면 네트워크 요청 없이 즉시 비로그인으로 처리한다.
// - 저장된 세션이 있으면 getMe()로 실제 유효성을 확인한다(만료 시 apiRequest가 자동 갱신).
// - 렌더를 막지 않고, 실패는 비로그인 상태로만 처리한다(자동 리다이렉트 없음).
export function useLiveAuthState(): LiveAuthState {
  const [state, setState] = useState<LiveAuthState>({ status: "checking", user: null });

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!cancelled) {
        setState((current) => (current.status === "checking" ? current : { status: "checking", user: current.user }));
      }

      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      if (!session) {
        if (!cancelled) {
          setState({ status: "unauthenticated", user: null });
        }
        return;
      }

      try {
        const me = await authApi.getMe();
        if (!cancelled) {
          setState({ status: "authenticated", user: me });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "unauthenticated", user: null });
        }
      }
    }

    void checkSession();

    const onSessionChange = () => {
      void checkSession();
    };

    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, onSessionChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, onSessionChange);
    };
  }, []);

  return state;
}

export function useLiveAuthUser() {
  return useLiveAuthState().user;
}
