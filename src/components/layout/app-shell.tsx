import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
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
        <div className="bubli-nav-wrap">
          <AppNav />
        </div>
      </aside>
      <main className="shell bubli-main">
        <WorkspaceTopbar
          notificationCount={3}
          project={{
            description: "자료보드 · 작업판 · 소통",
            name: "Bubli 제품 개발룸",
            statusLabel: "진행 중",
          }}
          searchPlaceholder="검색"
          surfaceLabel="작업공간"
          user={{
            displayName: "정현 님",
            email: "jihyun.kim@bubli.kr",
            initials: "JH",
          }}
        />
        {children}
      </main>
    </div>
  );
}
