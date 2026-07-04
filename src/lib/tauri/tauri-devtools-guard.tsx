"use client";

import { useEffect } from "react";

import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const BLOCKED_DEVTOOLS_KEYS = new Set(["c", "i", "j"]);

function isDevtoolsShortcut(event: KeyboardEvent) {
  if (event.key === "F12") return true;
  if (!event.ctrlKey || !event.shiftKey) return false;
  return BLOCKED_DEVTOOLS_KEYS.has(event.key.toLowerCase());
}

export function TauriDevtoolsGuard() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    function blockContextMenu(event: MouseEvent) {
      event.preventDefault();
    }

    function blockDevtoolsShortcut(event: KeyboardEvent) {
      if (!isDevtoolsShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("contextmenu", blockContextMenu, { capture: true });
    window.addEventListener("keydown", blockDevtoolsShortcut, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu, { capture: true });
      window.removeEventListener("keydown", blockDevtoolsShortcut, { capture: true });
    };
  }, []);

  return null;
}
