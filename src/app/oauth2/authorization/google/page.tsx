"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";

export default function LegacyGoogleAuthorizationPage() {
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startGoogleLogin() {
      try {
        const { authorizeUrl } = await authApi.getGoogleAuthorizationUrl({
          state: "login",
        });

        if (!cancelled) {
          window.location.replace(authorizeUrl);
        }
      } catch {
        if (!cancelled) {
          setErrorText("로그인 시작에 실패했습니다. 잠시 뒤 다시 시도하세요.");
        }
      }
    }

    void startGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="auth-page" aria-label="구글 로그인 이동">
      <section className="auth-page__intro">
        <Link className="auth-page__brand bubli-wordmark" href="/">
          Bubli
        </Link>
        <p className="auth-page__welcome">Welcome!</p>
        <h1>
          <span>구글 로그인으로,</span>
          <span>이동하고 있습니다.</span>
        </h1>
      </section>

      <GlassPanel as="section" className="auth-card">
        <div className="auth-form" aria-live="polite">
          <p className="auth-card__helper">{errorText ?? "잠시만 기다려 주세요."}</p>
          {errorText ? (
            <Link className="bubli-button bubli-button--primary bubli-button--lg auth-card__submit" href="/login">
              로그인 화면으로 돌아가기
            </Link>
          ) : null}
        </div>
      </GlassPanel>
    </main>
  );
}
