"use client";

import { useEffect } from "react";

import { AUTH_SESSION_CHANGE_EVENT, getStoredAuthSession } from "@/lib/auth/auth-session";
import { launchTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { startTauriActivityRuntime, stopTauriActivityRuntime } from "@/lib/tauri/activity-runtime";
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

      startTauriActivityRuntime();
      void launchTauriAuthenticatedSurfaces().catch(() => undefined);
    }

    launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);
    };
  }, []);

  return null;
}
