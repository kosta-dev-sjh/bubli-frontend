import { activityApi } from "@/features/activity/api/activityApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  blocked,
  failed,
  getErrorMessage,
  ready,
  runTauriAdapter,
  unavailable,
} from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import type {
  ActivityBufferSyncAdapterResult,
  ActivityBufferSyncResult,
  ActivityContextAdapterResult,
  ActivityContextReadInput,
  ActivityContextRecordAdapterResult,
  ActivityContextRecordInput,
} from "@/types/local";

export const LOCAL_ACTIVITY_RECORDED_EVENT = "bubli:local-activity-recorded";
export const LOCAL_ACTIVITY_SYNCED_EVENT = "bubli:local-activity-synced";

type IncrementalActivityCheckpoint = {
  capturedAtMs: number;
  focusKey: string;
  recordedDurationSeconds: number;
};

type ActivityRecordSegment = {
  durationSeconds: number;
  endedAt: string;
  startedAt: string;
};

let incrementalActivityCheckpoint: IncrementalActivityCheckpoint | null = null;
const INCREMENTAL_ACTIVITY_CHECKPOINT_KEY = "bubli:activity-incremental-checkpoint:v1";
const INCREMENTAL_ACTIVITY_CHECKPOINT_STALE_MS = 120_000;
const ACTIVITY_RECORD_LOCK_KEY = "bubli:activity-record-lock:v1";
const ACTIVITY_RECORD_LOCK_TTL_MS = 30_000;
let activityRecordInFlight = false;

export async function readCurrentActivityContext(
  input: ActivityContextReadInput,
): Promise<ActivityContextAdapterResult> {
  const commandName = TAURI_COMMANDS.readActivityContext;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  const serverConsentGranted = input.consentGranted
    ? await readServerActivityConsent().catch(() => false)
    : false;

  if (!serverConsentGranted) {
    const disabled = await mirrorNativeActivityConsent(false);
    if (!disabled) {
      return failed("Failed to disable native activity consent", commandName);
    }
    return blocked(
      "activity_consent_required",
      translate("local.activity.consentRequired"),
      commandName,
    );
  }

  return runTauriAdapter(commandName, async () => {
    await tauriCommands.setActivityContextConsent({ enabled: serverConsentGranted });
    return tauriCommands.readActivityContext();
  });
}

export async function recordCurrentActivityContext(
  input: ActivityContextRecordInput,
): Promise<ActivityContextRecordAdapterResult> {
  const commandName = TAURI_COMMANDS.recordActivityContext;
  if (activityRecordInFlight) {
    return blocked(
      "activity_no_new_duration",
      translate("local.activity.noNewDwell"),
      commandName,
    );
  }

  activityRecordInFlight = true;
  const recordLock = tryAcquireActivityRecordLock();
  if (!recordLock) {
    activityRecordInFlight = false;
    return blocked(
      "activity_no_new_duration",
      translate("local.activity.noNewDwell"),
      commandName,
    );
  }

  try {
    await syncLocalActivityBufferToServer({ consentGranted: input.consentGranted, limit: 10 }).catch(() => undefined);

    const context = await readCurrentActivityContext(input);

    if (context.status !== "ready") {
      return context;
    }

    await syncLocalActivityBufferToServer({ consentGranted: input.consentGranted, limit: 10 }).catch(() => undefined);

    const capturedAt = parseIsoDate(context.data.capturedAt);
    const durationSeconds = Math.max(0, Math.trunc(context.data.durationSeconds ?? 0));
    const incremental = input.recordMode === "incremental";
    const segment = incremental
      ? resolveIncrementalActivitySegment(context.data.appName, context.data.windowTitle, durationSeconds, capturedAt)
      : {
          durationSeconds,
          endedAt: capturedAt.toISOString(),
          startedAt: new Date(capturedAt.getTime() - durationSeconds * 1000).toISOString(),
        };

    if (!segment) {
      return blocked(
        "activity_no_new_duration",
        translate("local.activity.noNewDwell"),
        commandName,
      );
    }

    const localActivity = await runTauriAdapter(TAURI_COMMANDS.recordActivityContext, () =>
      tauriCommands.recordActivityContext({
        appName: context.data.appName,
        capturedAt: context.data.capturedAt,
        durationSeconds: segment.durationSeconds,
        endedAt: segment.endedAt,
        roomId: input.roomId ?? null,
        startedAt: segment.startedAt,
        windowTitle: context.data.windowTitle ?? null,
      }),
    );

    if (localActivity.status !== "ready") {
      return localActivity;
    }
    rememberIncrementalActivityCheckpoint(context.data.appName, context.data.windowTitle, durationSeconds);

    let recordedActivity;
    try {
      recordedActivity = await activityApi.recordCurrentApp({
        appName: context.data.appName,
        durationSeconds: segment.durationSeconds,
        endedAt: segment.endedAt,
        localActivityId: localActivity.data.localActivityId,
        roomId: input.roomId ?? null,
        startedAt: segment.startedAt,
        windowTitle: context.data.windowTitle ?? null,
      });
    } catch (error) {
      await tauriCommands
        .markActivityContextSynced({
          localActivityId: localActivity.data.localActivityId,
          status: "FAILED",
        })
        .catch(() => undefined);
      return failed(getErrorMessage(error), commandName);
    }

    try {
      await tauriCommands.markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        serverActivityLogId: recordedActivity.id,
        status: "SYNCED",
      });
    } catch (error) {
      await tauriCommands
        .markActivityContextSynced({
          localActivityId: localActivity.data.localActivityId,
          status: "FAILED",
        })
        .catch(() => undefined);
      return failed(getErrorMessage(error), commandName);
    }

    const todayActivities = await activityApi.getToday().catch(() => []);
    notifyLocalActivitySynced({
      failedCount: 0,
      sentCount: 1,
      stagedCount: 1,
      syncedAt: new Date().toISOString(),
    });
    notifyLocalActivityRecorded(todayActivities);

    return ready(
      {
        appName: context.data.appName,
        context: context.data,
        localActivityId: localActivity.data.localActivityId,
        recordedActivity,
        syncStatus: "SYNCED",
        todayActivities,
        windowTitle: context.data.windowTitle,
      },
      commandName,
      translate("local.activity.recorded"),
    );
  } finally {
    releaseActivityRecordLock(recordLock);
    activityRecordInFlight = false;
  }
}

export async function syncLocalActivityBufferToServer(input?: {
  consentGranted?: boolean;
  limit?: number;
}): Promise<ActivityBufferSyncAdapterResult> {
  const commandName = TAURI_COMMANDS.stageActivityContextsForSync;
  if (input?.consentGranted !== true) {
    return blocked(
      "activity_consent_required",
      translate("local.activity.consentRequired"),
      commandName,
    );
  }

  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageActivityContextsForSync({ limit: input.limit }),
  );

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.activities.length === 0) {
    const emptySyncResult = {
      failedCount: 0,
      sentCount: 0,
      stagedCount: 0,
      syncedAt: staged.data.stagedAt,
    };
    notifyLocalActivitySynced(emptySyncResult);

    return ready(
      emptySyncResult,
      commandName,
      translate("local.activity.noResend"),
    );
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const activity of staged.data.activities) {
    try {
      const recorded = await activityApi.recordCurrentApp({
        appName: activity.appName,
        durationSeconds: activity.durationSeconds ?? null,
        endedAt: activity.endedAt,
        localActivityId: activity.localActivityId,
        roomId: activity.roomId ?? null,
        startedAt: activity.startedAt,
        windowTitle: activity.windowTitle ?? null,
      });
      await tauriCommands.markActivityContextSynced({
        localActivityId: activity.localActivityId,
        serverActivityLogId: recorded.id,
        status: "SYNCED",
      });
      sentCount += 1;
    } catch {
      failedCount += 1;
      await tauriCommands
        .markActivityContextSynced({
          localActivityId: activity.localActivityId,
          status: "FAILED",
        })
        .catch(() => undefined);
    }
  }

  const syncResult = {
    failedCount,
    sentCount,
    stagedCount: staged.data.activities.length,
    syncedAt: new Date().toISOString(),
  };
  notifyLocalActivitySynced(syncResult);

  return ready(
    syncResult,
    commandName,
    translate("local.activity.resent", { count: sentCount }),
  );
}

function parseIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function resolveIncrementalActivitySegment(
  appName: string,
  windowTitle: string | undefined,
  durationSeconds: number,
  capturedAt: Date,
): ActivityRecordSegment | null {
  const focusKey = `${appName}\u0000${windowTitle ?? ""}`;
  const checkpoint = readIncrementalActivityCheckpoint();
  const sameCheckpoint = checkpoint?.focusKey === focusKey ? checkpoint : null;
  const checkpointAgeMs = sameCheckpoint ? Math.max(0, capturedAt.getTime() - sameCheckpoint.capturedAtMs) : 0;
  const staleCheckpoint = sameCheckpoint ? checkpointAgeMs > INCREMENTAL_ACTIVITY_CHECKPOINT_STALE_MS : false;
  const previousDuration = sameCheckpoint
    ? staleCheckpoint
      ? durationSeconds
      : Math.min(sameCheckpoint.recordedDurationSeconds, durationSeconds)
    : 0;
  const nextDuration = Math.max(0, durationSeconds - previousDuration);

  if (nextDuration <= 0) {
    if (staleCheckpoint) {
      rememberIncrementalActivityCheckpoint(appName, windowTitle, durationSeconds);
    }
    return null;
  }

  return {
    durationSeconds: nextDuration,
    endedAt: capturedAt.toISOString(),
    startedAt: new Date(capturedAt.getTime() - nextDuration * 1000).toISOString(),
  };
}

function rememberIncrementalActivityCheckpoint(
  appName: string,
  windowTitle: string | undefined,
  durationSeconds: number,
) {
  incrementalActivityCheckpoint = {
    capturedAtMs: Date.now(),
    focusKey: `${appName}\u0000${windowTitle ?? ""}`,
    recordedDurationSeconds: durationSeconds,
  };
  writeIncrementalActivityCheckpoint(incrementalActivityCheckpoint);
}

export function resetIncrementalActivityCheckpoint() {
  incrementalActivityCheckpoint = null;
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(INCREMENTAL_ACTIVITY_CHECKPOINT_KEY);
  } catch {
    // localStorage can be unavailable in hardened/diagnostic surfaces.
  }
}

function readIncrementalActivityCheckpoint(): IncrementalActivityCheckpoint | null {
  if (incrementalActivityCheckpoint) {
    return incrementalActivityCheckpoint;
  }
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(INCREMENTAL_ACTIVITY_CHECKPOINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IncrementalActivityCheckpoint>;
    if (
      typeof parsed.focusKey !== "string" ||
      typeof parsed.recordedDurationSeconds !== "number" ||
      typeof parsed.capturedAtMs !== "number"
    ) {
      return null;
    }
    incrementalActivityCheckpoint = {
      capturedAtMs: parsed.capturedAtMs,
      focusKey: parsed.focusKey,
      recordedDurationSeconds: Math.max(0, Math.trunc(parsed.recordedDurationSeconds)),
    };
    return incrementalActivityCheckpoint;
  } catch {
    return null;
  }
}

function writeIncrementalActivityCheckpoint(checkpoint: IncrementalActivityCheckpoint) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(INCREMENTAL_ACTIVITY_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  } catch {
    // localStorage can be unavailable in hardened/diagnostic surfaces; the in-memory guard still works.
  }
}

function tryAcquireActivityRecordLock() {
  if (typeof window === "undefined") {
    return "server";
  }

  const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  try {
    const current = window.localStorage.getItem(ACTIVITY_RECORD_LOCK_KEY);
    if (current) {
      const [expiresAtRaw] = current.split(":", 1);
      const expiresAt = Number(expiresAtRaw);
      if (Number.isFinite(expiresAt) && expiresAt > now) {
        return null;
      }
    }

    const value = `${now + ACTIVITY_RECORD_LOCK_TTL_MS}:${token}`;
    window.localStorage.setItem(ACTIVITY_RECORD_LOCK_KEY, value);
    return window.localStorage.getItem(ACTIVITY_RECORD_LOCK_KEY) === value ? value : null;
  } catch {
    return token;
  }
}

function releaseActivityRecordLock(lock: string) {
  if (typeof window === "undefined" || lock === "server") {
    return;
  }

  try {
    if (window.localStorage.getItem(ACTIVITY_RECORD_LOCK_KEY) === lock) {
      window.localStorage.removeItem(ACTIVITY_RECORD_LOCK_KEY);
    }
  } catch {
    // Nothing to release if storage is unavailable.
  }
}

async function readServerActivityConsent() {
  const privacy = await settingsApi.getPrivacyConsents();
  return Boolean(privacy.activityDetectionEnabled);
}

async function mirrorNativeActivityConsent(enabled: boolean) {
  try {
    await tauriCommands.setActivityContextConsent({ enabled });
    return true;
  } catch {
    return false;
  }
}

function notifyLocalActivityRecorded(todayActivities: unknown[]) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(LOCAL_ACTIVITY_RECORDED_EVENT, {
      detail: { todayActivities },
    }),
  );
}

function notifyLocalActivitySynced(result: ActivityBufferSyncResult) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ActivityBufferSyncResult>(LOCAL_ACTIVITY_SYNCED_EVENT, {
      detail: result,
    }),
  );
}
