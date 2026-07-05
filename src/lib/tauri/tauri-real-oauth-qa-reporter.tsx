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

type RealOAuthQaEvent = {
  attemptCount?: number;
  failedCheckCount?: number;
  failedChecks?: string[];
  hasReportUrl?: boolean;
  isDesktopWidgetSurface?: boolean;
  isTauri?: boolean;
  ok?: boolean;
  pathname: string;
  reason: string;
  runtimeSmokeEnabled?: boolean;
  stage: "assertion" | "disposed" | "mounted" | "report-error" | "report-posted" | "run-start" | "skipped";
  timestamp: string;
};

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const realOAuthQaEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";
const realOAuthQaEventUrl = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_EVENT_URL;
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

function timeoutAfter<T>(ms: number, message: string) {
  return new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), ms));
}

function remainingQaMs(startedAt: number) {
  return Math.max(0, realOAuthQaTimeoutMs - (Date.now() - startedAt));
}

async function assertTauriRealGoogleAuthWidgetQaBeforeTimeout(startedAt: number) {
  const remainingMs = remainingQaMs(startedAt);
  if (remainingMs <= 0) {
    throw new Error("Timed out before starting the next real OAuth QA assertion.");
  }

  return Promise.race([
    assertTauriRealGoogleAuthWidgetQa(),
    timeoutAfter<TauriRealGoogleAuthWidgetQaAssertion>(
      remainingMs,
      "Timed out while waiting for one real OAuth QA assertion to finish.",
    ),
  ]);
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

function postRealOAuthQaEvent(event: Omit<RealOAuthQaEvent, "timestamp">) {
  if (!realOAuthQaEventUrl) {
    return;
  }

  void fetch(realOAuthQaEventUrl, {
    body: JSON.stringify({ ...event, timestamp: new Date().toISOString() }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
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
    const isTauri = isTauriRuntime();
    const skipReasons = [
      !isTauri ? "not-tauri-runtime" : null,
      isDesktopWidgetSurface ? "desktop-widget-surface" : null,
      runtimeSmokeEnabled ? "runtime-smoke-enabled" : null,
      !realOAuthQaEnabled ? "real-oauth-qa-disabled" : null,
      !realOAuthQaReportUrl ? "missing-report-url" : null,
    ].filter((reason): reason is string => Boolean(reason));

    if (realOAuthQaEnabled) {
      postRealOAuthQaEvent({
        hasReportUrl: Boolean(realOAuthQaReportUrl),
        isDesktopWidgetSurface,
        isTauri,
        pathname,
        reason: "effect-mounted",
        runtimeSmokeEnabled,
        stage: "mounted",
      });
    }

    if (
      !isTauri ||
      isDesktopWidgetSurface ||
      runtimeSmokeEnabled ||
      !realOAuthQaEnabled ||
      !realOAuthQaReportUrl
    ) {
      if (realOAuthQaEnabled) {
        postRealOAuthQaEvent({
          hasReportUrl: Boolean(realOAuthQaReportUrl),
          isDesktopWidgetSurface,
          isTauri,
          pathname,
          reason: skipReasons.join(",") || "unknown",
          runtimeSmokeEnabled,
          stage: "skipped",
        });
      }
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
        postRealOAuthQaEvent({ pathname, reason, stage: "run-start" });
        while (!disposed && Date.now() - startedAt <= realOAuthQaTimeoutMs) {
          attemptCount += 1;
          latestAssertion = await assertTauriRealGoogleAuthWidgetQaBeforeTimeout(startedAt);
          if (attemptCount === 1 || latestAssertion.ok) {
            postRealOAuthQaEvent({
              attemptCount,
              failedCheckCount: latestAssertion.failedChecks.length,
              failedChecks: latestAssertion.failedChecks,
              ok: latestAssertion.ok,
              pathname,
              reason,
              stage: "assertion",
            });
          }

          if (latestAssertion.ok) {
            const report = reportPayload("passed", startedAt, reason, attemptCount, latestAssertion);
            await postRealOAuthQaReport(report);
            postRealOAuthQaEvent({ attemptCount, ok: true, pathname, reason, stage: "report-posted" });
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
          postRealOAuthQaEvent({ attemptCount, ok: false, pathname, reason, stage: "report-posted" });
          reported = true;
        }
      } catch (error) {
        if (!disposed) {
          postRealOAuthQaEvent({
            attemptCount,
            failedChecks: latestAssertion?.failedChecks,
            failedCheckCount: latestAssertion?.failedChecks.length,
            ok: latestAssertion?.ok,
            pathname,
            reason: error instanceof Error ? error.message : String(error),
            stage: "report-error",
          });
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
      postRealOAuthQaEvent({ pathname, reason: "effect-disposed", stage: "disposed" });
      window.clearTimeout(initialTimer);
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isDesktopWidgetSurface, pathname]);

  return null;
}
