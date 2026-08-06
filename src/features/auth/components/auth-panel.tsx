"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { siteConfig } from "@/config/site";
import { AuthConfigurationError, authApi } from "@/features/auth/api/authApi";
import { useLiveAuthState } from "@/features/auth/hooks/use-live-auth-user";
import { saveAuthUserLocale } from "@/features/auth/lib/user-locale";
import { getApiBaseUrl } from "@/lib/api/client";
import {
  getStoredAuthSession,
  restoreStoredAuthSessionFromTauri,
  setStoredAuthSessionAndWaitForTauriMirror,
} from "@/lib/auth/auth-session";
import { readExplicitStoredLocale, useI18n } from "@/lib/i18n";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { isWindowsTauriRuntime } from "@/lib/tauri/platform";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="auth-card__google-icon" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.52z"
        fill="var(--google-blue)"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z"
        fill="var(--google-green)"
      />
      <path
        d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.51l3.35-2.59z"
        fill="var(--google-yellow)"
      />
      <path
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.97 14.7 2 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96z"
        fill="var(--google-red)"
      />
    </svg>
  );
}

function setSignedPointerVars(element: HTMLElement, x: number, y: number) {
  element.style.setProperty("--auth-x", x.toFixed(3));
  element.style.setProperty("--auth-y", y.toFixed(3));
}

function handlePagePointerMove(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  setSignedPointerVars(event.currentTarget, x, y);
}

function handlePagePointerLeave(event: PointerEvent<HTMLElement>) {
  setSignedPointerVars(event.currentTarget, 0, 0);
}

function handleSubmitPointerMove(event: PointerEvent<HTMLButtonElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const signedX = (x - 0.5) * 2;
  const signedY = (y - 0.5) * 2;

  event.currentTarget.style.setProperty("--button-light-x", `${(x * 100).toFixed(1)}%`);
  event.currentTarget.style.setProperty("--button-light-y", `${(y * 100).toFixed(1)}%`);
  event.currentTarget.style.setProperty("--button-tilt-x", `${(-signedY * 4).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--button-tilt-y", `${(signedX * 5).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--button-shift-x", `${(signedX * 7).toFixed(2)}px`);
  event.currentTarget.style.setProperty("--button-shift-y", `${(signedY * 4).toFixed(2)}px`);
}

function handleSubmitPointerLeave(event: PointerEvent<HTMLButtonElement>) {
  event.currentTarget.style.setProperty("--button-light-x", "50%");
  event.currentTarget.style.setProperty("--button-light-y", "50%");
  event.currentTarget.style.setProperty("--button-tilt-x", "0deg");
  event.currentTarget.style.setProperty("--button-tilt-y", "0deg");
  event.currentTarget.style.setProperty("--button-shift-x", "0px");
  event.currentTarget.style.setProperty("--button-shift-y", "0px");
}

function shouldUseTauriDevLogin() {
  return (
    isTauriRuntime() &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN === "true" &&
    Boolean(process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN)
  );
}

const TAURI_LOOPBACK_REDIRECT_URI = "http://127.0.0.1:3791/auth/callback";
const TAURI_MEMBER_APP_ROUTE = "/app/";

function subscribeClientSnapshot() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function createTauriLoginState() {
  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return btoa(JSON.stringify({ nonce, returnTo: TAURI_MEMBER_APP_ROUTE }));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

async function runTauriLoginStep<T>(stage: string, task: () => Promise<T>) {
  try {
    return await task();
  } catch (error) {
    throw new Error(`${stage}: ${getErrorMessage(error)}`);
  }
}

export function AuthPanel() {
  const { t } = useI18n();
  const router = useRouter();
  const liveAuth = useLiveAuthState();
  const liveUser = liveAuth.user;
  const [isStartingLogin, setIsStartingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const hasMounted = useSyncExternalStore(subscribeClientSnapshot, getClientSnapshot, getServerSnapshot);
  const isDevTauriLogin = shouldUseTauriDevLogin();
  const isCheckingExistingSession = liveAuth.status === "checking";
  const submitLabel =
    hasMounted && isTauriRuntime()
      ? t("auth.panel.googleLogin")
      : isCheckingExistingSession
        ? t("common.loading")
        : isStartingLogin
          ? t("auth.panel.googleRedirecting")
          : t("auth.panel.googleLogin");

  // 살아 있는 세션이면 다시 로그인하지 않고 곧바로 앱으로 보낸다.
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;

    async function openStoredTauriSession() {
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      if (!cancelled && session) {
        router.replace(TAURI_MEMBER_APP_ROUTE);
      }
    }

    void openStoredTauriSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (liveUser) {
      router.replace(isTauriRuntime() ? TAURI_MEMBER_APP_ROUTE : "/app");
    }
  }, [liveUser, router]);

  async function handleGoogleLogin() {
    setIsStartingLogin(true);
    setLoginError(null);

    try {
      if (isDevTauriLogin && process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN) {
        await authApi.loginWithDevAccessToken(process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN);
        router.replace(TAURI_MEMBER_APP_ROUTE);
        return;
      }

      if (isTauriRuntime()) {
        const state = createTauriLoginState();
        const { authorizeUrl } = await runTauriLoginStep("authorize", () =>
          tauriCommands.getTauriGoogleAuthorizationUrl({
            apiBaseUrl: getApiBaseUrl(),
            redirectUri: TAURI_LOOPBACK_REDIRECT_URI,
            state,
          }),
        );
        const token = await runTauriLoginStep("complete-oauth", () =>
          tauriCommands.completeTauriGoogleOauth({
            apiBaseUrl: getApiBaseUrl(),
            authorizeUrl,
            expectedState: state,
            redirectUri: TAURI_LOOPBACK_REDIRECT_URI,
          }),
        );
        await runTauriLoginStep("store-session", () =>
          setStoredAuthSessionAndWaitForTauriMirror({ ...token, clientType: "TAURI" }),
        );
        const selectedLocale = readExplicitStoredLocale();
        if (selectedLocale && token.user.locale !== selectedLocale) {
          const savedUser = await runTauriLoginStep(
            "sync-locale",
            () => saveAuthUserLocale(token.user, selectedLocale),
          );
          if (isWindowsTauriRuntime()) {
            await runTauriLoginStep("store-locale-session", () =>
              setStoredAuthSessionAndWaitForTauriMirror({ ...token, clientType: "TAURI", user: savedUser }),
            );
          }
        }
        await tauriCommands.openMainWindowRoute({ route: TAURI_MEMBER_APP_ROUTE }).catch(async () => {
          await tauriCommands.showMainWindow().catch(() => undefined);
        });
        router.replace(TAURI_MEMBER_APP_ROUTE);
        return;
      }

      const { authorizeUrl } = await authApi.getGoogleAuthorizationUrl({
        state: "login",
      });
      window.location.assign(authorizeUrl);
    } catch (error) {
      setLoginError(
        error instanceof AuthConfigurationError
          ? t("auth.panel.errorConfig")
          : isTauriRuntime()
            ? `로그인 처리 실패: ${getErrorMessage(error)}`
            : t("auth.panel.errorStart"),
      );
      setIsStartingLogin(false);
    }
  }

  return (
    <main
      className="auth-page"
      aria-label={t("auth.panel.pageAria")}
      onPointerLeave={handlePagePointerLeave}
      onPointerMove={handlePagePointerMove}
      style={{ "--auth-x": 0, "--auth-y": 0 } as CSSProperties}
    >
      <div className="auth-page__motion" aria-hidden="true">
        <video autoPlay loop muted playsInline preload="metadata">
          <source src="/landing/login-bubble-flow.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="auth-page__bubble-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <GlassPanel as="section" className="auth-card">
        <div className="auth-card__head">
          <Link className="auth-card__brand bubli-wordmark" href="/">
            {siteConfig.name}
          </Link>
          <h1 className="auth-card__heading">
            <span>{t("auth.panel.headingLine1")}</span>
            <span>{t("auth.panel.headingLine2")}</span>
          </h1>
          <p className="auth-card__tagline">{t("auth.panel.tagline")}</p>
        </div>
        <div className="auth-form" aria-label={t("auth.panel.formAria")}>
          {liveUser ? (
            <div className="auth-card__session">
              <p className="auth-card__session-notice">{t("auth.panel.sessionNotice", { name: liveUser.name })}</p>
              <Link className="auth-card__session-link" href="/app">
                {t("auth.panel.sessionOpenApp")}
              </Link>
            </div>
          ) : null}
          <button
            className="bubli-button bubli-button--primary bubli-button--lg auth-card__submit"
            aria-busy={isStartingLogin || isCheckingExistingSession}
            disabled={isStartingLogin || isCheckingExistingSession}
            onClick={handleGoogleLogin}
            onPointerLeave={handleSubmitPointerLeave}
            onPointerMove={handleSubmitPointerMove}
            style={
              {
                "--button-light-x": "50%",
                "--button-light-y": "50%",
                "--button-shift-x": "0px",
                "--button-shift-y": "0px",
                "--button-tilt-x": "0deg",
                "--button-tilt-y": "0deg",
              } as CSSProperties
            }
            type="button"
          >
            <GoogleIcon />
            {submitLabel}
          </button>
          {loginError ? <p className="auth-card__error">{loginError}</p> : null}
        </div>
      </GlassPanel>
    </main>
  );
}
