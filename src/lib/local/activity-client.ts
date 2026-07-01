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
  ActivityContextAdapterResult,
  ActivityContextReadInput,
  ActivityContextRecordAdapterResult,
  ActivityContextRecordInput,
  ActivityEventsSyncAdapterResult,
  ActivityEventsSyncInput,
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
  const context = await readCurrentActivityContext(input);

  if (context.status !== "ready") {
    return context;
  }

  const capturedAt = parseIsoDate(context.data.capturedAt);
  const durationSeconds = Math.max(0, Math.trunc(context.data.durationSeconds ?? 0));
  const startedAt = new Date(capturedAt.getTime() - durationSeconds * 1000).toISOString();

  try {
    const recordedActivity = await activityApi.recordCurrentApp({
      appName: context.data.appName,
      durationSeconds,
      endedAt: capturedAt.toISOString(),
      roomId: input.roomId ?? null,
      startedAt,
      windowTitle: context.data.windowTitle ?? null,
    });
    const todayActivities = await activityApi.getToday();

    const localSyncMarked = await tauriCommands
      .markActivityEventSyncStatus({
        localEventId: context.data.localEventId,
        serverActivityId: recordedActivity.id,
        status: "SYNCED",
      })
      .then(() => true)
      .catch(() => false);

    return ready(
      {
        appName: context.data.appName,
        context: { ...context.data, syncStatus: localSyncMarked ? "SYNCED" : context.data.syncStatus },
        recordedActivity,
        todayActivities,
        windowTitle: context.data.windowTitle,
      },
      commandName,
      "현재 활동을 서버에 기록했습니다.",
    );
  } catch (error) {
    await tauriCommands
      .markActivityEventSyncStatus({
        localEventId: context.data.localEventId,
        status: "FAILED",
      })
      .catch(() => undefined);
    return failed(getErrorMessage(error), commandName);
  }
}

export async function syncPendingActivityEventsToServer(
  input: ActivityEventsSyncInput,
): Promise<ActivityEventsSyncAdapterResult> {
  const commandName = TAURI_COMMANDS.stageActivityEventsForSync;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (!input.consentGranted) {
    return blocked(
      "activity_consent_required",
      "활동 감지는 사용자가 동의한 뒤에만 동기화할 수 있습니다.",
      commandName,
    );
  }

  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageActivityEventsForSync({ limit: input.limit }),
  );

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.events.length === 0) {
    return ready(
      {
        failedCount: 0,
        sentCount: 0,
        stagedCount: 0,
        syncedAt: staged.data.stagedAt,
        syncedCount: 0,
      },
      commandName,
      "서버에 보낼 활동 기록이 없습니다.",
    );
  }

  let failedCount = 0;
  let syncedCount = 0;

  for (const event of staged.data.events) {
    try {
      const recordedActivity = await activityApi.recordCurrentApp({
        appName: event.appName,
        durationSeconds: Math.max(0, Math.trunc(event.durationSeconds)),
        endedAt: event.endedAt,
        roomId: input.roomId ?? null,
        startedAt: event.startedAt,
        windowTitle: event.windowTitle ?? null,
      });

      await tauriCommands.markActivityEventSyncStatus({
        localEventId: event.localEventId,
        serverActivityId: recordedActivity.id,
        status: "SYNCED",
      });
      syncedCount += 1;
    } catch {
      failedCount += 1;
      await tauriCommands
        .markActivityEventSyncStatus({
          localEventId: event.localEventId,
          status: "FAILED",
        })
        .catch(() => undefined);
    }
  }

  return ready(
    {
      failedCount,
      sentCount: staged.data.events.length,
      stagedCount: staged.data.events.length,
      syncedAt: new Date().toISOString(),
      syncedCount,
    },
    commandName,
    failedCount > 0
      ? `활동 기록 ${syncedCount}건을 서버에 반영했고 ${failedCount}건은 재시도 대기 중입니다.`
      : `활동 기록 ${syncedCount}건을 서버에 반영했습니다.`,
  );
}

function parseIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}
