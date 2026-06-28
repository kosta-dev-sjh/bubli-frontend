"use client";

import { Toaster } from "sonner";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme";
import { QueryProvider } from "@/lib/query/query-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
