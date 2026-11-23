"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function AtlasSearch({
  items,
}: {
  items: { slug: string; names: string; content: ReactNode }[];
}) {
  const t = useTranslations("Atlas");
  const inputId = useId();
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/);
  const matches = items.filter((item) => {
    const names = item.names.normalize("NFKC").toLocaleLowerCase();
    return terms.every((term) => names.includes(term));
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Label htmlFor={inputId} className="sr-only">
          {t("searchLabel")}
        </Label>
        <Input
          id={inputId}
          type="search"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-controls={resultsId}
          className="h-10 sm:max-w-sm"
        />
        <p role="status" className="text-xs text-ink-soft">
          {t("results", { count: matches.length })}
        </p>
      </div>
      {matches.length > 0 ? (
        <ul
          id={resultsId}
          className="grid grid-cols-1 gap-3 group-has-[[data-filtering]]:opacity-60 group-has-[[data-filtering]]:transition-opacity sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
        >
          {matches.map((item) => (
            <li key={item.slug}>{item.content}</li>
          ))}
        </ul>
      ) : (
        <Empty id={resultsId} className="py-12">
          <EmptyHeader>
            <EmptyTitle>{t("noResultsTitle")}</EmptyTitle>
            <EmptyDescription>{t("noResultsDescription")}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => setQuery("")}>
            {t("clearSearch")}
          </Button>
        </Empty>
      )}
    </div>
  );
}
