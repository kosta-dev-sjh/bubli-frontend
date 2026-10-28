import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import type {
  LocalFileByResourceIdResult,
  LocalFileAnalysisStatusResult,
  LocalFileKeySentenceResult,
} from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { localFileAnalysisApi } from "@/features/managed-folder/api/localFileAnalysisApi";
import { managedFolderApi } from "@/features/managed-folder/api/managedFolderApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { notifyDataChanged } from "@/lib/data-changed";
import {
  blocked,
  failed,
  getErrorMessage,
  hasProjectRoomScope,
  ready,
  runTauriAdapter,
  unavailable,
} from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import { ApiClientError } from "@/lib/api/errors";
import { getApiTimeoutMs } from "@/lib/api/client";
import { getStoredAuthSession } from "@/lib/auth/auth-session";
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
  deferred?: boolean;
  analysisFailedCount: number;
  analysisRequestedCount: number;
  analysisSkippedCount: number;
  failedCount: number;
  sentCount: number;
  skippedCount: number;
  syncedAt: string;
  syncedCount: number;
  syncedResourceIds: string[];
};

type PersonalLocalFileSyncInput = {
  consentGranted?: boolean;
  limit?: number;
  localFolderId?: string;
  roomId?: string | null;
};

// SQLite owns the cross-window lease; this tail only coalesces this context's calls.
let personalFileSyncTail: Promise<void> = Promise.resolve();
let personalFileSyncEnabled = true;
let personalFileSyncGeneration = 0;
const pendingPersonalFileSyncs = new Map<
  string,
  Promise<LocalAdapterResult<PersonalLocalFileEventsSyncResult>>
>();

export function setPersonalLocalFileSyncEnabled(enabled: boolean) {
  if (personalFileSyncEnabled === enabled) return;
  personalFileSyncEnabled = enabled;
  personalFileSyncGeneration += 1;
  pendingPersonalFileSyncs.clear();
}

export type PersonalLocalFileAnalysisBackfillResult = {
  attemptedCount: number;
  failedCount: number;
  markedFailedCount: number;
  markedSyncedCount: number;
  stagedAt: string;
  succeededCount: number;
};

export type PersonalLocalFileAnalysisStatusResult = LocalFileAnalysisStatusResult;

export type PersonalLocalFileAnalysisResult = {
  extraction: LocalFileKeySentenceResult;
  job: LocalFileAnalysisResponse;
  sentAt: string;
};

type PersonalLocalFileAnalysisInput = LocalFileKeySentenceAdapterInput & {
  resourceId: string;
  expectedOwnerId?: string;
};

type PersonalLocalFileByResourceInput = {
  consentGranted?: boolean;
  resourceId: string;
  roomId?: string | null;
};

export const PERSONAL_RESOURCES_CHANGED_EVENT = "bubli-personal-resources-changed";

const ANALYZABLE_LOCAL_FILE_EXTENSIONS = new Set([
  "csv",
  "docx",
  "htm",
  "html",
  "hwpx",
  "json",
  "jsonl",
  "markdown",
  "md",
  "pdf",
  "pptx",
  "rtf",
  "tsv",
  "txt",
  "xlsx",
  "yaml",
  "yml",
]);

// 호출 시점의 로케일로 번역하기 위해 상수 대신 함수로 둔다(모듈 로드 시점에 고정되지 않도록).
const personalScopeMessage = () => translate("local.folder.personalOnly");
const folderConsentMessage = () => translate("local.folder.consentRequired");

function localFolderConsentBlocked(commandName: typeof TAURI_COMMANDS[keyof typeof TAURI_COMMANDS]) {
  return blocked("local_folder_consent_required", folderConsentMessage(), commandName);
}

export async function selectPersonalManagedFolder(
  input?: PersonalManagedFolderSelectInput,
): Promise<ManagedFolderSelectResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.selectManagedFolder);
  }

  if (!input?.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.selectManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.selectManagedFolder);
  }

  const tauriInput = input?.path ? { path: input.path } : undefined;

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

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.scanManagedFolder);
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

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.getIndexProgress);
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

  if (input.enabled && !input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.setFolderSync);
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

export type PersonalFolderResourceCleanupResult = {
  // 이 폴더 출처로 확인돼 삭제를 시도한 자료 수.
  matchedCount: number;
  deletedCount: number;
  failedCount: number;
  // 확인을 위해 훑은 개인 자료 수.
  scannedCount: number;
};

// 파일 경로가 폴더 안에 있는지 확인한다. 경로 구분자(/, \)까지 확인해서
// "폴더 이름이 접두어만 우연히 같은" 다른 폴더의 파일은 제외한다.
function isPathInsideFolder(filePath: string, normalizedFolderPath: string) {
  if (!filePath.startsWith(normalizedFolderPath)) {
    return false;
  }

  const rest = filePath.slice(normalizedFolderPath.length);
  return rest.startsWith("/") || rest.startsWith("\\");
}

// 폴더 연결 해제에서 "서버 자료도 함께 삭제"를 고른 경우:
// 그 폴더 출처로 업로드된 개인 자료를 서버에서 일괄 삭제한다.
// 서버에는 폴더 정보가 없어서(자료는 제목/크기만 올라간다), 로컬 색인(local_files)의
// resourceId ↔ 파일 경로 매핑으로 "이 폴더에서 올라간 자료"를 골라낸다.
// 폴더를 해제해도 로컬 색인은 기기 안에 남아 있어 해제 직후에도 조회할 수 있다.
// 항목별 실패는 건너뛰고 개수만 집계하는 최선 노력 방식이다.
export async function deletePersonalFolderResourcesOnServer(input: {
  folderPath: string;
  roomId?: string | null;
}): Promise<LocalAdapterResult<PersonalFolderResourceCleanupResult>> {
  const commandName = TAURI_COMMANDS.findLocalFileByResourceId;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), commandName);
  }

  // 끝의 경로 구분자를 정리해 접두어 비교를 일정하게 만든다.
  const normalizedFolderPath = input.folderPath.replace(/[\\/]+$/, "");
  if (!normalizedFolderPath) {
    return failed(translate("local.folder.cleanupPathMissing"), commandName);
  }

  // 1) 개인 자료를 페이지 단위로 전부 모은다. 폴더 자료 수는 크지 않다는 전제이고,
  //    페이지 상한을 둬서 서버 오류로 인한 무한 순회를 막는다.
  const resources: Array<{ id: string }> = [];
  const pageSize = 100;
  const maxPages = 50;
  try {
    for (let page = 0; page < maxPages; page += 1) {
      const response = await resourcesApi.listPersonalPage(page, pageSize);
      resources.push(...response.items);
      if (!response.hasNext) {
        break;
      }
    }
  } catch (error) {
    return failed(getErrorMessage(error), commandName);
  }

  // 2) 자료마다 로컬 색인을 역조회해서 이 폴더 안에서 올라간 자료만 고른다.
  //    조회 실패는 "이 폴더 자료 아님"으로 보고 건너뛴다(서버 자료 오삭제 방지).
  const targetResourceIds: string[] = [];
  for (const resource of resources) {
    const localFile = await tauriCommands
      .findLocalFileByResourceId({ resourceId: resource.id })
      .catch(() => null);
    if (localFile && isPathInsideFolder(localFile.path, normalizedFolderPath)) {
      targetResourceIds.push(resource.id);
    }
  }

  // 3) 항목별 최선 노력 삭제 — 하나가 실패해도 나머지는 계속 지우고 개수만 보고한다.
  let deletedCount = 0;
  let failedCount = 0;
  for (const resourceId of targetResourceIds) {
    await resourcesApi
      .delete(resourceId)
      .then(() => {
        deletedCount += 1;
      })
      .catch(() => {
        failedCount += 1;
      });
  }

  if (deletedCount > 0) {
    notifyDataChanged("resource");
  }

  return ready(
    {
      deletedCount,
      failedCount,
      matchedCount: targetResourceIds.length,
      scannedCount: resources.length,
    },
    commandName,
  );
}

export async function watchPersonalManagedFolder(
  input: PersonalManagedFolderCommandInput & { consentGranted?: boolean },
): Promise<ManagedFolderWatchAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.watchManagedFolder);
  }

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.watchManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.watchManagedFolder);
  }

  const tauriInput = { localFolderId: input.localFolderId };
  const commandName = TAURI_COMMANDS.watchManagedFolder;

  const result = await runTauriAdapter(commandName, () => tauriCommands.watchManagedFolder(tauriInput));
  if (result.status !== "failed") {
    return result;
  }

  return failed(getErrorMessage(result.message), commandName);
}

export async function searchPersonalLocalFiles(
  input: LocalFileSearchAdapterInput,
): Promise<LocalFileSearchAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.searchLocalFiles);
  }

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.searchLocalFiles);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.searchLocalFiles);
  }

  const tauriInput = {
    limit: input.limit,
    query: input.query,
  };

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

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.openLocalFile);
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

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.readLocalFilePreview);
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

export async function findPersonalLocalFileByResourceId(
  input: PersonalLocalFileByResourceInput,
): Promise<LocalAdapterResult<LocalFileByResourceIdResult | null>> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.findLocalFileByResourceId);
  }

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.findLocalFileByResourceId);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.findLocalFileByResourceId);
  }

  return runTauriAdapter(TAURI_COMMANDS.findLocalFileByResourceId, () =>
    tauriCommands.findLocalFileByResourceId({ resourceId: input.resourceId }),
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
    return blocked("personal_scope_only", personalScopeMessage(), commandName);
  }

  if (!input.consentGranted) {
    return localFolderConsentBlocked(commandName);
  }

  const expectedOwnerId = input.expectedOwnerId ?? getStoredAuthSession()?.user?.id;
  if (!expectedOwnerId || getStoredAuthSession()?.user?.id !== expectedOwnerId) {
    return failed("File analysis account changed", commandName);
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
    await markPersonalLocalFileAnalysis({
      checksum: extraction.checksum,
      errorMessage: `local key sentence extraction status: ${extraction.status}`,
      localFileId: extraction.localFileId,
      resourceId: input.resourceId,
      status: "FAILED",
    });
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
    }, { expectedUserId: expectedOwnerId });
    const markResult = await markPersonalLocalFileAnalysis({
      checksum: extraction.checksum,
      errorMessage: null,
      localFileId: extraction.localFileId,
      resourceId: input.resourceId,
      status: "SYNCED",
    });

    return ready(
      {
        extraction,
        job,
        sentAt: new Date().toISOString(),
      },
      commandName,
      markResult.status === "ready" && markResult.data.syncedCount > 0
        ? "로컬 파일 중요 문장을 서버 분석 요청으로 전달했습니다."
        : "로컬 파일 분석은 전달했지만 로컬 분석 전송 상태를 동기화로 표시하지 못했습니다.",
    );
  } catch (error) {
    const message = getErrorMessage(error);
    await markPersonalLocalFileAnalysis({
      checksum: extraction.checksum,
      errorMessage: message,
      localFileId: extraction.localFileId,
      resourceId: input.resourceId,
      status: "FAILED",
    });
    return failed(message, commandName);
  }
}

async function markPersonalLocalFileAnalysis(input: {
  checksum?: string | null;
  errorMessage?: string | null;
  localFileId: string;
  resourceId: string;
  status: "FAILED" | "SYNCED";
}) {
  try {
    const data = await tauriCommands.markLocalFileAnalysesSent({
      results: [
        {
          checksum: input.checksum,
          errorMessage: input.errorMessage,
          localFileId: input.localFileId,
          resourceId: input.resourceId,
          status: input.status,
        },
      ],
    });
    return { data, status: "ready" as const };
  } catch (error) {
    return { message: getErrorMessage(error), status: "failed" as const };
  }
}

export async function reindexPersonalLocalFile(
  input: LocalFileReindexAdapterInput,
): Promise<LocalFileReindexAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.reindexFile);
  }

  if (!input.consentGranted) {
    return localFolderConsentBlocked(TAURI_COMMANDS.reindexFile);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), TAURI_COMMANDS.reindexFile);
  }

  return runTauriAdapter(TAURI_COMMANDS.reindexFile, () =>
    tauriCommands.reindexFile({ localFileId: input.localFileId }),
  );
}

export async function syncPersonalLocalFileEventsToServer(
  input?: PersonalLocalFileSyncInput,
): Promise<LocalAdapterResult<PersonalLocalFileEventsSyncResult>> {
  const commandName = TAURI_COMMANDS.stageLocalFileEventsForSync;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), commandName);
  }

  if (!input?.consentGranted || !personalFileSyncEnabled) {
    return localFolderConsentBlocked(commandName);
  }

  const ownerId = getStoredAuthSession()?.user?.id;
  if (!ownerId) return failed("File sync requires an authenticated account", commandName);
  const key = JSON.stringify([ownerId, input.localFolderId ?? null, input.limit ?? null]);
  const pending = pendingPersonalFileSyncs.get(key);
  if (pending) return pending;

  const snapshot = { ...input };
  const generation = personalFileSyncGeneration;
  const request: Promise<LocalAdapterResult<PersonalLocalFileEventsSyncResult>> = personalFileSyncTail.then(() => {
    if (pendingPersonalFileSyncs.get(key) === request) pendingPersonalFileSyncs.delete(key);
    if (generation !== personalFileSyncGeneration) {
      return failed(translate("local.folder.syncCancelled"), commandName);
    }
    return syncPersonalLocalFileEventsOnce(snapshot, generation, ownerId);
  });
  pendingPersonalFileSyncs.set(key, request);
  personalFileSyncTail = request.then(() => undefined, () => undefined);
  return request;
}

async function syncPersonalLocalFileEventsOnce(
  input: PersonalLocalFileSyncInput,
  generation: number,
  ownerId: string,
): Promise<LocalAdapterResult<PersonalLocalFileEventsSyncResult>> {
  const commandName = TAURI_COMMANDS.stageLocalFileEventsForSync;
  const staged = await runTauriAdapter(commandName, async () => {
    const context = await tauriCommands.getLocalFileSyncContext({ ownerId });
    return tauriCommands.stageLocalFileEventsForSync({
        context,
        limit: input.limit,
        localFolderId: input.localFolderId,
    });
  });

  if (staged.status !== "ready") {
    return staged;
  }

  if (generation !== personalFileSyncGeneration) {
    if (staged.data.lease) await tauriCommands.releaseLocalFileSyncLease(staged.data.lease).catch(() => undefined);
    return failed(translate("local.folder.syncCancelled"), commandName);
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
        syncedResourceIds: [],
        deferred: staged.data.busy,
      },
      commandName,
      translate("local.folder.noChanges"),
    );
  }

  let lease = staged.data.lease;
  if (!lease || lease.context.ownerId !== ownerId) return failed("Missing file sync sender lease", commandName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getApiTimeoutMs());
  let renewing = false;
  const renewal = window.setInterval(async () => {
    if (renewing) return;
    renewing = true;
    try { lease = await tauriCommands.renewLocalFileSyncLease(lease!); }
    catch { controller.abort(); }
    finally { renewing = false; }
  }, 20_000);
  try {
    const eventsById = new Map(staged.data.events.map(event => [event.localEventId, event]));
    if (eventsById.size !== staged.data.events.length || staged.data.events.some(event => !event.localEventId?.trim())) {
      throw new Error("Invalid staged change IDs");
    }
    const response = await sendLocalFileEventBatch({
      events: staged.data.events.map((event) => ({
        eventType: event.eventType,
        fileName: event.fileName,
        fileSizeBytes: event.fileSizeBytes,
        localEventId: event.localEventId,
        mimeType: event.mimeType,
        resourceId: event.resourceId,
        syncDeviceId: event.syncDeviceId,
        localSequence: event.localSequence,
      })),
    }, { expectedUserId: ownerId, signal: controller.signal });
    if (!Array.isArray(response?.results) || response.results.length !== staged.data.events.length) {
      throw new Error("Incomplete sync response");
    }
    const seen = new Set<string>();
    const pairedResults = response.results.map(result => {
      const id = result?.localEventId;
      const localEvent = typeof id === "string" ? eventsById.get(id) : undefined;
      if (!id || !localEvent || seen.has(id) || result.eventType !== localEvent.eventType) {
        throw new Error("Sync response change ID or event type does not match the request");
      }
      seen.add(id);
      if (!["PROCESSING", "SYNCED", "SUPERSEDED", "SKIPPED", "FAILED"].includes(result.status)
        || (result.status === "SKIPPED" && localEvent.eventType !== "DELETED")
        || (result.status === "SUPERSEDED" && localEvent.eventType !== "UPDATED")
        || (result.retryable != null && typeof result.retryable !== "boolean")
        || (result.errorCode != null && typeof result.errorCode !== "string")
        || (result.resourceId != null && (typeof result.resourceId !== "string" || !result.resourceId.trim()))
        || (["SYNCED", "SUPERSEDED"].includes(result.status) && localEvent.eventType !== "DELETED" && !result.resourceId)) {
        throw new Error("Invalid sync response status or resource ID");
      }
      return { localEvent, syncResult: result, localEventId: id };
    });
    const markResults = pairedResults.map(({syncResult, localEventId}) => ({
      localEventId,
      resourceId: syncResult.resourceId,
      status: syncResult.status === "FAILED" && syncResult.retryable === false ? "REJECTED" : syncResult.status,
      reason: syncResult.errorCode ?? null,
      nextRetryAt: syncResult.status === "PROCESSING" || (syncResult.status === "FAILED" && syncResult.retryable !== false)
        ? Date.now() + 1000 + Math.floor(Math.random() * 1000) : null,
    }));
    const markResult = await tauriCommands.markLocalFileEventsSynced({
      lease,
      results: markResults,
    });
    window.clearInterval(renewal);
    clearTimeout(timeout);
    await tauriCommands.releaseLocalFileSyncLease(lease);
    const skippedCount = response.results.filter(
      (result) => result.status === "SKIPPED" || result.status === "SUPERSEDED",
    ).length;
    const syncedResourceIds = [
      ...new Set(
        response.results
          .filter((result) => result.status === "SYNCED" && typeof result.resourceId === "string")
          .map((result) => result.resourceId as string),
      ),
    ];
    const syncedAnalysisEvents = pairedResults
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
          expectedOwnerId: ownerId,
          consentGranted: input.consentGranted,
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
      syncedResourceIds,
    };
    notifyPersonalResourcesChanged(syncResult);

    return ready(
      syncResult,
      commandName,
      `동기화 응답 ${response.results.length}건: 완료 ${markResult.syncedCount}건, 실패 ${markResult.failedCount}건, 처리 중 ${response.results.filter(result => result.status === "PROCESSING").length}건.`,
    );
  } catch (error) {
    const syncErrorMessage = getErrorMessage(error);
    const permanent = error instanceof ApiClientError && [400, 404, 409, 413, 415, 422].includes(error.status);
    const delay = error instanceof ApiClientError && [401, 403].includes(error.status) ? 60_000
      : error instanceof ApiClientError ? Math.min(error.retryAfterMs ?? 1000, Number.MAX_SAFE_INTEGER - Date.now() - 1000) : 1000;
    const nextRetryAt = permanent ? null : Date.now() + delay + Math.floor(Math.random() * 1000);
    try {
      await tauriCommands.markLocalFileEventsSynced({
        lease,
        results: staged.data.events.map((event) => ({
          localEventId: event.localEventId,
          resourceId: event.resourceId,
          status: permanent ? "REJECTED" : "FAILED",
          reason: syncErrorMessage,
          nextRetryAt,
        })),
      });
    } catch (markError) {
      return failed(`${syncErrorMessage} / local failure mark failed: ${getErrorMessage(markError)}`, commandName);
    }

    return failed(syncErrorMessage, commandName);
  } finally {
    window.clearInterval(renewal);
    clearTimeout(timeout);
    await tauriCommands.releaseLocalFileSyncLease(lease).catch(() => undefined);
  }
}

async function sendLocalFileEventBatch(input: Parameters<typeof managedFolderApi.syncApprovedLocalFileEvents>[0], options: Parameters<typeof managedFolderApi.syncApprovedLocalFileEvents>[1]): ReturnType<typeof managedFolderApi.syncApprovedLocalFileEvents> {
  if (input.events.length > 100) {
    const first = await sendLocalFileEventBatch({ events: input.events.slice(0, 100) }, options);
    const second = await sendLocalFileEventBatch({ events: input.events.slice(100) }, options);
    return { results: [...first.results, ...second.results] };
  }
  try {
    return await managedFolderApi.syncApprovedLocalFileEvents(input, options);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 413 && input.events.length > 1) {
      const middle = Math.ceil(input.events.length / 2);
      const first = await sendLocalFileEventBatch({ events: input.events.slice(0, middle) }, options);
      const second = await sendLocalFileEventBatch({ events: input.events.slice(middle) }, options);
      return { results: [...first.results, ...second.results] };
    }
    if (error instanceof ApiClientError && [400, 404, 409, 413, 415, 422].includes(error.status)) {
      return { results: input.events.map(event => ({ eventType: event.eventType, localEventId: event.localEventId,
        resourceId: event.resourceId ?? null, status: "FAILED", errorCode: `HTTP_${error.status}`, retryable: false })) };
    }
    throw error;
  }
}

export async function backfillPersonalLocalFileAnalyses(input?: {
  consentGranted?: boolean;
  limit?: number;
  maxAttempts?: number;
  roomId?: string | null;
}): Promise<LocalAdapterResult<PersonalLocalFileAnalysisBackfillResult>> {
  const commandName = TAURI_COMMANDS.stageLocalFileAnalysisBackfill;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), commandName);
  }

  if (!input?.consentGranted) {
    return localFolderConsentBlocked(commandName);
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
        consentGranted: input.consentGranted,
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
    syncedResourceIds: [],
  });

  return ready(
    result,
    commandName,
    `기존 로컬 파일 분석 백필 ${succeededCount}건을 전달했습니다. ${failedCount}건은 실패했습니다.`,
  );
}

export async function getPersonalLocalFileAnalysisStatus(input?: {
  consentGranted?: boolean;
  maxAttempts?: number;
  roomId?: string | null;
}): Promise<LocalAdapterResult<PersonalLocalFileAnalysisStatusResult>> {
  const commandName = TAURI_COMMANDS.getLocalFileAnalysisStatus;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", personalScopeMessage(), commandName);
  }

  if (!input?.consentGranted) {
    return localFolderConsentBlocked(commandName);
  }

  return runTauriAdapter(commandName, () =>
    tauriCommands.getLocalFileAnalysisStatus({ maxAttempts: input.maxAttempts }),
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

  const changedOrAttempted =
    result.syncedCount > 0 ||
    result.sentCount > 0 ||
    result.failedCount > 0 ||
    result.skippedCount > 0 ||
    result.analysisRequestedCount > 0 ||
    result.analysisFailedCount > 0 ||
    result.analysisSkippedCount > 0;
  if (!changedOrAttempted) {
    return;
  }

  notifyDataChanged("resource");
  if (result.analysisRequestedCount > 0 || result.analysisFailedCount > 0) {
    notifyDataChanged("agent");
  }

  window.dispatchEvent(
    new CustomEvent<PersonalLocalFileEventsSyncResult>(PERSONAL_RESOURCES_CHANGED_EVENT, {
      detail: result,
    }),
  );
}
