"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

// 메뉴는 별도 페이지가 아니라 같은 페이지 섹션으로 가는 앵커.
const navLinks = [
  { href: "/#features", id: "features", label: "기능" },
  { href: "/#desktop", id: "desktop", label: "데스크탑 앱" },
  { href: "/#download", id: "download", label: "다운로드" },
  { href: "/#faq", id: "faq", label: "FAQ" },
];

export function LandingNav() {
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
        <nav aria-label="공개 사이트" className="landing-nav__links">
          {navLinks.map((item) => (
            <Link aria-current={activeSection === item.id ? "page" : undefined} className={cn(activeSection === item.id && "is-active")} key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="landing-nav__cta">
          <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/login">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
