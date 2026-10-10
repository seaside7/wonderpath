"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { CONTENT, Locale, LOCALE_PATH } from "./content";

function LanguageSwitch({ locale, label }: { locale: Locale; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-full bg-ink/5 p-1 text-xs font-bold"
    >
      {(["id", "en"] as const).map((option) => (
        <Link
          key={option}
          href={LOCALE_PATH[option]}
          hrefLang={option}
          aria-current={option === locale ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
            option === locale ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          {option}
        </Link>
      ))}
    </div>
  );
}

export default function TopBar({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].nav;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#how", label: t.how },
    { href: "#features", label: t.features },
    { href: "#books", label: t.books },
    { href: "#parents", label: t.parents },
    { href: "#faq", label: t.faq },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow] duration-200 ${
        scrolled || open
          ? "bg-white/95 shadow-[0_4px_20px_rgba(46,42,92,0.08)] backdrop-blur"
          : "bg-white"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href={LOCALE_PATH[locale]} className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-waypoint font-display text-base font-bold text-ink"
          >
            W
          </span>
          <span className="font-display text-xl font-semibold text-ink">
            WonderPath
          </span>
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          <LanguageSwitch locale={locale} label={t.switchLabel} />
          <Link
            href="/login"
            className="text-sm font-semibold text-ink hover:text-coral-deep"
          >
            {t.login}
          </Link>
          <Link
            href="/register"
            className="btn-tactile rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-ink shadow-[0_4px_0_rgba(46,42,92,0.18)] hover:bg-[#ff7c5f]"
          >
            {t.cta}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t.close : t.menu}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-ink/5 lg:hidden"
        >
          {open ? <XIcon /> : <MenuIcon />}
        </button>
      </nav>

      {open ? (
        <div id="mobile-menu" className="border-t border-line px-5 pb-6 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base font-semibold text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            <LanguageSwitch locale={locale} label={t.switchLabel} />
            <Link href="/login" className="text-sm font-semibold text-ink">
              {t.login}
            </Link>
          </div>
          <Link
            href="/register"
            className="btn-tactile mt-4 block rounded-full bg-coral px-5 py-3 text-center text-base font-bold text-ink"
          >
            {t.cta}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
