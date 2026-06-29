import type { Metadata } from "next";
import type { ReactNode } from "react";

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
  return children;
}
