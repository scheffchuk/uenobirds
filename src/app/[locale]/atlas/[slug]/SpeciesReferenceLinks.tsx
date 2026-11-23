import { ExternalLinkIcon } from "lucide-react";

export type SpeciesReferenceLabels = {
  wikipedia: string;
  ebird: string;
  viewOnWikipedia: string;
  viewOnEbird: string;
  opensNewTab: string;
};

/** External Wikipedia and eBird reference pills shared by framed and artless species detail views. */
export function SpeciesReferenceLinks({
  wikipediaUrl,
  ebirdUrl,
  labels,
  compact = false,
}: {
  wikipediaUrl?: string;
  ebirdUrl?: string;
  labels: SpeciesReferenceLabels;
  compact?: boolean;
}) {
  if (!wikipediaUrl && !ebirdUrl) return null;

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {wikipediaUrl ? (
        <a
          href={wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${labels.viewOnWikipedia} (${labels.opensNewTab})`}
          className="postcard-action-pill"
        >
          <span>{compact ? labels.wikipedia : labels.viewOnWikipedia}</span>
          <ExternalLinkIcon aria-hidden className="size-2.5" />
        </a>
      ) : null}
      {ebirdUrl ? (
        <a
          href={ebirdUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${labels.viewOnEbird} (${labels.opensNewTab})`}
          className="postcard-action-pill"
        >
          <span>{compact ? labels.ebird : labels.viewOnEbird}</span>
          <ExternalLinkIcon aria-hidden className="size-2.5" />
        </a>
      ) : null}
    </div>
  );
}
