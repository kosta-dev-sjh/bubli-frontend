"use client";

import { createContext, useCallback, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_CHANGE_EVENT,
  normalizeLocale,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
} from "./locale";
import { messages, type MessageKey } from "./messages";

export type TranslateVars = Record<string, string | number>;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: TranslateVars) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

// 저장된 로케일을 외부 스토어로 읽는다. 같은 탭에서 setLocale로 바뀌면 통지한다.
// (effect에서 setState로 초기값을 끌어오지 않으므로 cascading render가 없고, 하이드레이션도 안전하다.
//  ThemeProvider와 동일한 패턴이다.)
const storedListeners = new Set<() => void>();

function notifyStored(): void {
  for (const listener of storedListeners) {
    listener();
  }
}

function subscribeStored(onChange: () => void): () => void {
  storedListeners.add(onChange);
  // 다른 탭에서의 변경(storage 이벤트)과 명시적 locale 변경 이벤트도 반영한다.
  const handleStorage = () => onChange();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener(LOCALE_CHANGE_EVENT, handleStorage);
  }
  return () => {
    storedListeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleStorage);
    }
  };
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

type I18nProviderProps = {
  children: ReactNode;
  /** 스토리/미리보기에서 로케일을 고정할 때 사용한다. */
  forcedLocale?: Locale;
};

export function I18nProvider({ children, forcedLocale }: I18nProviderProps) {
  const storedLocale = useSyncExternalStore<Locale>(
    subscribeStored,
    () => (forcedLocale ? forcedLocale : readStoredLocale()),
    () => DEFAULT_LOCALE,
  );

  const locale: Locale = forcedLocale ?? storedLocale;

  const setLocale = useCallback(
    (next: Locale) => {
      const normalized = normalizeLocale(next);
      writeStoredLocale(normalized);
      notifyStored();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT));
      }
    },
    [],
  );

  const t = useCallback(
    (key: MessageKey, vars?: TranslateVars) => {
      const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
      return interpolate(template, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
