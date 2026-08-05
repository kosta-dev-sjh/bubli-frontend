"use client";

import { Globe, LogOut, Settings, SunMoon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme";
import { LOCALES, useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./workspace-topbar.module.css";

// 로케일 표기는 설정 화면(localeOptions)과 동일하게 고유 명칭을 그대로 쓴다.
const localeLabels: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
};

export type TopbarProfileMenuUser = {
  displayName: string;
  email: string;
};

export type TopbarProfileMenuProps = {
  id?: string;
  onLocaleChange?: (locale: Locale) => Promise<void> | void;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  user: TopbarProfileMenuUser;
};

export function TopbarProfileMenu({ id, onClose, onLocaleChange, onLogout, user }: TopbarProfileMenuProps) {
  const { locale, setLocale, t } = useI18n();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savingLocale, setSavingLocale] = useState<Locale | null>(null);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === locale || savingLocale) return;

    const previousLocale = locale;
    setLocale(nextLocale);
    setSavingLocale(nextLocale);

    try {
      await onLocaleChange?.(nextLocale);
    } catch {
      setLocale(previousLocale);
    } finally {
      setSavingLocale(null);
    }
  }

  return (
    <div aria-label={t("layout.profileMenu.aria")} className={styles.menuPopover} id={id} role="menu">
      <div className={styles.menuHeader}>
        <strong>{user.displayName}</strong>
        <span>{user.email}</span>
      </div>
      <Link className={styles.menuItem} href="/app/settings" onClick={onClose} role="menuitem">
        <Settings size={15} strokeWidth={2.1} aria-hidden="true" />
        {t("layout.profileMenu.settings")}
      </Link>
      <div aria-label={t("layout.profileMenu.language")} className={styles.menuLocaleRow} role="group">
        <Globe size={15} strokeWidth={2.1} aria-hidden="true" />
        {LOCALES.map((option) => (
          <button
            aria-pressed={locale === option}
            className={styles.menuLocaleButton}
            data-active={locale === option ? "true" : undefined}
            disabled={savingLocale !== null}
            key={option}
            lang={option}
            onClick={() => void handleLocaleChange(option)}
            type="button"
          >
            {localeLabels[option]}
          </button>
        ))}
      </div>
      {/* 다크/라이트 전환 — 설정 화면까지 가지 않아도 프로필 메뉴에서 바로 바꿀 수 있게 한다. */}
      <div aria-label={t("layout.profileMenu.theme")} className={styles.menuThemeRow} role="group">
        <SunMoon size={15} strokeWidth={2.1} aria-hidden="true" />
        <ThemeToggle />
      </div>
      <div aria-hidden="true" className={styles.menuDivider} />
      <button
        className={cn(styles.menuItem, styles.menuItemDanger)}
        disabled={isLoggingOut}
        onClick={handleLogout}
        role="menuitem"
        type="button"
      >
        <LogOut size={15} strokeWidth={2.1} aria-hidden="true" />
        {isLoggingOut ? t("layout.profileMenu.loggingOut") : t("layout.profileMenu.logout")}
      </button>
    </div>
  );
}
