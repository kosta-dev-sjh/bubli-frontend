import type { ReactNode } from "react";

import { PublicHeader } from "@/components/layout/public-header";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="shell">
      <PublicHeader />
      <main style={{ marginTop: 48 }}>{children}</main>
    </div>
  );
}
