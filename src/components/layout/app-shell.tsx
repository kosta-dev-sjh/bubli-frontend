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
          <span className="bubli-nav-hint" aria-hidden="true">
            옆으로 더 보기
          </span>
        </div>
      </aside>
      <main className="shell bubli-main">
        <WorkspaceTopbar
          notificationCount={3}
          project={{
            description: "자료, 작업, 소통을 보는 현재 프로젝트룸",
            name: "Bubli 제품 개발룸",
            statusLabel: "진행 중",
          }}
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
