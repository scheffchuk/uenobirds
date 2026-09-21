"use client";

import { useEffect, useRef } from "react";
import { WifiOffIcon } from "lucide-react";
import { useOffline } from "next/offline";
import { useTranslations } from "next-intl";

/** Sticky offline banner; named so view transitions do not snapshot it. */
export function OfflineIndicator() {
  const offline = useOffline();
  const t = useTranslations("Offline");
  const banner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = banner.current;
    if (!node) return;
    node.hidden = !offline;
  }, [offline]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
      style={{ viewTransitionName: "offline-toast" }}
    >
      <div
        ref={banner}
        hidden
        role="status"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-mono text-[10px] tracking-[0.14em] text-background uppercase shadow-(--raised)"
      >
        <WifiOffIcon aria-hidden className="size-3.5" />
        {t("message")}
      </div>
    </div>
  );
}
