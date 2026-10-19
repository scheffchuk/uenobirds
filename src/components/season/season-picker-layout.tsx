export const seasonPickerTrack =
  "relative inline-flex h-8 items-center rounded-full bg-paper-2 p-1 shadow-(--recess)";

export const seasonPickerItem =
  "relative z-10 inline-flex h-full min-h-0 min-w-0 items-center justify-center rounded-full px-3 font-mono text-[10px] leading-none text-ink-soft uppercase";

export function SeasonPickerLabel({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className="hidden tracking-[0.14em] pl-[0.14em] sm:inline">{full}</span>
      <span className="tracking-[0.14em] pl-[0.14em] sm:hidden">{short}</span>
    </>
  );
}
