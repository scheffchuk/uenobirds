"use client";

import { useState, type ComponentProps } from "react";
import { FastLink } from "@/components/ui/fast-link";

type Props = Omit<ComponentProps<typeof FastLink>, "prefetch"> & {
  eager: boolean;
};

/** Prefetch on hover/focus, or immediately when `eager`. */
export function HoverPrefetchLink({
  eager,
  onFocus,
  onMouseEnter,
  ...props
}: Props) {
  const [intent, setIntent] = useState(false);

  return (
    <FastLink
      {...props}
      prefetch={eager || intent ? true : "auto"}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
    />
  );
}
