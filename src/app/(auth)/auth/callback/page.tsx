"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { getAuthRedirectUri, resolveAuthClientType } from "@/lib/auth/auth-session";

function resolveReturnPath(state: string | null) {
  if (!state || state === "login") {
    return "/app";
  }

  try {
    const parsed = JSON.parse(atob(state)) as { returnTo?: string };
    if (parsed.returnTo?.startsWith("/app")) {
      return parsed.returnTo;
    }
  } catch {
    return "/app";
  }

  return "/app";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("로그인을 확인하고 있습니다.");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code) {
        setErrorText("Google에서 받은 로그인 코드가 없습니다.");
        setStatusText("로그인을 완료하지 못했습니다.");
        return;
      }

      try {
        await authApi.callbackGoogle({
          clientType: resolveAuthClientType(),
          code,
          redirectUri: getAuthRedirectUri(),
        });

        if (cancelled) {
          return;
        }

        setStatusText("업무 화면으로 이동합니다.");
        router.replace(resolveReturnPath(state));
      } catch {
        if (cancelled) {
          return;
        }

        setErrorText("로그인을 완료하지 못했습니다. 다시 시도하세요.");
        setStatusText("로그인을 완료하지 못했습니다.");
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="auth-page" aria-label="로그인 확인">
      <section className="auth-page__intro">
        <Link className="auth-page__brand bubli-wordmark" href="/">
          Bubli
        </Link>
        <p className="auth-page__welcome">Welcome!</p>
        <h1>
          <span>로그인을 확인하고,</span>
          <span>오늘 일을 이어갑니다.</span>
        </h1>
      </section>

      <GlassPanel as="section" className="auth-card">
        <div className="auth-form" aria-live="polite">
          <p className="auth-card__helper">{statusText}</p>
          {errorText ? <p className="auth-card__error">{errorText}</p> : null}
          {errorText ? (
            <Link className="bubli-button bubli-button--primary bubli-button--lg auth-card__submit" href="/login">
              다시 로그인
            </Link>
          ) : null}
        </div>
      </GlassPanel>
    </main>
  );
}
