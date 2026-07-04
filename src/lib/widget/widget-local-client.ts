import { isBackendWidgetBubbleType, widgetApi, type BackendWidgetBubbleType } from "@/features/widget/api/widgetApi";
import { failed, getErrorMessage, ready, runTauriAdapter } from "@/lib/local/adapter-result";
import { recordWidgetUsageEvent, rollupWidgetUsage } from "@/lib/local";
import { stageWidgetUsageSummary } from "@/lib/sync";
import {
  TAURI_COMMANDS,
  tauriCommands,
  type WidgetBubbleType,
  type WidgetUsageSummaryStagedRollup,
} from "@/lib/tauri/commands";
import { toApiWidgetBubbleType, toLocalWidgetBubbleType } from "@/lib/widget/widget-types";
import type {
  WidgetSettingsResponse,
  WidgetItemStateUpdateRequest,
  WidgetUsageRollupResponse,
  WidgetUsageSummarySaveRequest,
  WidgetUsageSummarySyncCandidate,
} from "@/types/api/widget";
import type {
  LocalAdapterResult,
  WidgetUsageEventAdapterInput,
  WidgetUsageRollupAdapterInput,
  WidgetUsageRollupAdapterResult,
  WidgetUsageSummarySyncAdapterInput,
  WidgetUsageSummarySyncAdapterResult,
} from "@/types/local";

export type WidgetItemStateSaveInput = Omit<WidgetItemStateUpdateRequest, "bubbleType"> & {
  bubbleType: BackendWidgetBubbleType;
  itemStateId: string;
};

export type WidgetUsageServerSyncResult = {
  failedCount: number;
  markedSyncedCount: number;
  responses: WidgetUsageRollupResponse[];
  sentCount: number;
  stagedCount: number;
  syncedAt: string;
};

type ServerUsageRollupMapping = {
  localRollupKey: string;
  request: WidgetUsageSummarySyncCandidate;
};

let cachedWidgetUsageDeviceId: string | null = null;

async function getWidgetUsageDeviceId(): Promise<string> {
  if (cachedWidgetUsageDeviceId) {
    return cachedWidgetUsageDeviceId;
  }

  const identity = await tauriCommands.getOrCreateWidgetUsageDeviceId();
  cachedWidgetUsageDeviceId = identity.deviceId;
  return cachedWidgetUsageDeviceId;
}

function isLocalWidgetBubbleType(value: string): value is WidgetBubbleType {
  return ["agent", "alert", "chat", "memo", "resource", "schedule", "timer", "todo"].includes(value);
}

function isBackendSupportedRollup(rollup: WidgetUsageSummaryStagedRollup) {
  if (!isLocalWidgetBubbleType(rollup.bubbleType)) return false;
  return isBackendWidgetBubbleType(toApiWidgetBubbleType(rollup.bubbleType));
}

async function toServerUsageRollupMappings(
  rollups: WidgetUsageSummaryStagedRollup[],
  settings: WidgetSettingsResponse,
  syncedAt: string,
): Promise<ServerUsageRollupMapping[]> {
  const settingsByType = new Map(settings.bubbles.map((bubble) => [bubble.bubbleType, bubble]));
  const deviceId = await getWidgetUsageDeviceId();

  return rollups.flatMap((rollup) => {
    if (!isLocalWidgetBubbleType(rollup.bubbleType)) {
      return [];
    }

    const apiBubbleType = toApiWidgetBubbleType(rollup.bubbleType);
    if (!isBackendWidgetBubbleType(apiBubbleType)) {
      return [];
    }

    const setting = settingsByType.get(apiBubbleType);
    if (!setting) {
      return [];
    }

    return [
      {
        localRollupKey: rollup.rollupKey,
        request: {
          bubbleSettingId: setting.id,
          bubbleType: apiBubbleType,
          deviceId,
          interactionCount: Math.max(0, rollup.interactionCount ?? rollup.sourceEventCount),
          openCount: Math.max(0, rollup.openCount ?? 0),
          rollupKey: `${deviceId}:${setting.id}:${rollup.rollupKey}`,
          sourceEventCount: rollup.sourceEventCount,
          summaryDate: rollup.summaryDate,
          syncedAt,
          visibleSeconds: Math.max(0, rollup.visibleSeconds ?? rollup.sourceEventCount),
        },
      },
    ];
  });
}

function toUsageSummarySaveRequest(request: WidgetUsageSummarySyncCandidate): WidgetUsageSummarySaveRequest {
  return {
    bubbleSettingId: request.bubbleSettingId,
    deviceId: request.deviceId,
    interactionCount: request.interactionCount,
    openCount: request.openCount,
    rollupKey: request.rollupKey,
    summaryDate: request.summaryDate,
    syncedAt: request.syncedAt,
    visibleSeconds: request.visibleSeconds,
  };
}

export async function saveWidgetItemState(input: WidgetItemStateSaveInput): Promise<null> {
  const { itemStateId, ...body } = input;

  return widgetApi.updateItemState(itemStateId, body);
}

export async function recordLocalWidgetUsageEvent(input: WidgetUsageEventAdapterInput) {
  return recordWidgetUsageEvent(input);
}

export async function recordApiWidgetUsageEvent(
  input: Omit<WidgetUsageEventAdapterInput, "bubbleType"> & Pick<WidgetItemStateUpdateRequest, "bubbleType">,
) {
  return recordWidgetUsageEvent({
    ...input,
    bubbleType: toLocalWidgetBubbleType(input.bubbleType),
  });
}

export async function rollupLocalWidgetUsage(
  input?: WidgetUsageRollupAdapterInput,
): Promise<WidgetUsageRollupAdapterResult> {
  return rollupWidgetUsage(input);
}

export async function stageLocalWidgetUsageSummary(
  input?: WidgetUsageSummarySyncAdapterInput,
): Promise<WidgetUsageSummarySyncAdapterResult> {
  return stageWidgetUsageSummary(input);
}

export async function syncWidgetUsageRollupsToServer(
  rollups: WidgetUsageSummarySaveRequest[],
): Promise<WidgetUsageRollupResponse[]> {
  return widgetApi.saveUsageSummariesSequentially(rollups);
}

export async function syncLocalWidgetUsageSummaryToServer(
  input?: WidgetUsageSummarySyncAdapterInput,
): Promise<LocalAdapterResult<WidgetUsageServerSyncResult>> {
  const commandName = TAURI_COMMANDS.syncWidgetUsageSummary;
  const staged = await runTauriAdapter(commandName, () => tauriCommands.syncWidgetUsageSummary(input));

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.rollups.length === 0) {
    return ready(
      {
        failedCount: staged.data.failedCount,
        markedSyncedCount: 0,
        responses: [],
        sentCount: 0,
        stagedCount: 0,
        syncedAt: staged.data.syncedAt,
      },
      commandName,
      "No local widget usage rollups are waiting for server sync.",
    );
  }

  try {
    const settings = await widgetApi.getSettings();
    const syncedAt = new Date().toISOString();
    const backendRollups = staged.data.rollups.filter(isBackendSupportedRollup);
    const localOnlyRollupKeys = staged.data.rollups
      .filter((rollup) => isLocalWidgetBubbleType(rollup.bubbleType) && !isBackendSupportedRollup(rollup))
      .map((rollup) => rollup.rollupKey);
    const localOnlyMarkResult =
      localOnlyRollupKeys.length > 0
        ? await tauriCommands.markWidgetUsageSummarySynced({ rollupKeys: localOnlyRollupKeys }).catch(() => ({
            syncedCount: 0,
          }))
        : { syncedCount: 0 };

    const mappings = await toServerUsageRollupMappings(backendRollups, settings, syncedAt);
    if (backendRollups.length === 0 && localOnlyRollupKeys.length > 0) {
      return ready(
        {
          failedCount: staged.data.failedCount,
          markedSyncedCount: localOnlyMarkResult.syncedCount,
          responses: [],
          sentCount: 0,
          stagedCount: staged.data.rollups.length,
          syncedAt,
        },
        commandName,
        `Marked ${localOnlyMarkResult.syncedCount} local-only widget usage rollup${localOnlyMarkResult.syncedCount === 1 ? "" : "s"} as synced.`,
      );
    }

    if (mappings.length === 0) {
      await tauriCommands
        .markWidgetUsageSummaryFailed({
          errorMessage: "No staged widget usage rollups matched the current backend widget settings.",
          rollupKeys: backendRollups.map((rollup) => rollup.rollupKey),
        })
        .catch(() => undefined);
      return failed("No staged widget usage rollups matched the current backend widget settings.", commandName);
    }

    const settled = await Promise.allSettled(
      mappings.map(async (mapping) => ({
        localRollupKey: mapping.localRollupKey,
        response: await widgetApi.saveUsageSummary(toUsageSummarySaveRequest(mapping.request)),
      })),
    );
    const successful = settled
      .filter((result): result is PromiseFulfilledResult<{ localRollupKey: string; response: WidgetUsageRollupResponse }> => result.status === "fulfilled")
      .map((result) => result.value);
    const successfulKeys = new Set(successful.map((result) => result.localRollupKey));
    const failedRollupKeys = [
      ...mappings
        .filter((mapping) => !successfulKeys.has(mapping.localRollupKey))
        .map((mapping) => mapping.localRollupKey),
      ...backendRollups
        .filter((rollup) => !mappings.some((mapping) => mapping.localRollupKey === rollup.rollupKey))
        .map((rollup) => rollup.rollupKey),
    ];

    if (successful.length === 0) {
      await tauriCommands
        .markWidgetUsageSummaryFailed({
          errorMessage: "All staged widget usage rollups failed to sync to the backend.",
          rollupKeys: failedRollupKeys,
        })
        .catch(() => undefined);
      return failed("All staged widget usage rollups failed to sync to the backend.", commandName);
    }

    const responses = successful.map((result) => result.response);
    const localRollupKeys = successful.map((result) => result.localRollupKey);
    const markResult = await tauriCommands.markWidgetUsageSummarySynced({ rollupKeys: localRollupKeys });
    if (failedRollupKeys.length > 0) {
      await tauriCommands
        .markWidgetUsageSummaryFailed({
          errorMessage: "Some staged widget usage rollups failed or no longer match backend settings.",
          rollupKeys: failedRollupKeys,
        })
        .catch(() => undefined);
    }
    const rejectedCount = settled.filter((result) => result.status === "rejected").length;
    const unmatchedCount = Math.max(0, backendRollups.length - mappings.length);
    const failedCount = staged.data.failedCount + rejectedCount + unmatchedCount;

    return ready(
      {
        failedCount,
        markedSyncedCount: markResult.syncedCount + localOnlyMarkResult.syncedCount,
        responses,
        sentCount: responses.length,
        stagedCount: staged.data.rollups.length,
        syncedAt,
      },
      commandName,
      failedCount > 0
        ? `Synced ${responses.length} widget usage rollup${responses.length === 1 ? "" : "s"} to the backend; ${failedCount} remain pending.`
        : `Synced ${responses.length} widget usage rollup${responses.length === 1 ? "" : "s"} to the backend.`,
    );
  } catch (error) {
    return failed(getErrorMessage(error), commandName);
  }
}
