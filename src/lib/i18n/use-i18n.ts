"use client";

import { useContext } from "react";

import { I18nContext, type I18nContextValue } from "./i18n-provider";

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n는 I18nProvider 안에서만 사용할 수 있다.");
  }
  return ctx;
}
