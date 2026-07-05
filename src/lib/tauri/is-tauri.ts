export function isTauriRuntime() {
  if (typeof window === "undefined") return false;
  if ("__TAURI_INTERNALS__" in window || "__TAURI__" in window) return true;

  const { hostname, protocol } = window.location;
  return protocol === "tauri:" || hostname === "tauri.localhost";
}
