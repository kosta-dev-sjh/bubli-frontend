"use client";

// 구글 캘린더 OAuth 리다이렉트 수신 페이지 — 백엔드 google.calendar.redirect-uri
// 기본값(/calendar/google/callback)과 짝을 이룬다. 받은 code를
// POST /api/calendar/google/callback으로 교환한 뒤 일정 화면으로 돌아간다.
// 연결 버튼(일정/설정 화면)은 로그인 세션에서만 노출되므로 별도 인증 게이트는 두지 않고,
// 세션 만료 등으로 교환에 실패하면 안내 문구와 돌아가기 링크만 보여준다.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { calendarApi, googleCalendarRedirectUri } from "@/features/calendar/api/calendarApi";
import { useI18n } from "@/lib/i18n";

export default function GoogleCalendarCallbackPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [statusText, setStatusText] = useState(t("calendar.googleCallback.connecting"));
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeConnect() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      // 사용자가 구글 동의 화면에서 취소하면 code 없이 error 파라미터만 돌아온다.
      if (!code) {
        setErrorText(t("calendar.googleCallback.noCode"));
        setStatusText(t("calendar.googleCallback.failedStatus"));
        return;
      }

      try {
        await calendarApi.callbackGoogle({ code, redirectUri: googleCalendarRedirectUri() });

        if (cancelled) {
          return;
        }

        setStatusText(t("calendar.googleCallback.redirecting"));
        router.replace("/app/calendar");
      } catch {
        if (cancelled) {
          return;
        }

        setErrorText(t("calendar.googleCallback.failed"));
        setStatusText(t("calendar.googleCallback.failedStatus"));
      }
    }

    void completeConnect();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  return (
    <main aria-label={t("calendar.googleCallback.pageAria")} className="auth-page">
      <GlassPanel as="section" className="auth-card">
        <div className="auth-card__head">
          <Link className="auth-card__brand bubli-wordmark" href="/">
            Bubli
          </Link>
          <h1 className="auth-card__heading">
            <span>{t("calendar.googleCallback.heading")}</span>
          </h1>
        </div>
        <div aria-live="polite" className="auth-form">
          <p className="auth-card__helper">{statusText}</p>
          {errorText ? <p className="auth-card__error">{errorText}</p> : null}
          {errorText ? (
            <Link className="bubli-button bubli-button--primary bubli-button--lg auth-card__submit" href="/app/calendar">
              {t("calendar.googleCallback.back")}
            </Link>
          ) : null}
        </div>
      </GlassPanel>
    </main>
  );
}
