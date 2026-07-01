"use client";

import { useEffect, useRef } from "react";

import { AUTH_SESSION_CHANGE_EVENT, getStoredAuthSession } from "@/lib/auth/auth-session";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export function TauriPostLoginLauncher() {
  const launchedRef = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    function launchAuthenticatedSurfaces() {
      const hasAuthenticatedSession = Boolean(getStoredAuthSession());
      if (launchedRef.current || !hasAuthenticatedSession) {
        return;
      }

      launchedRef.current = true;

      void tauriCommands.appReady().catch(() => undefined);
      void tauriCommands
        .openWidgetWindow({
          bubbleType: "todo",
          mode: "DEFAULT",
          windowId: "todo",
        })
        .catch(() => {
          launchedRef.current = false;
        });
    }

    launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);
    };
  }, []);

  return null;
}
