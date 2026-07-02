import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { managedFolderApi } from "@/features/managed-folder/api/managedFolderApi";
import {
  blocked,
  failed,
  getErrorMessage,
  hasProjectRoomScope,
  pending,
  ready,
  runTauriAdapter,
  unavailable,
} from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import type {
  LocalAdapterResult,
  LocalFileOpenAdapterInput,
  LocalFileOpenAdapterResult,
  LocalFilePreviewAdapterInput,
  LocalFilePreviewAdapterResult,
  LocalFileReindexAdapterInput,
  LocalFileReindexAdapterResult,
  LocalFileSearchAdapterInput,
  LocalFileSearchAdapterResult,
  ManagedFolderIndexProgressAdapterResult,
  ManagedFolderListAdapterResult,
  ManagedFolderRemoveAdapterResult,
  ManagedFolderScanAdapterResult,
  ManagedFolderSelectResult,
  ManagedFolderSyncAdapterInput,
  ManagedFolderSyncAdapterResult,
  ManagedFolderWatchAdapterResult,
  PersonalManagedFolderCommandInput,
  PersonalManagedFolderSelectInput,
} from "@/types/local";

export type PersonalLocalFileEventsSyncResult = {
  failedCount: number;
  sentCount: number;
  skippedCount: number;
  syncedAt: string;
  syncedCount: number;
};

// 호출 시점의 로케일로 번역하기 위해 상수 대신 함수로 둔다(모듈 로드 시점에 고정되지 않도록).
const personalScopeMessage = () => translate("local.folder.personalOnly");

export async function selectPersonalManagedFolder(
  input?: PersonalManagedFolderSelectInput,
): Promise<ManagedFolderSelectResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.selectManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.selectManagedFolder);
  }

  const { roomId: _roomId, ...tauriInput } = input ?? {};

  return runTauriAdapter(TAURI_COMMANDS.selectManagedFolder, () =>
    tauriCommands.selectManagedFolder(tauriInput),
  );
}

export async function listPersonalManagedFolders(): Promise<ManagedFolderListAdapterResult> {
  const commandName = TAURI_COMMANDS.listManagedFolders;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  return runTauriAdapter(commandName, () => tauriCommands.listManagedFolders());
}

export async function scanPersonalManagedFolder(
  input: PersonalManagedFolderCommandInput,
): Promise<ManagedFolderScanAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.scanManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.scanManagedFolder);
  }

  const tauriInput = { localFolderId: input.localFolderId };

  return runTauriAdapter(TAURI_COMMANDS.scanManagedFolder, () =>
    tauriCommands.scanManagedFolder(tauriInput),
  );
}

export async function getPersonalManagedFolderIndexProgress(
  input: PersonalManagedFolderCommandInput,
): Promise<ManagedFolderIndexProgressAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.getIndexProgress);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.getIndexProgress);
  }

  const tauriInput = { localFolderId: input.localFolderId };

  return runTauriAdapter(TAURI_COMMANDS.getIndexProgress, () =>
    tauriCommands.getIndexProgress(tauriInput),
  );
}

export async function setPersonalManagedFolderSync(
  input: ManagedFolderSyncAdapterInput,
): Promise<ManagedFolderSyncAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.setFolderSync);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.setFolderSync);
  }

  const tauriInput = {
    enabled: input.enabled,
    localFolderId: input.localFolderId,
  };

  return runTauriAdapter(TAURI_COMMANDS.setFolderSync, () =>
    tauriCommands.setFolderSync(tauriInput),
  );
}

export async function removePersonalManagedFolder(
  input: PersonalManagedFolderCommandInput,
): Promise<ManagedFolderRemoveAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.removeManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.removeManagedFolder);
  }

  const tauriInput = { localFolderId: input.localFolderId };

  return runTauriAdapter(TAURI_COMMANDS.removeManagedFolder, () =>
    tauriCommands.removeManagedFolder(tauriInput),
  );
}

export async function watchPersonalManagedFolder(
  input: PersonalManagedFolderCommandInput,
): Promise<ManagedFolderWatchAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.watchManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.watchManagedFolder);
  }

  const { roomId: _roomId, ...tauriInput } = input;
  const commandName = TAURI_COMMANDS.watchManagedFolder;

  const result = await runTauriAdapter(commandName, () => tauriCommands.watchManagedFolder(tauriInput));
  if (result.status !== "failed") {
    return result;
  }

  if (result.message.includes("not wired yet")) {
    return pending(
      { localFolderId: tauriInput.localFolderId, watching: false },
      translate("local.folder.watchPending"),
      commandName,
    );
  }

  return failed(getErrorMessage(result.message), commandName);
}

export async function searchPersonalLocalFiles(
  input: LocalFileSearchAdapterInput,
): Promise<LocalFileSearchAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.searchLocalFiles);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.searchLocalFiles);
  }

  const { roomId: _roomId, ...tauriInput } = input;

  return runTauriAdapter(TAURI_COMMANDS.searchLocalFiles, () =>
    tauriCommands.searchLocalFiles(tauriInput),
  );
}

export async function openPersonalLocalFile(
  input: LocalFileOpenAdapterInput,
): Promise<LocalFileOpenAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.openLocalFile);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.openLocalFile);
  }

  return runTauriAdapter(TAURI_COMMANDS.openLocalFile, () =>
    tauriCommands.openLocalFile({ localFileId: input.localFileId }),
  );
}

export async function readPersonalLocalFilePreview(
  input: LocalFilePreviewAdapterInput,
): Promise<LocalFilePreviewAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.readLocalFilePreview);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.readLocalFilePreview);
  }

  const tauriInput = {
    localFileId: input.localFileId,
    maxChars: input.maxChars,
  };

  return runTauriAdapter(TAURI_COMMANDS.readLocalFilePreview, () =>
    tauriCommands.readLocalFilePreview(tauriInput),
  );
}

export async function reindexPersonalLocalFile(
  input: LocalFileReindexAdapterInput,
): Promise<LocalFileReindexAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.reindexFile);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.reindexFile);
  }

  return runTauriAdapter(TAURI_COMMANDS.reindexFile, () =>
    tauriCommands.reindexFile({ localFileId: input.localFileId }),
  );
}

export async function syncPersonalLocalFileEventsToServer(input?: {
  limit?: number;
  localFolderId?: string;
  roomId?: string | null;
}): Promise<LocalAdapterResult<PersonalLocalFileEventsSyncResult>> {
  const commandName = TAURI_COMMANDS.stageLocalFileEventsForSync;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), commandName);
  }

  const tauriInput = input
    ? {
        limit: input.limit,
        localFolderId: input.localFolderId,
      }
    : undefined;
  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageLocalFileEventsForSync(tauriInput),
  );

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.events.length === 0) {
    return ready(
      {
        failedCount: 0,
        sentCount: 0,
        skippedCount: 0,
        syncedAt: staged.data.stagedAt,
        syncedCount: 0,
      },
      commandName,
      translate("local.folder.noChanges"),
    );
  }

  try {
    const response = await managedFolderApi.syncApprovedLocalFileEvents({
      events: staged.data.events.map((event) => ({
        eventType: event.eventType,
        fileName: event.fileName,
        fileSizeBytes: event.fileSizeBytes,
        mimeType: event.mimeType,
        resourceId: event.resourceId,
      })),
    });
    const markResult = await tauriCommands.markLocalFileEventsSynced({
      results: response.results.map((result, index) => ({
        localEventId: staged.data.events[index]?.localEventId ?? "",
        resourceId: result.resourceId,
        status: result.status,
      })),
    });
    const skippedCount = response.results.filter((result) => result.status === "SKIPPED").length;

    return ready(
      {
        failedCount: markResult.failedCount,
        sentCount: response.results.length,
        skippedCount,
        syncedAt: markResult.completedAt,
        syncedCount: markResult.syncedCount,
      },
      commandName,
      translate("local.folder.synced", { count: response.results.length }),
    );
  } catch (error) {
    const syncErrorMessage = getErrorMessage(error);
    try {
      await tauriCommands.markLocalFileEventsSynced({
        results: staged.data.events.map((event) => ({
          localEventId: event.localEventId,
          resourceId: event.resourceId,
          status: "FAILED",
        })),
      });
    } catch (markError) {
      return failed(`${syncErrorMessage} / local failure mark failed: ${getErrorMessage(markError)}`, commandName);
    }

    return failed(syncErrorMessage, commandName);
  }
}
