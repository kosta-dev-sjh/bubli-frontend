import Link from "next/link";

import { siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="glass-panel" style={{ padding: "14px 18px" }}>
      <nav
        aria-label="공개 사이트"
        style={{
          alignItems: "center",
          display: "flex",
          gap: 18,
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ color: "var(--color-brand)", fontSize: 28, fontWeight: 800 }}>
          {siteConfig.name}
        </Link>
        <div style={{ display: "flex", gap: 14 }}>
          {siteConfig.publicNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/login">로그인</Link>
        </div>
      </nav>
    </header>
  );
}
