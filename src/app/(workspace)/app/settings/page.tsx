"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { ApiClientError } from "@/lib/api/errors";
import type { AuthUser } from "@/types/api/auth";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline" };

function localeLabel(locale?: string | null) {
  if (!locale) return "한국어";
  if (locale.toLowerCase().startsWith("ko")) return "한국어";
  if (locale.toLowerCase().startsWith("en")) return "English";
  if (locale.toLowerCase().startsWith("ja")) return "日本語";
  return locale;
}

function timezoneLabel(timezone?: string | null) {
  if (!timezone) return "서울 시간";
  if (timezone === "Asia/Seoul") return "서울 시간";
  return timezone.replaceAll("_", " ");
}

export default function SettingsPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const user = await authApi.getMe();
      setState({ kind: "ready", user });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <section className="workspace-route" aria-labelledby="settings-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="settings-title">설정</h1>
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className="workspace-route__panel">불러오는 중</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className="workspace-route__panel">
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && <GlassPanel className="workspace-route__panel">설정을 불러오지 못했습니다</GlassPanel>}

      {state.kind === "ready" && (
        <div className="workspace-route__cards">
          <section className="workspace-route__card" aria-label="계정">
            <span className="workspace-route__label">계정</span>
            <strong>{state.user.name}</strong>
            <span>{state.user.email}</span>
          </section>
          <section className="workspace-route__card" aria-label="언어">
            <span className="workspace-route__label">표시</span>
            <strong>{localeLabel(state.user.locale)}</strong>
            <span>{timezoneLabel(state.user.timezone)}</span>
          </section>
        </div>
      )}
    </section>
  );
}
