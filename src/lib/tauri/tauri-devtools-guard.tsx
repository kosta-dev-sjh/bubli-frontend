"use client";

import { useEffect } from "react";

import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const BLOCKED_DEVTOOLS_KEYS = new Set(["c", "i", "j"]);

function isDevtoolsShortcut(event: KeyboardEvent) {
  if (event.key === "F12") return true;
  if (event.key === "ContextMenu") return true;
  if (event.shiftKey && event.key === "F10") return true;
  if (!event.ctrlKey || !event.shiftKey) return false;
  return BLOCKED_DEVTOOLS_KEYS.has(event.key.toLowerCase());
}

export function TauriDevtoolsGuard() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    function blockContextMenu(event: MouseEvent) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function blockContextMenuPointer(event: MouseEvent) {
      if (event.button !== 2) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function blockDevtoolsShortcut(event: KeyboardEvent) {
      if (!isDevtoolsShortcut(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("mousedown", blockContextMenuPointer, { capture: true });
    window.addEventListener("contextmenu", blockContextMenu, { capture: true });
    window.addEventListener("keydown", blockDevtoolsShortcut, { capture: true });

    return () => {
      window.removeEventListener("mousedown", blockContextMenuPointer, { capture: true });
      window.removeEventListener("contextmenu", blockContextMenu, { capture: true });
      window.removeEventListener("keydown", blockDevtoolsShortcut, { capture: true });
    };
  }, []);

  return null;
}
