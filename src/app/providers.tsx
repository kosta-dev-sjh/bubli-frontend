"use client";

import { Toaster } from "sonner";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme";
import { I18nProvider } from "@/lib/i18n";
import { QueryProvider } from "@/lib/query/query-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
