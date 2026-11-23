"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Syncs a sliding pill indicator's width and X translation to the currently
 * active item inside a segmented control, updating on resize.
 */
export function useSlidingPill(
  trackRef: RefObject<HTMLElement | null>,
  pillRef: RefObject<HTMLElement | null>,
  activeSelector: string,
  watchKey: string,
  childSelector?: string,
) {
  useLayoutEffect(() => {
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;

    const sync = () => {
      const current = track.querySelector<HTMLElement>(activeSelector);
      if (!current) return;
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.transform = `translateX(${current.offsetLeft}px)`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(track);
    if (childSelector) {
      for (const el of track.querySelectorAll(childSelector)) {
        ro.observe(el);
      }
    }
    return () => ro.disconnect();
  }, [trackRef, pillRef, activeSelector, watchKey, childSelector]);
}
