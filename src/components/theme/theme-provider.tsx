"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

function readStored(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return theme;
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
  const [theme, setThemeState] = useState<Theme>(defaultTheme ?? "system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const mounted = useRef(false);

  // 첫 마운트에서 저장값 읽기(서버/클라 불일치 방지를 위해 effect에서만 처리)
  useEffect(() => {
    mounted.current = true;
    if (defaultTheme) {
      setThemeState(defaultTheme);
      return;
    }
    if (enableStorage) {
      setThemeState(readStored());
    }
  }, [defaultTheme, enableStorage]);

  // theme이 바뀌거나 system 선호가 바뀔 때 attribute 적용
  useEffect(() => {
    const target = attributeTarget ?? (typeof document !== "undefined" ? document.documentElement : null);
    if (!target) {
      return;
    }

    const apply = () => {
      const next = resolve(theme);
      target.setAttribute("data-theme", next);
      setResolvedTheme(next);
    };
    apply();

    if (theme !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, attributeTarget]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (enableStorage && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
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
