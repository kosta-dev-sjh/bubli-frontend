"use client";

import dynamic from "next/dynamic";

import { TauriDevtoolsGuard } from "@/lib/tauri/tauri-devtools-guard";
import { TauriPostLoginLauncher } from "@/lib/tauri/tauri-post-login-launcher";

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const realOAuthQaEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";

const TauriRealOAuthQaReporter = dynamic(
  () => import("@/lib/tauri/tauri-real-oauth-qa-reporter").then((mod) => mod.TauriRealOAuthQaReporter),
  { ssr: false },
);

const TauriRuntimeSmokeRunner = dynamic(
  () => import("@/lib/tauri/tauri-runtime-smoke-runner").then((mod) => mod.TauriRuntimeSmokeRunner),
  { ssr: false },
);

export function TauriRuntimeGates() {
  return (
    <>
      <TauriDevtoolsGuard />
      <TauriPostLoginLauncher />
      {realOAuthQaEnabled ? <TauriRealOAuthQaReporter /> : null}
      {runtimeSmokeEnabled ? <TauriRuntimeSmokeRunner /> : null}
    </>
  );
}
