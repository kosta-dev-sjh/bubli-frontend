import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/brand/icon-app-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-app-512.png", sizes: "512x512", type: "image/png" },
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
