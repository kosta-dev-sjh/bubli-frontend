"use client";

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

// 공개 네비 라벨은 siteConfig(단일 언어)에 있으므로 href → 번역 키로 매핑해 t()로 표시한다.
const publicNavKeys: Record<(typeof siteConfig.publicNav)[number]["href"], MessageKey> = {
  "/": "nav.public.home",
  "/features": "nav.public.features",
  "/#download": "nav.public.download",
  "/faq": "nav.public.faq",
};

export function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="bubli-surface bubli-public-header">
      <nav aria-label={t("nav.publicLabel")} className="bubli-public-header__nav">
        <Link className="bubli-brand" href="/">
          {siteConfig.name}
        </Link>
        <div className="bubli-public-header__links">
          {siteConfig.publicNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {t(publicNavKeys[item.href])}
            </Link>
          ))}
          <Link href="/login">{t("common.login")}</Link>
        </div>
      </nav>
    </header>
  );
}
