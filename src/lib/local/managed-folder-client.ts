import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  blocked,
  failed,
  getErrorMessage,
  hasProjectRoomScope,
  pending,
  runTauriAdapter,
  unavailable,
} from "@/lib/local/adapter-result";
import type {
  LocalFileSearchAdapterInput,
  LocalFileSearchAdapterResult,
  ManagedFolderScanAdapterResult,
  ManagedFolderSelectResult,
  ManagedFolderWatchAdapterResult,
  PersonalManagedFolderCommandInput,
  PersonalManagedFolderSelectInput,
} from "@/types/local";

const PERSONAL_SCOPE_MESSAGE =
  "개인 로컬 폴더는 개인 자료 전용입니다. 프로젝트룸 공용 자료는 서버 업로드 흐름으로 연결해야 합니다.";

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

export async function scanPersonalManagedFolder(
  input: PersonalManagedFolderCommandInput,
): Promise<ManagedFolderScanAdapterResult> {
  if (!isTauriRuntime()) {
    return unavailable(TAURI_COMMANDS.scanManagedFolder);
  }

  if (hasProjectRoomScope(input)) {
    return blocked("personal_scope_only", PERSONAL_SCOPE_MESSAGE, TAURI_COMMANDS.scanManagedFolder);
  }

  const { roomId: _roomId, ...tauriInput } = input;

  return runTauriAdapter(TAURI_COMMANDS.scanManagedFolder, () =>
    tauriCommands.scanManagedFolder(tauriInput),
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
