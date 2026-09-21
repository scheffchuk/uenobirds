"use client";

import type { ComponentProps, ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FastLink } from "@/components/ui/fast-link";
import { hrefWithSeason, type SeasonHrefPath } from "@/lib/season/url";
import { useSeasonQuery } from "@/lib/season/use-season-filter";
import { cn } from "@/lib/utils";

export type SeasonLinkProps = {
  pathname: SeasonHrefPath;
  className?: string;
} & (
  | { backLabel: string; children?: never }
  | { backLabel?: undefined; children: ReactNode }
) &
  Omit<ComponentProps<typeof FastLink>, "href" | "children">;

/** next-intl FastLink that carries `?season=` when present in the current URL. */
export function SeasonLink({
  pathname,
  children,
  className,
  backLabel,
  ...rest
}: SeasonLinkProps) {
  const season = useSeasonQuery();
  const href = hrefWithSeason(pathname, season);

  if (backLabel) {
    return (
      <FastLink
        href={href}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-ink-soft hover:text-ink",
          className,
        )}
        {...rest}
        aria-label={backLabel}
      >
        <ArrowLeftIcon />
      </FastLink>
    );
  }

  return (
    <FastLink href={href} className={className} {...rest}>
      {children}
    </FastLink>
  );
}
