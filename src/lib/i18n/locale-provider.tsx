"use client";

import { createContext, useCallback, useContext } from "react";
import { getT, messages, type Locale } from "./messages";

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
  const t = useCallback(getT(initialLocale), [initialLocale]);
  return (
    <LocaleContext.Provider value={{ locale: initialLocale, t }}>
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
