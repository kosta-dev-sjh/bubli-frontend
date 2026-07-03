"use client";

import { settingsApi } from "@/features/settings/api/settingsApi";
import {
  recordCurrentActivityContext,
  resetIncrementalActivityCheckpoint,
  syncLocalActivityBufferToServer,
} from "@/lib/local/activity-client";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

const ACTIVITY_CAPTURE_INTERVAL_MS = 30_000;
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

export function startActivityAutoCapture() {
  if (!isTauriRuntime()) return;
  if (captureIntervalId !== null) return;

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
    return;
  }

  startActivityAutoCapture();
}

async function captureActivityOnce() {
  if (captureInFlight) {
    return captureInFlightPromise ?? Promise.resolve();
  }

  captureInFlight = true;
  captureInFlightPromise = (async () => {
    try {
      const revision = activityConsentRevision;
      const consentGranted = await readActivityConsent();
      if (!consentGranted || revision !== activityConsentRevision) return;

      await recordCurrentActivityContext({
        consentGranted,
        recordMode: "incremental",
        roomId: getActiveProjectRoomId(),
      });
    } catch {
      cachedConsent = null;
      cachedConsentCheckedAt = 0;
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
  captureInFlightPromise = (async () => {
    try {
      const consentGranted = await readActivityConsent();
      if (!consentGranted) return;

      await recordCurrentActivityContext({
        consentGranted,
        recordMode: "incremental",
        roomId: getActiveProjectRoomId(),
      }).catch(() => undefined);
      await syncLocalActivityBufferToServer({ consentGranted, limit: 20 }).catch(() => undefined);
    } catch {
      cachedConsent = null;
      cachedConsentCheckedAt = 0;
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
  await tauriCommands.setActivityContextConsent({ enabled }).catch(() => undefined);
}
