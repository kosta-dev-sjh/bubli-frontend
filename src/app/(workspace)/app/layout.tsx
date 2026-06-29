import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

// 회원 앱(/app) 전용 파비콘 = 다크 앱 타일 마크. 루트(라이트 버블)를 덮어쓴다.
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/brand/icon-app.svg", type: "image/svg+xml" },
      { url: "/brand/icon-app-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/brand/icon-app-180.png",
  },
};

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
