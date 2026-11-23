"use client";

import { useEffect, useState } from "react";
import { FastLink } from "@/components/ui/fast-link";
import { cn } from "@/lib/utils";

/**
 * Editorial Atlas heading that smoothly collapses its eyebrow and shrinks into
 * a single sticky frosted-glass bar as the visitor scrolls down.
 */
export function CompactScrollHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const next = window.scrollY > 40;
      setCompact((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header
      data-compact={compact ? "true" : "false"}
      className={cn(
        "compact-scroll-header sticky top-0 z-20 -mx-4 px-4 text-center transition-[padding,background-color,box-shadow] duration-300 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8",
        compact
          ? "bg-background/88 py-3 shadow-[0_1px_0_rgba(26,22,18,0.09)] backdrop-blur-md"
          : "bg-transparent pt-10 pb-2 md:pt-8",
      )}
    >
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity,transform,margin] duration-300",
          compact
            ? "pointer-events-none mb-0 max-h-0 -translate-y-2 opacity-0"
            : "mb-1.5 max-h-7 translate-y-0 opacity-100",
        )}
      >
        <FastLink
          href="/about"
          className="font-heading text-sm tracking-wide text-ink-2 italic transition-colors hover:text-ink hover:underline underline-offset-4"
        >
          {eyebrow}
        </FastLink>
      </div>
      <h1
        className={cn(
          "font-heading leading-none text-ink transition-[font-size,letter-spacing] duration-300",
          compact
            ? "text-base tracking-[0.14em] uppercase md:text-lg"
            : "text-[clamp(24px,3vw,36px)] tracking-tight",
        )}
      >
        {title}
      </h1>
    </header>
  );
}
