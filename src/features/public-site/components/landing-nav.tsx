"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

// 메뉴는 별도 페이지가 아니라 같은 페이지 섹션으로 가는 앵커.
const navLinks = [
  { href: "/#features", label: "기능" },
  { href: "/#desktop", label: "데스크탑 앱" },
  { href: "/#download", label: "다운로드" },
  { href: "/#faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("landing-nav", scrolled && "landing-nav--scrolled")}>
      <div className="landing-nav__inner">
        <Link className="landing-nav__brand bubli-wordmark" href="/">
          {siteConfig.name}
        </Link>
        <nav aria-label="공개 사이트" className="landing-nav__links">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="landing-nav__cta">
          <Link className="bubli-button bubli-button--sm" href="/#download">
            다운로드
          </Link>
          <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/login">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
