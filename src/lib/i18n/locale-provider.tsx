"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { messages, type Locale } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const t = useCallback((key: string) => messages[initialLocale][key] ?? key, [initialLocale]);
  const value = useMemo(() => ({ locale: initialLocale, t }), [initialLocale, t]);
  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "uz",
      t: (key: string) => messages.uz[key] ?? key,
    };
  }
  return ctx;
}
