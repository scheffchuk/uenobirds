import { ViewTransition, type ReactNode } from "react";

/** Shared-element name for collage tile / atlas card / detail perch art. */
export function SpeciesArtTransition({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={`art-${slug}`} share="auto" default="none">
      {children}
    </ViewTransition>
  );
}
