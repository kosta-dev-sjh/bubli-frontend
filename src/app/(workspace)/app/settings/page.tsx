"use client";

import { useEffect, useState } from "react";

import { authApi } from "@/features/auth/api/authApi";
import { ApiClientError } from "@/lib/api/errors";
import type { AuthUser } from "@/types/api/auth";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline" };

export default function SettingsPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let mounted = true;

    authApi
      .getMe()
      .then((user) => {
        if (mounted) setState({ kind: "ready", user });
      })
      .catch((error) => {
        if (!mounted) return;
        if (error instanceof ApiClientError && error.status === 401) {
          setState({ kind: "auth" });
          return;
        }
        setState({ kind: "offline" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="workspace-route" aria-labelledby="settings-title">
      <header className="workspace-route__header">
        <div>
          <p className="workspace-route__eyebrow">Settings</p>
          <h1 id="settings-title">설정</h1>
        </div>
      </header>

      {state.kind === "loading" && <div className="workspace-route__panel">불러오는 중</div>}
      {state.kind === "auth" && <div className="workspace-route__panel">로그인이 필요합니다</div>}
      {state.kind === "offline" && <div className="workspace-route__panel">API 연결 대기</div>}

      {state.kind === "ready" && (
        <div className="workspace-route__cards">
          <section className="workspace-route__card" aria-label="계정">
            <span className="workspace-route__label">계정</span>
            <strong>{state.user.name}</strong>
            <span>{state.user.email}</span>
          </section>
          <section className="workspace-route__card" aria-label="언어">
            <span className="workspace-route__label">언어</span>
            <strong>{state.user.locale ?? "ko"}</strong>
            <span>{state.user.timezone ?? "Asia/Seoul"}</span>
          </section>
          <section className="workspace-route__card" aria-label="데스크탑 앱">
            <span className="workspace-route__label">데스크탑 앱</span>
            <strong>로컬 기능은 앱에서 관리</strong>
            <span>폴더 동기화와 위젯 설정은 Tauri 연결 뒤 표시합니다.</span>
          </section>
        </div>
      )}
    </section>
  );
}
