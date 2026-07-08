"use client";

import { ThemeProvider } from "./theme-provider";
import { AuthSessionProvider } from "./session-provider";
import { ToastProvider } from "./toast-provider";
import { LoadingProvider } from "./loading-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthSessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <LoadingProvider>
          {children}
        </LoadingProvider>
        <ToastProvider />
      </ThemeProvider>
    </AuthSessionProvider>
  );
}
