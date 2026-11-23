"use client";

import { usePathname } from "next/navigation";
import { Suspense, useLayoutEffect, useRef } from "react";
import { SeasonLink } from "@/components/season/SeasonLink";
import { stripLocalePrefix } from "@/lib/season/canonicalize";
import { cn } from "@/lib/utils";

export type ViewSwitcherCopy = {
  collage: string;
  atlas: string;
  ariaLabel: string;
};

function ViewSwitcherLinks({
  active,
  copy,
}: {
  active: "collage" | "atlas";
  copy: ViewSwitcherCopy;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;

    const sync = () => {
      const current = track.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) return;
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.transform = `translateX(${current.offsetLeft}px)`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(track);
    for (const link of track.querySelectorAll("a")) {
      ro.observe(link);
    }
    return () => ro.disconnect();
  }, [active, copy.collage, copy.atlas]);

  return (
    <nav
      ref={trackRef}
      aria-label={copy.ariaLabel}
      className="fixed bottom-4 left-1/2 z-30 inline-flex -translate-x-1/2 items-center rounded-full bg-paper-2/95 p-1 shadow-(--recess) backdrop-blur-md md:bottom-6"
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-full bg-background shadow-(--raised) transition-[transform,width] duration-[320ms] ease-[cubic-bezier(0.7,0.05,0.2,1)] will-change-[transform,width]"
      />
      <SeasonLink
        pathname="/"
        prefetch={true}
        aria-current={active === "collage" ? "page" : undefined}
        className={cn(
          "relative z-10 inline-flex min-h-8 items-center justify-center rounded-full px-5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:px-6",
          active === "collage" ? "text-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {copy.collage}
      </SeasonLink>
      <SeasonLink
        pathname="/atlas"
        prefetch={true}
        aria-current={active === "atlas" ? "page" : undefined}
        className={cn(
          "relative z-10 inline-flex min-h-8 items-center justify-center rounded-full px-5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:px-6",
          active === "atlas" ? "text-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {copy.atlas}
      </SeasonLink>
    </nav>
  );
}

/** Persistent bottom-center sliding-pill switcher between Collage and Atlas. */
export function BottomViewSwitcher({ copy }: { copy: ViewSwitcherCopy }) {
  const pathname = usePathname();
  const stripped = stripLocalePrefix(pathname);
  if (stripped !== "/" && stripped !== "/atlas") return null;

  const active = stripped === "/atlas" ? "atlas" : "collage";

  return (
    <Suspense fallback={null}>
      <ViewSwitcherLinks active={active} copy={copy} />
    </Suspense>
  );
}
