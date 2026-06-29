import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

// 로그인 전에는 회원 앱 목업 화면을 노출하지 않는다.
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
  void children;
  redirect("/login");
}
