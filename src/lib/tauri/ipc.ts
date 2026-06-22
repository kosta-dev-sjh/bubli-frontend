import { isTauriRuntime } from "@/lib/tauri/is-tauri";

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export async function invokeTauri<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error(`Tauri IPC is not available in this runtime: ${command}`);
  }

  const { invoke } = (await import("@tauri-apps/api/core")) as {
    invoke: TauriInvoke;
  };

  return invoke<T>(command, args);
}
