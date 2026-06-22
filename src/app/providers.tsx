"use client";

import { Toaster } from "sonner";
import type { ReactNode } from "react";

import { QueryProvider } from "@/lib/query/query-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}
