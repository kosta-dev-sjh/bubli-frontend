"use client";

import { settingsApi } from "@/features/settings/api/settingsApi";
import {
  recordCurrentActivityContext,
  resetIncrementalActivityCheckpoint,
  syncLocalActivityBufferToServer,
} from "@/lib/local/activity-client";
import { translate } from "@/lib/i18n/translate";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";
import type { ActivityContextRecordAdapterResult } from "@/types/local";

const DEFAULT_ACTIVITY_CAPTURE_INTERVAL_MS = 30_000;
const ACTIVITY_CAPTURE_INTERVAL_MS = resolveActivityCaptureIntervalMs();
const CONSENT_REFRESH_INTERVAL_MS = 60_000;

let captureIntervalId: number | null = null;
let captureInFlight = false;
let captureInFlightPromise: Promise<void> | null = null;
let cachedConsent: boolean | null = null;
let cachedConsentCheckedAt = 0;
let activityConsentRevision = 0;

type ActivityAutoCaptureStopInput = {
  flush?: boolean;
};

export type ActivityAutoCaptureStatus = {
  lastAppName?: string;
  lastAttemptAt?: string;
  lastErrorMessage?: string;
  lastMessage?: string;
  lastStatus: "idle" | "capturing" | "recorded" | "waiting" | "blocked" | "failed" | "stopped";
  lastSuccessAt?: string;
  lastWindowTitle?: string;
  running: boolean;
};

type ActivityAutoCaptureStatusListener = (status: ActivityAutoCaptureStatus) => void;

let captureStatus: ActivityAutoCaptureStatus = {
  lastStatus: "idle",
  running: false,
};
const statusListeners = new Set<ActivityAutoCaptureStatusListener>();

export function startActivityAutoCapture() {
  if (!isTauriRuntime()) return;
  if (captureIntervalId !== null) return;

  updateActivityAutoCaptureStatus({ lastErrorMessage: undefined, lastStatus: "capturing", running: true });
  void captureActivityOnce();
  captureIntervalId = window.setInterval(() => {
    void captureActivityOnce();
  }, ACTIVITY_CAPTURE_INTERVAL_MS);
}

export async function stopActivityAutoCapture(input?: ActivityAutoCaptureStopInput) {
  if (captureIntervalId !== null) {
    window.clearInterval(captureIntervalId);
  }

  captureIntervalId = null;
  updateActivityAutoCaptureStatus({ lastStatus: "stopped", running: false });

  if (input?.flush) {
    await flushActivityAutoCapture();
  }

  await mirrorNativeActivityConsent(false);

  captureInFlight = false;
  captureInFlightPromise = null;
  cachedConsent = null;
  cachedConsentCheckedAt = 0;
  resetIncrementalActivityCheckpoint();
}

export function isActivityAutoCaptureRunning() {
  return captureIntervalId !== null;
}

export function getActivityAutoCaptureStatus(): ActivityAutoCaptureStatus {
  return captureStatus;
}

export function subscribeActivityAutoCaptureStatus(listener: ActivityAutoCaptureStatusListener) {
  statusListeners.add(listener);
  listener(captureStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function notifyActivityConsentChanged(enabled: boolean) {
  cachedConsent = enabled;
  cachedConsentCheckedAt = Date.now();
  activityConsentRevision += 1;
  void mirrorNativeActivityConsent(enabled);

  if (!enabled) {
    if (captureIntervalId !== null) {
      window.clearInterval(captureIntervalId);
    }
    captureIntervalId = null;
    resetIncrementalActivityCheckpoint();
    updateActivityAutoCaptureStatus({ lastMessage: undefined, lastStatus: "stopped", running: false });
    return;
  }

  startActivityAutoCapture();
}

async function captureActivityOnce() {
  if (captureInFlight) {
    return captureInFlightPromise ?? Promise.resolve();
  }

  captureInFlight = true;
  updateActivityAutoCaptureStatus({
    lastAttemptAt: new Date().toISOString(),
    lastErrorMessage: undefined,
    lastStatus: "capturing",
    running: isAutoCaptureActive(),
  });
  captureInFlightPromise = (async () => {
    try {
      const revision = activityConsentRevision;
      const consentGranted = await readActivityConsent();
      if (!consentGranted || revision !== activityConsentRevision) {
        updateActivityAutoCaptureStatus({
          lastMessage: undefined,
          lastStatus: "stopped",
          running: isAutoCaptureActive(),
        });
        return;
      }

      const result = await recordCurrentActivityContext({
        consentGranted,
        recordMode: "incremental",
        roomId: getActiveProjectRoomId(),
      });
      updateActivityAutoCaptureStatus(statusFromRecordResult(result));
    } catch {
      cachedConsent = null;
      cachedConsentCheckedAt = 0;
      updateActivityAutoCaptureStatus({
        lastErrorMessage: translate("activity.detection.autoCapture.captureFailedMessage"),
        lastStatus: "failed",
        running: isAutoCaptureActive(),
      });
    } finally {
      captureInFlight = false;
      captureInFlightPromise = null;
    }
  })();

  return captureInFlightPromise;
}

export async function flushActivityAutoCapture() {
  if (!isTauriRuntime()) return;
  if (captureInFlightPromise) {
    await captureInFlightPromise.catch(() => undefined);
  }
  if (captureInFlight) return;

  captureInFlight = true;
  updateActivityAutoCaptureStatus({
    lastAttemptAt: new Date().toISOString(),
    lastErrorMessage: undefined,
    lastStatus: "capturing",
    running: isAutoCaptureActive(),
  });
  captureInFlightPromise = (async () => {
    try {
      const consentGranted = await readActivityConsent();
      if (!consentGranted) {
        updateActivityAutoCaptureStatus({ lastStatus: "stopped", running: isAutoCaptureActive() });
        return;
      }

      const result = await recordCurrentActivityContext({
        consentGranted,
        recordMode: "incremental",
        roomId: getActiveProjectRoomId(),
      }).catch(() => undefined);
      if (result) {
        updateActivityAutoCaptureStatus(statusFromRecordResult(result));
      }
      await syncLocalActivityBufferToServer({ consentGranted, limit: 20 }).catch(() => undefined);
    } catch {
      cachedConsent = null;
      cachedConsentCheckedAt = 0;
      updateActivityAutoCaptureStatus({
        lastErrorMessage: translate("activity.detection.autoCapture.flushFailedMessage"),
        lastStatus: "failed",
        running: isAutoCaptureActive(),
      });
    } finally {
      captureInFlight = false;
      captureInFlightPromise = null;
    }
  })();

  return captureInFlightPromise;
}

async function readActivityConsent() {
  const now = Date.now();
  if (cachedConsent !== null && now - cachedConsentCheckedAt < CONSENT_REFRESH_INTERVAL_MS) {
    return cachedConsent;
  }

  const privacy = await settingsApi.getPrivacyConsents();
  cachedConsent = Boolean(privacy.activityDetectionEnabled);
  cachedConsentCheckedAt = now;
  await mirrorNativeActivityConsent(cachedConsent);
  return cachedConsent;
}

async function mirrorNativeActivityConsent(enabled: boolean) {
  if (!isTauriRuntime()) return;
  await tauriCommands.setActivityContextConsent({ enabled }).catch(() => {
    updateActivityAutoCaptureStatus({
      lastErrorMessage: translate("activity.detection.autoCapture.nativeConsentFailedMessage"),
      lastStatus: "failed",
      running: isAutoCaptureActive(),
    });
  });
}

function statusFromRecordResult(result: ActivityContextRecordAdapterResult): Partial<ActivityAutoCaptureStatus> {
  if (result.status === "ready") {
    return {
      lastAppName: result.data.appName,
      lastErrorMessage: undefined,
      lastMessage: result.message,
      lastStatus: "recorded",
      lastSuccessAt: new Date().toISOString(),
      lastWindowTitle: result.data.windowTitle,
      running: isAutoCaptureActive(),
    };
  }

  if (result.status === "blocked") {
    return {
      lastErrorMessage: undefined,
      lastMessage: result.message,
      lastStatus: result.reason === "activity_consent_required" ? "blocked" : "waiting",
      running: isAutoCaptureActive(),
    };
  }

  if (result.status === "failed") {
    return {
      lastErrorMessage: result.message,
      lastMessage: result.message,
      lastStatus: "failed",
      running: isAutoCaptureActive(),
    };
  }

  return {
    lastMessage: result.message,
    lastStatus: result.status === "unavailable" ? "stopped" : "waiting",
    running: isAutoCaptureActive(),
  };
}

function updateActivityAutoCaptureStatus(next: Partial<ActivityAutoCaptureStatus>) {
  captureStatus = {
    ...captureStatus,
    ...next,
    running: next.running ?? isAutoCaptureActive(),
  };
  for (const listener of statusListeners) {
    listener(captureStatus);
  }
}

function isAutoCaptureActive() {
  return captureIntervalId !== null || captureInFlight;
}

function resolveActivityCaptureIntervalMs() {
  const configured = Number(process.env.NEXT_PUBLIC_BUBLI_TAURI_ACTIVITY_CAPTURE_INTERVAL_MS);
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true" &&
    Number.isFinite(configured) &&
    configured >= 1_000 &&
    configured <= DEFAULT_ACTIVITY_CAPTURE_INTERVAL_MS
  ) {
    return configured;
  }

  return DEFAULT_ACTIVITY_CAPTURE_INTERVAL_MS;
}
