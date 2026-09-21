"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-heading text-xl text-ink">{t("title")}</h1>
      <p className="text-sm text-ink-2">{t("body")}</p>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
