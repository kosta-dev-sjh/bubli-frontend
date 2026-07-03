"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// 메뉴는 별도 페이지가 아니라 같은 페이지 섹션으로 가는 앵커.
const navLinks: { href: string; id: string; labelKey: MessageKey }[] = [
  { href: "/#features", id: "features", labelKey: "public.nav.features" },
  { href: "/#desktop", id: "desktop", labelKey: "public.nav.desktop" },
  { href: "/#download", id: "download", labelKey: "public.nav.download" },
  { href: "/#faq", id: "faq", labelKey: "public.nav.faq" },
];

export function LandingNav() {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = ["features", "desktop", "download", "faq"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-24% 0px -54% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={cn("landing-nav", scrolled && "landing-nav--scrolled")}>
      <div className="landing-nav__inner">
        <Link className="landing-nav__brand bubli-wordmark" href="/">
          {siteConfig.name}
        </Link>
        <nav aria-label={t("public.nav.aria")} className="landing-nav__links">
          {navLinks.map((item) => (
            <Link aria-current={activeSection === item.id ? "page" : undefined} className={cn(activeSection === item.id && "is-active")} key={item.href} href={item.href}>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="landing-nav__cta">
          <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/login">
            {t("common.login")}
          </Link>
        </div>
      </div>
    </header>
  );
}
