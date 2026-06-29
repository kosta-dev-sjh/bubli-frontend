"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
};

const STORAGE_KEY = "bubli-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function parseTheme(raw: string | null): Theme {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function readStored(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }
  return parseTheme(window.localStorage.getItem(STORAGE_KEY));
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// 저장된 테마를 외부 스토어로 읽는다. 같은 탭에서 setTheme로 바뀌면 통지한다.
// (effect에서 setState로 초기값을 끌어오지 않으므로 cascading render가 없고, 하이드레이션도 안전하다.)
const storedListeners = new Set<() => void>();
function notifyStored(): void {
  for (const listener of storedListeners) {
    listener();
  }
}
function subscribeStored(onChange: () => void): () => void {
  storedListeners.add(onChange);
  return () => {
    storedListeners.delete(onChange);
  };
}

function subscribeSystem(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

type ThemeProviderProps = {
  children: ReactNode;
  /** Storybook이나 미리보기에서 attribute를 붙일 대상. 기본은 document.documentElement. */
  attributeTarget?: HTMLElement | null;
  /** 초기값 강제(스토리에서 Light/Dark/System 고정 미리보기용). */
  defaultTheme?: Theme;
  /** localStorage 사용 여부. 스토리에서는 끈다. */
  enableStorage?: boolean;
};

export function ThemeProvider({
  children,
  attributeTarget,
  defaultTheme,
  enableStorage = true,
}: ThemeProviderProps) {
  // 저장값(서버/하이드레이션 스냅샷은 "system" → 첫 렌더 불일치 없음, 이후 저장값으로 동기화)
  const storedTheme = useSyncExternalStore<Theme>(
    subscribeStored,
    () => (enableStorage ? readStored() : "system"),
    () => "system",
  );
  // 시스템 다크 선호(OS 변경에 반응)
  const prefersDark = useSyncExternalStore(subscribeSystem, systemPrefersDark, () => false);
  // 사용자가 세션 중 토글로 고른 값(저장을 끈 경우의 캐리어)
  const [override, setOverride] = useState<Theme | null>(null);

  const theme: Theme = defaultTheme ?? override ?? storedTheme;
  const resolvedTheme: ResolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  // theme이 바뀌면 attribute만 적용(상태 변경 없음)
  useEffect(() => {
    const target = attributeTarget ?? (typeof document !== "undefined" ? document.documentElement : null);
    if (target) {
      target.setAttribute("data-theme", resolvedTheme);
    }
  }, [resolvedTheme, attributeTarget]);

  const setTheme = useCallback(
    (next: Theme) => {
      setOverride(next);
      if (enableStorage && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
        notifyStored();
      }
    },
    [enableStorage],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme는 ThemeProvider 안에서만 사용할 수 있다.");
  }
  return ctx;
}
