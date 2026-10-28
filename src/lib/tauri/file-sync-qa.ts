import { getStoredAuthSession } from "@/lib/auth/auth-session";
import { tauriCommands, type LocalFileEventsSyncStageInput } from "@/lib/tauri/commands";

export async function currentFileSyncQaContext() {
  const ownerId = getStoredAuthSession()?.user?.id;
  if (!ownerId) throw new Error("File-sync QA requires a signed-in account");
  return tauriCommands.getLocalFileSyncContext({ ownerId });
}

// Inspection must not retain a sender lease and block the production adapter.
export async function inspectFileSyncQaBatch(input: Omit<LocalFileEventsSyncStageInput, "context">) {
  const staged = await tauriCommands.stageLocalFileEventsForSync({ ...input, context: await currentFileSyncQaContext() });
  if (staged.lease) await tauriCommands.releaseLocalFileSyncLease(staged.lease);
  return staged;
}
