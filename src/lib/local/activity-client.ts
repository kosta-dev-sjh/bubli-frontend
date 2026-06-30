import { plannedTauriCommands, PLANNED_TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { blocked, runTauriAdapter, unavailable } from "@/lib/local/adapter-result";
import type { ActivityContextAdapterResult, ActivityContextReadInput } from "@/types/local";

export async function readCurrentActivityContext(
  input: ActivityContextReadInput,
): Promise<ActivityContextAdapterResult> {
  const commandName = PLANNED_TAURI_COMMANDS.readActivityContext;

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

  return runTauriAdapter(commandName, () => plannedTauriCommands.readActivityContext());
}
