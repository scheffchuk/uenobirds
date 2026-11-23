"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { stripLocalePrefix } from "@/lib/season/canonicalize";
import { FastLink } from "@/components/ui/fast-link";
import { cn } from "@/lib/utils";

function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

export type CornerMenuCopy = {
  menu: string;
  about: string;
};

/**
 * Top-right corner shell that morphs seamlessly from a pill trigger into a
 * rounded card containing Locale selection and About link.
 */
export function MorphingCornerMenu({
  copy,
  className,
}: {
  copy: CornerMenuCopy;
  className?: string;
}) {
  const tLocale = useTranslations("LocaleSwitcher");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        shellRef.current &&
        event.target instanceof Node &&
        !shellRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const switchLocale = (next: AppLocale) => {
    setOpen(false);
    if (next === locale) return;
    const pathname = stripLocalePrefix(window.location.pathname);
    const query = Object.fromEntries(
      new URLSearchParams(window.location.search).entries(),
    );
    router.replace(
      getPathname({
        href:
          Object.keys(query).length > 0 ? { pathname, query } : pathname,
        locale: next,
      }) as Route,
    );
  };

  return (
    <div
      ref={shellRef}
      data-open={open ? "true" : "false"}
      className={cn("corner-menu-shell relative", className)}
    >
      <div className="corner-menu-surface">
        <aside
          id={menuId}
          aria-hidden={!open}
          role="menu"
          aria-label={copy.menu}
          className="corner-menu-panel"
        >
          <div className="corner-menu-sheet flex flex-col gap-3.5">
            {/* Locale selector */}
            <div className="flex flex-col gap-1.5">
              <span className="px-1 font-mono text-[9px] tracking-[0.2em] text-ink-soft uppercase">
                {tLocale("label")}
              </span>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-paper-2 p-1 shadow-(--recess)">
                {routing.locales.map((code) => {
                  const selected = code === locale;
                  return (
                    <button
                      key={code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      tabIndex={open ? 0 : -1}
                      onClick={() => {
                        if (isAppLocale(code)) switchLocale(code);
                      }}
                      className={cn(
                        "rounded-full px-2 py-1.5 font-mono text-[10px] tracking-[0.04em] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        selected
                          ? "bg-background font-medium text-ink shadow-(--raised)"
                          : "text-ink-soft hover:text-ink",
                      )}
                    >
                      {tLocale(code)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* About link */}
            <nav className="flex flex-col gap-0.5 border-t border-hairline pt-2">
              <FastLink
                href="/about"
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1.5 text-sm text-ink transition-colors hover:bg-paper-2"
              >
                {copy.about}
              </FastLink>
            </nav>
          </div>
        </aside>
      </div>

      <button
        type="button"
        aria-label={tLocale("label")}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className="corner-menu-btn"
      >
        <span className="corner-menu-word" aria-hidden="true">
          {copy.menu}
        </span>
        <span className="corner-menu-x" aria-hidden="true">
          <svg
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="size-3.5"
          >
            <path d="M3.6 3.6 L10.4 10.4" />
            <path d="M10.4 3.6 L3.6 10.4" />
          </svg>
        </span>
      </button>
    </div>
  );
}
