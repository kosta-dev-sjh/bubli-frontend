"use client";

import { useEffect } from "react";

import { AUTH_SESSION_CHANGE_EVENT, getStoredAuthSession } from "@/lib/auth/auth-session";
import { startTauriActivityRuntime, stopTauriActivityRuntime } from "@/lib/local/activity-runtime";
import { launchTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export function TauriPostLoginLauncher() {
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    function launchAuthenticatedSurfaces() {
      const hasAuthenticatedSession = Boolean(getStoredAuthSession());
      if (!hasAuthenticatedSession) {
        stopTauriActivityRuntime();
        return;
      }

      void launchTauriAuthenticatedSurfaces().catch(() => undefined);
      startTauriActivityRuntime();
    }

    launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);
    };
  }, []);

  return null;
}
