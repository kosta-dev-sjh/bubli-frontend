import Link from "next/link";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bubli-app-layout">
      <aside className="bubli-sidebar">
        <Link className="bubli-brand" href="/app">
          {siteConfig.name}
        </Link>
        <nav aria-label="회원 앱" className="bubli-nav">
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
