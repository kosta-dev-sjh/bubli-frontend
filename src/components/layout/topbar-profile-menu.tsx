"use client";

import { Globe, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  user: TopbarProfileMenuUser;
};

export function TopbarProfileMenu({ id, onClose, onLogout, user }: TopbarProfileMenuProps) {
  const { locale, setLocale, t } = useI18n();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
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
            key={option}
            lang={option}
            onClick={() => setLocale(option)}
            type="button"
          >
            {localeLabels[option]}
          </button>
        ))}
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
