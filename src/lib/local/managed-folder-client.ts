import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import type { LocalFileKeySentenceResult } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { localFileAnalysisApi } from "@/features/managed-folder/api/localFileAnalysisApi";
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
import type {
  LocalAdapterResult,
  LocalFileKeySentenceAdapterInput,
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
import type { LocalFileAnalysisResponse } from "@/types/api/localFileAnalysis";

export type PersonalLocalFileEventsSyncResult = {
  analysisFailedCount: number;
  analysisRequestedCount: number;
  analysisSkippedCount: number;
  failedCount: number;
  sentCount: number;
  skippedCount: number;
  syncedAt: string;
  syncedCount: number;
};

export type PersonalLocalFileAnalysisBackfillResult = {
  attemptedCount: number;
  failedCount: number;
  markedFailedCount: number;
  markedSyncedCount: number;
  stagedAt: string;
  succeededCount: number;
};

export type PersonalLocalFileAnalysisResult = {
  extraction: LocalFileKeySentenceResult;
  job: LocalFileAnalysisResponse;
  sentAt: string;
};

type PersonalLocalFileAnalysisInput = LocalFileKeySentenceAdapterInput & {
  resourceId: string;
};

export const PERSONAL_RESOURCES_CHANGED_EVENT = "bubli-personal-resources-changed";

const PERSONAL_SCOPE_MESSAGE =
  "개인 로컬 폴더는 개인 자료 전용입니다. 프로젝트룸 공용 자료는 서버 업로드 흐름으로 연결해야 합니다.";
const ANALYZABLE_LOCAL_FILE_EXTENSIONS = new Set(["docx", "markdown", "md", "pdf", "txt"]);

export async function selectPersonalManagedFolder(
  input?: PersonalManagedFolderSelectInput,
): Promise<ManagedFolderSelectResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.selectManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.selectManagedFolder);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.scanManagedFolder);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.getIndexProgress);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.setFolderSync);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.removeManagedFolder);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.watchManagedFolder);
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
      "실시간 폴더 감시는 아직 준비 중입니다. 지금은 수동 스캔 결과를 사용합니다.",
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.searchLocalFiles);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.openLocalFile);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.readLocalFilePreview);
  }

  const tauriInput = {
    localFileId: input.localFileId,
    maxChars: input.maxChars,
  };

  return runTauriAdapter(TAURI_COMMANDS.readLocalFilePreview, () =>
    tauriCommands.readLocalFilePreview(tauriInput),
  );
}

export async function analyzePersonalLocalFileWithKeySentences(
  input: PersonalLocalFileAnalysisInput,
): Promise<LocalAdapterResult<PersonalLocalFileAnalysisResult>> {
  const commandName = TAURI_COMMANDS.extractLocalFileKeySentences;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, commandName);
  }

  const extractionResult = await runTauriAdapter(commandName, () =>
    tauriCommands.extractLocalFileKeySentences({
      localFileId: input.localFileId,
      maxChars: input.maxChars,
      maxSentenceChars: input.maxSentenceChars,
      maxSentences: input.maxSentences,
    }),
  );

  if (extractionResult.status !== "ready") {
    return failed(extractionResult.message, commandName);
  }

  const extraction = extractionResult.data;
  if (extraction.status !== "READY") {
    return failed(`로컬 파일 중요 문장 추출 상태가 ${extraction.status}입니다.`, commandName);
  }

  try {
    const job = await localFileAnalysisApi.create({
      analyzedCharCount: extraction.analyzedCharCount,
      checksum: extraction.checksum,
      combinedText: extraction.combinedText,
      extractionMethod: extraction.extractionMethod,
      fileName: extraction.fileName,
      keySentences: extraction.keySentences,
      localFileId: extraction.localFileId,
      mimeType: extraction.mimeType,
      resourceId: input.resourceId,
      sourceCharCount: extraction.sourceCharCount,
      textTruncated: extraction.truncated,
    });

    return ready(
      {
        extraction,
        job,
        sentAt: new Date().toISOString(),
      },
      commandName,
      "로컬 파일 중요 문장을 서버 분석 요청으로 전달했습니다.",
    );
  } catch (error) {
    return failed(getErrorMessage(error), commandName);
  }
}

export async function reindexPersonalLocalFile(
  input: LocalFileReindexAdapterInput,
): Promise<LocalFileReindexAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.reindexFile);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.reindexFile);
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
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, commandName);
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
        analysisFailedCount: 0,
        analysisRequestedCount: 0,
        analysisSkippedCount: 0,
        sentCount: 0,
        skippedCount: 0,
        syncedAt: staged.data.stagedAt,
        syncedCount: 0,
      },
      commandName,
      "서버에 보낼 로컬 파일 변경분이 없습니다.",
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
    const syncedAnalysisEvents = response.results
      .map((result, index) => ({
        localEvent: staged.data.events[index],
        syncResult: result,
      }))
      .filter(({ localEvent, syncResult }) => {
        return (
          localEvent !== undefined &&
          localEvent.eventType !== "DELETED" &&
          localEvent.localFileId !== null &&
          localEvent.localFileId !== undefined &&
          syncResult.resourceId !== null &&
          syncResult.resourceId !== undefined &&
          syncResult.status === "SYNCED"
        );
      });
    const analysisCandidates = syncedAnalysisEvents.filter(({ localEvent }) =>
      isAnalyzableLocalFileName(localEvent?.fileName),
    );
    const analysisSkippedCount = syncedAnalysisEvents.length - analysisCandidates.length;
    const analysisResults = await Promise.allSettled(
      analysisCandidates.map(({ localEvent, syncResult }) =>
        analyzePersonalLocalFileWithKeySentences({
          localFileId: localEvent.localFileId ?? "",
          resourceId: syncResult.resourceId ?? "",
        }),
      ),
    );
    const analysisRequestedCount = analysisResults.filter(
      (result) => result.status === "fulfilled" && result.value.status === "ready",
    ).length;
    const analysisFailedCount = analysisResults.length - analysisRequestedCount;

    const syncResult = {
      analysisFailedCount,
      analysisRequestedCount,
      analysisSkippedCount,
      failedCount: markResult.failedCount,
      sentCount: response.results.length,
      skippedCount,
      syncedAt: markResult.completedAt,
      syncedCount: markResult.syncedCount,
    };
    notifyPersonalResourcesChanged(syncResult);

    return ready(
      syncResult,
      commandName,
      analysisFailedCount > 0
        ? `로컬 파일 변경 ${response.results.length}건을 서버에 반영했고, 중요 문장 분석 요청 ${analysisRequestedCount}건을 전달했습니다. ${analysisSkippedCount}건은 지원하지 않는 파일이라 건너뛰었고, ${analysisFailedCount}건은 실패했습니다.`
        : `로컬 파일 변경 ${response.results.length}건을 서버에 반영했고, 중요 문장 분석 요청 ${analysisRequestedCount}건을 전달했습니다. ${analysisSkippedCount}건은 지원하지 않는 파일이라 건너뛰었습니다.`,
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

export async function backfillPersonalLocalFileAnalyses(input?: {
  limit?: number;
  maxAttempts?: number;
  roomId?: string | null;
}): Promise<LocalAdapterResult<PersonalLocalFileAnalysisBackfillResult>> {
  const commandName = TAURI_COMMANDS.stageLocalFileAnalysisBackfill;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, commandName);
  }

  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageLocalFileAnalysisBackfill({
      limit: input?.limit,
      maxAttempts: input?.maxAttempts,
    }),
  );

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.candidates.length === 0) {
    return ready(
      {
        attemptedCount: 0,
        failedCount: 0,
        markedFailedCount: 0,
        markedSyncedCount: 0,
        stagedAt: staged.data.stagedAt,
        succeededCount: 0,
      },
      commandName,
      "백필할 로컬 파일 분석 대상이 없습니다.",
    );
  }

  const analysisResults = await Promise.allSettled(
    staged.data.candidates.map((candidate) =>
      analyzePersonalLocalFileWithKeySentences({
        localFileId: candidate.localFileId,
        resourceId: candidate.resourceId,
      }),
    ),
  );
  const marks = staged.data.candidates.map((candidate, index) => {
    const result = analysisResults[index];
    const succeeded = result?.status === "fulfilled" && result.value.status === "ready";
    const message =
      result?.status === "rejected"
        ? getErrorMessage(result.reason)
        : result?.status === "fulfilled" && result.value.status !== "ready"
          ? result.value.message
          : null;

    return {
      checksum: candidate.checksum,
      errorMessage: succeeded ? null : message,
      localFileId: candidate.localFileId,
      resourceId: candidate.resourceId,
      status: succeeded ? "SYNCED" : "FAILED",
    };
  });
  const markResult = await tauriCommands.markLocalFileAnalysesSent({ results: marks });
  const succeededCount = marks.filter((mark) => mark.status === "SYNCED").length;
  const failedCount = marks.length - succeededCount;
  const result = {
    attemptedCount: marks.length,
    failedCount,
    markedFailedCount: markResult.failedCount,
    markedSyncedCount: markResult.syncedCount,
    stagedAt: staged.data.stagedAt,
    succeededCount,
  };
  notifyPersonalResourcesChanged({
    analysisFailedCount: failedCount,
    analysisRequestedCount: succeededCount,
    analysisSkippedCount: 0,
    failedCount,
    sentCount: 0,
    skippedCount: 0,
    syncedAt: markResult.completedAt,
    syncedCount: 0,
  });

  return ready(
    result,
    commandName,
    `기존 로컬 파일 분석 백필 ${succeededCount}건을 전달했습니다. ${failedCount}건은 실패했습니다.`,
  );
}

function isAnalyzableLocalFileName(fileName?: string | null) {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  return extension !== undefined && ANALYZABLE_LOCAL_FILE_EXTENSIONS.has(extension);
}

function notifyPersonalResourcesChanged(result: PersonalLocalFileEventsSyncResult) {
  if (typeof window === "undefined") {
    return;
  }

  if (result.syncedCount === 0 && result.analysisRequestedCount === 0) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PersonalLocalFileEventsSyncResult>(PERSONAL_RESOURCES_CHANGED_EVENT, {
      detail: result,
    }),
  );
}
