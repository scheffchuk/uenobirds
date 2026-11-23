// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { AtlasSpeciesCard } from "./AtlasSpeciesCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    children: React.ReactNode;
  }) => (
    <a
      href={
        typeof href === "string"
          ? href
          : `${href.pathname}${href.query ? `?${new URLSearchParams(href.query)}` : ""}`
      }
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/site/species-art-transition", () => ({
  SpeciesArtTransition: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const labels = {
  play: "Play audio",
  pause: "Pause audio",
  loading: "Loading audio",
  retry: "Retry audio",
  unavailable: "Audio unavailable",
};

let roots: Array<{ root: Root; container: HTMLDivElement }> = [];

function renderCard() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });

  act(() => {
    root.render(
      <AtlasSpeciesCard
        slug="passer-montanus"
        comName="スズメ"
        sciName="Passer montanus"
        imageUrl="https://images.example/sparrow.png"
        index={0}
        season="spring"
        audio={{
          status: "available",
          url: "https://audio.example/sparrow.mp3",
        }}
        labels={labels}
      />,
    );
  });

  return container;
}

afterEach(() => {
  for (const { root, container } of roots) {
    act(() => root.unmount());
    container.remove();
  }
  roots = [];
  vi.clearAllMocks();
});

describe("AtlasSpeciesCard", () => {
  it("keeps the detail link on the illustration and Locale common name", () => {
    const container = renderCard();
    const detailLink = container.querySelector<HTMLAnchorElement>("a");
    if (!detailLink) throw new Error("Missing species detail link");

    expect(detailLink.querySelector("img")).not.toBeNull();
    expect(detailLink.textContent).toContain("スズメ");
    expect(detailLink.textContent).toContain("Passer montanus");
    expect(detailLink.getAttribute("href")).toBe(
      "/atlas/passer-montanus?season=spring",
    );
    expect(container.textContent).toContain("Passer montanus");
  });

  it("keeps audio as a separate keyboard control and references on the detail page", () => {
    const container = renderCard();
    const button = container.querySelector("button");

    expect(button?.type).toBe("button");
    expect(button?.getAttribute("aria-label")).toBe("Play audio");
    expect(button?.closest("a")).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });
});
