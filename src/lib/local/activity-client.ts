import { activityApi } from "@/features/activity/api/activityApi";
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
import type {
  ActivityBufferSyncAdapterResult,
  ActivityContextAdapterResult,
  ActivityContextReadInput,
  ActivityContextRecordAdapterResult,
  ActivityContextRecordInput,
} from "@/types/local";

export async function readCurrentActivityContext(
  input: ActivityContextReadInput,
): Promise<ActivityContextAdapterResult> {
  const commandName = TAURI_COMMANDS.readActivityContext;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (!input.consentGranted) {
    return blocked(
      "activity_consent_required",
      "활동 감지는 사용자가 동의한 뒤에만 읽을 수 있습니다.",
      commandName,
    );
  }

  return runTauriAdapter(commandName, () => tauriCommands.readActivityContext());
}

export async function recordCurrentActivityContext(
  input: ActivityContextRecordInput,
): Promise<ActivityContextRecordAdapterResult> {
  const commandName = TAURI_COMMANDS.readActivityContext;
  await syncLocalActivityBufferToServer({ limit: 10 }).catch(() => undefined);

  const context = await readCurrentActivityContext(input);

  if (context.status !== "ready") {
    return context;
  }

  const capturedAt = parseIsoDate(context.data.capturedAt);
  const durationSeconds = Math.max(0, Math.trunc(context.data.durationSeconds ?? 0));
  const startedAt = new Date(capturedAt.getTime() - durationSeconds * 1000).toISOString();
  const endedAt = capturedAt.toISOString();
  const localActivity = await runTauriAdapter(TAURI_COMMANDS.recordActivityContext, () =>
    tauriCommands.recordActivityContext({
      appName: context.data.appName,
      capturedAt: context.data.capturedAt,
      durationSeconds,
      endedAt,
      roomId: input.roomId ?? null,
      startedAt,
      windowTitle: context.data.windowTitle ?? null,
    }),
  );

  if (localActivity.status !== "ready") {
    return localActivity;
  }

  try {
    const recordedActivity = await activityApi.recordCurrentApp({
      appName: context.data.appName,
      durationSeconds,
      endedAt,
      roomId: input.roomId ?? null,
      startedAt,
      windowTitle: context.data.windowTitle ?? null,
    });
    await tauriCommands
      .markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        serverActivityLogId: recordedActivity.id,
        status: "SYNCED",
      })
      .catch(() => undefined);
    const todayActivities = await activityApi.getToday();

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
      "현재 활동을 서버에 기록했습니다.",
    );
  } catch (error) {
    await tauriCommands
      .markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        status: "FAILED",
      })
      .catch(() => undefined);
    return failed(getErrorMessage(error), commandName);
  }
}

export async function syncLocalActivityBufferToServer(input?: {
  limit?: number;
}): Promise<ActivityBufferSyncAdapterResult> {
  const commandName = TAURI_COMMANDS.stageActivityContextsForSync;
  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageActivityContextsForSync(input),
  );

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.activities.length === 0) {
    return ready(
      {
        failedCount: 0,
        sentCount: 0,
        stagedCount: 0,
        syncedAt: staged.data.stagedAt,
      },
      commandName,
      "서버에 다시 보낼 활동 기록이 없습니다.",
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

  return ready(
    {
      failedCount,
      sentCount,
      stagedCount: staged.data.activities.length,
      syncedAt: new Date().toISOString(),
    },
    commandName,
    `활동 기록 ${sentCount}건을 서버에 다시 반영했습니다.`,
  );
}

function parseIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}
