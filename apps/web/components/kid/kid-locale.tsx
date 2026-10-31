"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getChild } from "@/lib/api";
import { getChildModeChildId } from "@/lib/child-mode";
import { KidCopy, kidCopy, KidLocale, kidLocale } from "@/lib/kid-copy";

const KidLocaleContext = createContext<KidLocale>("en");

const cacheKey = (childId: string) => `wonderpath:kid-locale:${childId}`;

function readCachedLocale(childId: string | null): KidLocale | null {
  if (!childId) return null;
  try {
    const value = window.sessionStorage.getItem(cacheKey(childId));
    return value === "id" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

// The kid UI language follows the child's first curriculum. It defaults to
// English until the child profile loads; the last value is kept in
// sessionStorage so a reload does not flash the other language.
export function KidLocaleProvider({ children }: { children: ReactNode }) {
  const [childId] = useState<string | null>(() => getChildModeChildId());
  const [locale, setLocale] = useState<KidLocale>(
    () => readCachedLocale(childId) ?? "en",
  );

  useEffect(() => {
    if (!childId) return;
    const id: string = childId;
    let cancelled = false;
    getChild(id)
      .then((child) => {
        if (cancelled) return;
        const next = kidLocale(child.curricula[0]);
        setLocale(next);
        try {
          window.sessionStorage.setItem(cacheKey(id), next);
        } catch {
          // Storage can be blocked; the cache is a convenience only.
        }
      })
      .catch(() => {
        // Keep the current language if the profile can't be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  return (
    <KidLocaleContext.Provider value={locale}>{children}</KidLocaleContext.Provider>
  );
}

export function useKidLocale(): KidLocale {
  return useContext(KidLocaleContext);
}

export function useKidCopy(): KidCopy {
  return kidCopy(useKidLocale());
}
