import Link from "next/link";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px minmax(0, 1fr)",
        minHeight: "100vh",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid var(--color-border)",
          padding: 24,
        }}
      >
        <Link href="/app" style={{ color: "var(--color-brand)", fontSize: 28, fontWeight: 800 }}>
          {siteConfig.name}
        </Link>
        <nav aria-label="회원 앱" style={{ display: "grid", gap: 10, marginTop: 32 }}>
          {siteConfig.appNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="shell">{children}</main>
    </div>
  );
}
