import { isTauriRuntime } from "./is-tauri";

function tauriUserAgent() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent.toLowerCase();
}

export function isMacTauriRuntime() {
  return isTauriRuntime() && tauriUserAgent().includes("mac");
}

export function isWindowsTauriRuntime() {
  return isTauriRuntime() && tauriUserAgent().includes("windows");
}
