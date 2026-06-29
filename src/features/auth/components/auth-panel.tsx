"use client";

import Link from "next/link";
import type { CSSProperties, PointerEvent } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { siteConfig } from "@/config/site";
import { authApi } from "@/features/auth/api/authApi";

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

function handleSubmitPointerMove(event: PointerEvent<HTMLAnchorElement>) {
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

function handleSubmitPointerLeave(event: PointerEvent<HTMLAnchorElement>) {
  event.currentTarget.style.setProperty("--button-light-x", "50%");
  event.currentTarget.style.setProperty("--button-light-y", "50%");
  event.currentTarget.style.setProperty("--button-tilt-x", "0deg");
  event.currentTarget.style.setProperty("--button-tilt-y", "0deg");
  event.currentTarget.style.setProperty("--button-shift-x", "0px");
  event.currentTarget.style.setProperty("--button-shift-y", "0px");
}

export function AuthPanel() {
  const googleLoginUrl = authApi.getGoogleAuthorizationUrl();

  return (
    <main
      className="auth-page"
      aria-label="로그인"
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
      <section className="auth-page__intro">
        <Link className="auth-page__brand bubli-wordmark" href="/">
          {siteConfig.name}
        </Link>
        <p className="auth-page__welcome">Welcome!</p>
        <h1>
          <span>받은 자료를,</span>
          <span>오늘 일로 이어갑니다.</span>
        </h1>
        <p>프리랜서를 위한 업무 비서</p>
      </section>

      <GlassPanel as="section" className="auth-card">
        <div className="auth-form" aria-label="구글 계정 로그인">
          <a
            className="bubli-button bubli-button--primary bubli-button--lg auth-card__submit"
            href={googleLoginUrl}
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
          >
            <GoogleIcon />
            Google로 계속하기
          </a>
        </div>
      </GlassPanel>
    </main>
  );
}
