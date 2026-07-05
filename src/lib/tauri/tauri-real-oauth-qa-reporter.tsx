"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { AUTH_SESSION_CHANGE_EVENT } from "@/lib/auth/auth-session";
import {
  assertTauriRealGoogleAuthWidgetQa,
  type TauriRealGoogleAuthWidgetQaAssertion,
} from "@/lib/tauri/tauri-auth-widget-qa";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

type RealOAuthQaReport = {
  assertion?: TauriRealGoogleAuthWidgetQaAssertion;
  attemptCount: number;
  durationMs: number;
  error?: string;
  finishedAt: string;
  platform: string;
  reason: string;
  status: "failed" | "passed";
};

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const realOAuthQaEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";
const realOAuthQaReportUrl = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL;
const realOAuthQaTimeoutMs = readPositiveNumber(
  process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS,
  300_000,
);
const realOAuthQaIntervalMs = readPositiveNumber(
  process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_INTERVAL_MS,
  2_000,
);

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function postRealOAuthQaReport(report: RealOAuthQaReport) {
  if (!realOAuthQaReportUrl) {
    throw new Error("Tauri real OAuth QA report URL is not configured.");
  }

  const response = await fetch(realOAuthQaReportUrl, {
    body: JSON.stringify(report),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Tauri real OAuth QA report failed with HTTP ${response.status}.`);
  }
}

function reportPayload(
  status: RealOAuthQaReport["status"],
  startedAt: number,
  reason: string,
  attemptCount: number,
  assertion?: TauriRealGoogleAuthWidgetQaAssertion,
  error?: string,
): RealOAuthQaReport {
  return {
    assertion,
    attemptCount,
    durationMs: Date.now() - startedAt,
    error,
    finishedAt: new Date().toISOString(),
    platform: navigator.userAgent,
    reason,
    status,
  };
}

export function TauriRealOAuthQaReporter() {
  const pathname = usePathname();
  const isDesktopWidgetSurface = pathname === "/desktop-widget" || pathname.startsWith("/desktop-widget/");

  useEffect(() => {
    if (
      !isTauriRuntime() ||
      isDesktopWidgetSurface ||
      runtimeSmokeEnabled ||
      !realOAuthQaEnabled ||
      !realOAuthQaReportUrl
    ) {
      return;
    }

    let disposed = false;
    let running = false;
    let reported = false;

    async function runRealOAuthQa(reason: string) {
      if (running || reported || disposed) {
        return;
      }

      running = true;
      const startedAt = Date.now();
      let attemptCount = 0;
      let latestAssertion: TauriRealGoogleAuthWidgetQaAssertion | undefined;

      try {
        while (!disposed && Date.now() - startedAt <= realOAuthQaTimeoutMs) {
          attemptCount += 1;
          latestAssertion = await assertTauriRealGoogleAuthWidgetQa();

          if (latestAssertion.ok) {
            const report = reportPayload("passed", startedAt, reason, attemptCount, latestAssertion);
            await postRealOAuthQaReport(report);
            reported = true;
            return;
          }

          await sleep(realOAuthQaIntervalMs);
        }

        if (!disposed) {
          const report = reportPayload(
            "failed",
            startedAt,
            reason,
            attemptCount,
            latestAssertion,
            "Timed out waiting for a real Google TAURI session with all widgets ready.",
          );
          await postRealOAuthQaReport(report);
          reported = true;
        }
      } catch (error) {
        if (!disposed) {
          const report = reportPayload(
            "failed",
            startedAt,
            reason,
            attemptCount,
            latestAssertion,
            error instanceof Error ? error.message : String(error),
          );
          await postRealOAuthQaReport(report).catch(() => undefined);
          reported = true;
        }
      } finally {
        running = false;
      }
    }

    const handleAuthSessionChange = () => void runRealOAuthQa("auth-session-change");
    const initialTimer = window.setTimeout(() => void runRealOAuthQa("mount"), 1_000);
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      disposed = true;
      window.clearTimeout(initialTimer);
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isDesktopWidgetSurface]);

  return null;
}
