"use client";

import { getStoredAuthSession } from "@/lib/auth/auth-session";

// 지원 로케일. 설정 화면의 한국어 / English / 日本語 버튼과 1:1 대응한다.
export const LOCALES = ["ko", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

// LocaleProvider 전용 저장 키. auth session(user.locale)과 분리한다.
// authApi.updateMe()는 /api/me만 PATCH하고 저장된 세션은 갱신하지 않으므로,
// 언어 전환 즉시성과 새로고침 유지는 이 키로 담당한다.
export const LOCALE_STORAGE_KEY = "bubli-locale";

export const LOCALE_CHANGE_EVENT = "bubli:locale-change";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// 초기 로케일 우선순위: localStorage(bubli-locale) → 저장된 auth session의 user.locale → ko
// 서버 렌더/하이드레이션 스냅샷은 항상 DEFAULT_LOCALE이므로 useSyncExternalStore로 안전하게 동기화한다.
export function readStoredLocale(): Locale {
  if (!canUseStorage()) {
    return DEFAULT_LOCALE;
  }

  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) {
      return raw;
    }
  } catch {
    // localStorage 접근이 막힌 환경은 세션/기본값으로 대체한다.
  }

  const sessionLocale = getStoredAuthSession()?.user?.locale;
  return normalizeLocale(sessionLocale);
}

export function writeStoredLocale(locale: Locale) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 저장 실패는 무시한다. 상태는 메모리에 유지된다.
  }
}
