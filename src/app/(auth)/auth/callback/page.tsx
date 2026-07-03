"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { getAuthRedirectUri, resolveAuthClientType } from "@/lib/auth/auth-session";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const router = useRouter();
  const [statusText, setStatusText] = useState(t("auth.callback.checking"));
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code) {
        setErrorText(t("auth.callback.noCode"));
        setStatusText(t("auth.callback.failedStatus"));
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

        setStatusText(t("auth.callback.redirecting"));
        router.replace(resolveReturnPath(state));
      } catch {
        if (cancelled) {
          return;
        }

        setErrorText(t("auth.callback.failedRetry"));
        setStatusText(t("auth.callback.failedStatus"));
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  return (
    <main className="auth-page" aria-label={t("auth.callback.pageAria")}>
      <section className="auth-page__intro">
        <Link className="auth-page__brand bubli-wordmark" href="/">
          Bubli
        </Link>
        <p className="auth-page__welcome">Welcome!</p>
        <h1>
          <span>{t("auth.callback.headingLine1")}</span>
          <span>{t("auth.callback.headingLine2")}</span>
        </h1>
      </section>

      <GlassPanel as="section" className="auth-card">
        <div className="auth-form" aria-live="polite">
          <p className="auth-card__helper">{statusText}</p>
          {errorText ? <p className="auth-card__error">{errorText}</p> : null}
          {errorText ? (
            <Link className="bubli-button bubli-button--primary bubli-button--lg auth-card__submit" href="/login">
              {t("auth.callback.retryLogin")}
            </Link>
          ) : null}
        </div>
      </GlassPanel>
    </main>
  );
}
