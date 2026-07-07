"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  AUTH_SESSION_CHANGE_EVENT,
  getStoredAuthSessionDiagnostics,
  readTauriAuthSessionDiagnostics,
} from "@/lib/auth/auth-session";
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
  routeProbe: RealOAuthQaRouteProbe;
  status: "failed" | "passed";
};

type RealOAuthQaRouteEntry = {
  hasAuthGate: boolean;
  hasLoginSurface: boolean;
  pathname: string;
  timestamp: string;
};

type RealOAuthQaRouteProbe = {
  expectedPathPrefix: "/app";
  finalPathname: string;
  history: RealOAuthQaRouteEntry[];
  ok: boolean;
  sawAuthGateAfterGrace: boolean;
  sawLoginPathAfterGrace: boolean;
  sawLoginSurfaceAfterGrace: boolean;
  sampleCount: number;
};

type RealOAuthQaEvent = {
  attemptCount?: number;
  failedCheckCount?: number;
  failedChecks?: string[];
  hasReportUrl?: boolean;
  isDesktopWidgetSurface?: boolean;
  isTauri?: boolean;
  missingVisibleBubbles?: string[];
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
const realOAuthQaAttemptTimeoutMs = readPositiveNumber(
  process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_ATTEMPT_TIMEOUT_MS,
  60_000,
);
const routeProbeGraceMs = 1_500;
const routeProbeMaxHistory = 40;
const missingAuthSessionReportAttempts = 3;
let realOAuthQaRunActive = false;
let realOAuthQaReportPosted = false;

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
      Math.min(remainingMs, realOAuthQaAttemptTimeoutMs),
      "Timed out while waiting for one real OAuth QA assertion to finish.",
    ),
  ]);
}

function isQaAssertionAttemptTimeout(error: unknown) {
  return error instanceof Error && error.message.includes("Timed out while waiting for one real OAuth QA assertion");
}

async function hasAnyStoredAuthSessionForQa() {
  const localSession = getStoredAuthSessionDiagnostics();
  if (localSession.hasSession) {
    return true;
  }

  const tauriMirrorSession = await readTauriAuthSessionDiagnostics();
  return tauriMirrorSession.hasSession;
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

function currentPathname(fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.location.pathname || fallback;
}

function readRouteEntry(pathname: string): RealOAuthQaRouteEntry {
  return {
    hasAuthGate: typeof document !== "undefined" && Boolean(document.querySelector(".bubli-auth-gate")),
    hasLoginSurface: typeof document !== "undefined" && Boolean(document.querySelector(".auth-page .auth-card__submit")),
    pathname,
    timestamp: new Date().toISOString(),
  };
}

function pruneRouteHistory(history: RealOAuthQaRouteEntry[]) {
  if (history.length <= routeProbeMaxHistory) return history;
  return history.slice(history.length - routeProbeMaxHistory);
}

function reportPayload(
  status: RealOAuthQaReport["status"],
  startedAt: number,
  reason: string,
  attemptCount: number,
  routeProbe: RealOAuthQaRouteProbe,
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
    routeProbe,
    status,
  };
}

export function TauriRealOAuthQaReporter() {
  const pathname = usePathname();
  const isDesktopWidgetSurface = pathname === "/desktop-widget" || pathname.startsWith("/desktop-widget/");
  const pathnameRef = useRef(pathname);
  const routeHistoryRef = useRef<RealOAuthQaRouteEntry[]>([]);
  const routeProbeStateRef = useRef({
    runStartedAt: 0,
    sampleCount: 0,
    sawAuthGateAfterGrace: false,
    sawLoginPathAfterGrace: false,
    sawLoginSurfaceAfterGrace: false,
  });

  const recordRouteSample = useCallback((nextPathname = currentPathname(pathnameRef.current)) => {
    const entry = readRouteEntry(nextPathname);
    routeHistoryRef.current = pruneRouteHistory([...routeHistoryRef.current, entry]);

    const runStartedAt = routeProbeStateRef.current.runStartedAt;
    const afterGrace = runStartedAt > 0 && Date.now() - runStartedAt >= routeProbeGraceMs;
    routeProbeStateRef.current.sampleCount += 1;
    if (afterGrace) {
      routeProbeStateRef.current.sawAuthGateAfterGrace ||= entry.hasAuthGate;
      routeProbeStateRef.current.sawLoginPathAfterGrace ||= entry.pathname === "/login";
      routeProbeStateRef.current.sawLoginSurfaceAfterGrace ||= entry.hasLoginSurface;
    }

    return entry;
  }, []);

  const buildRouteProbe = useCallback((): RealOAuthQaRouteProbe => {
    const finalPathname = currentPathname(pathnameRef.current);
    const finalEntry = recordRouteSample(finalPathname);
    const state = routeProbeStateRef.current;
    const history = pruneRouteHistory([...routeHistoryRef.current]);

    return {
      expectedPathPrefix: "/app",
      finalPathname,
      history,
      ok:
        finalPathname.startsWith("/app") &&
        !state.sawAuthGateAfterGrace &&
        !state.sawLoginPathAfterGrace &&
        !state.sawLoginSurfaceAfterGrace &&
        !finalEntry.hasAuthGate &&
        !finalEntry.hasLoginSurface,
      sawAuthGateAfterGrace: state.sawAuthGateAfterGrace,
      sawLoginPathAfterGrace: state.sawLoginPathAfterGrace,
      sawLoginSurfaceAfterGrace: state.sawLoginSurfaceAfterGrace,
      sampleCount: state.sampleCount,
    };
  }, [recordRouteSample]);

  useEffect(() => {
    pathnameRef.current = pathname;
    recordRouteSample(pathname);
  }, [pathname, recordRouteSample]);

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
        pathname: pathnameRef.current,
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
          pathname: pathnameRef.current,
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
      if (running || reported || disposed || realOAuthQaRunActive || realOAuthQaReportPosted) {
        return;
      }

      running = true;
      realOAuthQaRunActive = true;
      const startedAt = Date.now();
      let attemptCount = 0;
      let missingAuthSessionCount = 0;
      let latestAssertion: TauriRealGoogleAuthWidgetQaAssertion | undefined;
      routeProbeStateRef.current = {
        runStartedAt: startedAt,
        sampleCount: 0,
        sawAuthGateAfterGrace: false,
        sawLoginPathAfterGrace: false,
        sawLoginSurfaceAfterGrace: false,
      };
      const routeProbeTimer = window.setInterval(() => recordRouteSample(), 250);

      try {
        postRealOAuthQaEvent({ pathname: pathnameRef.current, reason, stage: "run-start" });
        while (!disposed && Date.now() - startedAt <= realOAuthQaTimeoutMs) {
          attemptCount += 1;
          try {
            latestAssertion = await assertTauriRealGoogleAuthWidgetQaBeforeTimeout(startedAt);
          } catch (error) {
            if (!isQaAssertionAttemptTimeout(error)) {
              throw error;
            }
            const reasonMessage = error instanceof Error ? error.message : String(error);
            postRealOAuthQaEvent({
              attemptCount,
              failedChecks: latestAssertion?.failedChecks,
              failedCheckCount: latestAssertion?.failedChecks.length,
              missingVisibleBubbles: latestAssertion?.snapshot.widgetRuntime.missingVisibleBubbles,
              ok: latestAssertion?.ok,
              pathname: pathnameRef.current,
              reason: reasonMessage,
              stage: "assertion",
            });
            await sleep(realOAuthQaIntervalMs);
            continue;
          }
          if (await hasAnyStoredAuthSessionForQa()) {
            missingAuthSessionCount = 0;
          } else {
            missingAuthSessionCount += 1;
          }
          if (attemptCount === 1 || latestAssertion.ok || attemptCount % 3 === 0) {
            postRealOAuthQaEvent({
              attemptCount,
              failedCheckCount: latestAssertion.failedChecks.length,
              failedChecks: latestAssertion.failedChecks,
              missingVisibleBubbles: latestAssertion.snapshot.widgetRuntime.missingVisibleBubbles,
              ok: latestAssertion.ok,
              pathname: pathnameRef.current,
              reason,
              stage: "assertion",
            });
          }

          if (latestAssertion.ok) {
            const report = reportPayload("passed", startedAt, reason, attemptCount, buildRouteProbe(), latestAssertion);
            await postRealOAuthQaReport(report);
            postRealOAuthQaEvent({ attemptCount, ok: true, pathname: pathnameRef.current, reason, stage: "report-posted" });
            reported = true;
            realOAuthQaReportPosted = true;
            return;
          }

          if (missingAuthSessionCount >= missingAuthSessionReportAttempts) {
            const report = reportPayload(
              "failed",
              startedAt,
              reason,
              attemptCount,
              buildRouteProbe(),
              latestAssertion,
              "Missing a real Google TAURI session; complete Google login before running release QA.",
            );
            await postRealOAuthQaReport(report);
            postRealOAuthQaEvent({
              attemptCount,
              ok: false,
              pathname: pathnameRef.current,
              reason: "missing-auth-session",
              stage: "report-posted",
            });
            reported = true;
            realOAuthQaReportPosted = true;
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
            buildRouteProbe(),
            latestAssertion,
            "Timed out waiting for a real Google TAURI session with all widgets ready.",
          );
          await postRealOAuthQaReport(report);
          postRealOAuthQaEvent({ attemptCount, ok: false, pathname: pathnameRef.current, reason, stage: "report-posted" });
          reported = true;
          realOAuthQaReportPosted = true;
        }
      } catch (error) {
        if (!disposed) {
          postRealOAuthQaEvent({
            attemptCount,
            failedChecks: latestAssertion?.failedChecks,
            failedCheckCount: latestAssertion?.failedChecks.length,
            missingVisibleBubbles: latestAssertion?.snapshot.widgetRuntime.missingVisibleBubbles,
            ok: latestAssertion?.ok,
            pathname: pathnameRef.current,
            reason: error instanceof Error ? error.message : String(error),
            stage: "report-error",
          });
          const report = reportPayload(
            "failed",
            startedAt,
            reason,
            attemptCount,
            buildRouteProbe(),
            latestAssertion,
            error instanceof Error ? error.message : String(error),
          );
          await postRealOAuthQaReport(report).catch(() => undefined);
          reported = true;
          realOAuthQaReportPosted = true;
        }
      } finally {
        window.clearInterval(routeProbeTimer);
        running = false;
        realOAuthQaRunActive = false;
      }
    }

    const handleAuthSessionChange = () => void runRealOAuthQa("auth-session-change");
    const initialTimer = window.setTimeout(() => void runRealOAuthQa("mount"), 1_000);
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      if (!running) {
        disposed = true;
      }
      postRealOAuthQaEvent({ pathname: pathnameRef.current, reason: "effect-disposed", stage: "disposed" });
      window.clearTimeout(initialTimer);
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
    }, [buildRouteProbe, isDesktopWidgetSurface, recordRouteSample]);

  return null;
}
